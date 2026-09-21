"""Router del módulo Agenda (CRUD eventos, etiquetas, config, sesiones, productividad).

Sigue el patrón de dashboard.py: las llamadas a Supabase van por
`asyncio.to_thread` para no bloquear el event loop, y la autenticación
pasa por `get_current_user` que devuelve (user, token).
"""

import asyncio
import logging
from datetime import date, datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from app.core.auth_utils import get_current_user
from app.core.database import get_supabase
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

@router.post("/parse-matricula")
async def parse_matricula(
    file: UploadFile = File(...),
    auth=Depends(get_current_user),
):
    """Recibe un PDF de matrícula, extrae cursos con Gemini, busca bloques
    en carga_horaria y crea eventos semanales en la agenda del estudiante."""
    import io
    import json
    import os

    user, token = auth
    sb = get_supabase(token)

    # ── 1. Extraer texto del PDF ──────────────────────────────────────────
    try:
        import pdfplumber
    except ImportError:
        raise HTTPException(status_code=500, detail="pdfplumber no está instalado.")

    texto = ""
    try:
        pdf_bytes = io.BytesIO(await file.read())
        with pdfplumber.open(pdf_bytes) as pdf:
            for page in pdf.pages:
                texto += (page.extract_text() or "") + "\n"
    except Exception as e:
        logger.error(f"Error leyendo PDF: {e}")
        raise HTTPException(status_code=400, detail="Error al leer el PDF.")

    if not texto.strip():
        raise HTTPException(status_code=400, detail="El PDF no contiene texto extraíble.")

    # ── 2. Enviar a Gemini para extraer cursos matriculados ───────────────
    try:
        import google.generativeai as genai
    except ImportError:
        raise HTTPException(status_code=500, detail="google-generativeai no instalado.")

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY no configurada.")

    genai.configure(api_key=api_key)
    modelo_nombre = os.getenv("GEMINI_GEN_MODEL", "gemini-2.0-flash")
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
        logger.error(f"Error llamando a Gemini: {e}")
        raise HTTPException(status_code=502, detail="Error al procesar con IA.")

    try:
        cursos_detectados = json.loads(raw)
        if not isinstance(cursos_detectados, list):
            raise ValueError("La respuesta no es una lista.")
    except (json.JSONDecodeError, ValueError) as e:
        logger.error(f"Gemini devolvió JSON inválido: {raw[:500]}")
        raise HTTPException(status_code=422, detail="IA devolvió formato inválido.")

    if not cursos_detectados:
        raise HTTPException(status_code=400, detail="No se detectaron cursos en el PDF.")

    # ── 3. Buscar bloques en carga_horaria ────────────────────────────────
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

    eventos_creados = []
    for item in cursos_detectados:
        code = item.get("course_code", "").strip().upper()
        section = item.get("section", "").strip().upper()
        if not code or not section:
            continue

        resp_bloques = await _run(lambda: (
            sb.table("carga_horaria")
            .select("*")
            .eq("codigo", code)
            .eq("seccion", section)
            .execute()
        ))
        bloques = getattr(resp_bloques, "data", []) or []

        for bloque in bloques:
            tipo = bloque.get("tipo_clase", "T")
            label = TIPO_LABELS.get(tipo, tipo)
            dia = bloque.get("dia", "LU")
            hi = _time_to_decimal(str(bloque["hora_inicio"]))
            hf = _time_to_decimal(str(bloque["hora_fin"]))
            duracion = round(hf - hi, 2)
            fecha = _first_date_for_day(semester_start, dia)

            payload = {
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
            }

            resp_ins = await _run(lambda: (
                sb.table("agenda_eventos").insert(payload).execute()
            ))
            filas = getattr(resp_ins, "data", []) or []
            if filas:
                ev = filas[0]
                ev["hora_inicio"] = float(ev.get("hora_inicio", 0))
                ev["duracion"] = float(ev.get("duracion", 1))
                if ev.get("fecha_iso"):
                    ev["fecha_iso"] = str(ev["fecha_iso"])
                eventos_creados.append(ev)

    return {
        "eventos_creados": eventos_creados,
        "cursos_detectados": cursos_detectados,
        "message": f"Se crearon {len(eventos_creados)} bloques horarios para {len(cursos_detectados)} cursos.",
    }
