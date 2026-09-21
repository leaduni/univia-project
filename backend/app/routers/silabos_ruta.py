"""Ruta de Aprendizaje no vacía: sílabos, unidades de usuario y ruta IA provisional.

Tres vías para que un curso sin ruta oficial deje de mostrarse vacío:

1. POST /api/cursos/{id}/silabo-upload — el alumno sube el PDF/imagen de su
   sílabo. Se persiste en `solicitudes_silabos` (estado 'en_procesamiento') y
   se notifica a los devs (Discord -> SMTP, best-effort).
2. POST /api/cursos/{id}/unidades-usuario — el alumno crea sus propias unidades
   y temas a mano (origen='usuario', perfil_id=auth.uid()).
3. POST /api/cursos/{id}/generar-ruta-provisional — con solo el nombre del
   curso, la cascada LLM gratuita (Gemini -> Groq -> OpenAI) arma una ruta
   provisional (origen='ia_provisional') persistida y asociada al perfil.
"""

import asyncio
import json
import logging
import os
import re
from typing import Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile
from pydantic import BaseModel, Field, field_validator

from app.core.auth_utils import get_current_user
from app.core.database import get_admin_client, get_supabase
from app.core.llm import generar
from app.core.notificaciones_dev import despachar_notificacion_dev
from app.core.rate_limit import limiter

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/cursos", tags=["silabos-ruta"])

BUCKET_SILABOS = os.getenv("SUPABASE_STORAGE_BUCKET_SILABOS", "silabos-pendientes")

MIMES_ADMITIDOS = {
    "application/pdf": ".pdf",
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}
MAX_SILABO_BYTES = 10 * 1024 * 1024

MAX_UNIDADES_POR_REQUEST = 12
MAX_TITULO_CARACTERES = 120
MAX_DESCRIPCION_CARACTERES = 200
MAX_TEMAS_POR_UNIDAD = 12
MAX_CARACTERES_TEMA = 80


def _run(fn):
    """Ejecuta una llamada bloqueante de Supabase en un hilo aparte."""
    return asyncio.to_thread(fn)

# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class UnidadUsuario(BaseModel):
    titulo: str
    descripcion: Optional[str] = None
    duracion: Optional[str] = None
    topics: list[str] = []

    @field_validator("titulo")
    @classmethod
    def validar_titulo(cls, v: str) -> str:
        texto = " ".join((v or "").split())
        if not texto:
            raise ValueError("Escribe un título para la unidad.")
        if len(texto) > MAX_TITULO_CARACTERES:
            raise ValueError(
                f"El título no puede superar los {MAX_TITULO_CARACTERES} caracteres."
            )
        return texto

    @field_validator("descripcion")
    @classmethod
    def validar_descripcion(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        texto = " ".join(v.split())
        if len(texto) > MAX_DESCRIPCION_CARACTERES:
            raise ValueError(
                f"La descripción no puede superar los {MAX_DESCRIPCION_CARACTERES} caracteres."
            )
        return texto or None

    @field_validator("topics")
    @classmethod
    def validar_topics(cls, v: list[str]) -> list[str]:
        limpios = [" ".join(t.split()) for t in (v or []) if " ".join(t.split())]
        if len(limpios) > MAX_TEMAS_POR_UNIDAD:
            raise ValueError(
                f"Una unidad admite hasta {MAX_TEMAS_POR_UNIDAD} temas."
            )
        for tema in limpios:
            if len(tema) > MAX_CARACTERES_TEMA:
                raise ValueError(
                    f"Un tema no puede superar los {MAX_CARACTERES_TEMA} caracteres."
                )
        return limpios


class CrearUnidadesRequest(BaseModel):
    unidades: list[UnidadUsuario] = Field(min_length=1, max_length=MAX_UNIDADES_POR_REQUEST)


class UnidadesIAResponse(BaseModel):
    unidades: list[dict]

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _extraer_json(texto: str) -> dict:
    """Saca el objeto JSON de la respuesta del modelo (tolera vallas ```json)."""
    limpio = texto.strip()
    limpio = re.sub(r"^```(?:json)?\s*", "", limpio)
    limpio = re.sub(r"\s*```$", "", limpio)
    try:
        return json.loads(limpio)
    except json.JSONDecodeError:
        inicio = limpio.find("{")
        fin = limpio.rfind("}")
        if inicio == -1 or fin == -1 or fin <= inicio:
            raise
        return json.loads(limpio[inicio : fin + 1])


async def _tiene_ruta_oficial(supabase, curso_id: int) -> bool:
    """¿El curso ya tiene ruta oficial (global)? En ese caso las vías personales
    se cierran: la oficial manda."""
    resp = await _run(
        lambda: (
            supabase.table("learning_path_steps")
            .select("id")
            .eq("curso_id", curso_id)
            .eq("origen", "oficial")
            .limit(1)
            .execute()
        )
    )
    return bool(resp and resp.data)


async def _tiene_unidades_personales(supabase, perfil_id: str, curso_id: int) -> bool:
    resp = await _run(
        lambda: (
            supabase.table("learning_path_steps")
            .select("id")
            .eq("curso_id", curso_id)
            .eq("perfil_id", perfil_id)
            .eq("estado", "activo")
            .limit(1)
            .execute()
        )
    )
    return bool(resp and resp.data)


async def _nombre_curso(supabase, curso_id: int) -> Optional[str]:
    resp = await _run(
        lambda: (
            supabase.table("cursos")
            .select("name, code")
            .eq("id", curso_id)
            .maybe_single()
            .execute()
        )
    )
    datos = getattr(resp, "data", None)
    if not datos:
        return None
    codigo = datos.get("code") or ""
    nombre = datos.get("name") or "el curso"
    return f"{codigo} - {nombre}" if codigo else nombre

# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/{curso_id}/silabo-upload", status_code=201)
@limiter.limit("5/hour")
async def subir_silabo(
    request: Request,
    curso_id: int,
    archivo: UploadFile = File(...),
    user_data=Depends(get_current_user),
):
    """Sube el sílabo del curso en PDF/imagen y notifica a los devs.

    La escritura de Storage se hace con el cliente admin (service_role); la
    fila en `solicitudes_silabos` se inserta con el token del alumno (la RLS
    exige perfil_id = auth.uid()). El estado queda 'en_procesamiento' y la
    notificación a devs corre en segundo plano (best-effort).
    """
    user, token = user_data

    from app.routers.cursos import _verificar_acceso_curso

    supabase = get_supabase(token)
    await _run(lambda: _verificar_acceso_curso(supabase, user, curso_id))

    if await _tiene_ruta_oficial(supabase, curso_id):
        raise HTTPException(
            status_code=409,
            detail="Este curso ya tiene una ruta oficial procesada.",
        )

    mime = (archivo.content_type or "").lower()
    if mime not in MIMES_ADMITIDOS:
        raise HTTPException(
            status_code=400,
            detail="Tipo de archivo no admitido. Usa PDF o imágenes (PNG, JPG, WEBP).",
        )

    contenido = await archivo.read()
    if not contenido:
        raise HTTPException(status_code=400, detail="El archivo está vacío.")
    if len(contenido) > MAX_SILABO_BYTES:
        raise HTTPException(
            status_code=400, detail="El archivo supera los 10 MB."
        )

    nombre_original = archivo.filename or f"silabo{MIMES_ADMITIDOS[mime]}"
    path = f"{curso_id}/{user.id}/{uuid4().hex}{MIMES_ADMITIDOS[mime]}"

    admin = get_admin_client()
    try:
        await _run(
            lambda: admin.storage.from_(BUCKET_SILABOS).upload(
                path, contenido, {"content-type": mime}
            )
        )
    except Exception as e:
        logger.error("[SILABOS] Error subiendo el sílabo a Storage: %s", e)
        raise HTTPException(
            status_code=500, detail="No se pudo guardar el archivo del sílabo."
        )

    fila = {
        "curso_id": curso_id,
        "perfil_id": str(user.id),
        "archivo_path": path,
        "nombre_original": nombre_original,
        "tipo_mime": mime,
        "size_bytes": len(contenido),
        "estado": "en_procesamiento",
    }

    try:
        resp = await _run(
            lambda: (
                supabase.table("solicitudes_silabos")
                .insert(fila)
                .select("*")
                .execute()
            )
        )
        creado = getattr(resp, "data", None) or []
        if not creado:
            raise ValueError("Insert sin fila devuelta")
        solicitud = creado[0]
    except Exception as e:
        logger.error("[SILABOS] Error registrando solicitud de %s: %s", user.id, e)
        await _run(lambda: admin.storage.from_(BUCKET_SILABOS).remove([path]))
        raise HTTPException(
            status_code=500, detail="No se pudo registrar la solicitud del sílabo."
        )

    try:
        url_resp = await _run(
            lambda: admin.storage.from_(BUCKET_SILABOS).create_signed_url(path, 3600)
        )
        url_silabo = (url_resp or {}).get("signedURL")
    except Exception as e:
        logger.warning("[SILABOS] No se pudo firmar la URL del sílabo: %s", e)
        url_silabo = None

    nombre_curso = await _nombre_curso(supabase, curso_id) or f"curso {curso_id}"
    detalle = (
        f"Un alumno subió el sílabo del curso **{nombre_curso}**.\n"
        f"Archivo: {nombre_original} ({len(contenido) / 1024 / 1024:.1f} MB)\n"
        f"Solicitud: `{solicitud['id']}`"
        + (f"\nDescarga: {url_silabo}" if url_silabo else "")
    )
    asyncio.create_task(
        despachar_notificacion_dev(
            asunto="📄 Nuevo sílabo pendiente de procesar",
            detalle=detalle,
            campos=[
                {"name": "Curso", "value": nombre_curso[:100], "inline": True},
                {"name": "Estado", "value": "en_procesamiento", "inline": True},
                {"name": "Estudiante", "value": getattr(user, "email", "—"), "inline": True},
            ],
            color=16750592,
        )
    )

    return {
        "solicitud_id": solicitud["id"],
        "estado": solicitud["estado"],
        "mensaje": "Sílabo enviado. Estará listo en menos de 24h.",
    }

@router.post("/{curso_id}/unidades-usuario", status_code=201)
async def crear_unidades_usuario(
    curso_id: int,
    data: CrearUnidadesRequest,
    user_data=Depends(get_current_user),
):
    """Crea las unidades y temas que el alumno arma a mano (origen='usuario').

    Solo válido mientras el curso no tenga ruta oficial. El order_index se
    calcula server-side (max + 1..n) para no confiar en el cliente.
    """
    user, token = user_data
    supabase = get_supabase(token)

    from app.routers.cursos import _verificar_acceso_curso

    await _run(lambda: _verificar_acceso_curso(supabase, user, curso_id))

    if await _tiene_ruta_oficial(supabase, curso_id):
        raise HTTPException(
            status_code=409,
            detail="Este curso ya tiene una ruta oficial procesada.",
        )
    if await _tiene_unidades_personales(supabase, str(user.id), curso_id):
        raise HTTPException(
            status_code=409,
            detail="Ya tienes unidades creadas para este curso.",
        )

    resp = await _run(
        lambda: (
            supabase.table("learning_path_steps")
            .select("order_index")
            .eq("curso_id", curso_id)
            .order("order_index", desc=True)
            .limit(1)
            .execute()
        )
    )
    siguiente = (resp.data[0]["order_index"] + 1) if (resp and resp.data) else 1

    filas = [
        {
            "curso_id": curso_id,
            "perfil_id": str(user.id),
            "origen": "usuario",
            "estado": "activo",
            "title": unidad.titulo,
            "description": unidad.descripcion,
            "duration": unidad.duracion,
            "topics": unidad.topics,
            "icon": "book-open",
            "order_index": siguiente + i,
        }
        for i, unidad in enumerate(data.unidades)
    ]

    try:
        resp = await _run(
            lambda: (
                supabase.table("learning_path_steps")
                .insert(filas)
                .select("*")
                .execute()
            )
        )
        creadas = getattr(resp, "data", None) or []
    except Exception as e:
        logger.error("[SILABOS] Error creando unidades de %s: %s", user.id, e)
        raise HTTPException(status_code=500, detail="No se pudieron crear las unidades.")

    return {
        "creadas": len(creadas),
        "unidades": creadas,
        "mensaje": f"{len(creadas)} unidades creadas correctamente.",
    }

@router.post("/{curso_id}/generar-ruta-provisional", status_code=201)
async def generar_ruta_provisional(
    curso_id: int,
    user_data=Depends(get_current_user),
):
    """Genera una ruta provisional con la cascada LLM gratuita y la persiste."""
    user, token = user_data
    supabase = get_supabase(token)

    from app.routers.cursos import _verificar_acceso_curso

    await _run(lambda: _verificar_acceso_curso(supabase, user, curso_id))

    if await _tiene_ruta_oficial(supabase, curso_id):
        raise HTTPException(
            status_code=409,
            detail="Este curso ya tiene una ruta oficial procesada.",
        )
    if await _tiene_unidades_personales(supabase, str(user.id), curso_id):
        raise HTTPException(
            status_code=409,
            detail="Ya tienes una ruta (manual o provisional) para este curso.",
        )

    nombre_curso = await _nombre_curso(supabase, curso_id)
    if not nombre_curso:
        raise HTTPException(status_code=404, detail="Curso no encontrado")

    try:
        texto = await asyncio.wait_for(
            asyncio.to_thread(
                generar,
                prompt=(
                    f"Genera una ruta de aprendizaje para el curso universitario "
                    f"'{nombre_curso}' de una carrera de ingeniería. No tienes el "
                    f"sílabo oficial: construye unidades razonables basadas en el "
                    f"temario estándar de la materia."
                ),
                system=(
                    "Eres un diseñador instruccional. Devuelve UNICAMENTE un objeto "
                    'JSON válido, sin markdown: {"unidades": [{"title": "...", '
                    '"description": "...", "duration": "4h", '
                    '"topics": ["...", "..."], "icon": "..."}]}\n'
                    'REGLAS:\n'
                    '1. title con numeración propia: "Unidad 1: <tema>".\n'
                    "2. description: frase corta (máx. 120 caracteres) sin punto final.\n"
                    "3. topics: entre 2 y 6 temas concretos del temario.\n"
                    "4. duration en horas ('4h').\n"
                    "5. icon EXACTAMENTE de: book, code, calculator, file-text, "
                    "target, brain, database, network, atom, sigma, lightbulb, "
                    "chart-line, box, layers, terminal, globe.\n"
                    "6. Entre 5 y 7 unidades. Si no puedes determinar un temario "
                    "razonable, devuelve una lista vacía."
                ),
                max_tokens=2500,
                json_mode=True,
            ),
            # Si la cascada LLM se cuelga, limpiamos la petición a los 90s con
            # un 502 en vez de dejar el request abierto indefinidamente.
            timeout=90.0,
        )
        datos = _extraer_json(texto)
        unidades = UnidadesIAResponse.model_validate(datos).unidades
    except asyncio.TimeoutError:
        logger.error("[SILABOS] Timeout de 90s en la cascada LLM para el curso %s", curso_id)
        raise HTTPException(
            status_code=502,
            detail="La IA tardó demasiado en responder. Inténtalo de nuevo en unos minutos.",
        )
    except Exception as e:
        logger.error("[SILABOS] Error generando ruta provisional de %s: %s", user.id, e)
        raise HTTPException(
            status_code=502,
            detail="No se pudo generar la ruta con IA en este momento. Inténtalo en unos minutos.",
        )

    # Descarta unidades malformadas (sin título) antes de persistir.
    unidades = [
        u for u in unidades
        if isinstance(u, dict) and (u.get("title") or "").strip()
    ]
    if not unidades:
        raise HTTPException(
            status_code=422,
            detail="La IA no pudo proponer un temario para este curso.",
        )

    resp = await _run(
        lambda: (
            supabase.table("learning_path_steps")
            .select("order_index")
            .eq("curso_id", curso_id)
            .order("order_index", desc=True)
            .limit(1)
            .execute()
        )
    )
    siguiente = (resp.data[0]["order_index"] + 1) if (resp and resp.data) else 1

    filas = [
        {
            "curso_id": curso_id,
            "perfil_id": str(user.id),
            "origen": "ia_provisional",
            "estado": "activo",
            "title": u["title"].strip(),
            "description": u.get("description"),
            "duration": u.get("duration"),
            "topics": u.get("topics") or [],
            "icon": u.get("icon") or "book-open",
            "order_index": siguiente + i,
        }
        for i, u in enumerate(unidades)
    ]

    try:
        resp = await _run(
            lambda: (
                supabase.table("learning_path_steps")
                .insert(filas)
                .select("*")
                .execute()
            )
        )
        creadas = getattr(resp, "data", None) or []
    except Exception as e:
        logger.error("[SILABOS] Error persistiendo ruta IA de %s: %s", user.id, e)
        raise HTTPException(
            status_code=500, detail="La IA generó la ruta, pero no se pudo guardar."
        )

    return {
        "creadas": len(creadas),
        "unidades": creadas,
        "origen": "ia_provisional",
        "mensaje": "Ruta provisional generada. Se reemplazará cuando llegue el sílabo oficial.",
    }
