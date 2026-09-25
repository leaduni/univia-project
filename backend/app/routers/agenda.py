"""Router del módulo Agenda (CRUD eventos, etiquetas, config, sesiones, productividad).

Sigue el patrón de dashboard.py: las llamadas a Supabase van por
`asyncio.to_thread` para no bloquear el event loop, y la autenticación
pasa por `get_current_user` que devuelve (user, token).
"""

import asyncio
import logging
from datetime import date, datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Query, UploadFile, File
from app.core.auth_utils import get_current_user
from app.core.database import get_supabase
from app.core.llm import _redactar_claves, _status_http
from app.schemas.agenda import (
    EventoCreate, EventoUpdate, EventoResponse,
    EtiquetaCreate, EtiquetaUpdate, EtiquetaResponse,
    ConfiguracionUpdate, ConfiguracionResponse,
    SesionEstudioCreate, ProductividadResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/agenda", tags=["Agenda"])


async def _run(fn):
    """Ejecuta llamada síncrona de Supabase en un hilo aparte."""
    return await asyncio.to_thread(fn)


# ── Etiquetas por defecto ──────────────────────────────────────────────

ETIQUETAS_DEFECTO = [
    {"nombre": "Clases Univ.", "color": "indigo", "is_system": True},
    {"nombre": "Evaluaciones", "color": "rose", "is_system": True},
    {"nombre": "Deporte", "color": "emerald", "is_system": False},
    {"nombre": "Bloques de Estudio", "color": "fuchsia", "is_system": True},
]


async def _asegurar_etiquetas_defecto(sb, perfil_id: str) -> None:
    """Crea las etiquetas por defecto si el usuario no tiene ninguna."""
    resp = await _run(lambda: (
        sb.table("agenda_etiquetas")
        .select("id")
        .eq("perfil_id", perfil_id)
        .limit(1)
        .execute()
    ))
    if getattr(resp, "data", None):
        return  # Ya tiene etiquetas

    for etq in ETIQUETAS_DEFECTO:
        await _run(lambda etq=etq: (
            sb.table("agenda_etiquetas")
            .insert({"perfil_id": perfil_id, **etq})
            .execute()
        ))


# ═══════════════════════════════════════════════════════════════════════
# ETIQUETAS
# ═══════════════════════════════════════════════════════════════════════

@router.get("/etiquetas")
async def listar_etiquetas(auth=Depends(get_current_user)):
    user, token = auth
    perfil_id = user.id
    sb = get_supabase(token)

    await _asegurar_etiquetas_defecto(sb, perfil_id)

    resp = await _run(lambda: (
        sb.table("agenda_etiquetas")
        .select("id, nombre, color, is_system")
        .eq("perfil_id", perfil_id)
        .order("created_at")
        .execute()
    ))
    return getattr(resp, "data", []) or []


@router.post("/etiquetas", status_code=201)
async def crear_etiqueta(body: EtiquetaCreate, auth=Depends(get_current_user)):
    user, token = auth
    sb = get_supabase(token)

    resp = await _run(lambda: (
        sb.table("agenda_etiquetas")
        .insert({
            "perfil_id": user.id,
            "nombre": body.nombre,
            "color": body.color,
            "is_system": False,
        })
        .execute()
    ))
    filas = getattr(resp, "data", None) or []
    if not filas:
        raise HTTPException(status_code=500, detail="No se pudo crear la etiqueta.")
    return filas[0]


@router.put("/etiquetas/{etiqueta_id}")
async def editar_etiqueta(etiqueta_id: int, body: EtiquetaUpdate, auth=Depends(get_current_user)):
    user, token = auth
    sb = get_supabase(token)

    cambios = {k: v for k, v in body.model_dump().items() if v is not None}
    if not cambios:
        raise HTTPException(status_code=400, detail="No hay campos para actualizar.")

    resp = await _run(lambda: (
        sb.table("agenda_etiquetas")
        .update(cambios)
        .eq("id", etiqueta_id)
        .eq("perfil_id", user.id)
        .execute()
    ))
    filas = getattr(resp, "data", None) or []
    if not filas:
        raise HTTPException(status_code=404, detail="Etiqueta no encontrada.")
    return filas[0]


@router.delete("/etiquetas/{etiqueta_id}")
async def eliminar_etiqueta(etiqueta_id: int, auth=Depends(get_current_user)):
    user, token = auth
    sb = get_supabase(token)

    resp = await _run(lambda: (
        sb.table("agenda_etiquetas")
        .delete()
        .eq("id", etiqueta_id)
        .eq("perfil_id", user.id)
        .eq("is_system", False)
        .execute()
    ))
    return {"ok": True}


# ═══════════════════════════════════════════════════════════════════════
# EVENTOS
# ═══════════════════════════════════════════════════════════════════════

@router.get("/eventos")
async def listar_eventos(
    desde: Optional[str] = Query(None, description="Fecha inicio YYYY-MM-DD"),
    hasta: Optional[str] = Query(None, description="Fecha fin YYYY-MM-DD"),
    etiqueta_id: Optional[int] = Query(None),
    auth=Depends(get_current_user),
):
    user, token = auth
    sb = get_supabase(token)

    def consultar():
        q = (
            sb.table("agenda_eventos")
            .select("*, agenda_tareas(*)")
            .eq("perfil_id", user.id)
            .order("fecha_iso")
            .order("hora_inicio")
        )
        if desde:
            q = q.gte("fecha_iso", desde)
        if hasta:
            q = q.lte("fecha_iso", hasta)
        if etiqueta_id:
            q = q.eq("etiqueta_id", etiqueta_id)
        return q.execute()

    resp = await _run(consultar)
    filas = getattr(resp, "data", None) or []

    # Convertir campos numéricos para el frontend
    for fila in filas:
        fila["hora_inicio"] = float(fila.get("hora_inicio", 0))
        fila["duracion"] = float(fila.get("duracion", 1))
        if fila.get("fecha_iso"):
            fila["fecha_iso"] = str(fila["fecha_iso"])
        if fila.get("fecha_fin_iso"):
            fila["fecha_fin_iso"] = str(fila["fecha_fin_iso"])

    return filas


@router.post("/eventos", status_code=201)
async def crear_evento(body: EventoCreate, auth=Depends(get_current_user)):
    user, token = auth
    sb = get_supabase(token)

    payload = {
        "perfil_id": user.id,
        "titulo": body.titulo,
        "subtitulo": body.subtitulo,
        "tipo": body.tipo,
        "etiqueta_id": body.etiqueta_id,
        "fecha_iso": body.fecha_iso,
        "fecha_fin_iso": body.fecha_fin_iso,
        "hora_inicio": body.hora_inicio,
        "duracion": body.duracion,
        "todo_el_dia": body.todo_el_dia,
        "recurrencia": body.recurrencia,
        "ubicacion": body.ubicacion,
        "videollamada": body.videollamada,
        "notificacion": body.notificacion,
        "descripcion": body.descripcion,
        "invitados": body.invitados,
        "is_recurring": body.is_recurring,
        "rrule": body.rrule,
    }
    # Limpiar None para que Supabase use defaults
    payload = {k: v for k, v in payload.items() if v is not None}

    resp = await _run(lambda: (
        sb.table("agenda_eventos")
        .insert(payload)
        .execute()
    ))
    filas = getattr(resp, "data", None) or []
    if not filas:
        raise HTTPException(status_code=500, detail="No se pudo crear el evento.")

    ev = filas[0]
    ev["hora_inicio"] = float(ev.get("hora_inicio", 0))
    ev["duracion"] = float(ev.get("duracion", 1))
    if ev.get("fecha_iso"):
        ev["fecha_iso"] = str(ev["fecha_iso"])
    return ev


@router.put("/eventos/{evento_id}")
@router.patch("/eventos/{evento_id}")
async def editar_evento(evento_id: int, body: EventoUpdate, auth=Depends(get_current_user)):
    user, token = auth
    sb = get_supabase(token)

    cambios = {k: v for k, v in body.model_dump().items() if v is not None}
    if not cambios:
        raise HTTPException(status_code=400, detail="No hay campos para actualizar.")

    # Si se marca como completado, anotar la fecha
    if cambios.get("completed") is True:
        cambios["completed_at"] = datetime.now(timezone.utc).isoformat()
    elif cambios.get("completed") is False:
        cambios["completed_at"] = None

    cambios["updated_at"] = datetime.now(timezone.utc).isoformat()

    resp = await _run(lambda: (
        sb.table("agenda_eventos")
        .update(cambios)
        .eq("id", evento_id)
        .eq("perfil_id", user.id)
        .execute()
    ))
    filas = getattr(resp, "data", None) or []
    if not filas:
        raise HTTPException(status_code=404, detail="Evento no encontrado.")

    ev = filas[0]
    ev["hora_inicio"] = float(ev.get("hora_inicio", 0))
    ev["duracion"] = float(ev.get("duracion", 1))
    return ev


@router.delete("/eventos/{evento_id}")
async def eliminar_evento(evento_id: int, auth=Depends(get_current_user)):
    user, token = auth
    sb = get_supabase(token)

    await _run(lambda: (
        sb.table("agenda_eventos")
        .delete()
        .eq("id", evento_id)
        .eq("perfil_id", user.id)
        .execute()
    ))
    return {"ok": True}


@router.post("/eventos/bulk", status_code=201)
async def crear_eventos_bulk(eventos: list[EventoCreate], auth=Depends(get_current_user)):
    """Crear múltiples eventos de una vez (importar matrícula)."""
    user, token = auth
    sb = get_supabase(token)

    payloads = []
    for ev in eventos:
        payload = {
            "perfil_id": user.id,
            "titulo": ev.titulo,
            "subtitulo": ev.subtitulo,
            "tipo": ev.tipo,
            "etiqueta_id": ev.etiqueta_id,
            "fecha_iso": ev.fecha_iso,
            "hora_inicio": ev.hora_inicio,
            "duracion": ev.duracion,
            "todo_el_dia": ev.todo_el_dia,
            "recurrencia": ev.recurrencia,
            "ubicacion": ev.ubicacion,
        }
        payloads.append({k: v for k, v in payload.items() if v is not None})

    if not payloads:
        raise HTTPException(status_code=400, detail="No hay eventos para crear.")

    resp = await _run(lambda: (
        sb.table("agenda_eventos")
        .insert(payloads)
        .execute()
    ))
    filas = getattr(resp, "data", None) or []
    return {"creados": len(filas)}


# ═══════════════════════════════════════════════════════════════════════
# CONFIGURACIÓN
# ═══════════════════════════════════════════════════════════════════════

@router.get("/configuracion")
async def obtener_configuracion(auth=Depends(get_current_user)):
    user, token = auth
    sb = get_supabase(token)

    resp = await _run(lambda: (
        sb.table("agenda_configuracion")
        .select("*")
        .eq("perfil_id", user.id)
        .maybe_single()
        .execute()
    ))
    fila = getattr(resp, "data", None)
    if not fila:
        # Crear config por defecto
        hoy = date.today()
        fin = hoy + timedelta(days=120)
        defaults = {
            "perfil_id": user.id,
            "sleep_start": "23:00",
            "sleep_end": "07:00",
            "semester_start": hoy.isoformat(),
            "semester_end": fin.isoformat(),
            "meta_horas_semanal": 20.0,
            "pomodoro_focus_min": 50,
            "pomodoro_break_min": 10,
        }
        await _run(lambda: (
            sb.table("agenda_configuracion")
            .insert(defaults)
            .execute()
        ))
        return ConfiguracionResponse(
            semester_start=defaults["semester_start"],
            semester_end=defaults["semester_end"],
        ).model_dump()

    # Convertir fechas
    if fila.get("semester_start"):
        fila["semester_start"] = str(fila["semester_start"])
    if fila.get("semester_end"):
        fila["semester_end"] = str(fila["semester_end"])
    fila["meta_horas_semanal"] = float(fila.get("meta_horas_semanal", 20))
    return fila


@router.put("/configuracion")
async def guardar_configuracion(body: ConfiguracionUpdate, auth=Depends(get_current_user)):
    user, token = auth
    sb = get_supabase(token)

    cambios = {k: v for k, v in body.model_dump().items() if v is not None}
    if not cambios:
        raise HTTPException(status_code=400, detail="No hay campos para actualizar.")
    cambios["updated_at"] = datetime.now(timezone.utc).isoformat()

    # Upsert: si no existe, crear; si existe, actualizar
    resp = await _run(lambda: (
        sb.table("agenda_configuracion")
        .upsert({"perfil_id": user.id, **cambios})
        .execute()
    ))
    filas = getattr(resp, "data", None) or []
    if filas:
        fila = filas[0]
        if fila.get("semester_start"):
            fila["semester_start"] = str(fila["semester_start"])
        if fila.get("semester_end"):
            fila["semester_end"] = str(fila["semester_end"])
        fila["meta_horas_semanal"] = float(fila.get("meta_horas_semanal", 20))
        return fila
    return {"ok": True}


# ═══════════════════════════════════════════════════════════════════════
# SESIONES DE ESTUDIO (Pomodoro)
# ═══════════════════════════════════════════════════════════════════════

@router.post("/sesiones", status_code=201)
async def registrar_sesion(body: SesionEstudioCreate, auth=Depends(get_current_user)):
    user, token = auth
    sb = get_supabase(token)

    payload = {
        "perfil_id": user.id,
        "evento_id": body.evento_id,
        "minutos_configurados": body.minutos_configurados,
        "minutos_reales": body.minutos_reales,
        "finalizado_temprano": body.finalizado_temprano,
        "started_at": body.started_at,
        "ended_at": body.ended_at,
    }

    resp = await _run(lambda: (
        sb.table("sesiones_estudio")
        .insert(payload)
        .execute()
    ))
    filas = getattr(resp, "data", None) or []
    if not filas:
        raise HTTPException(status_code=500, detail="No se pudo registrar la sesión.")

    # Si hay evento_id, marcar evento como completado
    if body.evento_id and not body.finalizado_temprano:
        await _run(lambda: (
            sb.table("agenda_eventos")
            .update({"completed": True, "completed_at": datetime.now(timezone.utc).isoformat()})
            .eq("id", body.evento_id)
            .eq("perfil_id", user.id)
            .execute()
        ))

    return filas[0]


@router.get("/productividad")
async def obtener_productividad(auth=Depends(get_current_user)):
    """Horas de estudio de la semana actual vs meta configurada."""
    user, token = auth
    sb = get_supabase(token)

    # Calcular lunes y domingo de la semana actual
    hoy = date.today()
    dia_semana = hoy.weekday()  # 0=lunes
    lunes = hoy - timedelta(days=dia_semana)
    domingo = lunes + timedelta(days=6)

    lunes_ts = datetime.combine(lunes, datetime.min.time()).isoformat()
    domingo_ts = datetime.combine(domingo, datetime.max.time()).isoformat()

    # Sesiones de esta semana
    resp_sesiones = await _run(lambda: (
        sb.table("sesiones_estudio")
        .select("minutos_reales")
        .eq("perfil_id", user.id)
        .gte("started_at", lunes_ts)
        .lte("started_at", domingo_ts)
        .execute()
    ))
    sesiones = getattr(resp_sesiones, "data", None) or []
    minutos_total = sum(s.get("minutos_reales", 0) for s in sesiones)
    horas = round(minutos_total / 60, 1)

    # Total de sesiones
    resp_total = await _run(lambda: (
        sb.table("sesiones_estudio")
        .select("id")
        .eq("perfil_id", user.id)
        .execute()
    ))
    total_all = len(getattr(resp_total, "data", None) or [])

    # Meta del usuario
    resp_config = await _run(lambda: (
        sb.table("agenda_configuracion")
        .select("meta_horas_semanal")
        .eq("perfil_id", user.id)
        .maybe_single()
        .execute()
    ))
    config = getattr(resp_config, "data", None)
    meta = float(config.get("meta_horas_semanal", 20)) if config else 20.0

    pct = round(min(100, (horas / meta) * 100), 1) if meta > 0 else 0

    return ProductividadResponse(
        horas_estudiadas=horas,
        meta=meta,
        porcentaje=pct,
        sesiones_semana=len(sesiones),
        total_sesiones=total_all,
    ).model_dump()


# ── Tareas de Eventos ─────────────────────────────────────────────────────

@router.post("/eventos/{evento_id}/tareas")
async def create_tarea(evento_id: int, body: dict, user_data=Depends(get_current_user)):
    user, token = user_data
    sb = get_supabase(token)
    try:
        # Validar que el evento existe y es del usuario
        ev_resp = await _run(lambda: sb.table("agenda_eventos").select("id").eq("id", evento_id).eq("perfil_id", user.id).single().execute())
        if not getattr(ev_resp, "data", None):
            raise HTTPException(status_code=404, detail="Evento no encontrado.")
            
        resp = await _run(lambda: sb.table("agenda_tareas").insert({
            "evento_id": evento_id,
            "titulo": body.get("titulo", "Nueva Tarea"),
            "is_completed": body.get("is_completed", False)
        }).execute())
        data = getattr(resp, "data", [])
        return data[0] if data else {}
    except Exception as e:
        logger.error(f"Error creando tarea: {e}")
        raise HTTPException(status_code=500, detail="Error interno al crear tarea.")

@router.patch("/tareas/{tarea_id}")
async def update_tarea(tarea_id: int, body: dict, user_data=Depends(get_current_user)):
    user, token = user_data
    sb = get_supabase(token)
    try:
        cambios = {k: v for k, v in body.items() if k in ("titulo", "is_completed")}
        if not cambios:
            return {"status": "ok"}
            
        resp = await _run(lambda: sb.table("agenda_tareas").update(cambios).eq("id", tarea_id).execute())
        data = getattr(resp, "data", [])
        return data[0] if data else {}
    except Exception as e:
        logger.error(f"Error actualizando tarea: {e}")
        raise HTTPException(status_code=500, detail="Error interno al actualizar tarea.")

# ── Radar ─────────────────────────────────────────────────────────────────

@router.get("/radar")
async def get_radar(user_data=Depends(get_current_user)):
    """Devuelve las evaluaciones o exámenes de los próximos 7 días."""
    user, token = user_data
    sb = get_supabase(token)
    try:
        hoy = datetime.now(timezone.utc).date()
        en_7_dias = hoy + timedelta(days=7)
        
        resp = await _run(lambda: sb.table("agenda_eventos")
                          .select("*")
                          .eq("perfil_id", user.id)
                          .in_("tipo", ["evaluacion", "examen", "evento"])
                          .gte("fecha_iso", hoy.isoformat())
                          .lte("fecha_iso", en_7_dias.isoformat())
                          .order("fecha_iso")
                          .execute())
        return getattr(resp, "data", [])
    except Exception as e:
        logger.error(f"Error consultando radar: {e}")
        raise HTTPException(status_code=500, detail="Error al cargar el radar.")


# ═══════════════════════════════════════════════════════════════════════
# PARSE MATRÍCULA (PDF → Gemini → Carga Horaria → Eventos)
# ═══════════════════════════════════════════════════════════════════════

def _day_code_to_weekday(day: str) -> int:
    """Convierte LU→1, MA→2, …, SA→6."""
    return {"LU": 1, "MA": 2, "MI": 3, "JU": 4, "VI": 5, "SA": 6}.get(day.upper(), 1)


def _first_date_for_day(semester_start: str, day_code: str) -> str:
    """Retorna la primera fecha YYYY-MM-DD que cae en `day_code` a partir de semester_start."""
    target = _day_code_to_weekday(day_code)
    d = date.fromisoformat(semester_start)
    current = d.isoweekday()  # 1=lunes … 7=domingo
    diff = target - current
    if diff < 0:
        diff += 7
    result = d + timedelta(days=diff)
    return result.isoformat()


def _time_to_decimal(t: str) -> float:
    """Convierte 'HH:MM:SS' o 'HH:MM' a horas decimales."""
    parts = t.split(":")
    h = int(parts[0])
    m = int(parts[1]) if len(parts) > 1 else 0
    return h + m / 60


TIPO_LABELS = {"T": "Teoría", "P": "Práctica", "LAB": "Laboratorio"}


def _valor_clave_header(x_user_llm_key) -> Optional[str]:
    """Normaliza el header `X-User-LLM-Key` a un string limpio o None.

    Vía HTTP FastAPI inyecta el valor real; al invocar la función endpoint
    directamente (patrón usado por los tests) el parámetro llega como el
    objeto `Header` sentinel, así que se extrae su `.default` para que ambos
    caminos se comporten igual.
    """
    if x_user_llm_key is None:
        return None
    if not isinstance(x_user_llm_key, str):
        default = getattr(x_user_llm_key, "default", None)
        x_user_llm_key = default if isinstance(default, str) else None
        if x_user_llm_key is None:
            return None
    clave = x_user_llm_key.strip()
    return clave or None


@router.get("/carga-horaria")
async def get_carga_horaria(
    ciclo: str = Query("2026-II", description="Ciclo académico, ej. 2026-II"),
    auth=Depends(get_current_user)
):
    """Retorna toda la carga horaria oficial del ciclo especificado."""
    user, token = auth
    sb = get_supabase(token)
    
    try:
        resp = await _run(lambda: (
            sb.table("carga_horaria")
            .select("*")
            .eq("ciclo", ciclo)
            .execute()
        ))
        data = getattr(resp, "data", [])
        return data
    except Exception as e:
        logger.error(f"Error cargando carga_horaria: {e}")
        raise HTTPException(status_code=500, detail="Error al cargar la carga horaria.")

async def _gemini_detectar_cursos(texto: str, api_key: Optional[str] = None) -> list:
    """Fallback IA: pide a Gemini los pares (course_code, section).

    `api_key` (BYOK, header X-User-LLM-Key) tiene prioridad sobre la cuota
    compartida GEMINI_API_KEY del servidor; si llega, el cupo consumido es el
    del estudiante, igual que en chat y evaluaciones.
    """
    import json
    import os

    try:
        import google.generativeai as genai
    except ImportError:
        raise HTTPException(status_code=500, detail="google-generativeai no instalado.")

    api_key = (api_key or "").strip() or os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="No hay ninguna clave de Gemini configurada (ni clave propia del estudiante).",
        )

    genai.configure(api_key=api_key)
    modelo_nombre = os.getenv("GEMINI_GEN_MODEL", "gemini-2.5-flash")
    modelo = genai.GenerativeModel(model_name=modelo_nombre)

    prompt = (
        "Analiza el siguiente texto extraído de una ficha de matrícula universitaria.\n"
        "Extrae SOLO los cursos matriculados con su código y sección.\n"
        "Responde EXCLUSIVAMENTE en formato JSON como una lista de objetos "
        'con las claves "course_code" y "section".\n'
        "No incluyas explicaciones, solo el JSON.\n\n"
        f"Texto:\n{texto[:8000]}"
    )

    try:
        resp_gemini = await asyncio.to_thread(
            lambda: modelo.generate_content(
                prompt,
                generation_config={
                    "max_output_tokens": 2048,
                    "temperature": 0.1,
                    "response_mime_type": "application/json",
                },
            )
        )
        raw = resp_gemini.text or ""
    except Exception as e:
        codigo = _status_http(e)
        logger.error("Error llamando a Gemini (HTTP %s): %s", codigo, _redactar_claves(str(e)))
        if codigo in (400, 401, 403):
            raise HTTPException(
                status_code=400,
                detail="Tu clave de Gemini no es válida. Revísala o quítala en 'Gestionar mi clave de IA' para usar la cuota compartida.",
            )
        if codigo == 429:
            raise HTTPException(status_code=429, detail="La cuota de Gemini está agotada. Intenta más tarde.")
        if codigo == 404:
            raise HTTPException(status_code=503, detail="El modelo de Gemini no está disponible. Intenta más tarde.")
        raise HTTPException(status_code=502, detail="Error al procesar con IA.")

    try:
        cursos_detectados = json.loads(raw)
        if not isinstance(cursos_detectados, list):
            raise ValueError("La respuesta no es una lista.")
    except (json.JSONDecodeError, ValueError):
        logger.error(f"Gemini devolvió JSON inválido: {raw[:500]}")
        raise HTTPException(status_code=422, detail="IA devolvió formato inválido.")

    if not cursos_detectados:
        raise HTTPException(status_code=400, detail="No se detectaron cursos en el PDF.")

    return cursos_detectados


def _payloads_desde_bloques_uni(
    perfil_id: str,
    bloques_uni: list,
    cursos_uni: dict,
    etiqueta_id: Optional[int],
    semester_start: str,
) -> list:
    """Parser local: construye payloads de agenda_eventos directo del PDF UNI,
    preservando docente, aula y tipo."""
    payloads = []
    for bloque in bloques_uni:
        code = bloque["codigo"]
        section = bloque.get("seccion") or ""
        tipo = bloque.get("tipo", "T")
        label = TIPO_LABELS.get(tipo, tipo)
        nombre = (cursos_uni.get(code) or {}).get("nombre", "") or code
        try:
            hi = _time_to_decimal(bloque["hora_inicio"])
            hf = _time_to_decimal(bloque["hora_fin"])
        except (KeyError, ValueError, IndexError):
            continue
        duracion = round(hf - hi, 2)
        if duracion <= 0:
            continue  # Guard: bloque corrupto, no insertar NaN/duración inválida
        payloads.append({
            "perfil_id": perfil_id,
            "titulo": f"{code} - {label}",
            "subtitulo": f"{nombre} | Sección {section} | Aula: {bloque.get('aula', '')} | {bloque.get('docente', '')}",
            "tipo": "evento",
            "etiqueta_id": etiqueta_id,
            "fecha_iso": _first_date_for_day(semester_start, bloque["dia"]),
            "hora_inicio": hi,
            "duracion": duracion,
            "todo_el_dia": False,
            "recurrencia": "weekly",
            "ubicacion": bloque.get("aula", ""),
        })
    return payloads


@router.get("/mis-cursos")
async def get_mis_cursos(
    ciclo: str = Query("2026-II", description="Ciclo académico, ej. 2026-II"),
    auth=Depends(get_current_user)
):
    """Carga horaria filtrada por los cursos que el alumno registró en su
    Onboarding (tabla progreso_cursos con status='in_progress').

    Devuelve el mismo formato que /carga-horaria pero solo con los bloques
    de los cursos del alumno. Si el alumno no tiene cursos registrados,
    devuelve lista vacía (el frontend decide el fallback).
    """
    user, token = auth
    sb = get_supabase(token)

    try:
        # 1. Cursos del alumno según su progreso (onboarding)
        resp_prog = await _run(lambda: (
            sb.table("progreso_cursos")
            .select("curso_id, status")
            .eq("perfil_id", user.id)
            .eq("status", "in_progress")
            .execute()
        ))
        curso_ids = [r["curso_id"] for r in (getattr(resp_prog, "data", None) or [])]
        if not curso_ids:
            return []

        # 2. Resolver códigos de esos cursos
        resp_cursos = await _run(lambda: (
            sb.table("cursos")
            .select("id, code, name")
            .in_("id", curso_ids)
            .execute()
        ))
        codigos = [c["code"] for c in (getattr(resp_cursos, "data", None) or []) if c.get("code")]
        if not codigos:
            return []

        # 3. Bloques de carga_horaria solo de esos códigos
        resp_carga = await _run(lambda: (
            sb.table("carga_horaria")
            .select("*")
            .eq("ciclo", ciclo)
            .in_("codigo", codigos)
            .execute()
        ))
        return getattr(resp_carga, "data", None) or []
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error cargando mis-cursos: {e}")
        raise HTTPException(status_code=500, detail="Error al cargar los cursos del alumno.")


@router.post("/parse-matricula")
async def parse_matricula(
    file: UploadFile = File(...),
    auth=Depends(get_current_user),
    x_user_llm_key: Optional[str] = Header(None, alias="X-User-LLM-Key"),
):
    """Recibe un PDF de matrícula y crea eventos semanales en la agenda.

    Estrategia híbrida:
    1. Parser determinista local (firma estándar de la Boleta de Matrícula UNI).
    2. Fallback a Gemini AI si el PDF no cumple la estructura esperada.

    `X-User-LLM-Key` (BYOK) tiene prioridad sobre la cuota compartida para el
    fallback IA, igual que en chat y evaluaciones. Nunca se persiste ni loguea.
    """
    from app.utils.matricula_uni_parser import parse_ficha_uni, extraer_texto

    user, token = auth
    api_key_usuario = _valor_clave_header(x_user_llm_key)
    sb = get_supabase(token)

    # ── 1. Leer bytes del PDF ─────────────────────────────────────────────
    pdf_bytes = await file.read()
    if not pdf_bytes:
        raise HTTPException(status_code=400, detail="El archivo PDF está vacío.")

    metodo = "local"
    bloques_uni: list = []
    cursos_uni: dict = {}
    pares_cursos: list[tuple[str, str]] = []
    cursos_detectados: list = []

    # ── 2a. Intentar parser determinista local ────────────────────────────
    try:
        resultado_uni = parse_ficha_uni(pdf_bytes)
    except Exception as e:
        logger.warning(f"Parser local UNI lanzó excepción (fallback a Gemini): {e}")
        resultado_uni = None

    if resultado_uni and resultado_uni.get("bloques"):
        bloques_uni = resultado_uni["bloques"]
        cursos_uni = resultado_uni.get("cursos", {})
        pares_cursos = sorted({
            (b["codigo"], b.get("seccion") or "") for b in bloques_uni
        })
        cursos_detectados = [
            {"course_code": c, "section": s} for c, s in pares_cursos
        ]
        logger.info("Matrícula parseada localmente (UNI): %d bloques, %d cursos.",
                    len(bloques_uni), len(pares_cursos))
    else:
        # ── 2b. Fallback a Gemini AI ──────────────────────────────────────
        metodo = "gemini"
        try:
            texto = extraer_texto(pdf_bytes)
        except Exception as e:
            logger.error(f"Error leyendo PDF: {e}")
            raise HTTPException(status_code=400, detail="Error al leer el PDF.")

        if not texto.strip():
            raise HTTPException(status_code=400, detail="El PDF no contiene texto extraíble.")

        cursos_detectados = await _gemini_detectar_cursos(texto, api_key_usuario)

        # Normalizar los pares (código, sección) que detectó Gemini.
        for item in cursos_detectados:
            code = (item.get("course_code") or "").strip().upper()
            section = (item.get("section") or "").strip().upper()
            if code and section:
                pares_cursos.append((code, section))

    # ── 3. Contexto del usuario (semestre + etiqueta) ─────────────────────
    # Obtener config de semestre del usuario
    resp_cfg = await _run(lambda: (
        sb.table("agenda_configuracion")
        .select("semester_start")
        .eq("perfil_id", user.id)
        .maybe_single()
        .execute()
    ))
    cfg = getattr(resp_cfg, "data", None)
    semester_start = str(cfg["semester_start"]) if cfg and cfg.get("semester_start") else date.today().isoformat()

    # Obtener la etiqueta "Clases Univ." del usuario
    await _asegurar_etiquetas_defecto(sb, user.id)
    resp_etqs = await _run(lambda: (
        sb.table("agenda_etiquetas")
        .select("id, nombre")
        .eq("perfil_id", user.id)
        .execute()
    ))
    etqs = getattr(resp_etqs, "data", []) or []
    etq_clases = next((e for e in etqs if "clases" in e["nombre"].lower()), etqs[0] if etqs else None)
    etiqueta_id = etq_clases["id"] if etq_clases else None

    if not pares_cursos:
        return {
            "eventos_creados": [],
            "cursos_detectados": cursos_detectados,
            "metodo": metodo,
            "message": f"Se crearon 0 bloques horarios para {len(cursos_detectados)} cursos.",
        }

    # ── 4. Construir payloads de eventos ──────────────────────────────────
    if metodo == "local":
        # Parser local: los bloques (día, horario, tipo, docente, aula) ya
        # vienen del propio PDF — no se depende de carga_horaria.
        payloads_eventos = _payloads_desde_bloques_uni(
            user.id, bloques_uni, cursos_uni, etiqueta_id, semester_start,
        )
    else:
        # Gemini (fallback): buscar bloques en carga_horaria.
        # Una sola consulta para todos los pares detectados (evita N+1).
        resp_bloques = await _run(lambda: (
            sb.table("carga_horaria")
            .select("*")
            .in_("codigo", sorted({p[0] for p in pares_cursos}))
            .in_("seccion", sorted({p[1] for p in pares_cursos}))
            .execute()
        ))
        bloques = getattr(resp_bloques, "data", []) or []

        # El doble `.in_` es un producto de combinaciones: conservar en memoria
        # solo los pares (código, sección) exactos solicitados.
        pares_set = set(pares_cursos)
        bloques_por_par = {}
        for bloque in bloques:
            bcode = (bloque.get("codigo") or "").strip().upper()
            bsec = (bloque.get("seccion") or "").strip().upper()
            if (bcode, bsec) in pares_set:
                bloques_por_par.setdefault((bcode, bsec), []).append(bloque)

        payloads_eventos = []
        for code, section in pares_cursos:
            for bloque in bloques_por_par.get((code, section), []):
                if not bloque.get("hora_inicio") or not bloque.get("hora_fin"):
                    continue
                try:
                    hi = _time_to_decimal(str(bloque["hora_inicio"]))
                    hf = _time_to_decimal(str(bloque["hora_fin"]))
                except (ValueError, IndexError):
                    continue
                duracion = round(hf - hi, 2)
                if duracion <= 0:
                    continue
                tipo = bloque.get("tipo_clase", "T")
                label = TIPO_LABELS.get(tipo, tipo)
                dia = bloque.get("dia", "LU")
                fecha = _first_date_for_day(semester_start, dia)

                payloads_eventos.append({
                    "perfil_id": user.id,
                    "titulo": f"{code} - {label}",
                    "subtitulo": f"{bloque.get('nombre_curso', '')} | Sección {section} | Aula: {bloque.get('aula', '')} | {bloque.get('docente', '')}",
                    "tipo": "evento",
                    "etiqueta_id": etiqueta_id,
                    "fecha_iso": fecha,
                    "hora_inicio": hi,
                    "duracion": duracion,
                    "todo_el_dia": False,
                    "recurrencia": "weekly",
                    "ubicacion": bloque.get("aula", ""),
                })

    if not payloads_eventos:
        return {
            "eventos_creados": [],
            "cursos_detectados": cursos_detectados,
            "metodo": metodo,
            "message": f"Se crearon 0 bloques horarios para {len(cursos_detectados)} cursos.",
        }

    # Inserción en lote: una sola petición HTTP en lugar de una por evento.
    try:
        resp_ins = await _run(lambda: (
            sb.table("agenda_eventos")
            .insert(payloads_eventos)
            .execute()
        ))
    except Exception as e:
        logger.error("Error creando eventos de la matrícula: %s", e)
        raise HTTPException(status_code=500, detail="No se pudieron crear los eventos de la matrícula.")

    eventos_creados = []
    for ev in getattr(resp_ins, "data", None) or []:
        ev["hora_inicio"] = float(ev.get("hora_inicio", 0))
        ev["duracion"] = float(ev.get("duracion", 1))
        if ev.get("fecha_iso"):
            ev["fecha_iso"] = str(ev["fecha_iso"])
        eventos_creados.append(ev)

    return {
        "eventos_creados": eventos_creados,
        "cursos_detectados": cursos_detectados,
        "metodo": metodo,
        "message": f"Se crearon {len(eventos_creados)} bloques horarios para {len(cursos_detectados)} cursos.",
    }
