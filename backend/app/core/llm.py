"""Cliente único de generación de texto en UniVia, multi-proveedor.

Separación de proveedores del proyecto:

    INGESTA    (OCR, embeddings, etiquetado, sílabos) -> OpenAI, OPEN_AI_INGEST_API_KEY
    GENERACIÓN (evaluaciones, tutor RAG)              -> LLM_PROVIDER (default: OpenAI)

La ingesta es la parte de volumen (una llamada por página de cada PDF), así que
va por OpenAI. Para la generación, el proveedor principal se configura con
LLM_PROVIDER y, si falla por cuota/tasa (429) o error de conexión del servidor
(5xx), la llamada se reintenta automáticamente con LLM_FALLBACK (default: Gemini)
sin tocar a quien llama. Groq queda disponible como alternativa configurable.

Todo lo que genera pasa por aquí para que la clave, el modelo y el manejo de
errores estén en un solo sitio.
"""

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

# Modelo de ingesta. Necesita visión: lee páginas de PDF renderizadas a imagen.
MODELO_INGESTA = os.getenv("OPENAI_INGEST_MODEL", "gpt-4.1-mini")

_cliente: Optional[OpenAI] = None
_cliente_ingesta: Optional[OpenAI] = None
_cliente_groq = None
_cliente_gemini = None


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
