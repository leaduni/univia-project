import logging
import os

from fastapi import FastAPI, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.trustedhost import TrustedHostMiddleware
from dotenv import load_dotenv

from app.core.exceptions import ErrorResponse, ErrorDetail

load_dotenv()

logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO").upper(),
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="UniVia API",
    description="Backend para la plataforma de orientación académica personalizada",
    version="2.0.0"
)

# ── TrustedHostMiddleware ────────────────────────────────────────────
# En desarrollo permite cualquier host. En producción, configuralo con
# la variable TRUSTED_HOSTS (lista separada por comas).
TRUSTED_HOSTS_DEFAULT = "*"
trusted_hosts_raw = os.getenv("TRUSTED_HOSTS", TRUSTED_HOSTS_DEFAULT)
trusted_hosts = [
    host.strip()
    for host in trusted_hosts_raw.split(",")
    if host.strip()
] if trusted_hosts_raw != "*" else ["*"]

app.add_middleware(TrustedHostMiddleware, allowed_hosts=trusted_hosts)

# ── CORS ─────────────────────────────────────────────────────────────
# Orígenes permitidos: configurables por entorno (lista separada por comas).
# Para desarrollo local Next.js (3000, 3001) y Vite (5173).
DEFAULT_ORIGINS = (
    "http://localhost:3000,http://127.0.0.1:3000,"
    "http://localhost:3001,http://127.0.0.1:3001,"
    "http://localhost:5173,http://127.0.0.1:5173"
)
origins = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", DEFAULT_ORIGINS).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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
        content=ErrorResponse(errors=[ErrorDetail(field="general", message=str(exc.detail))]).model_dump(),
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

# Importar Routers
from app.routers import malla, usuarios, onboarding, dashboard, cursos, evaluaciones, services, recursos

app.include_router(malla.router, prefix="/api", tags=["malla"])
app.include_router(usuarios.router, prefix="/api", tags=["usuarios"])
app.include_router(onboarding.router, prefix="/api", tags=["onboarding"])
app.include_router(dashboard.router, prefix="/api", tags=["dashboard"])
app.include_router(cursos.router, prefix="/api", tags=["cursos"])
app.include_router(evaluaciones.router, prefix="/api", tags=["evaluaciones"])
app.include_router(services.router, prefix="/api", tags=["services"])
app.include_router(recursos.router, prefix="/api", tags=["recursos"])
