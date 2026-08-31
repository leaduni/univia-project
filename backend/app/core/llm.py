"""Clientes de IA de UniVia: uno por proveedor, todos centralizados aquí.

Separación de proveedores del proyecto (estado actual, todo pagado con la
misma cuenta de OpenAI salvo lo señalado):

    OCR DE VISION (páginas escaneadas/con imágenes) -> Gemini, GEMINI_VISION_API_KEY
                                                         (fallback: OpenAI, OPEN_AI_INGEST_API_KEY)
    EMBEDDINGS (ingesta Y consulta, mismo proveedor  -> OpenAI, OPEN_AI_INGEST_API_KEY
    siempre — ver EMBEDDINGS_PROVIDER en el .env)       (ver app/rag/embedder.py)
    ETIQUETADO DE TEXTO (ingesta)                    -> OpenAI, OPEN_AI_INGEST_API_KEY
    GENERACIÓN DE EVALUACIONES                       -> GPT, OPEN_AI_INGEST_API_KEY
    CHATBOT FLOTANTE                                 -> Groq, GROQ_API_KEY

El OCR de Vision es la parte de mayor volumen (una llamada por página escaneada
de cada PDF) y la que primero agota cuota/crédito, así que va por una cuenta de
Gemini separada de la de OpenAI. Si GEMINI_VISION_API_KEY no está configurada,
el extractor cae de vuelta a OpenAI para no romper corridas existentes.

El chatbot va por Groq y no por GPT porque es conversación de alto volumen y
bajo valor por mensaje (navegación, cultura general): su free tier absorbe ese
tráfico sin tocar el saldo pagado de OpenAI que sostiene ingesta y evaluaciones.

Claude (get_claude/generar más abajo) queda configurado pero SIN llamadas en
ningún endpoint en vivo: la generación de evaluaciones se movió a GPT. Sigue
existiendo porque `app/rag/generator.py` (un tutor RAG que ningún router
conecta) y `scripts_manuales/generar_ruta_desde_silabo.py` todavía lo llaman;
si algún día se retira CLAUDE_GEN_API_KEY del .env, esos dos son los únicos
que se rompen.

Todo lo que genera pasa por aquí para que la clave, el modelo, el caché de
prompt y el manejo de errores estén en un solo sitio.

El caché de prompt de Claude importa mucho para generar() (aunque hoy nada lo
llame en producción): el system prompt de evaluaciones ronda los 1.900 tokens.
Cacheado cuesta ~1/10. Se marca siempre para cachear: por debajo del mínimo
(~1.024 tokens) la API lo ignora en silencio, así que no hace falta adivinar el
largo desde el código. GPT (generar_gpt) no tiene este control manual: OpenAI
cachea automáticamente los prefijos repetidos, sin `cache_control` explícito.
"""

import base64
import logging
import os
from typing import Any, Optional

import anthropic
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# Modelo de generación. Se deja configurable porque el costo por millón de
# tokens cambia bastante entre familias y el presupuesto del piloto es acotado.
MODELO_GENERACION = os.getenv("CLAUDE_GEN_MODEL", "claude-sonnet-5")

# Modelo de generación de evaluaciones, en GPT. gpt-4.1 (no mini) por defecto:
# escribir preguntas de examen correctas y bien explicadas es la parte que más
# importa acertar, y la diferencia de precio ($2/$8 por 1M tokens vs $0.40/$1.60
# de mini) es chica en términos absolutos para el volumen de este piloto.
# Bajar a "gpt-4.1-mini" acá si el presupuesto aprieta.
MODELO_GENERACION_GPT = os.getenv("OPENAI_GEN_MODEL", "gpt-4.1")

# Modelo de ingesta. Necesita visión: lee páginas de PDF renderizadas a imagen.
MODELO_INGESTA = os.getenv("OPENAI_INGEST_MODEL", "gpt-4.1-mini")

# Modelo del chatbot, en el free tier de Groq. Groq rota su catálogo con cierta
# frecuencia (los Llama 3.x de chat ya no están disponibles), así que un modelo
# retirado se manifiesta como un 404 model_not_found y no como un fallo de clave.
MODELO_CHATBOT = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")

_cliente: Optional[anthropic.Anthropic] = None
_cliente_ingesta: Optional[OpenAI] = None
_cliente_chatbot: Optional[OpenAI] = None


def get_claude() -> Optional[anthropic.Anthropic]:
    """Cliente de Claude, o None si no hay clave configurada.

    Devuelve None en vez de reventar para que cada router decida su propio
    mensaje de error: la API tiene que arrancar aunque falte la clave.
    """
    global _cliente
    if _cliente is not None:
        return _cliente

    api_key = os.getenv("CLAUDE_GEN_API_KEY")
    if not api_key:
        logger.error("CLAUDE_GEN_API_KEY no configurada: la generación con IA queda deshabilitada.")
        return None

    # timeout duro y reintentos acotados: sin esto una petición colgada se
    # queda tomando un worker hasta 10 minutos (default del SDK).
    _cliente = anthropic.Anthropic(api_key=api_key, timeout=90.0, max_retries=2)
    return _cliente


def texto_de(mensaje) -> str:
    """Concatena los bloques de texto de una respuesta.

    `content` puede traer bloques de pensamiento además de texto; quedarse con
    `content[0].text` se rompe en cuanto el modelo piensa antes de responder.
    """
    return "".join(b.text for b in mensaje.content if b.type == "text")


def _bloques_system(system: Optional[str]) -> list:
    """System prompt como un bloque marcado para cachear.

    No se estima el largo desde aquí: contar caracteres para adivinar tokens
    falla con texto en español lleno de LaTeX (salen ~2 caracteres por token,
    no los ~4 de la regla de bolsillo). Se marca siempre y la API decide.
    """
    if not system:
        return []
    return [{
        "type": "text",
        "text": system,
        "cache_control": {"type": "ephemeral"},
    }]


def generar(
    prompt: str,
    system: Optional[str] = None,
    max_tokens: int = 16000,
    modelo: Optional[str] = None,
    stream: bool = False,
) -> str:
    """Una llamada a Claude; devuelve el texto de la respuesta.

    Args:
        prompt: mensaje del usuario.
        system: instrucciones de sistema; se marcan para cachear.
        max_tokens: tope de la respuesta.
        modelo: sobrescribe MODELO_GENERACION para una llamada concreta.
        stream: streamea la respuesta. Necesario cuando `max_tokens` es grande:
            sin streaming la petición puede pasarse del timeout HTTP.

    Raises:
        RuntimeError: si no hay clave configurada.
    """
    cliente = get_claude()
    if cliente is None:
        raise RuntimeError("CLAUDE_GEN_API_KEY no configurada.")

    kwargs = {
        "model": modelo or MODELO_GENERACION,
        "max_tokens": max_tokens,
        "messages": [{"role": "user", "content": prompt}],
    }
    bloques = _bloques_system(system)
    if bloques:
        kwargs["system"] = bloques

    if stream:
        with cliente.messages.stream(**kwargs) as flujo:
            respuesta = flujo.get_final_message()
    else:
        respuesta = cliente.messages.create(**kwargs)

    uso = respuesta.usage
    logger.info(
        "Claude %s | in=%s cache_write=%s cache_read=%s out=%s",
        kwargs["model"],
        uso.input_tokens,
        getattr(uso, "cache_creation_input_tokens", 0),
        getattr(uso, "cache_read_input_tokens", 0),
        uso.output_tokens,
    )
    if respuesta.stop_reason == "max_tokens":
        logger.warning("La respuesta se cortó por max_tokens (%s).", max_tokens)

    return texto_de(respuesta)


def generar_gpt(
    prompt: str,
    system: Optional[str] = None,
    max_tokens: int = 16000,
    modelo: Optional[str] = None,
    json_mode: bool = False,
) -> str:
    """Equivalente a generar() pero con GPT (evaluaciones). Devuelve el texto.

    Comparte cliente y key con la ingesta (get_openai(), OPEN_AI_INGEST_API_KEY):
    es la misma cuenta de OpenAI, no hay razón para separar el crédito.

    Args:
        prompt: mensaje del usuario.
        system: instrucciones de sistema.
        max_tokens: tope de la respuesta.
        modelo: sobrescribe MODELO_GENERACION_GPT para una llamada concreta.
        json_mode: fuerza salida JSON válida vía response_format. Úsalo SOLO
            cuando el prompt pide JSON explícitamente (la API de OpenAI lo
            exige) y el que consume la respuesta espera JSON puro — el camino
            de "una pregunta con marcadores" (SYSTEM_MSG_TEORICO) NO es JSON y
            no debe pasar esto en true.

    Raises:
        RuntimeError: si no hay clave configurada.
    """
    cliente = get_openai()
    if cliente is None:
        raise RuntimeError("OPEN_AI_INGEST_API_KEY no configurada.")

    mensajes = ([{"role": "system", "content": system}] if system else []) + [
        {"role": "user", "content": prompt}
    ]
    kwargs: dict = {
        "model": modelo or MODELO_GENERACION_GPT,
        "max_completion_tokens": max_tokens,
        "messages": mensajes,
    }
    if json_mode:
        kwargs["response_format"] = {"type": "json_object"}

    respuesta: Any = cliente.chat.completions.create(**kwargs)

    uso = respuesta.usage
    logger.info(
        "GPT-gen %s | in=%s out=%s",
        kwargs["model"],
        getattr(uso, "prompt_tokens", "?"),
        getattr(uso, "completion_tokens", "?"),
    )
    if respuesta.choices[0].finish_reason == "length":
        logger.warning("La respuesta se cortó por max_tokens (%s).", max_tokens)

    return respuesta.choices[0].message.content or ""


# ---------------------------------------------------------------------------
# Ingesta (OpenAI)
# ---------------------------------------------------------------------------

def get_openai() -> Optional[OpenAI]:
    """Cliente de OpenAI para la ingesta y la generación de evaluaciones,
    o None si no hay clave."""
    global _cliente_ingesta
    if _cliente_ingesta is not None:
        return _cliente_ingesta

    api_key = os.getenv("OPEN_AI_INGEST_API_KEY")
    if not api_key:
        logger.error("OPEN_AI_INGEST_API_KEY no configurada: la ingesta y la generación quedan deshabilitadas.")
        return None

    # timeout largo: la generación de evaluaciones puede pedir hasta 16.000
    # tokens de salida, igual que el equivalente de Claude en generar().
    _cliente_ingesta = OpenAI(api_key=api_key, timeout=120.0, max_retries=2)
    return _cliente_ingesta


def generar_ingesta(
    prompt: str,
    system: Optional[str] = None,
    imagen_b64: Optional[str] = None,
    max_tokens: int = 8000,
    modelo: Optional[str] = None,
):
    """Una llamada de ingesta a OpenAI. Devuelve la respuesta cruda.

    Se devuelve la respuesta entera y no solo el texto porque el extractor
    necesita mirar `finish_reason` para decidir si la página se leyó bien o
    quedó cortada.

    Args:
        prompt: instrucción de la tarea.
        system: instrucciones de sistema, opcional.
        imagen_b64: página renderizada en JPEG base64, para OCR.
        max_tokens: tope de la respuesta.
        modelo: sobrescribe MODELO_INGESTA.

    Raises:
        RuntimeError: si no hay clave configurada.
    """
    cliente = get_openai()
    if cliente is None:
        raise RuntimeError("OPEN_AI_INGEST_API_KEY no configurada.")

    contenido = []
    if imagen_b64:
        # La imagen va primero: el modelo mira la página y después lee qué
        # tiene que hacer con ella.
        contenido.append({
            "type": "image_url",
            "image_url": {"url": f"data:image/jpeg;base64,{imagen_b64}"},
        })
    contenido.append({"type": "text", "text": prompt})

    mensajes = []
    if system:
        mensajes.append({"role": "system", "content": system})
    mensajes.append({"role": "user", "content": contenido})

    respuesta = cliente.chat.completions.create(
        model=modelo or MODELO_INGESTA,
        max_tokens=max_tokens,
        messages=mensajes,
    )

    uso = respuesta.usage
    logger.info(
        "OpenAI %s | in=%s out=%s",
        modelo or MODELO_INGESTA,
        getattr(uso, "prompt_tokens", "?"),
        getattr(uso, "completion_tokens", "?"),
    )
    return respuesta


def texto_ingesta(respuesta) -> str:
    """Texto de una respuesta de ingesta."""
    return respuesta.choices[0].message.content or ""


# ---------------------------------------------------------------------------
# OCR de Vision (Gemini, con OpenAI como fallback)
# ---------------------------------------------------------------------------

MODELO_VISION_GEMINI = os.getenv("GEMINI_VISION_MODEL", "gemini-3.6-flash")

_cliente_gemini = None


def get_gemini_vision():
    """Cliente de Gemini para el OCR de Vision, o None si no hay clave."""
    global _cliente_gemini
    if _cliente_gemini is not None:
        return _cliente_gemini

    api_key = os.getenv("GEMINI_VISION_API_KEY")
    if not api_key:
        return None

    from google import genai
    _cliente_gemini = genai.Client(api_key=api_key)
    return _cliente_gemini


class _MensajeIngestaShim:
    def __init__(self, content: str):
        self.content = content


class _EleccionIngestaShim:
    def __init__(self, content: str, finish_reason: str):
        self.message = _MensajeIngestaShim(content)
        self.finish_reason = finish_reason


class _UsoIngestaShim:
    def __init__(self, prompt_tokens, completion_tokens):
        self.prompt_tokens = prompt_tokens
        self.completion_tokens = completion_tokens


class _RespuestaIngestaShim:
    """Envuelve una respuesta de Gemini con la misma forma que
    generar_ingesta() devuelve para OpenAI (choices[0].finish_reason,
    choices[0].message.content, usage.prompt_tokens/completion_tokens),
    para que extractor.py no necesite saber qué proveedor respondió."""
    def __init__(self, content: str, finish_reason: str, prompt_tokens, completion_tokens):
        self.choices = [_EleccionIngestaShim(content, finish_reason)]
        self.usage = _UsoIngestaShim(prompt_tokens, completion_tokens)


# Gemini usa su propio enum de finish_reason; se traduce al vocabulario de
# OpenAI ("stop"/"length"/"content_filter") porque extractor.py ya sabe
# reaccionar a esos tres valores (reintento de rescate, bloqueo, etc.).
_MAPA_FINISH_REASON_GEMINI = {
    "STOP": "stop",
    "MAX_TOKENS": "length",
    "SAFETY": "content_filter",
    "RECITATION": "content_filter",
    "BLOCKLIST": "content_filter",
    "PROHIBITED_CONTENT": "content_filter",
    "SPII": "content_filter",
}


def generar_ingesta_gemini(
    prompt: str,
    system: Optional[str] = None,
    imagen_b64: Optional[str] = None,
    max_tokens: int = 8000,
    modelo: Optional[str] = None,
):
    """Equivalente a generar_ingesta() pero contra Gemini en vez de OpenAI.

    Misma firma y misma forma de respuesta (ver _RespuestaIngestaShim) para
    que sea un reemplazo directo dentro de SyllabusExtractor.
    """
    cliente = get_gemini_vision()
    if cliente is None:
        raise RuntimeError("GEMINI_VISION_API_KEY no configurada.")

    from google.genai import types

    partes: list = []
    if imagen_b64:
        partes.append(types.Part.from_bytes(data=base64.b64decode(imagen_b64), mime_type="image/jpeg"))
    partes.append(prompt)

    config = types.GenerateContentConfig(
        max_output_tokens=max_tokens,
        system_instruction=system,
    )

    respuesta = cliente.models.generate_content(
        model=modelo or MODELO_VISION_GEMINI,
        contents=partes,
        config=config,
    )

    texto = respuesta.text or ""
    try:
        finish_reason_gemini = respuesta.candidates[0].finish_reason.name
    except Exception:
        finish_reason_gemini = "STOP" if texto else "OTHER"
    finish_reason = _MAPA_FINISH_REASON_GEMINI.get(finish_reason_gemini, "stop" if texto else "length")

    uso = getattr(respuesta, "usage_metadata", None)
    prompt_tokens = getattr(uso, "prompt_token_count", None)
    completion_tokens = getattr(uso, "candidates_token_count", None)

    logger.info(
        "Gemini Vision %s | in=%s out=%s | finish=%s",
        modelo or MODELO_VISION_GEMINI, prompt_tokens, completion_tokens, finish_reason_gemini,
    )
    return _RespuestaIngestaShim(texto, finish_reason, prompt_tokens, completion_tokens)


# ---------------------------------------------------------------------------
# Chatbot (Groq)
# ---------------------------------------------------------------------------

GROQ_BASE_URL = "https://api.groq.com/openai/v1"


def get_groq() -> Optional[OpenAI]:
    """Cliente del chatbot, o None si no hay clave configurada.

    Groq expone una API compatible con la de OpenAI, así que se reusa ese SDK
    con otra base_url en vez de sumar una dependencia más.
    """
    global _cliente_chatbot
    if _cliente_chatbot is not None:
        return _cliente_chatbot

    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        logger.error("GROQ_API_KEY no configurada: el chatbot queda deshabilitado.")
        return None

    # El chatbot responde en vivo mientras el usuario espera: un timeout corto
    # es preferible a dejar la burbuja cargando indefinidamente.
    _cliente_chatbot = OpenAI(api_key=api_key, base_url=GROQ_BASE_URL, timeout=30.0, max_retries=1)
    return _cliente_chatbot


def chatear(
    mensajes: list,
    system: Optional[str] = None,
    max_tokens: int = 1024,
    modelo: Optional[str] = None,
    temperature: float = 0.6,
    stream: bool = False,
):
    """Una llamada de chat a Groq.

    Args:
        mensajes: historial en formato [{"role": "user"|"assistant", "content": str}].
        system: instrucciones de sistema, opcional.
        max_tokens: tope de la respuesta.
        modelo: sobrescribe MODELO_CHATBOT.
        temperature: 0.6 por defecto; conversación necesita algo de variedad,
            pero no tanta como para inventar datos académicos.
        stream: devuelve el iterador de chunks del SDK en vez del texto ya
            armado. Lo usa el endpoint SSE para pintar la respuesta conforme llega.

    Returns:
        El texto de la respuesta, o el iterador de chunks si stream=True.

    Raises:
        RuntimeError: si no hay clave configurada.
    """
    cliente = get_groq()
    if cliente is None:
        raise RuntimeError("GROQ_API_KEY no configurada.")

    lista_mensajes: Any = ([{"role": "system", "content": system}] if system else []) + mensajes

    respuesta: Any = cliente.chat.completions.create(
        model=modelo or MODELO_CHATBOT,
        max_tokens=max_tokens,
        temperature=temperature,
        messages=lista_mensajes,
        stream=stream,
    )

    if stream:
        # El uso de tokens no viene hasta el último chunk; lo registra quien consuma.
        return respuesta

    uso = respuesta.usage
    logger.info(
        "Groq %s | in=%s out=%s",
        modelo or MODELO_CHATBOT,
        getattr(uso, "prompt_tokens", "?"),
        getattr(uso, "completion_tokens", "?"),
    )
    return respuesta.choices[0].message.content or ""
