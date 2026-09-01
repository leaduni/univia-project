"""Cliente único de generación de texto en UniVia, multi-proveedor.

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
from dataclasses import dataclass
from typing import Any, Callable, Optional

from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# --- Generación multi-proveedor ---------------------------------------------
# LLM_PROVIDER elige el proveedor principal; LLM_FALLBACK es el respaldo que
# se usa automáticamente si el principal responde 429 (cuota/tasa) o falla por
# conexión (5xx). Valores válidos: openai, groq, gemini.
LLM_PROVIDER = os.getenv("LLM_PROVIDER", "openai")
LLM_FALLBACK = os.getenv("LLM_FALLBACK", "gemini")

# Modelos de generación por proveedor. Se dejan configurables porque el costo
# por millón de tokens cambia bastante entre familias y el presupuesto del
# piloto es acotado.
MODELO_GENERACION = os.getenv("OPENAI_GEN_MODEL", "gpt-4o-mini")
MODELO_GROQ = os.getenv("GROQ_GEN_MODEL", "llama-3.3-70b-versatile")
MODELO_GEMINI = os.getenv("GEMINI_GEN_MODEL", "gemini-2.0-flash")

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

_cliente: Optional[OpenAI] = None
_cliente_ingesta: Optional[OpenAI] = None
_cliente_groq = None
_cliente_gemini = None
_cliente_chatbot: Optional[OpenAI] = None


def get_openai_generacion() -> Optional[OpenAI]:
    """Cliente de OpenAI para generación, o None si no hay clave configurada.

    Devuelve None en vez de reventar para que cada router decida su propio
    mensaje de error: la API tiene que arrancar aunque falte la clave.
    """
    global _cliente
    if _cliente is not None:
        return _cliente

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        logger.error("OPENAI_API_KEY no configurada: la generación con IA queda deshabilitada.")
        return None

    # timeout duro y reintentos acotados: sin esto una petición colgada se
    # queda tomando un worker hasta 10 minutos (default del SDK).
    _cliente = OpenAI(api_key=api_key, timeout=90.0, max_retries=2)
    return _cliente


def get_claude() -> Optional[OpenAI]:
    """Alias legado del cliente de generación para preservar compatibilidad."""
    return get_openai_generacion()


@dataclass
class ProveedorLLM:
    """Contrato uniforme de un proveedor de generación de texto.

    Cada factory devuelve un ProveedorLLM listo para usar (cliente cacheado y
    modelo por defecto del proveedor). `generar()` solo conoce este contrato,
    así que no se acopla al SDK específico de cada proveedor.
    """

    nombre: str
    modelo: str
    cliente: Any
    llamar: Callable[..., str]


def _llamar_openai(cliente, *, modelo, mensajes, max_tokens, stream, json_mode) -> str:
    """Una llamada de chat a OpenAI; devuelve el texto de la respuesta."""
    kwargs = {
        "model": modelo,
        "max_tokens": max_tokens,
        "messages": mensajes,
    }
    if json_mode:
        kwargs["response_format"] = {"type": "json_object"}

    if stream:
        flujo = cliente.chat.completions.create(**kwargs, stream=True)
        return "".join(
            chunk.choices[0].delta.content or ""
            for chunk in flujo
            if chunk.choices
        )

    respuesta = cliente.chat.completions.create(**kwargs)
    uso = respuesta.usage
    logger.info(
        "OpenAI %s | in=%s out=%s",
        modelo,
        getattr(uso, "prompt_tokens", "?"),
        getattr(uso, "completion_tokens", "?"),
    )
    if respuesta.choices[0].finish_reason == "length":
        logger.warning("La respuesta se cortó por max_tokens (%s).", max_tokens)

    return respuesta.choices[0].message.content or ""


def _llamar_groq(cliente, *, modelo, mensajes, max_tokens, stream, json_mode) -> str:
    """Una llamada de chat a Groq; devuelve el texto de la respuesta.

    La API de Groq replica la interfaz de chat de OpenAI.
    """
    kwargs = {
        "model": modelo,
        "max_tokens": max_tokens,
        "messages": mensajes,
    }
    if json_mode:
        kwargs["response_format"] = {"type": "json_object"}

    if stream:
        flujo = cliente.chat.completions.create(**kwargs, stream=True)
        return "".join(
            chunk.choices[0].delta.content or ""
            for chunk in flujo
            if chunk.choices
        )

    respuesta = cliente.chat.completions.create(**kwargs)
    return respuesta.choices[0].message.content or ""


def _llamar_gemini(cliente, *, modelo, mensajes, max_tokens, stream, json_mode) -> str:
    """Una llamada de chat a Gemini; devuelve el texto de la respuesta."""
    config = {"max_output_tokens": max_tokens}
    if json_mode:
        config["response_mime_type"] = "application/json"

    contenido = "\n\n".join(
        f"{m['role'].upper()}: {m['content']}" for m in mensajes
    )
    if stream:
        flujo = cliente.generate_content(contenido, generation_config=config, stream=True)
        return "".join(fragmento.text or "" for fragmento in flujo)

    respuesta = cliente.generate_content(contenido, generation_config=config)
    return respuesta.text or ""


def _proveedor_openai() -> Optional[ProveedorLLM]:
    """Factory del proveedor OpenAI (por defecto). None si no hay clave."""
    cliente = get_openai_generacion()
    if cliente is None:
        return None
    return ProveedorLLM(
        nombre="openai",
        modelo=MODELO_GENERACION,
        cliente=cliente,
        llamar=_llamar_openai,
    )


def _proveedor_groq() -> Optional[ProveedorLLM]:
    """Factory del proveedor Groq. None si falta la clave o el SDK."""
    global _cliente_groq
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        logger.error("GROQ_API_KEY no configurada: el proveedor Groq queda deshabilitado.")
        return None
    if _cliente_groq is None:
        try:
            from groq import Groq
        except ImportError:
            logger.error("Paquete 'groq' no instalado: el proveedor Groq queda deshabilitado.")
            return None
        _cliente_groq = Groq(api_key=api_key, timeout=90.0, max_retries=2)
    return ProveedorLLM(
        nombre="groq",
        modelo=MODELO_GROQ,
        cliente=_cliente_groq,
        llamar=_llamar_groq,
    )


def _proveedor_gemini() -> Optional[ProveedorLLM]:
    """Factory del proveedor Gemini. None si falta la clave o el SDK."""
    global _cliente_gemini
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        logger.error("GEMINI_API_KEY no configurada: Gemini queda deshabilitado.")
        return None
    if _cliente_gemini is None:
        try:
            import google.generativeai as genai
        except ImportError:
            logger.error("Paquete 'google-generativeai' no instalado: Gemini queda deshabilitado.")
            return None
        genai.configure(api_key=api_key)
        _cliente_gemini = genai.GenerativeModel(model_name=MODELO_GEMINI)
    return ProveedorLLM(
        nombre="gemini",
        modelo=MODELO_GEMINI,
        cliente=_cliente_gemini,
        llamar=_llamar_gemini,
    )


_FACTORIAS_PROVEEDORES = {
    "openai": _proveedor_openai,
    "groq": _proveedor_groq,
    "gemini": _proveedor_gemini,
}


def _proveedor(nombre: str) -> Optional[ProveedorLLM]:
    """Devuelve el ProveedorLLM del nombre pedido, o None si no existe."""
    fabrica = _FACTORIAS_PROVEEDORES.get((nombre or "").lower())
    if fabrica is None:
        logger.error(
            "Proveedor LLM '%s' desconocido (opciones: openai, groq, gemini).",
            nombre,
        )
        return None
    return fabrica()


def _ejecutar_llamada(
    proveedor: ProveedorLLM,
    mensajes: list,
    max_tokens: int,
    modelo: Optional[str],
    stream: bool,
    json_mode: bool,
) -> str:
    """Ejecuta una llamada a través del contrato ProveedorLLM."""
    return proveedor.llamar(
        proveedor.cliente,
        modelo=modelo or proveedor.modelo,
        mensajes=mensajes,
        max_tokens=max_tokens,
        stream=stream,
        json_mode=json_mode,
    )


def _es_error_reintentable(error: Exception) -> bool:
    """True si el error amerita reintentar con el proveedor de respaldo.

    Cuota/tasa agotada (429) o fallo de conexión del lado del servidor (5xx).
    Prefiere el código HTTP que expone el SDK; a falta de él, mira el nombre de
    la excepción (RateLimit, APIConnectionError, ResourceExhausted, ...).
    """
    status = getattr(error, "status_code", None)
    if status is None:
        status = getattr(error, "status", None)
    if status is not None:
        try:
            status = int(status)
        except (TypeError, ValueError):
            status = None
        if status is not None:
            return status == 429 or 500 <= status < 600
    nombre = type(error).__name__.lower()
    return any(
        parte in nombre
        for parte in ("rate", "connection", "timeout", "exhausted", "server", "unavailable")
    )


def generar(
    prompt: str,
    system: Optional[str] = None,
    max_tokens: int = 16000,
    modelo: Optional[str] = None,
    stream: bool = False,
    json_mode: bool = False,
) -> str:
    """Una llamada de generación al proveedor principal; devuelve el texto.

    Si el proveedor principal falla por cuota/tasa (429) o error de conexión
    del servidor (5xx), la llamada se reintenta automáticamente con el
    proveedor definido en LLM_FALLBACK, sin intervención del llamador.

    Args:
        prompt: mensaje del usuario.
        system: instrucciones de sistema, opcional (cada proveedor maneja su
            propio cacheado de prompt).
        max_tokens: tope de la respuesta.
        modelo: sobrescribe el modelo por defecto del proveedor principal
            para una llamada concreta. No se propaga al fallback: los nombres
            de modelo no se comparten entre proveedores.
        stream: streamea la respuesta. Necesario cuando `max_tokens` es grande:
            sin streaming la petición puede pasarse del timeout HTTP.
        json_mode: fuerza estructura JSON en la respuesta (response_format en
            OpenAI/Groq, response_mime_type en Gemini).

    Raises:
        RuntimeError: si ningún proveedor está disponible o ambos fallan.
    """
    proveedor = _proveedor(LLM_PROVIDER)
    if proveedor is None:
        raise RuntimeError(
            f"LLM_PROVIDER '{LLM_PROVIDER}' no disponible: falta la clave o el SDK."
        )

    mensajes = []
    if system:
        mensajes.append({"role": "system", "content": system})
    mensajes.append({"role": "user", "content": prompt})

    try:
        return _ejecutar_llamada(
            proveedor, mensajes, max_tokens, modelo, stream, json_mode
        )
    except Exception as error_principal:
        if not (
            LLM_FALLBACK
            and LLM_FALLBACK.lower() != LLM_PROVIDER.lower()
            and _es_error_reintentable(error_principal)
        ):
            raise

        proveedor_respaldo = _proveedor(LLM_FALLBACK)
        if proveedor_respaldo is None:
            logger.error(
                "Fallback '%s' no disponible; se propaga el error original de '%s': %s",
                LLM_FALLBACK,
                LLM_PROVIDER,
                error_principal,
            )
            raise

        logger.warning(
            "Llamada a '%s' falló (%s: %s). Reintentando con el fallback '%s'.",
            LLM_PROVIDER,
            type(error_principal).__name__,
            error_principal,
            LLM_FALLBACK,
        )
        try:
            return _ejecutar_llamada(
                proveedor_respaldo, mensajes, max_tokens, None, stream, json_mode
            )
        except Exception as error_respaldo:
            raise RuntimeError(
                f"Fallo en '{LLM_PROVIDER}' ({error_principal}) y en el fallback "
                f"'{LLM_FALLBACK}' ({error_respaldo})."
            ) from error_respaldo


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
