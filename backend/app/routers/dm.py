"""Mensajería Directa (DM) entre estudiantes (Fase 3).

Endpoints:
    GET  /api/dm/conversaciones                  -> bandeja del usuario
    POST /api/dm/conversaciones                  -> iniciar (o reutilizar) hilo 1 a 1
    GET  /api/dm/conversaciones/{id}/mensajes    -> historial de una conversación
    POST /api/dm/conversaciones/{id}/mensajes    -> enviar mensaje
    POST /api/dm/conversaciones/{id}/leer        -> marcar como leído
    GET  /api/dm/usuarios?q={texto}&limite={n}   -> directorio para iniciar chats

Convenciones (mismo patrón que routers/foro.py):
    - dependencia get_current_user -> (user, token)
    - cliente supabase con la sesión del estudiante (get_supabase(token)) para
      respetar las políticas RLS.
    - la privacidad del DM la impone RLS (auth.uid() IN (usuario_a, usuario_b));
      el backend solo verifica membrecía para devolver respuestas claras.
    - la VALIDACIÓN del destinatario se hace con get_admin_client() en el
      servidor: la RLS de `perfiles` solo permite leer el propio perfil, por lo
      que una consulta con el token del usuario oculta perfiles válidos y los
      haría parecer inexistentes (bug "El usuario no existe").
    - el orden por `updated_at` lo mantiene un trigger al insertar mensajes;
      el cliente NO escribe en conversaciones_dm tras crear el hilo.
"""

import asyncio
import logging
from typing import Dict, Optional, Tuple
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request

from app.core.auth_utils import get_current_user
from app.core.database import get_admin_client, get_supabase
from app.core.rate_limit import limiter
from app.schemas.dm import (
    ConversacionDMOut,
    EnviarMensajeDMRequest,
    IniciarDMRequest,
    MensajeDMOut,
    UsuarioDMBuscable,
)

logger = logging.getLogger(__name__)
router = APIRouter()


async def _run(fn):
    """Offload de PostgREST síncrono para no bloquear el event loop."""
    return await asyncio.to_thread(fn)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _meta_bandeja(supabase, user_id: str, conv_ids: list) -> Tuple[dict, dict]:
    """Último mensaje + no_leídos por conversación sin full-scan de mensajes_dm.

    Preferencia: RPC `dm_meta_bandeja` (DISTINCT ON + COUNT). Fallback local:
    unread filtrado + LIMIT 1 por conversación (misma forma de respuesta).
    """
    ultimos: dict = {}
    no_leidos: dict = {}
    if not conv_ids:
        return ultimos, no_leidos

    try:
        resp = (
            supabase.rpc(
                "dm_meta_bandeja",
                {"p_user_id": user_id, "p_conv_ids": conv_ids},
            ).execute()
        )
        for fila in getattr(resp, "data", None) or []:
            cid = fila["conversacion_dm_id"]
            if fila.get("ultimo_cuerpo") is not None or fila.get("ultimo_created_at"):
                ultimos[cid] = {
                    "cuerpo": fila.get("ultimo_cuerpo"),
                    "created_at": fila.get("ultimo_created_at"),
                }
            no_leidos[cid] = int(fila.get("no_leidos") or 0)
        return ultimos, no_leidos
    except Exception as e:
        logger.warning("RPC dm_meta_bandeja no disponible; fallback local: %s", e)

    try:
        ureesp = (
            supabase.table("mensajes_dm")
            .select("conversacion_dm_id")
            .in_("conversacion_dm_id", conv_ids)
            .eq("leido", False)
            .neq("remitente_id", user_id)
            .execute()
        )
        for m in getattr(ureesp, "data", None) or []:
            cid = m["conversacion_dm_id"]
            no_leidos[cid] = no_leidos.get(cid, 0) + 1
    except Exception as e:
        logger.warning("No se pudo cargar no_leídos DM: %s", e)

    for cid in conv_ids:
        try:
            mresp = (
                supabase.table("mensajes_dm")
                .select("cuerpo, created_at")
                .eq("conversacion_dm_id", cid)
                .order("created_at", desc=True)
                .limit(1)
                .execute()
            )
            filas = getattr(mresp, "data", None) or []
            if filas:
                ultimos[cid] = filas[0]
        except Exception as e:
            logger.warning("No se pudo cargar último mensaje DM (%s): %s", cid, e)

    return ultimos, no_leidos


def _par_canonico(a: str, b: str) -> Tuple[str, str]:
    """Devuelve (menor, mayor) para el par ordenado canónico."""
    return (a, b) if a < b else (b, a)


def _uuid_estricto(valor) -> str:
    """Valida/normaliza un UUID antes de interpolarlo en un filtro `.or_()`.

    PostgREST interpreta sintaxis dentro de `or_()`: sin esta validación un
    valor arbitrario podría romper o alterar el filtro. Con un UUID verificado
    por `uuid.UUID` el valor interpolado solo puede ser hex y guiones.
    """
    try:
        return str(UUID(str(valor)))
    except (ValueError, AttributeError, TypeError):
        raise HTTPException(status_code=422, detail="Identificador de usuario inválido.")


def _nombre_perfil(admin, perfil_id: str) -> Optional[str]:
    """Nombre visible de un perfil usando el cliente administrativo.

    El token del usuario tiene RLS self-only en `perfiles`; resolver nombres
    con ese cliente devolvería None para cualquiera que no sea el propio
    usuario. El admin se usa SIEMPRE en el servidor (nunca en el cliente).
    """
    return _nombres_perfiles(admin, [perfil_id]).get(str(perfil_id)) or "Estudiante"


def _nombres_perfiles(admin, perfil_ids) -> Dict[str, str]:
    """`{perfil_id: nombre visible}` en batch para evitar N+1.

    Prefiere `nombre_completo` y cae al alias público de gamificación
    (el "usuario" del directorio) cuando falta.
    """
    ids = [str(pid) for pid in perfil_ids if pid]
    if not ids:
        return {}

    nombres: Dict[str, str] = {}
    try:
        resp = (
            admin.table("perfiles")
            .select("id, nombre_completo")
            .in_("id", ids)
            .execute()
        )
        for p in (getattr(resp, "data", None) or []):
            pid = p.get("id")
            nombre = (p.get("nombre_completo") or "").strip()
            if pid and nombre:
                nombres[str(pid)] = nombre
    except Exception as e:
        logger.warning("No se pudieron resolver perfiles DM en batch: %s", e)

    faltantes = [pid for pid in ids if pid not in nombres]
    if faltantes:
        try:
            resp = (
                admin.table("gamificacion_usuarios")
                .select("perfil_id, alias_publico")
                .in_("perfil_id", faltantes)
                .execute()
            )
            for g in (getattr(resp, "data", None) or []):
                pid = g.get("perfil_id")
                alias = (g.get("alias_publico") or "").strip()
                if pid and alias:
                    nombres[str(pid)] = alias
        except Exception as e:
            logger.warning("No se pudo leer alias de perfiles DM: %s", e)

    return nombres


def _destinatario_existe(admin, perfil_id: UUID) -> bool:
    """Valida que `perfiles[id]` exista saltando la RLS self-only.

    Distingue un 404 real (perfil inexistente) de un fallo de infraestructura
    (503) para no reportar como "usuario no existe" un error de Supabase.
    """
    try:
        resp = (
            admin.table("perfiles")
            .select("id")
            .eq("id", str(perfil_id))
            .maybe_single()
            .execute()
        )
        return bool(getattr(resp, "data", None) if resp else None)
    except Exception as e:
        logger.error("[DM] Error verificando destinatario %s: %s", perfil_id, e)
        raise HTTPException(
            status_code=503,
            detail="No se pudo verificar el destinatario. Intenta de nuevo.",
        )


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
    # El UUID se valida antes de interpolarlo en el filtro .or_() (anti-inyección).
    uid = _uuid_estricto(user.id)
    resp = await _run(
        lambda: supabase.table("conversaciones_dm")
        .select("id, usuario_a, usuario_b, creado_por, created_at, updated_at")
        .or_(f"usuario_a.eq.{uid},usuario_b.eq.{uid}")
        .order("updated_at", desc=True)
        .execute()
    )
    filas = getattr(resp, "data", None) or []

    # Último mensaje y no leídos por conversación SIN descargar todos los
    # mensajes de la bandeja: RPC `dm_meta_bandeja` (DISTINCT ON + COUNT),
    # con fallback local de lecturas acotadas. Misma forma de respuesta.
    conv_ids = [f["id"] for f in filas]
    ultimos, no_leidos = await _run(
        lambda: _meta_bandeja(supabase, user.id, conv_ids)
    )

    resultado = []
    admin = get_admin_client()
    otros_ids = [_otro_de(f, user.id) for f in filas]
    nombres = await _run(lambda: _nombres_perfiles(admin, otros_ids))
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
                otro_nombre=nombres.get(otro_id) or "Estudiante",
                ultimo_mensaje=(ultimo or {}).get("cuerpo"),
                ultimo_mensaje_fecha=(ultimo or {}).get("created_at"),
                no_leidos=no_leidos.get(f["id"], 0),
            )
        )
    return resultado


@router.post("/dm/conversaciones", response_model=ConversacionDMOut, status_code=201)
async def iniciar_conversacion(datos: IniciarDMRequest, user_data=Depends(get_current_user)):
    """Inicia (o reutiliza) una conversación 1 a 1 sin mensaje automático."""
    user, token = user_data
    supabase = get_supabase(token)
    destino_id = str(datos.usuario_id)

    if destino_id == user.id:
        raise HTTPException(status_code=422, detail="No puedes abrir un chat contigo mismo.")

    # El destinatario debe existir (cliente admin: RLS self-only ocultaría el
    # perfil del otro usuario y arrojaría un falso "El usuario no existe").
    admin = get_admin_client()
    if not await _run(lambda: _destinatario_existe(admin, datos.usuario_id)):
        logger.warning(
            "DM: destinatario inexistente (remitente=%s, destinatario=%s).",
            user.id,
            destino_id,
        )
        raise HTTPException(status_code=404, detail="El usuario no existe.")

    usuario_a, usuario_b = _par_canonico(user.id, destino_id)

    # Reutilizar el par canónico si ya existe.
    existente = await _run(
        lambda: supabase.table("conversaciones_dm")
        .select("id, usuario_a, usuario_b, creado_por, created_at, updated_at")
        .eq("usuario_a", usuario_a)
        .eq("usuario_b", usuario_b)
        .maybe_single()
        .execute()
    )
    conversacion = getattr(existente, "data", None) if existente else None

    if not conversacion:
        try:
            creada = await _run(
                lambda: supabase.table("conversaciones_dm")
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
        except Exception as e:  # noqa: BLE001
            # Dos clics simultáneos sobre la misma pareja: el UNIQUE
            # (usuario_a, usuario_b) puede ganar antes que nosotros.
            if "23505" not in str(e) and "duplicate key" not in str(e).lower():
                logger.error("DM: error creando conversación: %s", e)
                raise HTTPException(status_code=500, detail="No se pudo iniciar la conversación.")
            reutilizada = await _run(
                lambda: supabase.table("conversaciones_dm")
                .select("id, usuario_a, usuario_b, creado_por, created_at, updated_at")
                .eq("usuario_a", usuario_a)
                .eq("usuario_b", usuario_b)
                .maybe_single()
                .execute()
            )
            conversacion = getattr(reutilizada, "data", None) if reutilizada else None
            if not conversacion:
                logger.error(
                    "DM: conflicto de par sin fila visible (remitente=%s, destino=%s)",
                    user.id,
                    destino_id,
                )
                raise HTTPException(status_code=500, detail="No se pudo iniciar la conversación.")

    # Primer mensaje opcional. `updated_at` lo actualiza el trigger de la base.
    if datos.primer_mensaje:
        try:
            await _run(
                lambda: supabase.table("mensajes_dm").insert({
                    "conversacion_dm_id": conversacion["id"],
                    "remitente_id": user.id,
                    "cuerpo": datos.primer_mensaje,
                }).execute()
            )
        except Exception as e:
            logger.error(f"Error enviando primer mensaje: {e}")
            raise HTTPException(status_code=500, detail="No se pudo enviar el mensaje.")

    otro_id = _otro_de(conversacion, user.id)
    otro_nombre = await _run(lambda: _nombre_perfil(admin, otro_id))
    return ConversacionDMOut(
        id=conversacion["id"],
        usuario_a=conversacion["usuario_a"],
        usuario_b=conversacion["usuario_b"],
        creado_por=conversacion.get("creado_por"),
        created_at=conversacion["created_at"],
        updated_at=conversacion["updated_at"],
        otro_id=otro_id,
        otro_nombre=otro_nombre,
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

    await _run(lambda: _conversacion_o_404(supabase, conversacion_id, user.id))

    resp = await _run(
        lambda: supabase.table("mensajes_dm")
        .select("id, conversacion_dm_id, remitente_id, cuerpo, leido, created_at")
        .eq("conversacion_dm_id", conversacion_id)
        .order("created_at")
        .execute()
    )
    filas = getattr(resp, "data", None) or []
    admin = get_admin_client()
    nombres = await _run(
        lambda: _nombres_perfiles(admin, [f["remitente_id"] for f in filas])
    )
    return [
        MensajeDMOut(
            id=f["id"],
            conversacion_dm_id=f["conversacion_dm_id"],
            remitente_id=f["remitente_id"],
            remitente_nombre=nombres.get(f["remitente_id"]) or "Estudiante",
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

    await _run(lambda: _conversacion_o_404(supabase, conversacion_id, user.id))

    try:
        resp = await _run(
            lambda: supabase.table("mensajes_dm")
            .insert({
                "conversacion_dm_id": conversacion_id,
                "remitente_id": user.id,
                "cuerpo": datos.cuerpo,
            })
            .execute()
        )
    except Exception as e:
        logger.error(f"Error enviando mensaje: {e}")
        raise HTTPException(status_code=500, detail="No se pudo enviar el mensaje.")

    fila = (getattr(resp, "data", None) or [])[0]
    admin = get_admin_client()
    remitente_nombre = await _run(lambda: _nombre_perfil(admin, fila["remitente_id"]))
    return MensajeDMOut(
        id=fila["id"],
        conversacion_dm_id=fila["conversacion_dm_id"],
        remitente_id=fila["remitente_id"],
        remitente_nombre=remitente_nombre,
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

    await _run(lambda: _conversacion_o_404(supabase, conversacion_id, user.id))

    try:
        await _run(
            lambda: supabase.table("mensajes_dm").update({"leido": True}).eq(
                "conversacion_dm_id", conversacion_id
            ).neq("remitente_id", user.id).execute()
        )
    except Exception as e:
        logger.error(f"Error marcando leído: {e}")
        raise HTTPException(status_code=500, detail="No se pudo marcar como leído.")

    return {"ok": True}


# ---------------------------------------------------------------------------
# Directorio de contactos (autenticado)
# ---------------------------------------------------------------------------

@router.get("/dm/usuarios", response_model=list[UsuarioDMBuscable])
@limiter.limit("20/minute")
async def buscar_usuarios_para_dm(
    request: Request,
    q: str = Query(default="", max_length=80),
    limite: int = Query(default=8, ge=1, le=10),
    user_data=Depends(get_current_user),
):
    """Directorio autenticado para iniciar chats.

    Busca por nombre completo, alias público (usuario), código de estudiante
    o correo institucional. La RPC `buscar_perfiles_para_dm` es SECURITY
    DEFINER con respecto a RLS (los perfiles ajenos son invisible con RLS), así
    que se llama SIEMPRE autenticado; excluye al propio usuario y devuelve el
    email enmascarado. El `request` lo exige el rate limiter.
    """
    user, token = user_data
    termino = q.strip()
    if len(termino) < 2:
        return []

    admin = get_admin_client()
    try:
        resp = await _run(
            lambda: admin.rpc(
                "buscar_perfiles_para_dm",
                {"p_texto": termino, "p_limite": limite, "p_usuario_excluir": user.id},
            ).execute()
        )
    except Exception as e:
        logger.error("[DM] Error buscando perfiles (%s): %s", user.id, e)
        raise HTTPException(status_code=503, detail="No se pudo buscar destinatarios ahora mismo.")

    filas = getattr(resp, "data", None) or []
    return [
        UsuarioDMBuscable(
            id=str(f["perfil_id"]),
            nombre=f.get("nombre_completo"),
            alias=f.get("alias_publico"),
            avatar_url=f.get("avatar_url"),
            codigo_estudiante=f.get("codigo_estudiante"),
            email_enmascarado=f.get("email_enmascarado"),
        )
        for f in filas
    ]