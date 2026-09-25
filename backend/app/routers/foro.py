"""Foro de la comunidad (Fases 1-5: secciones, publicaciones, comentarios,
votos, IA y feed global).

Endpoints:
    GET    /api/foro/secciones                     -> lista de secciones visibles
    POST   /api/foro/secciones                     -> crear sección (moderador)
    GET    /api/foro/secciones/{id}/publicaciones  -> hilos de una sección
    POST   /api/foro/publicaciones                 -> crear publicación (encola triaje IA)
    GET    /api/foro/publicaciones/{id}            -> detalle de un hilo
    POST   /api/foro/publicaciones/{id}/comentarios-> comentar
    DELETE /api/foro/publicaciones/{id}            -> borrar (propio o moderador)
    DELETE /api/foro/comentarios/{id}              -> borrar (propio o moderador)
    POST   /api/foro/votos                         -> votar (toggle up/down)
    POST   /api/foro/publicaciones/{id}/resolver   -> marcar solución (autor)
    GET    /api/foro/feed                          -> feed global con filtros y cursor (Fase 5)
    GET    /api/foro/tendencias                    -> top hilos últimas 24h (fallback 7d)
    POST   /api/foro/publicaciones/{id}/guardar    -> guardar hilo (bookmark)
    DELETE /api/foro/publicaciones/{id}/guardar    -> quitar hilo guardado
    POST   /api/foro/publicaciones/{id}/vista      -> registrar vista única

Fase 5: los contadores (num_comentarios/num_votos/num_vistas) viven
desnormalizados en foro_publicaciones y foro_comentarios, mantenidos por
triggers (ver base_de_datos/esquema/migracion_foro_fase5_feed.sql); este
router los LEE de columna y ya no agrega en Python.

Convenciones (mismo patrón que routers/recursos.py y chatbot.py):
    - dependencia get_current_user -> (user, token)
    - cliente supabase con la sesión del estudiante (get_supabase(token)) para
      respetar las políticas RLS.
    - la facultad del usuario se deriva de perfiles.carrera_id -> carreras.facultad_id
      (no hay columna facultad_id en perfiles).
    - el triaje IA corre en BackgroundTasks (fire-and-forget): no bloquea el POST.
"""

import logging
import os
import threading
import time
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, Header, HTTPException

from app.core.auth_utils import get_current_user
from app.core.database import get_admin_client, get_supabase
from app.schemas.foro import (
    ComentarioCreate,
    ComentarioOut,
    FeedOut,
    ModeradorCreate,
    PublicacionCreate,
    PublicacionOut,
    ResolverRequest,
    SeccionCreate,
    SeccionOut,
    TendenciasOut,
    VotoCreate,
    VotoOut,
)

logger = logging.getLogger(__name__)
router = APIRouter()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _facultad_del_usuario(supabase, user) -> Optional[int]:
    """facultad_id del estudiante, o None si no se puede resolver.

    La facultad no se guarda en `perfiles`; se deriva de la carrera
    (`perfiles.carrera_id -> carreras.facultad_id`). Devuelve None cuando el
    perfil no tiene carrera (onboarding sin terminar) o la carrera no tiene
    facultad.
    """
    try:
        cacheado = _cat_get(f"facultad_usuario:{user.id}")
        if cacheado is not None:
            return cacheado

        perfil_resp = (
            supabase.table("perfiles")
            .select("carrera_id")
            .eq("id", user.id)
            .maybe_single()
            .execute()
        )
        perfil = getattr(perfil_resp, "data", None) if perfil_resp else None
        carrera_id = (perfil or {}).get("carrera_id")
        if not carrera_id:
            _cat_set(f"facultad_usuario:{user.id}", None)
            return None

        carrera_resp = (
            supabase.table("carreras")
            .select("facultad_id")
            .eq("id", carrera_id)
            .maybe_single()
            .execute()
        )
        carrera = getattr(carrera_resp, "data", None) if carrera_resp else None
        facultad_id = (carrera or {}).get("facultad_id")
        _cat_set(f"facultad_usuario:{user.id}", facultad_id)
        return facultad_id
    except Exception as e:
        logger.error(f"Error resolviendo facultad de {user.id}: {e}")
        return None


def _es_moderador(supabase, user) -> bool:
    """¿El usuario figura en foro_moderadores?"""
    try:
        resp = (
            supabase.table("foro_moderadores")
            .select("perfil_id")
            .eq("perfil_id", user.id)
            .maybe_single()
            .execute()
        )
        return bool(resp and resp.data)
    except Exception as e:
        logger.error(f"Error consultando moderación de {user.id}: {e}")
        return False


def _nombre_autor(supabase, perfil_id: str) -> Optional[str]:
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


def _nombres_autores(supabase, perfil_ids: list) -> dict:
    """{perfil_id: nombre_completo} en una sola consulta batch (evita N+1)."""
    ids = [pid for pid in perfil_ids if pid is not None]
    if not ids:
        return {}
    try:
        resp = (
            supabase.table("perfiles")
            .select("id, nombre_completo")
            .in_("id", ids)
            .execute()
        )
        return {
            p["id"]: p.get("nombre_completo")
            for p in (getattr(resp, "data", None) or [])
            if p.get("id") is not None
        }
    except Exception as e:
        logger.warning(f"No se pudo resolver autores en batch: {e}")
        return {}


# ---------------------------------------------------------------------------
# Caché en memoria (catálogos estáticos y resolución de facultad)
# ---------------------------------------------------------------------------
# Facultades, carreras y las secciones activas del foro cambian con baja
# frecuencia; se cachean en proceso con TTL para cortar round-trips repetidos
# por request. El TTL se mantiene corto para no retrasar cambios administrativos.

_CATALOGO_TTL = 300  # 5 minutos
_cat_cache: dict = {}
_cat_cache_ts: dict = {}
_cat_lock = threading.Lock()


def _cat_get(key: str):
    with _cat_lock:
        ts = _cat_cache_ts.get(key)
        if ts is None:
            return None
        if time.time() - ts > _CATALOGO_TTL:
            _cat_cache.pop(key, None)
            _cat_cache_ts.pop(key, None)
            return None
        return _cat_cache.get(key)


def _cat_set(key: str, valor) -> None:
    with _cat_lock:
        _cat_cache[key] = valor
        _cat_cache_ts[key] = time.time()


def _nombres_facultad(supabase) -> dict:
    """{facultad_id: nombre}, cacheado en proceso."""
    cacheado = _cat_get("facultades")
    if cacheado is not None:
        return cacheado
    try:
        fresp = supabase.table("facultades").select("id, nombre").execute()
        resultado = {
            f["id"]: f["nombre"] for f in (getattr(fresp, "data", None) or [])
        }
        _cat_set("facultades", resultado)
        return resultado
    except Exception as e:
        logger.warning(f"No se pudo cargar nombres de facultad: {e}")
        return {}


# ---------------------------------------------------------------------------
# Feed global (Fase 5): columnas desnormalizadas + helpers compartidos
# ---------------------------------------------------------------------------

# Columnas seleccionadas en cada lectura de publicaciones. Los contadores
# (num_comentarios/num_votos/num_vistas) son columnas reales mantenidas por
# triggers: leerlas evita los agregados en Python de fases anteriores.
_COLUMNAS_PUBLICACION = (
    "id, seccion_id, autor_perfil_id, titulo, cuerpo, tags, estado, "
    "created_at, updated_at, sugerencia_ia, "
    "num_comentarios, num_votos, num_vistas, portada_url, tipo_contenido"
)

# Columnas de comentarios con su contador desnormalizado.
_COLUMNAS_COMENTARIO = (
    "id, publicacion_id, autor_perfil_id, parent_id, cuerpo, created_at, "
    "es_solucion, num_votos"
)


def _ids_guardados(supabase, user, publicacion_ids: list) -> set:
    """Ids de publicaciones guardadas por el usuario (filtrado por ids)."""
    ids = [pid for pid in publicacion_ids if pid is not None]
    if not ids:
        return set()
    try:
        resp = (
            supabase.table("foro_guardados")
            .select("publicacion_id")
            .eq("perfil_id", user.id)
            .in_("publicacion_id", ids)
            .execute()
        )
        return {
            f["publicacion_id"]
            for f in (getattr(resp, "data", None) or [])
            if f.get("publicacion_id") is not None
        }
    except Exception as e:
        logger.warning(f"No se pudieron leer guardados: {e}")
        return set()


def _secciones_por_id(supabase) -> dict:
    """{seccion_id: {'tipo', 'titulo', 'facultad_id'}} de secciones activas."""
    filas = _cat_get("secciones_activas")
    if filas is None:
        resp = (
            supabase.table("foro_secciones")
            .select("id, tipo, titulo, descripcion, facultad_id, activa, created_at")
            .eq("activa", True)
            .execute()
        )
        filas = getattr(resp, "data", None) or []
        _cat_set("secciones_activas", filas)
    return {f["id"]: f for f in filas}


def _publicacion_out(
    fila: dict,
    autores: dict,
    mis_votos: dict,
    guardados: set,
    secciones: Optional[dict] = None,
    nombres_facultad: Optional[dict] = None,
) -> PublicacionOut:
    """Construye un PublicacionOut desde una fila de foro_publicaciones."""
    seccion = (secciones or {}).get(fila["seccion_id"]) or {}
    return PublicacionOut(
        id=fila["id"],
        seccion_id=fila["seccion_id"],
        autor_perfil_id=fila["autor_perfil_id"],
        autor_nombre=autores.get(fila["autor_perfil_id"]),
        titulo=fila["titulo"],
        cuerpo=fila["cuerpo"],
        tags=fila.get("tags") or [],
        estado=fila.get("estado", "abierta"),
        created_at=fila["created_at"],
        num_comentarios=fila.get("num_comentarios") or 0,
        num_votos=fila.get("num_votos") or 0,
        mi_voto=mis_votos.get(fila["id"], 0),
        num_vistas=fila.get("num_vistas") or 0,
        portada_url=fila.get("portada_url"),
        tipo_contenido=fila.get("tipo_contenido") or "text",
        guardado=fila["id"] in guardados,
        seccion_tipo=seccion.get("tipo"),
        seccion_titulo=seccion.get("titulo"),
        facultad_nombre=(nombres_facultad or {}).get(seccion.get("facultad_id")),
        sugerencia_ia=fila.get("sugerencia_ia"),
    )


def _sanitizar_busqueda(q: str) -> str:
    """Limpia el término de búsqueda para websearch_to_tsquery.

    PostgREST interpreta ciertos caracteres como operadores; se eliminan para
    evitar 400s y se trunca a un tamaño razonable.
    """
    limpia = q.strip()[:200]
    # Quitar caracteres con significado especial en la sintaxis FTS/PostgREST.
    for ch in ("(", ")", ":", "'", "&", "|", "!", "<", ">"):
        limpia = limpia.replace(ch, " ")
    return " ".join(limpia.split())


def _num_votos_publicacion(supabase, publicacion_id: int) -> int:
    """Lee num_votos de columna (mantenido por trigger)."""
    try:
        resp = (
            supabase.table("foro_publicaciones")
            .select("num_votos")
            .eq("id", publicacion_id)
            .maybe_single()
            .execute()
        )
        fila = getattr(resp, "data", None) if resp else None
        return (fila or {}).get("num_votos") or 0
    except Exception as e:
        logger.warning(f"No se pudo leer num_votos de {publicacion_id}: {e}")
        return 0


def _num_votos_comentario(supabase, comentario_id: int) -> int:
    try:
        resp = (
            supabase.table("foro_comentarios")
            .select("num_votos")
            .eq("id", comentario_id)
            .maybe_single()
            .execute()
        )
        fila = getattr(resp, "data", None) if resp else None
        return (fila or {}).get("num_votos") or 0
    except Exception as e:
        logger.warning(f"No se pudo leer num_votos de comentario {comentario_id}: {e}")
        return 0


# ---------------------------------------------------------------------------
# Votos
# ---------------------------------------------------------------------------
# Desde la Fase 5 los acumulados num_votos viven en columna (trigger); estas
# secciones solo necesitan el voto del usuario actual para la UI.

def _mis_votos(supabase, user, publicacion_ids: list = None, comentario_ids: list = None) -> dict:
    """{objetivo_id: valor del voto del usuario} en batch (evita N+1).

    Solo uno de los dos conjuntos debe venir poblado por llamada.
    """
    resultado: dict = {}
    if publicacion_ids:
        ids = [pid for pid in publicacion_ids if pid is not None]
        if ids:
            try:
                resp = (
                    supabase.table("foro_votos")
                    .select("publicacion_id, valor")
                    .eq("autor_perfil_id", user.id)
                    .in_("publicacion_id", ids)
                    .execute()
                )
                for v in (getattr(resp, "data", None) or []):
                    if v.get("publicacion_id") is not None:
                        resultado[v["publicacion_id"]] = v.get("valor") or 0
            except Exception as e:
                logger.warning(f"No se pudo leer mis votos: {e}")
    if comentario_ids:
        ids = [cid for cid in comentario_ids if cid is not None]
        if ids:
            try:
                resp = (
                    supabase.table("foro_votos")
                    .select("comentario_id, valor")
                    .eq("autor_perfil_id", user.id)
                    .in_("comentario_id", ids)
                    .execute()
                )
                for v in (getattr(resp, "data", None) or []):
                    if v.get("comentario_id") is not None:
                        resultado[v["comentario_id"]] = v.get("valor") or 0
            except Exception as e:
                logger.warning(f"No se pudo leer mis votos: {e}")
    return resultado


def _mi_voto(supabase, user, publicacion_id: int = None, comentario_id: int = None) -> int:
    """Voto del usuario actual sobre un objetivo (0 si no votó)."""
    try:
        query = supabase.table("foro_votos").select("valor")
        if publicacion_id is not None:
            query = query.eq("publicacion_id", publicacion_id)
        else:
            query = query.eq("comentario_id", comentario_id)
        query = query.eq("autor_perfil_id", user.id)
        resp = query.maybe_single().execute()
        fila = getattr(resp, "data", None) if resp else None
        return (fila or {}).get("valor") or 0
    except Exception as e:
        logger.warning(f"No se pudo leer mi voto: {e}")
        return 0


# ---------------------------------------------------------------------------
# Secciones
# ---------------------------------------------------------------------------

@router.get("/foro/secciones", response_model=list[SeccionOut])
async def listar_secciones(user_data=Depends(get_current_user)):
    """Secciones visibles para el estudiante.

    Global + los canales por facultad que correspondan a la facultad del
    usuario. Sin facultad resoluble solo se muestran las globales.
    """
    user, token = user_data
    supabase = get_supabase(token)

    facultad_id = _facultad_del_usuario(supabase, user)

    # Las secciones activas cambian con baja frecuencia: se cachean en proceso.
    filas = _cat_get("secciones_activas")
    if filas is None:
        resp = (
            supabase.table("foro_secciones")
            .select("id, tipo, titulo, descripcion, facultad_id, activa, created_at")
            .eq("activa", True)
            .order("tipo")
            .execute()
        )
        filas = getattr(resp, "data", None) or []
        _cat_set("secciones_activas", filas)

    seccion_ids = [f["id"] for f in filas]

    # Conteo de publicaciones por sección para la lista (filtrado por ids).
    counts: dict = {}
    if seccion_ids:
        try:
            agg = (
                supabase.table("foro_publicaciones")
                .select("seccion_id")
                .in_("seccion_id", seccion_ids)
                .execute()
            )
            for p in (getattr(agg, "data", None) or []):
                sid = p.get("seccion_id")
                counts[sid] = counts.get(sid, 0) + 1
        except Exception as e:
            logger.warning(f"No se pudo contar publicaciones: {e}")

    # Nombre de facultad para los canales por facultad (cacheado).
    nombres_facultad = _nombres_facultad(supabase)

    visibles = []
    for fila in filas:
        if fila["tipo"] == "facultad" and fila.get("facultad_id") != facultad_id:
            continue
        visibles.append(
            SeccionOut(
                id=fila["id"],
                tipo=fila["tipo"],
                titulo=fila["titulo"],
                descripcion=fila.get("descripcion"),
                facultad_id=fila.get("facultad_id"),
                activa=fila.get("activa", True),
                num_publicaciones=counts.get(fila["id"], 0),
                facultad_nombre=nombres_facultad.get(fila.get("facultad_id")),
            )
        )

    return visibles


@router.post("/foro/secciones", response_model=SeccionOut, status_code=201)
async def crear_seccion(datos: SeccionCreate, user_data=Depends(get_current_user)):
    """Crea una sección. Solo moderadores (foro_moderadores)."""
    user, token = user_data
    supabase = get_supabase(token)

    if not _es_moderador(supabase, user):
        raise HTTPException(status_code=403, detail="Solo los moderadores pueden crear secciones.")

    if datos.tipo == "facultad" and not datos.facultad_id:
        raise HTTPException(
            status_code=422, detail="Una sección de facultad requiere facultad_id."
        )

    resp = (
        supabase.table("foro_secciones")
        .insert({
            "tipo": datos.tipo,
            "titulo": datos.titulo,
            "descripcion": datos.descripcion,
            "facultad_id": datos.facultad_id if datos.tipo == "facultad" else None,
        })
        .execute()
    )
    fila = getattr(resp, "data", None) or []
    if not fila:
        raise HTTPException(status_code=500, detail="No se pudo crear la sección.")

    nueva = fila[0]
    # Invalidar caché de secciones activas para reflejar la nueva sección.
    _cat_set("secciones_activas", None)
    return SeccionOut(
        id=nueva["id"],
        tipo=nueva["tipo"],
        titulo=nueva["titulo"],
        descripcion=nueva.get("descripcion"),
        facultad_id=nueva.get("facultad_id"),
        activa=nueva.get("activa", True),
    )


# ---------------------------------------------------------------------------
# Publicaciones
# ---------------------------------------------------------------------------

@router.get("/foro/secciones/{seccion_id}/publicaciones", response_model=list[PublicacionOut])
async def listar_publicaciones(seccion_id: int, user_data=Depends(get_current_user)):
    """Hilos de una sección, con conteo de comentarios y nombre del autor."""
    user, token = user_data
    supabase = get_supabase(token)

    seccion = _seccion_o_404(supabase, seccion_id, user)
    if seccion is None:
        raise HTTPException(status_code=404, detail="Sección no encontrada.")

    resp = (
        supabase.table("foro_publicaciones")
        .select(_COLUMNAS_PUBLICACION)
        .eq("seccion_id", seccion_id)
        .order("created_at", desc=True)
        .execute()
    )
    filas = getattr(resp, "data", None) or []
    ids = [f["id"] for f in filas]

    autores = _nombres_autores(supabase, [f["autor_perfil_id"] for f in filas])
    mis_votos = _mis_votos(supabase, user, publicacion_ids=ids)
    guardados = _ids_guardados(supabase, user, ids)

    return [
        _publicacion_out(fila, autores, mis_votos, guardados)
        for fila in filas
    ]


@router.get("/foro/publicaciones/{publicacion_id}", response_model=PublicacionOut)
async def obtener_publicacion(publicacion_id: int, user_data=Depends(get_current_user)):
    """Detalle de un hilo (sin comentarios anidados: esos van en otro endpoint)."""
    user, token = user_data
    supabase = get_supabase(token)

    resp = (
        supabase.table("foro_publicaciones")
        .select(_COLUMNAS_PUBLICACION)
        .eq("id", publicacion_id)
        .maybe_single()
        .execute()
    )
    fila = getattr(resp, "data", None) if resp else None
    if not fila:
        raise HTTPException(status_code=404, detail="Publicación no encontrada.")

    # Verificar que el usuario puede ver la sección del hilo.
    if not _seccion_o_404(supabase, fila["seccion_id"], user):
        raise HTTPException(status_code=404, detail="Publicación no encontrada.")

    return _publicacion_out(
        fila,
        autores={fila["autor_perfil_id"]: _nombre_autor(supabase, fila["autor_perfil_id"])},
        mis_votos={fila["id"]: _mi_voto(supabase, user, publicacion_id=fila["id"])},
        guardados=_ids_guardados(supabase, user, [fila["id"]]),
        secciones=_secciones_por_id(supabase),
        nombres_facultad=_nombres_facultad(supabase),
    )


@router.post("/foro/publicaciones", response_model=PublicacionOut, status_code=201)
async def crear_publicacion(
    datos: PublicacionCreate,
    background_tasks: BackgroundTasks,
    user_data=Depends(get_current_user),
    x_idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
):
    """Crea un hilo en una sección visible para el usuario.

    Tras crearlo, encola en background el triaje IA (fire-and-forget): si la
    publicación es una duda académica y el RAG encuentra fuentes relevantes, el
    bot genera una sugerencia y la guarda en `sugerencia_ia` sin bloquear el
    POST original.

    Idempotente: con el header `Idempotency-Key`, un doble envío (reintento de
    red o doble clic) devuelve la publicación ya creada en lugar de duplicarla.
    """
    user, token = user_data
    supabase = get_supabase(token)

    from app.core.idempotencia import verificar_idempotencia, registrar_resultado, liberar_clave
    previa = await verificar_idempotencia(str(user.id), x_idempotency_key)
    if previa is not None:
        return previa

    try:
        if not _seccion_o_404(supabase, datos.seccion_id, user):
            raise HTTPException(status_code=404, detail="Sección no encontrada.")

        resp = (
            supabase.table("foro_publicaciones")
            .insert({
                "seccion_id": datos.seccion_id,
                "autor_perfil_id": user.id,
                "titulo": datos.titulo,
                "cuerpo": datos.cuerpo,
                "tags": datos.tags,
            })
            .execute()
        )
    except Exception:
        await liberar_clave(str(user.id), x_idempotency_key)
        raise
    fila = getattr(resp, "data", None) or []
    if not fila:
        await liberar_clave(str(user.id), x_idempotency_key)
        raise HTTPException(status_code=500, detail="No se pudo crear la publicación.")

    nueva = fila[0]
    # Triaje IA asíncrono: recibe el id y el token para respetar RLS en la
    # consulta del RAG. Nunca debe reventar el turno si el modelo falla.
    background_tasks.add_task(
        _generar_sugerencia_ia, nueva["id"], token
    )
    publicacion = PublicacionOut(
        id=nueva["id"],
        seccion_id=nueva["seccion_id"],
        autor_perfil_id=nueva["autor_perfil_id"],
        autor_nombre=_nombre_autor(supabase, nueva["autor_perfil_id"]),
        titulo=nueva["titulo"],
        cuerpo=nueva["cuerpo"],
        tags=nueva.get("tags") or [],
        estado=nueva.get("estado", "abierta"),
        created_at=nueva["created_at"],
        num_votos=0,
        mi_voto=0,
        sugerencia_ia=None,
    )
    await registrar_resultado(str(user.id), x_idempotency_key, publicacion.model_dump(mode="json"))
    return publicacion


@router.delete("/foro/publicaciones/{publicacion_id}", status_code=200)
async def borrar_publicacion(publicacion_id: int, user_data=Depends(get_current_user)):
    """Borra un hilo. Solo el autor o un moderador (lo valida RLS)."""
    user, token = user_data
    supabase = get_supabase(token)

    es_mod = _es_moderador(supabase, user)
    query = supabase.table("foro_publicaciones").delete().eq("id", publicacion_id)
    if not es_mod:
        query = query.eq("autor_perfil_id", user.id)
    resp = query.execute()
    # RLS filtra filas: si no era suya ni moderador, no hay nada borrado.
    if not (getattr(resp, "data", None) or []):
        raise HTTPException(
            status_code=404, detail="Publicación no encontrada o sin permiso para borrarla."
        )
    return {"ok": True}


# ---------------------------------------------------------------------------
# Comentarios
# ---------------------------------------------------------------------------

@router.get("/foro/publicaciones/{publicacion_id}/comentarios", response_model=list[ComentarioOut])
async def listar_comentarios(publicacion_id: int, user_data=Depends(get_current_user)):
    """Comentarios de un hilo, en orden cronológico."""
    user, token = user_data
    supabase = get_supabase(token)

    # El hilo debe ser visible.
    pub = (
        supabase.table("foro_publicaciones")
        .select("id, seccion_id")
        .eq("id", publicacion_id)
        .maybe_single()
        .execute()
    )
    if not (getattr(pub, "data", None) if pub else None):
        raise HTTPException(status_code=404, detail="Publicación no encontrada.")
    if not _seccion_o_404(supabase, pub.data["seccion_id"], user):
        raise HTTPException(status_code=404, detail="Publicación no encontrada.")

    resp = (
        supabase.table("foro_comentarios")
        .select(_COLUMNAS_COMENTARIO)
        .eq("publicacion_id", publicacion_id)
        .order("created_at")
        .execute()
    )
    filas = getattr(resp, "data", None) or []
    ids = [f["id"] for f in filas]
    autores = _nombres_autores(supabase, [f["autor_perfil_id"] for f in filas])
    mis_votos = _mis_votos(supabase, user, comentario_ids=ids)
    return [
        ComentarioOut(
            id=f["id"],
            publicacion_id=f["publicacion_id"],
            autor_perfil_id=f["autor_perfil_id"],
            autor_nombre=autores.get(f["autor_perfil_id"]),
            parent_id=f.get("parent_id"),
            cuerpo=f["cuerpo"],
            created_at=f["created_at"],
            num_votos=f.get("num_votos") or 0,
            mi_voto=mis_votos.get(f["id"], 0),
            es_solucion=f.get("es_solucion", False),
        )
        for f in filas
    ]


@router.post("/foro/publicaciones/{publicacion_id}/comentarios", response_model=ComentarioOut, status_code=201)
async def crear_comentario(publicacion_id: int, datos: ComentarioCreate, user_data=Depends(get_current_user)):
    """Comenta en un hilo (opcionalmente responde a otro comentario)."""
    user, token = user_data
    supabase = get_supabase(token)

    if datos.publicacion_id != publicacion_id:
        raise HTTPException(
            status_code=422, detail="El id de la publicación no coincide con la ruta."
        )

    pub = (
        supabase.table("foro_publicaciones")
        .select("id, seccion_id")
        .eq("id", publicacion_id)
        .maybe_single()
        .execute()
    )
    if not (getattr(pub, "data", None) if pub else None):
        raise HTTPException(status_code=404, detail="Publicación no encontrada.")
    if not _seccion_o_404(supabase, pub.data["seccion_id"], user):
        raise HTTPException(status_code=404, detail="Publicación no encontrada.")

    # Validar parent_id (si viene) dentro del mismo hilo.
    if datos.parent_id is not None:
        padre = (
            supabase.table("foro_comentarios")
            .select("id, publicacion_id")
            .eq("id", datos.parent_id)
            .maybe_single()
            .execute()
        )
        padre_fila = getattr(padre, "data", None) if padre else None
        if not padre_fila or padre_fila["publicacion_id"] != publicacion_id:
            raise HTTPException(
                status_code=422, detail="El comentario padre no pertenece a esta publicación."
            )

    resp = (
        supabase.table("foro_comentarios")
        .insert({
            "publicacion_id": publicacion_id,
            "autor_perfil_id": user.id,
            "parent_id": datos.parent_id,
            "cuerpo": datos.cuerpo,
        })
        .execute()
    )
    fila = getattr(resp, "data", None) or []
    if not fila:
        raise HTTPException(status_code=500, detail="No se pudo crear el comentario.")

    nueva = fila[0]
    return ComentarioOut(
        id=nueva["id"],
        publicacion_id=nueva["publicacion_id"],
        autor_perfil_id=nueva["autor_perfil_id"],
        autor_nombre=_nombre_autor(supabase, nueva["autor_perfil_id"]),
        parent_id=nueva.get("parent_id"),
        cuerpo=nueva["cuerpo"],
        created_at=nueva["created_at"],
        num_votos=0,
        mi_voto=0,
        es_solucion=False,
    )


@router.delete("/foro/comentarios/{comentario_id}", status_code=200)
async def borrar_comentario(comentario_id: int, user_data=Depends(get_current_user)):
    """Borra un comentario. Solo el autor o un moderador."""
    user, token = user_data
    supabase = get_supabase(token)

    es_mod = _es_moderador(supabase, user)
    query = supabase.table("foro_comentarios").delete().eq("id", comentario_id)
    if not es_mod:
        query = query.eq("autor_perfil_id", user.id)
    resp = query.execute()
    if not (getattr(resp, "data", None) or []):
        raise HTTPException(
            status_code=404, detail="Comentario no encontrado o sin permiso para borrarlo."
        )
    return {"ok": True}


# ---------------------------------------------------------------------------
# Votos (Fase 2)
# ---------------------------------------------------------------------------

@router.post("/foro/votos", response_model=VotoOut)
async def votar(datos: VotoCreate, user_data=Depends(get_current_user)):
    """Vota (up/down) sobre una publicación o un comentario, con toggle.

    - Si el usuario ya votó el objetivo con el MISMO valor, se anula (borra).
    - Si ya votó con OTRO valor, se actualiza al nuevo.
    - Si no votó, se inserta.
    Devuelve el voto vigente y el nuevo acumulado del objetivo.
    """
    user, token = user_data
    supabase = get_supabase(token)

    if (datos.publicacion_id is None) == (datos.comentario_id is None):
        raise HTTPException(
            status_code=422,
            detail="Debes indicar exactamente uno de publicacion_id o comentario_id.",
        )

    # Validar que el objetivo existe y su sección es visible para el usuario.
    if datos.publicacion_id is not None:
        pub = (
            supabase.table("foro_publicaciones")
            .select("id, seccion_id")
            .eq("id", datos.publicacion_id)
            .maybe_single()
            .execute()
        )
        pub_fila = getattr(pub, "data", None) if pub else None
        if not pub_fila:
            raise HTTPException(status_code=404, detail="Publicación no encontrada.")
        if not _seccion_o_404(supabase, pub_fila["seccion_id"], user):
            raise HTTPException(status_code=404, detail="Publicación no encontrada.")
        objetivo = {"publicacion_id": datos.publicacion_id}
    else:
        com = (
            supabase.table("foro_comentarios")
            .select("id, publicacion_id")
            .eq("id", datos.comentario_id)
            .maybe_single()
            .execute()
        )
        com_fila = getattr(com, "data", None) if com else None
        if not com_fila:
            raise HTTPException(status_code=404, detail="Comentario no encontrado.")
        pub = (
            supabase.table("foro_publicaciones")
            .select("seccion_id")
            .eq("id", com_fila["publicacion_id"])
            .maybe_single()
            .execute()
        )
        pub_fila = getattr(pub, "data", None) if pub else None
        if not pub_fila or not _seccion_o_404(supabase, pub_fila["seccion_id"], user):
            raise HTTPException(status_code=404, detail="Comentario no encontrado.")
        objetivo = {"comentario_id": datos.comentario_id}

    # Voto existente del usuario sobre este objetivo.
    try:
        query = supabase.table("foro_votos").select("id, valor")
        for clave, val in objetivo.items():
            query = query.eq(clave, val)
        query = query.eq("autor_perfil_id", user.id)
        existente = query.maybe_single().execute()
    except Exception as e:
        logger.error(f"Error consultando voto existente: {e}")
        raise HTTPException(status_code=500, detail="No se pudo procesar el voto.")

    fila = getattr(existente, "data", None) if existente else None

    try:
        if fila and fila.get("valor") == datos.valor:
            # Toggle: mismo valor -> anular.
            supabase.table("foro_votos").delete().eq("id", fila["id"]).execute()
            mi_voto = 0
        elif fila:
            # Cambio de opción: actualizar valor.
            supabase.table("foro_votos").update({"valor": datos.valor}).eq("id", fila["id"]).execute()
            mi_voto = datos.valor
        else:
            # Nuevo voto.
            supabase.table("foro_votos").insert({
                **objetivo,
                "autor_perfil_id": user.id,
                "valor": datos.valor,
            }).execute()
            mi_voto = datos.valor
    except Exception as e:
        logger.error(f"Error aplicando voto: {e}")
        raise HTTPException(status_code=500, detail="No se pudo procesar el voto.")

    # Nuevo acumulado del objetivo (columna desnormalizada, tras el trigger).
    if datos.publicacion_id is not None:
        num_votos = _num_votos_publicacion(supabase, datos.publicacion_id)
    else:
        num_votos = _num_votos_comentario(supabase, datos.comentario_id)

    return VotoOut(
        id=(fila or {}).get("id") or 0,
        autor_perfil_id=user.id,
        publicacion_id=datos.publicacion_id,
        comentario_id=datos.comentario_id,
        valor=mi_voto,
        num_votos=num_votos,
        mi_voto=mi_voto,
    )


# ---------------------------------------------------------------------------
# Moderadores (solo backend / service_role)
# ---------------------------------------------------------------------------

@router.post("/foro/moderadores", status_code=201)
async def asignar_moderador(datos: ModeradorCreate, user_data=Depends(get_current_user)):
    """Asigna un moderador. Solo puede hacerlo otro moderador.

    Nota: en esta fase se usa como utilidad administrativa; la gestión plena
    de moderadores queda reservada al service_role para no exponerla al cliente.
    """
    user, token = user_data
    supabase = get_supabase(token)

    if not _es_moderador(supabase, user):
        raise HTTPException(status_code=403, detail="Solo los moderadores pueden asignar moderadores.")

    # El RLS de foro_moderadores no expone INSERT al cliente; se usa service_role.
    admin = get_admin_client()  # cliente con service role
    try:
        resp = (
            admin.table("foro_moderadores")
            .insert({"perfil_id": datos.perfil_id})
            .execute()
        )
    except Exception as e:
        logger.error(f"Error asignando moderador: {e}")
        raise HTTPException(status_code=500, detail="No se pudo asignar el moderador.")

    if not (getattr(resp, "data", None) or []):
        raise HTTPException(status_code=500, detail="No se pudo asignar el moderador.")
    return {"ok": True, "perfil_id": datos.perfil_id}


@router.get("/foro/moderadores")
async def listar_moderadores(user_data=Depends(get_current_user)):
    """Perfil_ids de los moderadores del foro.

    Se usa para pintar el badge de moderador junto al autor en hilos y
    comentarios. Es público (SELECT a foro_moderadores), pero no revela datos
    sensibles: solo los ids de los perfiles moderadores.
    """
    _user, token = user_data
    supabase = get_supabase(token)
    try:
        resp = supabase.table("foro_moderadores").select("perfil_id").execute()
    except Exception as e:
        logger.error(f"Error listando moderadores: {e}")
        raise HTTPException(status_code=500, detail="No se pudieron cargar los moderadores.")
    return [f["perfil_id"] for f in (getattr(resp, "data", None) or [])]


# ---------------------------------------------------------------------------
# Validación de visibilidad de sección
# ---------------------------------------------------------------------------

def _seccion_o_404(supabase, seccion_id: int, user) -> Optional[dict]:
    """Devuelve la sección si es visible para el usuario; si no, None.

    Global -> visible para todos. Por facultad -> solo si coincide con la
    facultad del usuario.
    """
    try:
        resp = (
            supabase.table("foro_secciones")
            .select("id, tipo, facultad_id, activa")
            .eq("id", seccion_id)
            .eq("activa", True)
            .maybe_single()
            .execute()
        )
    except Exception as e:
        logger.error(f"Error consultando sección {seccion_id}: {e}")
        return None
    seccion = getattr(resp, "data", None) if resp else None
    if not seccion:
        return None
    if seccion["tipo"] == "global":
        return seccion
    facultad_id = _facultad_del_usuario(supabase, user)
    if seccion.get("facultad_id") == facultad_id:
        return seccion
    return None


# ---------------------------------------------------------------------------
# Triaje y respuestas IA asíncronas (Fase 4)
# ---------------------------------------------------------------------------

# Umbral de activación de la sugerencia IA (dedicado y exigente).
FORO_UMBRAL_IA = float(os.getenv("FORO_UMBRAL_IA", "0.35"))
# Fragmentos del RAG que se inyectan a la generación.
FORO_TOP_K_IA = 3
# Etiquetas que activan el triaje sin llamar al clasificador.
_TAGS_DUDA = {"duda", "dudas", "ejercicio", "ejercicios", "problema", "problemas",
              "pregunta", "preguntas", "examen", "parcial", "practica", "practicas"}


def _es_duda_academica(tags: list, titulo: str, cuerpo: str) -> bool:
    """Detecta si la publicación es una duda académica.

    Híbrido confirmado: primero por tags/keys (barato, sin costo de LLM); si no
    hay señales claras, se delega en `intents.clasificar` (más preciso, con
    costo) como respaldo.
    """
    texto = f"{titulo} {cuerpo}".lower()
    if any(t.lower() in _TAGS_DUDA for t in (tags or [])):
        return True
    if any(palabra in texto for palabra in ("cuántas horas", "cómo resuelvo", "qué es",
                                            "explícame", "no entiendo", "ayuda", "derivada",
                                            "integral", "teorema", "fórmula")):
        return True
    # Respaldo: clasificador de intención del chatbot. Lanza ante cuota, pero
    # como esto corre en background un fallo solo degrada a "no es duda".
    try:
        from app.chatbot import intents
        return intents.clasificar(texto) == intents.DUDA_ACADEMICA
    except Exception as e:
        logger.info("Clasificador de duda no disponible (%s); se asume no-duda.", e)
        return False


def _generar_sugerencia_ia(publicacion_id: int, token: str) -> None:
    """Triaje IA en background: recupera contexto RAG y genera una sugerencia.

    Nunca lanza: un fallo (modelo, red, RLS) solo se registra. La respuesta
    HTTP del POST original ya se envió; esto corre desacoplado.
    """
    try:
        supabase = get_supabase(token)

        publicacion = (
            supabase.table("foro_publicaciones")
            .select("id, titulo, cuerpo, tags")
            .eq("id", publicacion_id)
            .maybe_single()
            .execute()
        )
        fila = getattr(publicacion, "data", None) if publicacion else None
        if not fila:
            logger.info("Triaje IA: publicación %s ya no existe.", publicacion_id)
            return

        if not _es_duda_academica(fila.get("tags") or [], fila.get("titulo") or "", fila.get("cuerpo") or ""):
            logger.info("Triaje IA: publicación %s no es una duda académica; se omite.", publicacion_id)
            return

        from app.rag.retriever import SyllabusRetriever

        pregunta = f"{fila.get('titulo', '')} {fila.get('cuerpo', '')}".strip()
        fragmentos = SyllabusRetriever(token=token).buscar_contexto(
            pregunta,
            limit=FORO_TOP_K_IA,
            umbral_similitud=FORO_UMBRAL_IA,
        )
        if not fragmentos:
            logger.info("Triaje IA: sin fuentes relevantes para %s.", publicacion_id)
            return

        contenido = "\n\n---\n".join(
            (f.get("contenido") or "").strip()
            for f in fragmentos
            if f.get("contenido")
        )
        fuentes = [{"curso_id": f.get("curso_id"), "recurso_id": f.get("recurso_id"),
                    "similitud": round(float(f.get("similarity") or 0), 4)}
                   for f in fragmentos]

        from app.core.llm import chatear
        system = (
            "Eres el bot UniVia que ayuda a estudiantes en el foro. Responde con base "
            "EXCLUSIVA en el material del curso provisto. Sé claro y breve (2-3 párrafos). "
            "No inventes datos que no estén en el material; si falta contexto, dilo."
        )
        mensaje = f"Pregunta del estudiante:\n{pregunta}\n\nMaterial del curso:\n{contenido}"
        respuesta = chatear([{"role": "user", "content": mensaje}], system=system, max_tokens=700)

        if not respuesta or not respuesta.strip():
            logger.info("Triaje IA: modelo no devolvió respuesta para %s.", publicacion_id)
            return

        supabase.table("foro_publicaciones").update({
            "sugerencia_ia": {
                "respuesta": respuesta.strip(),
                "fuentes": fuentes,
                "aceptada": False,
            }
        }).eq("id", publicacion_id).execute()

        logger.info("Triaje IA: sugerencia guardada para publicación %s.", publicacion_id)
    except Exception as e:
        logger.error("Triaje IA falló para publicación %s: %s", publicacion_id, e)


@router.post("/foro/publicaciones/{publicacion_id}/resolver", status_code=200)
async def resolver_hilo(
    publicacion_id: int,
    datos: ResolverRequest,
    user_data=Depends(get_current_user),
):
    """Marca una respuesta (o la sugerencia IA) como la solución del hilo.

    Solo el autor de la publicación puede resolver. Acepta `comentario_id`
    (marca es_solucion=true) o `aceptar_sugerencia_ia=true` (acepta la sugerencia
    del bot). En ambos casos el estado del hilo pasa a 'resuelta'.
    """
    user, token = user_data
    supabase = get_supabase(token)

    if (datos.comentario_id is None) == (not datos.aceptar_sugerencia_ia):
        raise HTTPException(
            status_code=422,
            detail="Debes indicar un comentario_id o aceptar_sugerencia_ia (no ambos).",
        )

    publicacion = (
        supabase.table("foro_publicaciones")
        .select("id, autor_perfil_id, estado")
        .eq("id", publicacion_id)
        .maybe_single()
        .execute()
    )
    fila = getattr(publicacion, "data", None) if publicacion else None
    if not fila:
        raise HTTPException(status_code=404, detail="Publicación no encontrada.")

    # Solo el autor del hilo puede marcarlo como resuelto.
    if fila["autor_perfil_id"] != user.id:
        raise HTTPException(status_code=403, detail="Solo el autor puede resolver el hilo.")

    if datos.comentario_id is not None:
        comentario = (
            supabase.table("foro_comentarios")
            .select("id, publicacion_id")
            .eq("id", datos.comentario_id)
            .maybe_single()
            .execute()
        )
        com_fila = getattr(comentario, "data", None) if comentario else None
        if not com_fila or com_fila["publicacion_id"] != publicacion_id:
            raise HTTPException(
                status_code=422, detail="El comentario no pertenece a esta publicación."
            )
        # Marcar solución en el comentario y quitar marca de otros comentarios del hilo.
        supabase.table("foro_comentarios").update({"es_solucion": False}).eq(
            "publicacion_id", publicacion_id
        ).execute()
        supabase.table("foro_comentarios").update({"es_solucion": True}).eq(
            "id", datos.comentario_id
        ).execute()
        # Al resolver por comentario, si había sugerencia IA, queda como no aceptada.
        supabase.table("foro_publicaciones").update({
            "estado": "resuelta",
            "sugerencia_ia": None,
        }).eq("id", publicacion_id).execute()
    elif datos.aceptar_sugerencia_ia:
        # Aceptar la sugerencia del bot.
        pub = (
            supabase.table("foro_publicaciones")
            .select("sugerencia_ia")
            .eq("id", publicacion_id)
            .maybe_single()
            .execute()
        )
        sugerencia = getattr(pub, "data", None) if pub else None
        sugerencia_ia = (sugerencia or {}).get("sugerencia_ia")
        if not sugerencia_ia:
            raise HTTPException(status_code=404, detail="Este hilo no tiene sugerencia de la IA.")
        sugerencia_ia["aceptada"] = True
        supabase.table("foro_publicaciones").update({
            "estado": "resuelta",
            "sugerencia_ia": sugerencia_ia,
        }).eq("id", publicacion_id).execute()

    return {"ok": True, "estado": "resuelta"}


# ---------------------------------------------------------------------------
# Feed global, tendencias, guardados y vistas (Fase 5)
# ---------------------------------------------------------------------------

# Límites del feed.
_FEED_LIMIT_DEFECTO = 10
_FEED_LIMIT_MAX = 30
# Filas que se traen para ordenar "tendencia" en memoria antes de paginar.
_FEED_VENTANA_TENDENCIA = 100

_ORDENES_FEED = ("recientes", "comentados", "tendencia")
_FILTROS_FEED = ("mis-hilos", "guardados", "sin-resolver", "mi-actividad")


def _secciones_visibles_ids(supabase, user) -> list:
    """Ids de secciones visibles para el usuario (globales + su facultad)."""
    facultad_id = _facultad_del_usuario(supabase, user)
    secciones = _secciones_por_id(supabase)
    return [
        sid for sid, s in secciones.items()
        if s.get("tipo") == "global" or s.get("facultad_id") == facultad_id
    ]


def _score_tendencia(fila: dict) -> float:
    """Score de tendencia: comentarios*3 + votos*2 + vistas*0.1."""
    return (
        (fila.get("num_comentarios") or 0) * 3
        + (fila.get("num_votos") or 0) * 2
        + (fila.get("num_vistas") or 0) * 0.1
    )


def _query_feed(supabase, user, q, seccion_id, facultad_id, tag, estado, filtro):
    """Query base del feed ya filtrada (sin orden ni rango)."""
    visibles = _secciones_visibles_ids(supabase, user)
    if not visibles:
        return None

    secciones = _secciones_por_id(supabase)
    if facultad_id is not None:
        visibles = [
            sid for sid in visibles
            if secciones.get(sid, {}).get("facultad_id") == facultad_id
        ]
        if not visibles:
            return None

    query = supabase.table("foro_publicaciones").select(_COLUMNAS_PUBLICACION)
    query = query.in_("seccion_id", visibles)

    if seccion_id is not None:
        query = query.eq("seccion_id", seccion_id)
    if tag:
        query = query.contains("tags", [tag.strip().lower()])
    if estado in ("abierta", "resuelta", "cerrada"):
        query = query.eq("estado", estado)

    if q:
        termino = _sanitizar_busqueda(q)
        if termino:
            # Full-text sobre search_vector (título A, cuerpo B, tags C) con
            # diccionario 'spanish'. postgrest-py no expone config en wfts(),
            # así que se usa la sintaxis de operador de PostgREST:
            #   ?search_vector=wfts(spanish).<consulta>
            query = query.filter("search_vector", "wfts(spanish)", termino)

    if filtro in _FILTROS_FEED:
        if filtro == "mis-hilos":
            query = query.eq("autor_perfil_id", user.id)
        elif filtro == "sin-resolver":
            query = query.eq("estado", "abierta")
        elif filtro == "guardados":
            resp = (
                supabase.table("foro_guardados")
                .select("publicacion_id")
                .eq("perfil_id", user.id)
                .execute()
            )
            ids = [f["publicacion_id"] for f in (getattr(resp, "data", None) or [])]
            if not ids:
                return None
            query = query.in_("id", ids)
        elif filtro == "mi-actividad":
            resp = (
                supabase.table("foro_comentarios")
                .select("publicacion_id")
                .eq("autor_perfil_id", user.id)
                .execute()
            )
            ids = {f["publicacion_id"] for f in (getattr(resp, "data", None) or [])}
            query = query.or_(
                f"autor_perfil_id.eq.{user.id},id.in.({','.join(str(i) for i in ids)})"
                if ids else f"autor_perfil_id.eq.{user.id}"
            )

    return query


@router.get("/foro/feed", response_model=FeedOut)
async def feed_global(
    q: Optional[str] = None,
    seccion_id: Optional[int] = None,
    facultad_id: Optional[int] = None,
    tag: Optional[str] = None,
    estado: Optional[str] = None,
    orden: str = "recientes",
    filtro: Optional[str] = None,
    limit: int = _FEED_LIMIT_DEFECTO,
    cursor: Optional[str] = None,
    user_data=Depends(get_current_user),
):
    """Feed global del foro con filtros, orden y paginación por cursor.

    - orden "recientes": keyset por (created_at, id); cursor = "fecha|id".
    - orden "comentados"/"tendencia": paginación por offset; cursor = offset.
    - "tendencia" ordena en memoria por score (comentarios*3 + votos*2 +
      vistas*0.1) sobre una ventana de resultados filtrados.
    """
    user, token = user_data
    supabase = get_supabase(token)

    if orden not in _ORDENES_FEED:
        raise HTTPException(status_code=422, detail=f"orden debe ser uno de {_ORDENES_FEED}.")
    if filtro is not None and filtro not in _FILTROS_FEED:
        raise HTTPException(status_code=422, detail=f"filtro debe ser uno de {_FILTROS_FEED}.")
    limit = max(1, min(limit, _FEED_LIMIT_MAX))

    query = _query_feed(supabase, user, q, seccion_id, facultad_id, tag, estado, filtro)
    if query is None:
        return FeedOut(publicaciones=[], siguiente_cursor=None, total=0)

    if orden == "recientes":
        query = query.order("created_at", desc=True).order("id", desc=True)
        if cursor:
            try:
                ts_cursor, id_cursor = cursor.rsplit("|", 1)
                query = query.or_(
                    f"created_at.lt.{ts_cursor},"
                    f"and(created_at.eq.{ts_cursor},id.lt.{id_cursor})"
                )
            except ValueError:
                raise HTTPException(status_code=422, detail="Cursor inválido.")
        resp = query.limit(limit + 1).execute()
        filas = getattr(resp, "data", None) or []
        siguiente = None
        if len(filas) > limit:
            extra = filas.pop()
            del extra
            ultima = filas[-1]
            siguiente = f"{ultima['created_at']}|{ultima['id']}"
        total = len(filas) + (1 if siguiente else 0)
    else:
        offset = 0
        if cursor:
            try:
                offset = max(0, int(cursor))
            except ValueError:
                raise HTTPException(status_code=422, detail="Cursor inválido.")
        if orden == "comentados":
            query = (
                query.order("num_comentarios", desc=True)
                .order("created_at", desc=True)
            )
            resp = query.range(offset, offset + limit).execute()
            filas = getattr(resp, "data", None) or []
            siguiente = str(offset + limit) if len(filas) > limit else None
            filas = filas[:limit]
            total = offset + len(filas) + (1 if siguiente else 0)
        else:  # tendencia: se ordena en memoria sobre una ventana.
            resp = (
                query.order("created_at", desc=True)
                .limit(_FEED_VENTANA_TENDENCIA)
                .execute()
            )
            candidatas = getattr(resp, "data", None) or []
            candidatas.sort(key=lambda f: (_score_tendencia(f), f["created_at"]),
                            reverse=True)
            filas = candidatas[offset: offset + limit]
            siguiente = (
                str(offset + limit) if len(candidatas) > offset + limit else None
            )
            total = offset + len(filas) + (1 if siguiente else 0)

    ids = [f["id"] for f in filas]
    autores = _nombres_autores(supabase, [f["autor_perfil_id"] for f in filas])
    mis_votos = _mis_votos(supabase, user, publicacion_ids=ids)
    guardados = _ids_guardados(supabase, user, ids)
    secciones = _secciones_por_id(supabase)
    nombres_facultad = _nombres_facultad(supabase)

    return FeedOut(
        publicaciones=[
            _publicacion_out(f, autores, mis_votos, guardados, secciones, nombres_facultad)
            for f in filas
        ],
        siguiente_cursor=siguiente,
        total=total,
    )


@router.get("/foro/tendencias", response_model=TendenciasOut)
async def tendencias(user_data=Depends(get_current_user)):
    """Top 5 hilos con mayor interacción reciente.

    Ventana principal: últimas 24h. Fallback: 7 días (el score se calcula con
    los contadores desnormalizados, no requiere agregados).
    """
    user, token = user_data
    supabase = get_supabase(token)

    visibles = _secciones_visibles_ids(supabase, user)
    if not visibles:
        return TendenciasOut(publicaciones=[], ventana="24h")

    filas, ventana = [], "24h"
    from datetime import datetime, timedelta, timezone
    for horas, etiqueta in ((24, "24h"), (168, "7d")):
        desde = (datetime.now(timezone.utc) - timedelta(hours=horas)).isoformat()
        resp = (
            supabase.table("foro_publicaciones")
            .select(_COLUMNAS_PUBLICACION)
            .in_("seccion_id", visibles)
            .gte("created_at", desde)
            .execute()
        )
        filas = getattr(resp, "data", None) or []
        if filas:
            ventana = etiqueta
            break

    filas.sort(key=lambda f: (_score_tendencia(f), f["created_at"]), reverse=True)
    top = filas[:5]
    ids = [f["id"] for f in top]
    return TendenciasOut(
        publicaciones=[
            _publicacion_out(
                f,
                _nombres_autores(supabase, [x["autor_perfil_id"] for x in top]),
                _mis_votos(supabase, user, publicacion_ids=ids),
                _ids_guardados(supabase, user, ids),
                _secciones_por_id(supabase),
                _nombres_facultad(supabase),
            )
            for f in top
        ],
        ventana=ventana,
    )


@router.post("/foro/publicaciones/{publicacion_id}/guardar", status_code=200)
async def guardar_publicacion(publicacion_id: int, user_data=Depends(get_current_user)):
    """Guarda un hilo (bookmark). Idempotente: re-guardar no falla."""
    user, token = user_data
    supabase = get_supabase(token)

    pub = (
        supabase.table("foro_publicaciones")
        .select("id, seccion_id")
        .eq("id", publicacion_id)
        .maybe_single()
        .execute()
    )
    fila = getattr(pub, "data", None) if pub else None
    if not fila or not _seccion_o_404(supabase, fila["seccion_id"], user):
        raise HTTPException(status_code=404, detail="Publicación no encontrada.")

    try:
        supabase.table("foro_guardados").upsert(
            {"perfil_id": user.id, "publicacion_id": publicacion_id},
            on_conflict="perfil_id,publicacion_id",
        ).execute()
    except Exception as e:
        logger.error(f"Error guardando publicación {publicacion_id}: {e}")
        raise HTTPException(status_code=500, detail="No se pudo guardar el hilo.")
    return {"ok": True, "guardado": True}


@router.delete("/foro/publicaciones/{publicacion_id}/guardar", status_code=200)
async def quitar_guardado(publicacion_id: int, user_data=Depends(get_current_user)):
    """Quita un hilo de los guardados del usuario. Idempotente."""
    user, token = user_data
    supabase = get_supabase(token)

    try:
        supabase.table("foro_guardados").delete().eq(
            "perfil_id", user.id
        ).eq("publicacion_id", publicacion_id).execute()
    except Exception as e:
        logger.error(f"Error quitando guardado de {publicacion_id}: {e}")
        raise HTTPException(status_code=500, detail="No se pudo quitar el guardado.")
    return {"ok": True, "guardado": False}


@router.post("/foro/publicaciones/{publicacion_id}/vista", status_code=200)
async def registrar_vista(publicacion_id: int, user_data=Depends(get_current_user)):
    """Registra una vista única (una por usuario e hilo) vía RPC.

    Devuelve el nuevo total de vistas del hilo.
    """
    user, token = user_data
    supabase = get_supabase(token)

    try:
        supabase.rpc("foro_registrar_vista", {"p_publicacion_id": publicacion_id}).execute()
    except Exception as e:
        logger.error(f"Error registrando vista de {publicacion_id}: {e}")
        raise HTTPException(status_code=500, detail="No se pudo registrar la vista.")

    try:
        resp = (
            supabase.table("foro_publicaciones")
            .select("num_vistas")
            .eq("id", publicacion_id)
            .maybe_single()
            .execute()
        )
        fila = getattr(resp, "data", None) if resp else None
        if fila is None:
            raise HTTPException(status_code=404, detail="Publicación no encontrada.")
        return {"ok": True, "num_vistas": (fila or {}).get("num_vistas") or 0}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error leyendo vistas de {publicacion_id}: {e}")
        raise HTTPException(status_code=500, detail="No se pudo leer el conteo.")