from fastapi import APIRouter, Depends, HTTPException, Request
import httpx
import os

from app.core.auth_utils import get_current_user
from app.core.rate_limit import limiter

router = APIRouter()

RAPIDAPI_KEY = os.getenv("RAPIDAPI_KEY")
JUDGE0_API_URL = "https://judge0-ce.p.rapidapi.com/submissions"

# Cliente HTTP persistente (keep-alive): reutiliza sockets entre peticiones y
# evita el handshake TCP/TLS en cada ejecución de código.
_http = httpx.AsyncClient(
    timeout=20.0,
    limits=httpx.Limits(max_keepalive_connections=20, max_connections=50),
)

@router.post("/services/execute_code")
@limiter.limit("10/minute")
async def execute_code(request: Request, payload: dict, user_data=Depends(get_current_user)):
    """Proxy a Judge0 con la clave del servidor.

    Protegido: sin auth ni rate limit, cualquiera podría gastar la cuota de
    RapidAPI ejecutando código arbitrario a costa del servidor.
    """
    if not RAPIDAPI_KEY:
        raise HTTPException(status_code=500, detail="La clave de RapidAPI no está configurada en el servidor.")

    source_code = payload.get("source_code")
    language_id = payload.get("language_id")

    if not source_code or not language_id:
        raise HTTPException(status_code=400, detail="Faltan 'source_code' o 'language_id'.")

    headers = {
        "x-rapidapi-key": RAPIDAPI_KEY,
        "x-rapidapi-host": "judge0-ce.p.rapidapi.com",
        "Content-Type": "application/json"
    }
    
    # wait=true para esperar el resultado de la ejecución
    url = f"{JUDGE0_API_URL}?wait=true"

    try:
        response = await _http.post(url, headers=headers, json={"language_id": language_id, "source_code": source_code})
        response.raise_for_status()
        return response.json()
    except httpx.HTTPStatusError as e:
        # Si Judge0 devuelve un error, lo pasamos al frontend
        error_detail = e.response.text
        raise HTTPException(status_code=e.response.status_code, detail=f"Error desde Judge0: {error_detail}")
    except httpx.RequestError as e:
        # Error de red o timeout
        raise HTTPException(status_code=500, detail=f"Error de conexión con el servicio de ejecución: {e}")

