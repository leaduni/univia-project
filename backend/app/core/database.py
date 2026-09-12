import logging
import os
import threading
from collections import OrderedDict

import httpx
from supabase import create_client, Client, ClientOptions
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

url: str = os.getenv("SUPABASE_URL")
key: str = os.getenv("SUPABASE_ANON_KEY")
service_key: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not url or not key:
    raise ValueError("SUPABASE_URL y SUPABASE_ANON_KEY deben estar configurados en el archivo .env")

if not service_key:
    raise ValueError("SUPABASE_SERVICE_ROLE_KEY debe estar configurado en el archivo .env")

_options = ClientOptions(postgrest_client_timeout=120)

# Cliente base compartido (token anónimo). Se reutiliza en todas las llamadas
# sin token, evitando el handshake TCP/TLS de create_client() por request.
supabase: Client = create_client(url, key, options=_options)

# Caché de clientes autenticados por token (LRU acotado). En lugar de instanciar
# un create_client() nuevo en cada petición (que reabre la conexión TLS y hace
# handshake), se reutiliza el mismo cliente por token. Cada token tiene su propio
# cliente para no mezclar identidades en requests concurrentes.
_MAX_CLIENTS = 64
_clientes: "OrderedDict[str, Client]" = OrderedDict()
_lock = threading.Lock()


def _cliente_con_token(token: str) -> Client:
    with _lock:
        cliente = _clientes.get(token)
        if cliente is not None:
            _clientes.move_to_end(token)
            return cliente
        cliente = create_client(url, key, options=_options)
        cliente.postgrest.auth(token)
        _clientes[token] = cliente
        if len(_clientes) > _MAX_CLIENTS:
            _clientes.popitem(last=False)
        return cliente


def get_supabase(token: str = None):
    if token:
        return _cliente_con_token(token)
    return supabase


def get_admin_client() -> Client:
    return _cliente_con_token(service_key)


def invalidar_cliente(token: str) -> None:
    """Elimina un cliente del pool LRU (conexión cerrada por idle, etc.).

    Tras un error de socket (p. ej. `ConnectionTerminated` de HTTP/2), la
    conexión reutilizable quedó muerta; al desalojar el cliente se fuerza a que
    la próxima llamada `get_supabase(token)` construya uno nuevo con un socket
    sano. No toca el token de sesión: la identidad RLS del usuario se conserva.
    """
    with _lock:
        _clientes.pop(token, None)


def _es_error_conexion(error: Exception) -> bool:
    """True si el error es un cierre de socket/conexión reintentable.

    Cubre los cierres silenciosos de HTTP/2 (`ConnectionTerminated`,
    `last_stream_id`) y las excepciones de red de httpx que SuPostgres/PostgREST
    propaga al reutilizar una conexión idle que el servidor ya cerró.
    """
    if isinstance(error, httpx.RemoteProtocolError):
        return True
    if isinstance(error, httpx.HTTPError):
        # ConnectError, ConnectTimeout, ReadError, RemoteProtocolError, ...
        return True
    if isinstance(error, httpx.TransportError):
        return True
    texto = str(error).lower()
    return any(
        parte in texto
        for parte in (
            "connectionterminated",
            "connection terminated",
            "last_stream_id",
            "remote protocol error",
            "broken pipe",
            "connection reset",
            "server disconnected",
        )
    )


def ejecutar_con_reintento(token: str, fn, reintentos: int = 1) -> object:
    """Ejecuta `fn(supabase)` reintentando 1 vez si la conexión falló por socket.

    El cierre silencioso de una conexión HTTP/2 idle (timeout por inactividad en
    Supabase) aparece como `ConnectionTerminated`; reintentar la misma instancia
    fallaría de nuevo porque el socket ya está muerto. Por eso, antes de
    reintentar, se desaloja el cliente del pool para que `get_supabase(token)`
    construya uno fresco con un socket nuevo.

    Args:
        token: token de sesión que identifica el cliente en el pool LRU.
        fn: callable que recibe el `Client` de Supabase y devuelve la respuesta.
        reintentos: reintentos adicionales tras el primer intento.
    """
    _token = token or service_key
    for intento in range(reintentos + 1):
        cliente = get_supabase(_token if token else None)
        try:
            return fn(cliente)
        except Exception as error:  # noqa: BLE001
            if intento >= reintentos or not _es_error_conexion(error):
                raise
            logger.warning(
                "Conexión de Supabase caída (%s: %s); invalidando cliente y reintentando.",
                type(error).__name__, error,
            )
            invalidar_cliente(_token)