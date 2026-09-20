"""Cliente único de generación de texto en UniVia, multi-proveedor.

Separación de proveedores del proyecto (estado actual, todo pagado con la
misma cuenta de OpenAI salvo lo señalado):

    OCR DE VISION (páginas escaneadas/con imágenes) -> Gemini, GEMINI_VISION_API_KEY
                                                         (fallback: OpenAI, OPEN_AI_INGEST_API_KEY)
    EMBEDDINGS (ingesta Y consulta, mismo proveedor  -> OpenAI, OPEN_AI_INGEST_API_KEY
    siempre — ver EMBEDDINGS_PROVIDER en el .env)       (ver app/rag/embedder.py)
    ETIQUETADO DE TEXTO (ingesta)                    -> OpenAI, OPEN_AI_INGEST_API_KEY
    GENERACIÓN DE EVALUACIONES                       -> cascada LLM_PROVIDER=gemini ->
                                                       LLM_FALLBACKS (groq, luego openai
                                                       pagado como último recurso)
    CHATBOT FLOTANTE                                 -> Groq, pool GROQ_API_KEY(_1.._3)
                                                       con cascada de respaldo

Cascada de generación (gratuita primero, pago al final):
    Gemini 2.0 Flash (pool GEMINI_API_KEY[_1..3])
      -> Groq llama-3.3-70b-versatile (pool GROQ_API_KEY[_1..3])
        -> OpenAI GPT (último recurso pagado)
Cada proveedor gratuito rota sus claves ante 429 vía MultiKeyPool antes de
ceder el paso al siguiente eslabón de la cascada.

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
import re
from dataclasses import dataclass
from typing import Any, Callable, Optional

from openai import OpenAI, RateLimitError
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# La clave BYOK del usuario jamás debe aparecer en los logs. Algunos SDK de
# proveedores incrustan la URL de la petición (con ?key=AIza...) en el texto
# de sus excepciones, así que cada mensaje que derive de una excepción de un
# proveedor se pasa por este filtro antes de loguearse.
_PATRON_CLAVE_URL = re.compile(r"key=[^&\s\"']+")


def _redactar_claves(texto: str) -> str:
    """Sustituye cualquier `key=...` de un mensaje de error por `key=***`."""
    return _PATRON_CLAVE_URL.sub("key=***", texto)

# --- Generación multi-proveedor ---------------------------------------------
# LLM_PROVIDER elige el proveedor principal; LLM_FALLBACKS es la lista de
# respaldos (separada por comas) que se prueba en orden si el principal
# responde 429 (cuota/tasa) o falla por conexión (5xx). Valores válidos:
# openai, groq, gemini. LLM_FALLBACK (singular) se mantiene como compatibilidad
# hacia atrás para despliegues viejos que aún la tengan.
#
# Cascada por defecto (gratuita primero, pagado al final):
#   gemini (Gemini 2.0 Flash, pool de claves gratuitas)
#     -> groq (llama-3.3-70b-versatile, pool de claves gratuitas)
#       -> openai (GPT, último recurso pagado)
LLM_PROVIDER = os.getenv("LLM_PROVIDER", "gemini")
LLM_FALLBACK = os.getenv("LLM_FALLBACK")
LLM_FALLBACKS = [
    p.strip().lower()
    for p in (
        os.getenv("LLM_FALLBACKS") or LLM_FALLBACK or "groq,openai"
    ).split(",")
    if p.strip()
]

# Modelos de generación por proveedor. Se dejan configurables porque el costo
# por millón de tokens cambia bastante entre familias y el presupuesto del
# piloto es acotado.
MODELO_GENERACION = os.getenv("OPENAI_GEN_MODEL", "gpt-4o-mini")
MODELO_GROQ = os.getenv("GROQ_GEN_MODEL", "llama-3.3-70b-versatile")
MODELO_GEMINI = os.getenv("GEMINI_GEN_MODEL", "gemini-3.6-flash")

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
MODELO_CHATBOT = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

_cliente: Optional[OpenAI] = None
_cliente_ingesta: Optional[OpenAI] = None
_cliente_gemini = None
_cliente_chatbot: Optional[OpenAI] = None


# ---------------------------------------------------------------------------
# Pool de claves por proveedor (rotación ante 429)
# ---------------------------------------------------------------------------

class _EntradaPool:
    """Una clave del pool, con su cliente construido perezosamente y cooldown."""
    def __init__(self, clave: str, construir: Callable[[str], Any]):
        self.clave = clave
        self._construir = construir
        self._cliente: Any = None
        self.cooldown_hasta: float = 0.0

    @property
    def cliente(self) -> Any:
        if self._cliente is None:
            self._cliente = self._construir(self.clave)
        return self._cliente


def _recolectar_claves(variable: str, maximo: int = 3) -> list:
    """Lee la clave base (sin sufijo) + VARIABLE_1..N del .env, sin duplicados."""
    claves: list = []
    base = os.getenv(variable)
    if base:
        claves.append(base)
    for i in range(1, maximo + 1):
        clave = os.getenv(f"{variable}_{i}")
        if clave and clave not in claves:
            claves.append(clave)
    return claves


class MultiKeyPool:
    """Pool de claves de un mismo proveedor, con rotación round-robin.

    Cada clave está envuelta en una _EntradaPool con cooldown individual: ante
    un 429 el proveedor deja fuera esa clave por `cooldown_segundos` y el
    resto sigue respondiendo. Es la mitigación de los límites de tasa del
    free tier ante picos de tráfico — multiplicar claves multiplica cuota.
    """

    def __init__(self, variable: str, construir: Callable[[str], Any], cooldown_segundos: float = 60.0):
        self.variable = variable
        self._entradas = [
            _EntradaPool(clave, construir) for clave in _recolectar_claves(variable)
        ]
        self._indice = 0
        self.cooldown_segundos = cooldown_segundos
        if self._entradas:
            logger.info("Pool %s listo con %d clave(s).", variable, len(self._entradas))

    @property
    def tiene_claves(self) -> bool:
        return bool(self._entradas)

    def siguiente(self) -> Optional[_EntradaPool]:
        """Devuelve la próxima entrada fuera de cooldown, o None si no hay."""
        import time
        ahora = time.monotonic()
        n = len(self._entradas)
        for salto in range(n):
            entrada = self._entradas[(self._indice + salto) % n]
            if entrada.cooldown_hasta <= ahora:
                self._indice = (self._indice + salto + 1) % n
                return entrada
        return None

    def castigar(self, entrada: _EntradaPool) -> None:
        """Saca de rotación la clave durante `cooldown_segundos` (429/5xx)."""
        import time
        entrada.cooldown_hasta = time.monotonic() + self.cooldown_segundos
        logger.warning(
            "Pool %s: clave #%d en cooldown %.0fs por rate limit.",
            self.variable,
            self._entradas.index(entrada) + 1,
            self.cooldown_segundos,
        )


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
    try:
        return respuesta.text or ""
    except ValueError:
        # Sin texto utilizable (p. ej. respuesta cortada por max_tokens o
        # bloqueada): se devuelve vacío en lugar de reventar, igual que los
        # otros proveedores.
        logger.warning("Gemini respondió sin texto utilizable (finish_reason anómalo).")
        return ""


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


# Pool compartido Groq: se usa tanto en generar() como en el chatbot, para que
# el cooldown de una clave se respete en todos los puntos del backend.
GROQ_BASE_URL = "https://api.groq.com/openai/v1"
_pool_groq: Optional[MultiKeyPool] = None
_pool_gemini: Optional[MultiKeyPool] = None


def _pool_groq_() -> Optional[MultiKeyPool]:
    """Pool de Groq. Usa el SDK de OpenAI (API compatible), sin dependencia extra."""
    global _pool_groq
    if _pool_groq is None:
        def _construir(clave: str):
            return OpenAI(api_key=clave, base_url=GROQ_BASE_URL, timeout=90.0, max_retries=1)

        _pool_groq = MultiKeyPool("GROQ_API_KEY", _construir)
        if not _pool_groq.tiene_claves:
            logger.error("Ninguna GROQ_API_KEY[_N] configurada: Groq queda deshabilitado.")
    return _pool_groq


def _pool_gemini_() -> Optional[MultiKeyPool]:
    global _pool_gemini
    if _pool_gemini is None:
        try:
            import google.generativeai as genai
        except ImportError:
            logger.error("Paquete 'google-generativeai' no instalado: Gemini queda deshabilitado.")
            return None

        def _construir(clave: str):
            genai.configure(api_key=clave)
            return genai.GenerativeModel(model_name=MODELO_GEMINI)

        _pool_gemini = MultiKeyPool("GEMINI_API_KEY", _construir)
        if not _pool_gemini.tiene_claves:
            logger.error("Ninguna GEMINI_API_KEY[_N] configurada: Gemini queda deshabilitado.")
    return _pool_gemini


class ProveedorPoolExhausted(RuntimeError):
    """Todas las claves del pool están agotadas/inutilizables ahora mismo."""


def _generar_con_pool(
    pool: MultiKeyPool,
    llamar: Callable,
    mensajes: list,
    max_tokens: int,
    modelo: str,
    stream: bool,
    json_mode: bool,
) -> str:
    """Ejecuta la llamada rotando claves dentro del pool ante 429/5xx.

    Prueba cada clave disponible una vez; las que responden con error
    reintentable quedan en cooldown. Si ninguna responde, lanza
    ProveedorPoolExhausted para que la cascada salte al siguiente proveedor.
    """
    errores: list = []
    for _ in range(len(pool._entradas)):
        entrada = pool.siguiente()
        if entrada is None:
            break
        try:
            return llamar(
                entrada.cliente,
                modelo=modelo,
                mensajes=mensajes,
                max_tokens=max_tokens,
                stream=stream,
                json_mode=json_mode,
            )
        except Exception as e:
            errores.append(e)
            if _es_error_reintentable(e):
                pool.castigar(entrada)
                continue
            raise
    raise ProveedorPoolExhausted(
        f"Pool {pool.variable} agotado ({len(errores)} clave(s) fallaron): {errores[-1] if errores else 'sin claves'}"
    )


def _proveedor_groq() -> Optional[ProveedorLLM]:
    """Proveedor Groq respaldado por su pool de claves."""
    pool = _pool_groq_()
    if pool is None or not pool.tiene_claves:
        return None
    return ProveedorLLM(
        nombre="groq",
        modelo=MODELO_GROQ,
        cliente=pool,
        llamar=_llamar_groq,
    )


def _proveedor_gemini() -> Optional[ProveedorLLM]:
    """Proveedor Gemini respaldado por su pool de claves."""
    pool = _pool_gemini_()
    if pool is None or not pool.tiene_claves:
        return None
    return ProveedorLLM(
        nombre="gemini",
        modelo=MODELO_GEMINI,
        cliente=pool,
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
    """Ejecuta una llamada a través del contrato ProveedorLLM.

    Si el proveedor está respaldado por un MultiKeyPool, la llamada rota
    claves ante 429/5xx antes de rendirse (ProveedorPoolExhausted).
    """
    if isinstance(proveedor.cliente, MultiKeyPool):
        return _generar_con_pool(
            proveedor.cliente,
            proveedor.llamar,
            mensajes,
            max_tokens,
            modelo or proveedor.modelo,
            stream,
            json_mode,
        )
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
    del servidor (5xx), la llamada se reintenta automáticamente con cada
    proveedor de LLM_FALLBACKS, en orden, sin intervención del llamador.

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

    # Cadena de proveedores: principal primero, después los fallbacks en
    # orden, sin repetir el nombre del principal.
    cadena = [LLM_PROVIDER] + [p for p in LLM_FALLBACKS if p != LLM_PROVIDER.lower()]

    error_principal: Optional[Exception] = None
    for i, nombre in enumerate(cadena):
        if i == 0:
            proveedor_actual = proveedor
        else:
            if not error_principal or not _es_error_reintentable(error_principal):
                # El último fallo no justifica fallback (400, auth, etc.):
                # propagarlo preserva el comportamiento anterior.
                raise error_principal  # type: ignore[misc]
            proveedor_actual = _proveedor(nombre)
            if proveedor_actual is None:
                logger.error("Fallback '%s' no disponible; se omite.", nombre)
                continue
            logger.warning(
                "Llamada a '%s' falló (%s: %s). Reintentando con '%s'.",
                cadena[i - 1],
                type(error_principal).__name__,
                error_principal,
                nombre,
            )
        try:
            return _ejecutar_llamada(
                proveedor_actual,
                mensajes,
                max_tokens,
                modelo if i == 0 else None,
                stream,
                json_mode,
            )
        except Exception as e:
            error_principal = e

    raise RuntimeError(
        f"Fallaron todos los proveedores de la cascada {cadena}. "
        f"Último error: {error_principal}"
    ) from error_principal


class LLMSaldoAgotado(RuntimeError):
    """El proveedor rechazó la llamada por saldo/cuota agotado (429)."""


def _es_error_saldo_agotado(error: Exception) -> bool:
    """True si la excepción corresponde a cuota/saldo agotado de la API."""
    if isinstance(error, RateLimitError):
        texto = str(error).lower()
        return "insufficient_quota" in texto or "credit_balance" in texto or "insufficient credit" in texto
    return False


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

    try:
        respuesta: Any = cliente.chat.completions.create(**kwargs)
    except Exception as e:
        if _es_error_saldo_agotado(e):
            raise LLMSaldoAgotado("Saldo agotado en la clave de OpenAI.") from e
        raise

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

def get_groq() -> Optional[OpenAI]:
    """Cliente del chatbot, o None si no hay ninguna clave configurada.

    Devuelve el cliente de la próxima entrada disponible del pool de Groq
    (rotación round-robin, cooldown ante 429). La rotación real entre claves
    dentro de una misma conversación la hace chatear().
    """
    pool = _pool_groq_()
    if pool is None or not pool.tiene_claves:
        return None
    entrada = pool.siguiente()
    if entrada is None:
        logger.error("Pool de Groq agotado (todas las claves en cooldown).")
        return None
    return entrada.cliente


@dataclass
class _DeltaGemini:
    """Fragmento de texto de un chunk de Gemini, con la forma del SDK de OpenAI."""
    content: str


@dataclass
class _ChoiceGemini:
    delta: _DeltaGemini


@dataclass
class _ChunkGemini:
    """Chunk de stream de Gemini adaptado a chunk.choices[0].delta.content."""
    choices: list


def chatear_gemini_con_clave(
    api_key: str,
    mensajes: list,
    system: Optional[str] = None,
    max_tokens: int = 1024,
    temperature: float = 0.6,
    stream: bool = False,
):
    """Llamada de chat a Gemini con la clave del usuario (BYOK).

    La clave abre su propio cupo: es el Nivel 0 de la cascada, anterior a la
    cuota compartida de UniVia. El cliente es EFÍMERO (se construye por turno y
    no se cachea) y la clave jamás se registra en logs ni se persiste.

    Args:
        api_key: clave de Gemini aportada por el usuario (header X-User-LLM-Key).
        mensajes, system, max_tokens, temperature: igual que chatear().
        stream: devuelve un iterador de _ChunkGemini (misma forma que el stream
            de Groq) para el endpoint SSE.

    Returns:
        Texto de la respuesta, o iterador de chunks si stream=True.

    Raises:
        RuntimeError: si el paquete falta o la clave es inválida.
    """
    try:
        import google.generativeai as genai
    except ImportError:
        raise RuntimeError("Paquete 'google-generativeai' no instalado para BYOK.")

    try:
        genai.configure(api_key=api_key)
        modelo = genai.GenerativeModel(model_name=MODELO_GEMINI)
    except Exception as e:
        # Sin `from e`: la excepción original puede arrastrar la clave en la URL.
        raise RuntimeError(f"Clave de Gemini inválida ({type(e).__name__}).") from None

    contenido = "\n\n".join(
        f"{m['role'].upper()}: {m['content']}" for m in mensajes
    )
    config: dict = {"max_output_tokens": max_tokens, "temperature": temperature}
    if system:
        config["system_instruction"] = system

    if stream:
        flujo = modelo.generate_content(contenido, generation_config=config, stream=True)

        def _generar():
            for fragmento in flujo:
                yield _ChunkGemini(
                    choices=[_ChoiceGemini(delta=_DeltaGemini(content=fragmento.text or ""))]
                )

        return _generar()

    respuesta = modelo.generate_content(contenido, generation_config=config)
    return respuesta.text or ""


def generar_gemini_con_clave(
    api_key: str,
    prompt: str,
    system: Optional[str] = None,
    max_tokens: int = 16000,
    json_mode: bool = False,
    modelo: Optional[str] = None,
) -> str:
    """Generación con Gemini usando la clave BYOK del usuario (Nivel 1).

    Es el espejo por-clave de `generar_gpt` para evaluaciones: mismo contrato de
    entrada (prompt + system + max_tokens + json_mode) y misma salida (texto).

    - `system` se pasa como `system_instruction` nativo de Gemini.
    - `json_mode` fuerza estructura JSON vía `response_mime_type`, para que el
      parser de evaluaciones reciba el mismo esquema que espera de OpenAI.

    Cliente efímero (por llamada), sin cachear ni loguear la clave.

    Raises:
        RuntimeError: si falta el SDK o la clave es inválida.
    """
    try:
        import google.generativeai as genai
    except ImportError:
        raise RuntimeError("Paquete 'google-generativeai' no instalado para BYOK.")

    try:
        genai.configure(api_key=api_key)
        cliente = genai.GenerativeModel(model_name=modelo or MODELO_GEMINI)
    except Exception as e:
        # Sin `from e`: la excepción original puede arrastrar la clave en la URL.
        raise RuntimeError(f"Clave de Gemini inválida ({type(e).__name__}).") from None

    config: dict = {"max_output_tokens": max_tokens}
    if json_mode:
        config["response_mime_type"] = "application/json"
    if system:
        # system_instruction se pasa en la llamada a generate_content.
        config["system_instruction"] = system

    respuesta = cliente.generate_content(prompt, generation_config=config)
    return respuesta.text or ""


def chatear(
    mensajes: list,
    system: Optional[str] = None,
    max_tokens: int = 1024,
    modelo: Optional[str] = None,
    temperature: float = 0.6,
    stream: bool = False,
    api_key: Optional[str] = None,
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
    if api_key:
        # Nivel 0 (BYOK): la clave del usuario abre su propio cupo en Gemini.
        return chatear_gemini_con_clave(
            api_key,
            mensajes,
            system=system,
            max_tokens=max_tokens,
            temperature=temperature,
            stream=stream,
        )

    pool = _pool_groq_()
    lista_mensajes: Any = ([{"role": "system", "content": system}] if system else []) + mensajes

    if pool is not None and pool.tiene_claves:
        ultimo_error: Optional[Exception] = None
        respuesta: Any = None
        for _ in range(len(pool._entradas)):
            entrada = pool.siguiente()
            if entrada is None:
                break
            try:
                respuesta = entrada.cliente.chat.completions.create(
                    model=modelo or MODELO_CHATBOT,
                    max_tokens=max_tokens,
                    temperature=temperature,
                    messages=lista_mensajes,
                    stream=stream,
                )
                break
            except Exception as e:
                ultimo_error = e
                if _es_error_reintentable(e):
                    pool.castigar(entrada)
                    continue
                raise

        if respuesta is not None:
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

        logger.warning(
            "Pool de Groq agotado (%s). El chatbot cae a la cascada de generar().",
            ultimo_error,
        )
    else:
        logger.error("Ninguna GROQ_API_KEY[_N] configurada; se intenta la cascada de generar().")

    # Fallback de emergencia: cascada Gemini -> OpenAI vía generar().
    return generar(
        prompt="\n\n".join(f"{m['role'].upper()}: {m['content']}" for m in mensajes),
        system=system,
        max_tokens=max_tokens,
        stream=stream,
    )
