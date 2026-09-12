"""Mensajería Directa (DM) entre estudiantes (Fase 3).

Endpoints:
    GET  /api/dm/conversaciones                  -> bandeja del usuario
    POST /api/dm/conversaciones                  -> iniciar (o reutilizar) hilo 1 a 1
    GET  /api/dm/conversaciones/{id}/mensajes    -> historial de una conversación
    POST /api/dm/conversaciones/{id}/mensajes    -> enviar mensaje
    POST /api/dm/conversaciones/{id}/leer        -> marcar como leído

Convenciones (mismo patrón que routers/foro.py):
    - dependencia get_current_user -> (user, token)
    - cliente supabase con la sesión del estudiante (get_supabase(token)) para
      respetar las políticas RLS.
    - la privacidad del DM la impone RLS (auth.uid() IN (usuario_a, usuario_b));
      el backend solo verifica membrecía para devolver respuestas claras.
"""

import logging
from typing import Optional, Tuple

from fastapi import APIRouter, Depends, HTTPException

from app.core.auth_utils import get_current_user
from app.core.database import get_supabase
from app.schemas.dm import (
    ConversacionDMOut,
    EnviarMensajeDMRequest,
    IniciarDMRequest,
    MensajeDMOut,
)

logger = logging.getLogger(__name__)
router = APIRouter()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _par_canonico(a: str, b: str) -> Tuple[str, str]:
    """Devuelve (menor, mayor) para el par ordenado canónico."""
    return (a, b) if a < b else (b, a)


def _nombre_perfil(supabase, perfil_id: str) -> Optional[str]:
    try:
        resp = (
            supabase.table("perfiles")
            .select("nombre_completo")
            .eq("id", perfil_id)
            .maybe_single()
            .execute()
        )
        perfil = getattr(resp, "data", None) if resp else None
        return (perfil or {}).get("nombre_completo")
    except Exception:
        return None


def _otro_de(conversacion: dict, user_id: str) -> str:
    """El id del otro participante de la conversación."""
    return (
        conversacion["usuario_b"]
        if conversacion.get("usuario_a") == user_id
        else conversacion["usuario_a"]
    )


def _es_miembro(conversacion: dict, user_id: str) -> bool:
    return user_id in (conversacion.get("usuario_a"), conversacion.get("usuario_b"))


def _conversacion_o_404(supabase, conversacion_id: int, user_id: str) -> dict:
    """Devuelve la conversación si el usuario es miembro; si no, 404."""
    try:
        resp = (
            supabase.table("conversaciones_dm")
            .select("id, usuario_a, usuario_b, creado_por, created_at, updated_at")
            .eq("id", conversacion_id)
            .maybe_single()
            .execute()
        )
    except Exception as e:
        logger.error(f"Error consultando conversación {conversacion_id}: {e}")
        raise HTTPException(status_code=500, detail="No se pudo cargar la conversación.")
    conversacion = getattr(resp, "data", None) if resp else None
    if not conversacion:
        raise HTTPException(status_code=404, detail="Conversación no encontrada.")
    if not _es_miembro(conversacion, user_id):
        raise HTTPException(status_code=404, detail="Conversación no encontrada.")
    return conversacion


# ---------------------------------------------------------------------------
# Bandeja e inicio de conversación
# ---------------------------------------------------------------------------

@router.get("/dm/conversaciones", response_model=list[ConversacionDMOut])
async def listar_conversaciones(user_data=Depends(get_current_user)):
    """Bandeja: conversaciones del usuario, más recientes primero."""
    user, token = user_data
    supabase = get_supabase(token)

    # Cualquier conversación donde participe (usuario_a o usuario_b).
    resp = (
        supabase.table("conversaciones_dm")
        .select("id, usuario_a, usuario_b, creado_por, created_at, updated_at")
        .or_(f"usuario_a.eq.{user.id},usuario_b.eq.{user.id}")
        .order("updated_at", desc=True)
        .execute()
    )
    filas = getattr(resp, "data", None) or []

    # Último mensaje y no leídos por conversación.
    ultimos: dict = {}
    no_leidos: dict = {}
    conv_ids = [f["id"] for f in filas]
    if conv_ids:
        try:
            mresp = (
                supabase.table("mensajes_dm")
                .select("id, conversacion_dm_id, remitente_id, cuerpo, leido, created_at")
                .in_("conversacion_dm_id", conv_ids)
                .order("created_at")
                .execute()
            )
            for m in (getattr(mresp, "data", None) or []):
                cid = m["conversacion_dm_id"]
                ultimos[cid] = m
                if (not m.get("leido")) and m.get("remitente_id") != user.id:
                    no_leidos[cid] = no_leidos.get(cid, 0) + 1
        except Exception as e:
            logger.warning(f"No se pudo cargar últimos mensajes: {e}")

    resultado = []
    for f in filas:
        otro_id = _otro_de(f, user.id)
        ultimo = ultimos.get(f["id"])
        resultado.append(
            ConversacionDMOut(
                id=f["id"],
                usuario_a=f["usuario_a"],
                usuario_b=f["usuario_b"],
                creado_por=f.get("creado_por"),
                created_at=f["created_at"],
                updated_at=f["updated_at"],
                otro_id=otro_id,
                otro_nombre=_nombre_perfil(supabase, otro_id),
                ultimo_mensaje=(ultimo or {}).get("cuerpo"),
                ultimo_mensaje_fecha=(ultimo or {}).get("created_at"),
                no_leidos=no_leidos.get(f["id"], 0),
            )
        )
    return resultado


@router.post("/dm/conversaciones", response_model=ConversacionDMOut, status_code=201)
async def iniciar_conversacion(datos: IniciarDMRequest, user_data=Depends(get_current_user)):
    """Inicia (o reutiliza) una conversación 1 a 1 y envía el primer mensaje."""
    user, token = user_data
    supabase = get_supabase(token)

    if datos.usuario_id == user.id:
        raise HTTPException(status_code=422, detail="No puedes abrir un chat contigo mismo.")

    # El destinatario debe existir.
    dest = (
        supabase.table("perfiles")
        .select("id")
        .eq("id", datos.usuario_id)
        .maybe_single()
        .execute()
    )
    if not (getattr(dest, "data", None) if dest else None):
        raise HTTPException(status_code=404, detail="El usuario no existe.")

    usuario_a, usuario_b = _par_canonico(user.id, datos.usuario_id)

    # Reutilizar el par canónico si ya existe.
    existente = (
        supabase.table("conversaciones_dm")
        .select("id, usuario_a, usuario_b, creado_por, created_at, updated_at")
        .eq("usuario_a", usuario_a)
        .eq("usuario_b", usuario_b)
        .maybe_single()
        .execute()
    )
    conversacion = getattr(existente, "data", None) if existente else None

    if not conversacion:
        creada = (
            supabase.table("conversaciones_dm")
            .insert({
                "usuario_a": usuario_a,
                "usuario_b": usuario_b,
                "creado_por": user.id,
            })
            .execute()
        )
        creada_filas = getattr(creada, "data", None) or []
        if not creada_filas:
            raise HTTPException(status_code=500, detail="No se pudo iniciar la conversación.")
        conversacion = creada_filas[0]

    # Primer mensaje.
    try:
        supabase.table("mensajes_dm").insert({
            "conversacion_dm_id": conversacion["id"],
            "remitente_id": user.id,
            "cuerpo": datos.primer_mensaje,
        }).execute()
        supabase.table("conversaciones_dm").update({"updated_at": "now()"}).eq(
            "id", conversacion["id"]
        ).execute()
    except Exception as e:
        logger.error(f"Error enviando primer mensaje: {e}")
        raise HTTPException(status_code=500, detail="No se pudo enviar el mensaje.")

    otro_id = _otro_de(conversacion, user.id)
    return ConversacionDMOut(
        id=conversacion["id"],
        usuario_a=conversacion["usuario_a"],
        usuario_b=conversacion["usuario_b"],
        creado_por=conversacion.get("creado_por"),
        created_at=conversacion["created_at"],
        updated_at=conversacion["updated_at"],
        otro_id=otro_id,
        otro_nombre=_nombre_perfil(supabase, otro_id),
        ultimo_mensaje=datos.primer_mensaje,
        ultimo_mensaje_fecha=conversacion["updated_at"],
        no_leidos=0,
    )


# ---------------------------------------------------------------------------
# Mensajes
# ---------------------------------------------------------------------------

@router.get("/dm/conversaciones/{conversacion_id}/mensajes", response_model=list[MensajeDMOut])
async def listar_mensajes(conversacion_id: int, user_data=Depends(get_current_user)):
    """Historial de una conversación, en orden cronológico."""
    user, token = user_data
    supabase = get_supabase(token)

    _conversacion_o_404(supabase, conversacion_id, user.id)

    resp = (
        supabase.table("mensajes_dm")
        .select("id, conversacion_dm_id, remitente_id, cuerpo, leido, created_at")
        .eq("conversacion_dm_id", conversacion_id)
        .order("created_at")
        .execute()
    )
    filas = getattr(resp, "data", None) or []
    return [
        MensajeDMOut(
            id=f["id"],
            conversacion_dm_id=f["conversacion_dm_id"],
            remitente_id=f["remitente_id"],
            remitente_nombre=_nombre_perfil(supabase, f["remitente_id"]),
            cuerpo=f["cuerpo"],
            leido=f.get("leido", False),
            created_at=f["created_at"],
            propio=f["remitente_id"] == user.id,
        )
        for f in filas
    ]


@router.post("/dm/conversaciones/{conversacion_id}/mensajes", response_model=MensajeDMOut, status_code=201)
async def enviar_mensaje(conversacion_id: int, datos: EnviarMensajeDMRequest, user_data=Depends(get_current_user)):
    """Envía un mensaje dentro de una conversación de la que eres miembro."""
    user, token = user_data
    supabase = get_supabase(token)

    _conversacion_o_404(supabase, conversacion_id, user.id)

    try:
        resp = (
            supabase.table("mensajes_dm")
            .insert({
                "conversacion_dm_id": conversacion_id,
                "remitente_id": user.id,
                "cuerpo": datos.cuerpo,
            })
            .execute()
        )
        supabase.table("conversaciones_dm").update({"updated_at": "now()"}).eq(
            "id", conversacion_id
        ).execute()
    except Exception as e:
        logger.error(f"Error enviando mensaje: {e}")
        raise HTTPException(status_code=500, detail="No se pudo enviar el mensaje.")

    fila = (getattr(resp, "data", None) or [])[0]
    return MensajeDMOut(
        id=fila["id"],
        conversacion_dm_id=fila["conversacion_dm_id"],
        remitente_id=fila["remitente_id"],
        remitente_nombre=_nombre_perfil(supabase, fila["remitente_id"]),
        cuerpo=fila["cuerpo"],
        leido=fila.get("leido", False),
        created_at=fila["created_at"],
        propio=True,
    )


@router.post("/dm/conversaciones/{conversacion_id}/leer", status_code=200)
async def marcar_leido(conversacion_id: int, user_data=Depends(get_current_user)):
    """Marca como leídos los mensajes de la conversación recibidos de otros.

    Solo afecta a los mensajes cuyo remitente NO es el usuario actual, y
    únicamente si el usuario es miembro de la conversación (lo valida RLS).
    """
    user, token = user_data
    supabase = get_supabase(token)

    _conversacion_o_404(supabase, conversacion_id, user.id)

    try:
        supabase.table("mensajes_dm").update({"leido": True}).eq(
            "conversacion_dm_id", conversacion_id
        ).neq("remitente_id", user.id).execute()
    except Exception as e:
        logger.error(f"Error marcando leído: {e}")
        raise HTTPException(status_code=500, detail="No se pudo marcar como leído.")

    return {"ok": True}