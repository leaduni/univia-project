import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.trustedhost import TrustedHostMiddleware
from dotenv import load_dotenv

from app.core.exceptions import ErrorResponse, ErrorDetail
from app.core.rate_limit import limiter
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

load_dotenv()

logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO").upper(),
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Cierra los clientes httpx persistentes al apagar la app."""
    yield

    # Cierre defensivo: se busca el cliente por nombre en cada módulo con
    # getattr. Así un módulo que no declare su propio cliente (feedback.py no
    # define `_http_feedback`, usa el de notificaciones_dev) no tumba el
    # apagado con AttributeError, y un módulo nuevo solo necesita registrar
    # su par (modulo, atributo) aquí.
    from app.core import notificaciones_dev
    from app.routers import services

    for modulo, atributo in (
        (services, "_http"),
        (notificaciones_dev, "_http_devs"),
    ):
        cliente = getattr(modulo, atributo, None)
        if cliente is None:
            continue
        try:
            await cliente.aclose()
        except Exception as e:
            logger.warning("No se pudo cerrar %s.%s: %s", modulo.__name__, atributo, e)

    # Cerrar el pool de hilos de LLM para no dejar hilos colgados al apagar.
    try:
        from app.core.executor_llm import executor_llm
        executor_llm.shutdown(wait=False, cancel_futures=True)
    except Exception as e:
        logger.warning("No se pudo cerrar el executor de LLM: %s", e)


app = FastAPI(
    title="UniVia API",
    description="Backend para la plataforma de orientación académica personalizada",
    version="2.0.0",
    lifespan=lifespan,
)

# ── Entorno ──────────────────────────────────────────────────────────
# `APP_ENV` (o `ENV` como respaldo) distingue desarrollo de producción.
# En producción se EXIGEN CORS_ORIGINS y TRUSTED_HOSTS explícitos (fail-fast):
# no queremos arrancar sirviendo CORS de localhost ni TrustedHost="*".
APP_ENV = os.getenv("APP_ENV", os.getenv("ENV", "development")).strip().lower()
IS_PRODUCTION = APP_ENV in {"production", "prod"}

# ── TrustedHostMiddleware ────────────────────────────────────────────
if IS_PRODUCTION:
    # TRUSTED_HOSTS es el nombre vigente del despliegue; ALLOWED_HOSTS se
    # acepta como alias (convención estándar) sin romper infraestructura que
    # ya use el primero.
    trusted_hosts_raw = os.getenv("TRUSTED_HOSTS") or os.getenv("ALLOWED_HOSTS")
    if not trusted_hosts_raw or trusted_hosts_raw.strip() in {"", "*"}:
        raise RuntimeError(
            "TRUSTED_HOSTS (o su alias ALLOWED_HOSTS) es obligatorio en producción "
            "y no puede ser '*'. Ejemplo: TRUSTED_HOSTS=univia.pe,api.univia.pe"
        )
    trusted_hosts = [host.strip() for host in trusted_hosts_raw.split(",") if host.strip()]
else:
    # En desarrollo permitimos cualquier host para aceptar *.trycloudflare.com
    trusted_hosts = ["*"]

app.add_middleware(TrustedHostMiddleware, allowed_hosts=trusted_hosts)

# ── CORS ─────────────────────────────────────────────────────────────
if IS_PRODUCTION:
    cors_origins_raw = os.getenv("CORS_ORIGINS")
    if not cors_origins_raw or not cors_origins_raw.strip():
        raise RuntimeError(
            "CORS_ORIGINS es obligatorio en producción. "
            "Ejemplo: CORS_ORIGINS=https://univia.pe,https://www.univia.pe"
        )
    origins = [origin.strip() for origin in cors_origins_raw.split(",") if origin.strip()]
else:
    # En desarrollo permitimos todos los orígenes para soportar el túnel del frontend
    origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Rate limiting (SlowAPI) ──────────────────────────────────────────────
# Límite por IP en los endpoints que declaran @limiter.limit(...) (hoy, el POST
# de feedback). Adapter in-memory: suficiente para el despliegue de un solo
# worker; si se escala a varios procesos, migrar al adapter de Redis.
app.state.limiter = limiter


@app.exception_handler(RateLimitExceeded)
async def rate_limit_exception_handler(request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content=ErrorResponse(errors=[ErrorDetail(
            field="general",
            message="Demasiadas solicitudes desde esta conexión. Inténtalo en unos minutos.",
        )]).model_dump(),
    )


app.add_middleware(SlowAPIMiddleware)

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc: RequestValidationError):
    errors = []
    for error in exc.errors():
        loc = error.get("loc", [])
        field = str(loc[-1]) if len(loc) > 1 else (str(loc[0]) if loc else "unknown")
        errors.append(ErrorDetail(field=field, message=error.get("msg", "Error de validación")))
    return JSONResponse(
        status_code=422,
        content=ErrorResponse(errors=errors).model_dump(),
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc: HTTPException):
    if isinstance(exc.detail, dict) and "errors" in exc.detail:
        return JSONResponse(status_code=exc.status_code, content=exc.detail)
    return JSONResponse(
        status_code=exc.status_code,
        content=ErrorResponse(errors=[ErrorDetail(field="general", message=exc.detail)]).model_dump(),
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request, exc: Exception):
    """Último recinto: cualquier error no controlado sale como 500 estructurado.

    Sin esto Starlette devuelve texto plano y el frontend, que espera el shape
    de ErrorResponse, no puede mostrar nada útil.
    """
    logger.exception("Error no controlado en %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content=ErrorResponse(errors=[ErrorDetail(
            field="general",
            message="Ocurrió un error interno. Intenta de nuevo en unos momentos.",
        )]).model_dump(),
    )


@app.get("/")
async def root():
    return {"message": "UniVia API v2.0 - Online", "status": "healthy"}


@app.get("/api/health")
async def health():
    """Readiness real: confirma además que Supabase/PostgREST responde.

    Hace un ping ultra ligero (1 fila de un catálogo público) con la clave
    anónima y un try/except amplio: si la BD está caída o inalcanzable se
    devuelve 503 para que el orquestador (Docker, LB, uptime monitor) saque
    la instancia de rotación en vez de mandarle tráfico roto.
    """
    import asyncio

    from app.core.database import get_supabase

    try:
        await asyncio.to_thread(
            lambda: get_supabase().table("facultades").select("id").limit(1).execute()
        )
    except Exception as e:
        logger.error("[HEALTH] Supabase no responde: %s", e)
        return JSONResponse(
            status_code=503,
            content={"status": "unavailable", "detalle": "Base de datos no disponible."},
        )
    return {"status": "ok", "supabase": "ok"}

# Importar Routers
from app.routers import malla, usuarios, onboarding, dashboard, cursos, evaluaciones, services, recursos, chatbot, feedback, foro, dm, evaluaciones_calificables, notas, gamificacion, silabos_ruta, agenda, horarios, donaciones, admin_donaciones

app.include_router(malla.router, prefix="/api", tags=["malla"])
app.include_router(usuarios.router, prefix="/api", tags=["usuarios"])
app.include_router(onboarding.router, prefix="/api", tags=["onboarding"])
app.include_router(dashboard.router, prefix="/api", tags=["dashboard"])
app.include_router(cursos.router, prefix="/api", tags=["cursos"])
app.include_router(evaluaciones.router, prefix="/api", tags=["evaluaciones"])
app.include_router(evaluaciones_calificables.router, prefix="/api", tags=["evaluaciones-calificables"])
app.include_router(services.router, prefix="/api", tags=["services"])
app.include_router(recursos.router, prefix="/api", tags=["recursos"])
app.include_router(chatbot.router, prefix="/api", tags=["chatbot"])
app.include_router(feedback.router, prefix="/api", tags=["feedback"])
app.include_router(foro.router, prefix="/api", tags=["foro"])
app.include_router(dm.router, prefix="/api", tags=["dm"])
app.include_router(notas.router, prefix="/api", tags=["notas"])
app.include_router(gamificacion.router, prefix="/api", tags=["gamificacion"])
app.include_router(silabos_ruta.router, prefix="/api", tags=["silabos-ruta"])
app.include_router(agenda.router, prefix="/api", tags=["agenda"])
app.include_router(horarios.router, prefix="/api", tags=["horarios"])
app.include_router(donaciones.router, prefix="/api", tags=["donaciones"])
app.include_router(admin_donaciones.router, prefix="/api", tags=["admin-donaciones"])
