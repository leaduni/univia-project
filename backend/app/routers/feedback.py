"""Módulo de Feedback, Sugerencias y Reporte de Errores (Fase 1).

El alumno registra un ticket multicriterio y consulta su historial. Los
desarrolladores (feedback_devs) pueden leer y actualizar cualquier ticket a
través de las políticas RLS (ver migracion_fase9_feedback.sql).

La notificación a devs es best-effort y asíncrona (fire-and-forget): primero se
persiste el ticket y se responde HTTP 201; el envío al webhook de Discord (con
fallback SMTP) corre en segundo plano y jamás rompe la petición principal. Es
el mismo criterio que app/core/actividad.py::registrar_evento: telemetría y
alertas no forman parte del trámite del estudiante.
"""

import asyncio
import logging
import os
import smtplib
from datetime import datetime, timezone
from email.message import EmailMessage
from typing import Optional
from uuid import uuid4

import httpx
from fastapi import APIRouter, Depends, File, HTTPException, Query, Request, UploadFile
from pydantic import BaseModel, field_validator

from app.core.auth_utils import get_current_user
from app.core.database import get_admin_client, get_supabase
from app.core.rate_limit import limiter

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/feedback", tags=["feedback"])

# Cliente HTTP persistente (keep-alive) para la notificación a devs. Reusa
# sockets entre peticiones y evita el handshake TCP/TLS en cada ticket.
_http_feedback = httpx.AsyncClient(
    timeout=10.0,
    limits=httpx.Limits(max_keepalive_connections=10, max_connections=30),
)

# Límites de contenido del formulario (protegen contra abuso de tamaño).
MAX_CARACTERES_TITULO = 120
MAX_CARACTERES_DESCRIPCION = 4000

# Categorías del formulario multicriterio (RF-01).
CATEGORIAS = {"funcion", "bug", "respuesta_chatbot", "ui_ux"}

# Estados del ciclo de vida de un ticket (Fase 2/3: cambio de estado por devs).
ESTADOS = {"recibido", "en_revision", "planeado", "resuelto", "descartado"}

# Storage: bucket privado de adjuntos (creado en migracion_fase9_feedback_fase2_3.sql).
BUCKET_ADJUNTOS = os.getenv("SUPABASE_STORAGE_BUCKET_FEEDBACK", "feedback-adjuntos")
MAX_ADJUNTO_BYTES = 5 * 1024 * 1024
MIMES_ADJUNTOS = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "application/pdf": ".pdf",
}


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class NuevoTicket(BaseModel):
    categoria: str
    titulo: str
    descripcion: str

    @field_validator("categoria")
    @classmethod
    def validar_categoria(cls, v: str) -> str:
        valor = (v or "").strip().lower()
        if valor not in CATEGORIAS:
            raise ValueError(
                "Categoría no válida. Opciones: funcion, bug, respuesta_chatbot, ui_ux."
            )
        return valor

    @field_validator("titulo")
    @classmethod
    def validar_titulo(cls, v: str) -> str:
        texto = " ".join((v or "").split())
        if not texto:
            raise ValueError("Escribe un título breve para tu reporte.")
        if len(texto) > MAX_CARACTERES_TITULO:
            raise ValueError(
                f"El título no puede superar los {MAX_CARACTERES_TITULO} caracteres."
            )
        return texto

    @field_validator("descripcion")
    @classmethod
    def validar_descripcion(cls, v: str) -> str:
        texto = (v or "").strip()
        if not texto:
            raise ValueError("Cuéntanos más sobre tu sugerencia o reporte.")
        if len(texto) > MAX_CARACTERES_DESCRIPCION:
            raise ValueError(
                f"La descripción no puede superar los {MAX_CARACTERES_DESCRIPCION} caracteres."
            )
        return texto


class NuevaRespuesta(BaseModel):
    contenido: str

    @field_validator("contenido")
    @classmethod
    def validar_contenido(cls, v: str) -> str:
        texto = (v or "").strip()
        if not texto:
            raise ValueError("Escribe un mensaje para el equipo.")
        if len(texto) > MAX_CARACTERES_DESCRIPCION:
            raise ValueError(
                f"El mensaje no puede superar los {MAX_CARACTERES_DESCRIPCION} caracteres."
            )
        return texto


class CambioEstadoTicket(BaseModel):
    estado: str

    @field_validator("estado")
    @classmethod
    def validar_estado(cls, v: str) -> str:
        valor = (v or "").strip().lower()
        if valor not in ESTADOS:
            raise ValueError(
                "Estado no válido. Opciones: recibido, en_revision, planeado, resuelto, descartado."
            )
        return valor


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _run(fn):
    """Ejecuta una llamada bloqueante de Supabase en un hilo aparte.

    Espejo de dashboard.py::_run: el cliente supabase-py es síncrono y moverlo
    a un hilo aparte libera el event loop mientras espera la respuesta de red.
    """
    return asyncio.to_thread(fn)


async def _es_dev(supabase, perfil_id: str) -> bool:
    """¿El usuario autenticado pertenece a feedback_devs?

    La política RLS `feedback_devs_select_propia` solo deja leer al propio
    usuario, así que consultar su fila es exactamente la prueba de membresía:
    dev → devuelve su fila; estudiante → sin datos → False.
    """
    try:
        resp = await _run(
            lambda: (
                supabase.table("feedback_devs")
                .select("perfil_id")
                .eq("perfil_id", str(perfil_id))
                .maybe_single()
                .execute()
            )
        )
    except Exception as e:
        logger.warning(f"[FEEDBACK] Error verificando membresía de devs: {e}")
        return False
    return bool(getattr(resp, "data", None))


def _enviar_correo_devs(
    ticket_id: int,
    email_estudiante: Optional[str],
    categoria: str,
    titulo: str,
    descripcion: str,
) -> bool:
    """Fallback SMTP: se usa cuando no hay webhook de Discord configurado.

    Replica la estructura de usuarios.py::_notificar_solicitud_invitado
    (smtplib + EmailMessage + DEV_NOTIFICATION_EMAILS) para no refactorizar
    ese módulo en producción; aquí solo se suma el cuerpo del ticket.
    """
    destinos = [
        d.strip()
        for d in os.getenv("DEV_NOTIFICATION_EMAILS", "").split(",")
        if d.strip()
    ]
    if not destinos:
        logger.warning("[FEEDBACK] DEV_NOTIFICATION_EMAILS no configurado.")
        return False
    host = os.getenv("SMTP_HOST", "")
    if not host:
        logger.warning("[FEEDBACK] SMTP_HOST no configurado; no se envió notificación.")
        return False
    try:
        msg = EmailMessage()
        msg["Subject"] = f"[UniVia] Ticket #{ticket_id}: [{categoria}] {titulo}"
        msg["From"] = os.getenv("SMTP_FROM", "no-reply@univiap.pe")
        msg["To"] = ", ".join(destinos)
        msg.set_content(
            "Nuevo ticket de feedback en UniVia:\n\n"
            f"ID: #{ticket_id}\n"
            f"Estudiante: {email_estudiante or 'desconocido'}\n"
            f"Categoría: {categoria}\n"
            f"Asunto: {titulo}\n\n"
            f"{descripcion}\n"
        )
        with smtplib.SMTP(host, int(os.getenv("SMTP_PORT", "587"))) as s:
            s.starttls()
            usuario = os.getenv("SMTP_USER", "")
            if usuario:
                s.login(usuario, os.getenv("SMTP_PASS", ""))
            s.send_message(msg)
        logger.info(
            "[FEEDBACK] Notificación SMTP de ticket %s enviada a %s correo(s).",
            ticket_id, len(destinos),
        )
        return True
    except Exception as e:
        logger.error(f"[FEEDBACK] Error enviando correo de ticket {ticket_id}: {e}")
        return False


async def _despachar_notificacion(
    ticket_id: int,
    email_estudiante: Optional[str],
    categoria: str,
    titulo: str,
    descripcion: str,
) -> None:
    """Notifica a los devs en segundo plano (Discord con fallback SMTP).

    A propósito nunca propaga errores: si la notificación falla, el ticket ya
    quedó persistido y la respuesta al alumno ya se envió; solo queda constancia
    en el log.
    """
    try:
        webhook = os.getenv("WEBHOOK_DISCORD_DEV", "").strip()
        if webhook:
            payload = {
                "content": f"**Nuevo ticket de feedback** (#{ticket_id})",
                "embeds": [
                    {
                        "title": f"[{categoria}] {titulo}",
                        # El límite del campo description del embed es 2048.
                        "description": descripcion[:1500],
                        "color": 11342943,
                        "fields": [
                            {"name": "Ticket", "value": f"#{ticket_id}", "inline": True},
                            {"name": "Estudiante", "value": email_estudiante or "—", "inline": True},
                            {"name": "Categoría", "value": categoria, "inline": True},
                        ],
                    }
                ],
            }
            respuesta = await _http_feedback.post(webhook, json=payload)
            if respuesta.status_code >= 400:
                logger.warning(
                    "[FEEDBACK] Discord devolvió %s para el ticket %s; se cae a SMTP.",
                    respuesta.status_code, ticket_id,
                )
            else:
                logger.info(
                    "[FEEDBACK] Webhook Discord enviado para ticket %s.", ticket_id
                )
                return

        # Fallback: SMTP (espejo de usuarios.py).
        _enviar_correo_devs(ticket_id, email_estudiante, categoria, titulo, descripcion)
    except Exception as e:
        logger.error(f"[FEEDBACK] Error despachando notificación del ticket {ticket_id}: {e}")


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/tickets", status_code=201)
@limiter.limit("20/hour")
async def crear_ticket(
    request: Request,
    data: NuevoTicket,
    user_data=Depends(get_current_user),
):
    """Crea un ticket de feedback y notifica a los devs en segundo plano.

    La escritura usa el cliente Supabase con el token de sesión del estudiante,
    así que la política RLS `feedback_tickets_insert` asegura que solo pueda
    registrarse un ticket a nombre del usuario autenticado. El rate limiter
    (SlowAPI, in-memory) corta el spam desde una misma IP.
    """
    user, token = user_data
    supabase = get_supabase(token)

    fila = {
        "perfil_id": str(user.id),
        "categoria": data.categoria,
        "titulo": data.titulo,
        "descripcion": data.descripcion,
    }

    try:
        resp = await _run(
            lambda: supabase.table("feedback_tickets")
            .insert(fila)
            .select("*")
            .execute()
        )
    except Exception as e:
        logger.error(f"[FEEDBACK] Error creando ticket de {user.id}: {e}")
        raise HTTPException(status_code=500, detail="No se pudo guardar tu reporte.")

    creado = getattr(resp, "data", None) or []
    if not creado:
        raise HTTPException(status_code=500, detail="No se pudo guardar tu reporte.")
    ticket = creado[0]

    # Notificación asíncrona best-effort: la respuesta al cliente no espera al
    # webhook ni al correo.
    asyncio.create_task(_despachar_notificacion(
        ticket_id=ticket["id"],
        email_estudiante=getattr(user, "email", None),
        categoria=ticket.get("categoria", data.categoria),
        titulo=ticket.get("titulo", data.titulo),
        descripcion=ticket.get("descripcion", data.descripcion),
    ))

    return ticket


@router.get("/tickets")
async def listar_tickets(
    estado: Optional[str] = None,
    categoria: Optional[str] = None,
    limite: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    user_data=Depends(get_current_user),
):
    """Historial de tickets del estudiante autenticado, más reciente primero.

    Filtros opcionales por `estado` y `categoria`. La política RLS
    `feedback_tickets_select` deja pasar solo los tickets propios del
    estudiante (o todos si es dev), así que el backend confía en la base y no
    filtra por perfil_id manualmente (mismo criterio que el chatbot).
    """
    if estado and estado not in ESTADOS:
        raise HTTPException(status_code=400, detail="Estado no válido.")
    if categoria and categoria not in CATEGORIAS:
        raise HTTPException(status_code=400, detail="Categoría no válida.")

    user, token = user_data
    supabase = get_supabase(token)

    query = (
        supabase.table("feedback_tickets")
        .select("*")
        .order("creado_en", desc=True)
    )
    if estado:
        query = query.eq("estado", estado)
    if categoria:
        query = query.eq("categoria", categoria)
    # range(start, end) es inclusivo en supabase-py.
    query = query.range(offset, offset + limite - 1)

    try:
        resp = await _run(lambda: query.execute())
    except Exception as e:
        logger.error(f"[FEEDBACK] Error listando tickets de {user.id}: {e}")
        raise HTTPException(status_code=500, detail="No se pudieron cargar tus reportes.")

    return getattr(resp, "data", None) or []


@router.get("/dev")
async def soy_dev(user_data=Depends(get_current_user)):
    """¿El usuario autenticado pertenece al equipo de feedback_devs?

    Sirve al frontend para decidir si mostrar el cambio de estado del ticket.
    La membresía se evalúa contra la tabla `feedback_devs` con su propio token
    (la RLS solo le deja leerse a sí mismo).
    """
    user, token = user_data
    supabase = get_supabase(token)
    return {"es_dev": await _es_dev(supabase, user.id)}


@router.get("/tickets/{ticket_id}")
async def detalle_ticket(ticket_id: int, user_data=Depends(get_current_user)):
    """Detalle del ticket en 1 sola consulta (1-RTT).

    El embed postgREST `feedback_mensajes(*) / feedback_adjuntos(*)` viaja con
    las claves foráneas en una única petición HTTP. Además se firman las URLs
    de los adjuntos en un segundo batch 1-RTT contra Storage. El RLS garantiza
    que un estudiante solo pueda leer sus propios tickets (o todos si es dev).
    """
    user, token = user_data
    supabase = get_supabase(token)

    try:
        resp = await _run(
            lambda: (
                supabase.table("feedback_tickets")
                .select("*, feedback_mensajes(*), feedback_adjuntos(*)")
                .eq("id", ticket_id)
                .maybe_single()
                .execute()
            )
        )
    except Exception as e:
        logger.error(f"[FEEDBACK] Error consultando detalle de ticket {ticket_id}: {e}")
        raise HTTPException(status_code=500, detail="No se pudo cargar el detalle del reporte.")

    ticket = getattr(resp, "data", None)
    if not ticket:
        raise HTTPException(status_code=404, detail="El reporte no existe o no tienes acceso.")

    adjuntos = list(ticket.get("feedback_adjuntos") or [])
    if adjuntos:
        por_path = {}
        try:
            admin = get_admin_client()
            urls = await _run(
                lambda: admin.storage.from_(BUCKET_ADJUNTOS).create_signed_urls(
                    [a["path"] for a in adjuntos], 3600
                )
            )
            por_path = {u["path"]: u["signedURL"] for u in (urls or []) if u.get("path")}
        except Exception as e:
            logger.warning(f"[FEEDBACK] No se pudieron firmar URLs de adjuntos: {e}")
        for a in adjuntos:
            a["url_firmada"] = por_path.get(a["path"])

    mensajes = sorted(ticket.get("feedback_mensajes") or [], key=lambda m: m["creado_en"] or "")
    adjuntos.sort(key=lambda a: a["creado_en"] or "")

    return {
        "id": ticket["id"],
        "perfil_id": ticket["perfil_id"],
        "categoria": ticket["categoria"],
        "prioridad": ticket["prioridad"],
        "estado": ticket["estado"],
        "titulo": ticket["titulo"],
        "descripcion": ticket["descripcion"],
        "creado_en": ticket["creado_en"],
        "actualizado_en": ticket["actualizado_en"],
        "mensajes": mensajes,
        "adjuntos": adjuntos,
    }


@router.patch("/tickets/{ticket_id}/estado")
@limiter.limit("60/minute")
async def cambiar_estado_ticket(
    ticket_id: int,
    data: CambioEstadoTicket,
    request: Request,
    user_data=Depends(get_current_user),
):
    """Cambia el estado de un ticket. Exclusivo para miembros de feedback_devs."""
    user, token = user_data
    supabase = get_supabase(token)

    if not await _es_dev(supabase, user.id):
        raise HTTPException(
            status_code=403, detail="Solo el equipo de desarrollo puede cambiar el estado.")

    try:
        resp = await _run(
            lambda: (
                supabase.table("feedback_tickets")
                .update({
                    "estado": data.estado,
                    "actualizado_en": datetime.now(timezone.utc).isoformat(),
                })
                .eq("id", ticket_id)
                .select("*")
                .maybe_single()
                .execute()
            )
        )
    except Exception as e:
        logger.error(f"[FEEDBACK] Error actualizando estado de ticket {ticket_id}: {e}")
        raise HTTPException(status_code=500, detail="No se pudo actualizar el estado.")

    actualizado = getattr(resp, "data", None)
    if not actualizado:
        raise HTTPException(status_code=404, detail="El reporte no existe.")
    return actualizado


@router.post("/tickets/{ticket_id}/mensajes", status_code=201)
@limiter.limit("20/minute")
async def responder_ticket(
    ticket_id: int,
    data: NuevaRespuesta,
    request: Request,
    user_data=Depends(get_current_user),
):
    """Agrega un mensaje al hilo: el estudiante titular de su ticket o un dev.

    El autor se determina en servidor: si el usuario está en feedback_devs se
    fija autor_rol='dev'; si es titular del ticket, 'estudiante'. La política
    RLS `feedback_mensajes_insert` valida la combinación autor_rol + titularidad
    a nivel de base de datos.
    """
    user, token = user_data
    supabase = get_supabase(token)
    es_dev_flag = await _es_dev(supabase, user.id)

    try:
        resp_ticket = await _run(
            lambda: (
                supabase.table("feedback_tickets")
                .select("perfil_id")
                .eq("id", ticket_id)
                .maybe_single()
                .execute()
            )
        )
    except Exception as e:
        logger.error(f"[FEEDBACK] Error verificando ticket {ticket_id}: {e}")
        raise HTTPException(status_code=500, detail="No se pudo registrar tu respuesta.")

    ticket = getattr(resp_ticket, "data", None)
    if not ticket:
        raise HTTPException(status_code=404, detail="El reporte no existe o no tienes acceso.")
    if not es_dev_flag and str(ticket["perfil_id"]) != str(user.id):
        raise HTTPException(status_code=403, detail="No puedes responder a este reporte.")

    fila = {
        "ticket_id": ticket_id,
        "autor_id": str(user.id),
        "autor_rol": "dev" if es_dev_flag else "estudiante",
        "contenido": data.contenido,
    }

    try:
        resp = await _run(
            lambda: (
                supabase.table("feedback_mensajes")
                .insert(fila)
                .select("*")
                .single()
                .execute()
            )
        )
    except Exception as e:
        logger.error(f"[FEEDBACK] Error guardando mensaje en ticket {ticket_id}: {e}")
        raise HTTPException(status_code=500, detail="No se pudo registrar tu respuesta.")

    mensaje = getattr(resp, "data", None)
    if not mensaje:
        raise HTTPException(status_code=500, detail="No se pudo registrar tu respuesta.")
    return mensaje


@router.post("/tickets/{ticket_id}/adjuntos", status_code=201)
@limiter.limit("10/minute")
async def subir_adjunto(
    ticket_id: int,
    request: Request,
    archivo: UploadFile = File(...),
    user_data=Depends(get_current_user),
):
    """Sube un adjunto (imagen o PDF, máx 5 MB) al bucket privado y lo registra.

    La validación de tipo y tamaño ocurre en este endpoint, antes de tocar
    Storage. El upload usa el cliente admin (service role) para no depender de
    políticas del storage con el token anónimo; la titularidad del ticket ya
    fue validada aquí. Si falla el registro en BD se limpia el archivo del
    bucket para no dejar huérfanos.
    """
    user, token = user_data
    supabase = get_supabase(token)
    es_dev_flag = await _es_dev(supabase, user.id)

    try:
        resp_ticket = await _run(
            lambda: (
                supabase.table("feedback_tickets")
                .select("perfil_id")
                .eq("id", ticket_id)
                .maybe_single()
                .execute()
            )
        )
    except Exception as e:
        logger.error(f"[FEEDBACK] Error verificando ticket {ticket_id}: {e}")
        raise HTTPException(status_code=500, detail="No se pudo registrar el adjunto.")

    ticket = getattr(resp_ticket, "data", None)
    if not ticket:
        raise HTTPException(status_code=404, detail="El reporte no existe o no tienes acceso.")
    if not es_dev_flag and str(ticket["perfil_id"]) != str(user.id):
        raise HTTPException(status_code=403, detail="No puedes adjuntar archivos a este reporte.")

    mime = (archivo.content_type or "").lower()
    if mime not in MIMES_ADJUNTOS:
        raise HTTPException(
            status_code=400,
            detail="Tipo de archivo no admitido. Usa imágenes (PNG, JPG, WEBP, GIF) o PDF.",
        )

    contenido = await archivo.read()
    if not contenido:
        raise HTTPException(status_code=400, detail="El archivo está vacío.")
    if len(contenido) > MAX_ADJUNTO_BYTES:
        raise HTTPException(status_code=400, detail="El archivo supera los 5 MB.")

    nombre_original = archivo.filename or f"adjunto{MIMES_ADJUNTOS[mime]}"
    path = f"{ticket_id}/{uuid4().hex}{MIMES_ADJUNTOS[mime]}"

    admin = get_admin_client()
    try:
        await _run(
            lambda: admin.storage.from_(BUCKET_ADJUNTOS).upload(
                path, contenido, {"content-type": mime}
            )
        )
    except Exception as e:
        logger.error(f"[FEEDBACK] Error subiendo adjunto a Storage: {e}")
        raise HTTPException(status_code=500, detail="No se pudo guardar el archivo adjunto.")

    fila = {
        "ticket_id": ticket_id,
        "path": path,
        "nombre_original": nombre_original,
        "tipo_mime": mime,
        "size_bytes": len(contenido),
    }

    try:
        resp = await _run(
            lambda: (
                supabase.table("feedback_adjuntos")
                .insert(fila)
                .select("*")
                .single()
                .execute()
            )
        )
        adjunto = getattr(resp, "data", None)
    except Exception as e:
        logger.error(f"[FEEDBACK] Error registrando adjunto de ticket {ticket_id}: {e}")
        await _run(lambda: admin.storage.from_(BUCKET_ADJUNTOS).remove([path]))
        raise HTTPException(status_code=500, detail="No se pudo registrar el adjunto.")

    if not adjunto:
        await _run(lambda: admin.storage.from_(BUCKET_ADJUNTOS).remove([path]))
        raise HTTPException(status_code=500, detail="No se pudo registrar el adjunto.")

    try:
        url_resp = await _run(
            lambda: admin.storage.from_(BUCKET_ADJUNTOS).create_signed_url(path, 3600)
        )
        adjunto["url_firmada"] = (url_resp or {}).get("signedURL")
    except Exception as e:
        logger.warning(f"[FEEDBACK] No se pudo firmar URL del adjunto {path}: {e}")
        adjunto["url_firmada"] = None

    return adjunto