"""Cliente único de Claude para todo lo que genera texto en UniVia.

Separación de proveedores del proyecto:

    INGESTA    (OCR, embeddings, etiquetado, sílabos) -> OpenAI, OPEN_AI_INGEST_API_KEY
    GENERACIÓN (evaluaciones, tutor RAG)              -> Claude, CLAUDE_GEN_API_KEY

La ingesta es la parte de volumen (una llamada por página de cada PDF), así que
va por OpenAI. Claude se reserva para lo que ve el estudiante, que es donde la
calidad de la respuesta importa y el volumen es mucho menor.

Todo lo que genera pasa por aquí para que la clave, el modelo, el caché de
prompt y el manejo de errores estén en un solo sitio.

El caché de prompt importa mucho aquí: el system prompt de evaluaciones ronda
los 1.900 tokens y se reenvía idéntico en cada generación. Cacheado cuesta ~1/10.
Se marca siempre para cachear: por debajo del mínimo (~1.024 tokens) la API lo
ignora en silencio, así que no hace falta adivinar el largo desde el código.
"""

import logging
import os
from typing import Optional

import anthropic
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# Modelo de generación. Se deja configurable porque el costo por millón de
# tokens cambia bastante entre familias y el presupuesto del piloto es acotado.
MODELO_GENERACION = os.getenv("CLAUDE_GEN_MODEL", "claude-sonnet-5")

# Modelo de ingesta. Necesita visión: lee páginas de PDF renderizadas a imagen.
MODELO_INGESTA = os.getenv("OPENAI_INGEST_MODEL", "gpt-4.1-mini")

_cliente: Optional[anthropic.Anthropic] = None
_cliente_ingesta: Optional[OpenAI] = None


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

    _cliente = anthropic.Anthropic(api_key=api_key)
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


# ---------------------------------------------------------------------------
# Ingesta (OpenAI)
# ---------------------------------------------------------------------------

def get_openai() -> Optional[OpenAI]:
    """Cliente de OpenAI para la ingesta, o None si no hay clave."""
    global _cliente_ingesta
    if _cliente_ingesta is not None:
        return _cliente_ingesta

    api_key = os.getenv("OPEN_AI_INGEST_API_KEY")
    if not api_key:
        logger.error("OPEN_AI_INGEST_API_KEY no configurada: la ingesta queda deshabilitada.")
        return None

    _cliente_ingesta = OpenAI(api_key=api_key)
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
