"""Gamificación: check-in de racha, resumen de XP/nivel, referidos y ranking.

Toda concesión de puntos pasa por `registro_puntos` (append-only) vía RPCs
`SECURITY DEFINER` o el cliente de servicio del backend; el frontend nunca
escribe el ledger. Las rachas se calculan en la zona horaria `America/Lima`
dentro de la base de datos (`fase10_checkin`).
"""

import asyncio
import base64
import logging
import os
from datetime import date, datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, Query, Request

from app.core.auth_utils import get_current_user
from app.core.database import get_admin_client, get_supabase
from app.core.rate_limit import limiter
from app.core.rpc import invocar_rpc
from app.schemas.gamificacion import (
    EntradaRanking,
    EventoCompartir,
    MiPosicionRanking,
    RegistroOnboardingReferido,
    RespuestaRanking,
    ResultadoCheckIn,
    ResultadoCompartir,
    ResultadoReferido,
    ResumenGamificacion,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/gamificacion", tags=["gamificacion"])

ZONA = None  # se inicializa perezosamente (ver _zona_lima)


def _zona_lima():
    """Zona horaria 'America/Lima'. En Windows o imágenes sin tzdata cae a
    UTC-5 fijo (Lima no usa horario de verano desde 1994)."""
    global ZONA
    if ZONA is not None:
        return ZONA
    try:
        ZONA = ZoneInfo("America/Lima")
    except Exception:  # noqa: BLE001 — falta el paquete tzdata en la plataforma
        ZONA = timezone(timedelta(hours=-5))
    return ZONA

# XP por referido que completa onboarding (configurable por entorno).
XP_REFERIDO = int(os.getenv("XP_REFERIDO_ONBOARDING", "50"))

# Umbrales de nivel: replican `floor(sqrt(xp/100)) + 1` de la migración.
XP_BASE_NIVEL = 100


def _run(fn):
    """Ejecuta una llamada bloqueante de Supabase en un hilo aparte."""
    return asyncio.to_thread(fn)


def _hoy_lima() -> date:
    return datetime.now(_zona_lima()).date()


def _bono_racha(racha: int) -> int:
    """5 XP + 1 XP por día consecutivo, tope 20 XP/día (misma fórmula de SQL)."""
    return min(5 + racha, 20)


@router.post("/check-in", response_model=ResultadoCheckIn)
@limiter.limit("20/minute")
async def check_in(request: Request, user_data=Depends(get_current_user)):
    """Check-in diario en hora Lima: racha y XP idempotentes (RPC server-side)."""
    user, token = user_data
    supabase = get_supabase(token)

    filas = await invocar_rpc(supabase, "fase10_checkin", {})
    if not filas:
        raise HTTPException(status_code=500, detail="No se pudo registrar el check-in.")
    fila = filas[0]

    return ResultadoCheckIn(
        racha_actual=int(fila.get("racha_actual") or 0),
        racha_maxima=int(fila.get("racha_maxima") or 0),
        xp_otorgado=int(fila.get("xp_otorgado") or 0),
        ya_registrado=bool(fila.get("ya_registrado") or False),
    )


@router.get("/resumen", response_model=ResumenGamificacion)
async def resumen_gamificacion(user_data=Depends(get_current_user)):
    """XP total, nivel, progreso al siguiente nivel y bono de racha disponible."""
    user, token = user_data
    supabase = get_supabase(token)

    try:
        resp = await _run(
            lambda: (
                supabase.table("gamificacion_usuarios")
                .select("xp_total, nivel, racha_actual, racha_maxima, ultima_fecha_actividad, alias_publico")
                .eq("perfil_id", str(user.id))
                .maybe_single()
                .execute()
            )
        )
        resp_codigo = await _run(
            lambda: (
                supabase.table("codigos_referido")
                .select("codigo")
                .eq("perfil_id", str(user.id))
                .maybe_single()
                .execute()
            )
        )
    except Exception as e:  # noqa: BLE001
        logger.error("[GAMI] Error leyendo resumen de %s: %s", user.id, e)
        raise HTTPException(status_code=500, detail="No se pudo cargar tu resumen de gamificación.")

    perfil = getattr(resp, "data", None) or {}
    codigo = (getattr(resp_codigo, "data", None) or {}).get("codigo")

    xp_total = int(perfil.get("xp_total") or 0)
    nivel = int(perfil.get("nivel") or 1)
    racha_actual = int(perfil.get("racha_actual") or 0)
    racha_maxima = int(perfil.get("racha_maxima") or 0)
    ultima_fecha = perfil.get("ultima_fecha_actividad")

    # Progreso al siguiente nivel (misma fórmula que el trigger en SQL).
    piso_nivel = XP_BASE_NIVEL * (nivel - 1) ** 2
    techo_nivel = XP_BASE_NIVEL * nivel**2
    xp_actual_nivel = max(xp_total - piso_nivel, 0)
    xp_requerido = max(techo_nivel - piso_nivel, 1)
    porcentaje = round(min(xp_actual_nivel / xp_requerido * 100, 100.0), 1)

    # Bono si hace check-in AHORA (misma lógica que fase10_checkin).
    hoy = _hoy_lima()
    ultima: "date | None" = None
    if ultima_fecha:
        try:
            ultima = date.fromisoformat(str(ultima_fecha)[:10])
        except ValueError:
            ultima = None
    puede_checkin = ultima != hoy
    if ultima == hoy:
        bono_proximo = 0
    elif ultima == hoy - timedelta(days=1):
        bono_proximo = _bono_racha(racha_actual + 1)
    else:
        bono_proximo = _bono_racha(1)

    return ResumenGamificacion(
        xp_total=xp_total,
        nivel=nivel,
        racha_actual=racha_actual,
        racha_maxima=racha_maxima,
        ultima_fecha_actividad=str(ultima) if ultima_fecha else None,
        alias_publico=perfil.get("alias_publico"),
        codigo_referido=codigo,
        pueda_checkin=puede_checkin,
        bono_proximo_checkin=bono_proximo,
        progreso_siguiente={
            "xp_actual_nivel": float(xp_actual_nivel),
            "xp_requerido": float(xp_requerido),
            "porcentaje": porcentaje,
        },
    )


# ---------------------------------------------------------------------------
# Referidos
# ---------------------------------------------------------------------------

def _es_violacion_unica(exc: Exception) -> bool:
    """True si la excepción es una violación de unicidad (SQLSTATE 23505)."""
    codigo = str(getattr(exc, "code", "") or "")
    if "23505" in codigo:
        return True
    return "duplicate key" in str(exc).lower() or "23505" in str(exc)


@router.post("/referidos/registrar-onboarding", response_model=ResultadoReferido)
@limiter.limit("10/minute")
async def registrar_onboarding_referido(
    request: Request,
    data: RegistroOnboardingReferido,
    user_data=Depends(get_current_user),
):
    """Valida el código de referido y premia al referente al completar onboarding.

    Reglas: sin auto-referidos, una sola atribución por cuenta, y la recompensa
    es idempotente (la clave `idempotency_key` del ledger lo garantiza).
    """
    user, token = user_data
    supabase = get_supabase(token)
    admin = get_admin_client()

    try:
        resp_perfil = await _run(
            lambda: (
                supabase.table("perfiles")
                .select("onboarding_completado")
                .eq("id", str(user.id))
                .maybe_single()
                .execute()
            )
        )
    except Exception as e:  # noqa: BLE001
        logger.error("[GAMI] Error leyendo onboarding de %s: %s", user.id, e)
        raise HTTPException(status_code=500, detail="No se pudo registrar el referido.")

    perfil = getattr(resp_perfil, "data", None) or {}
    if not perfil.get("onboarding_completado"):
        raise HTTPException(
            status_code=409,
            detail="Completa tu onboarding antes de registrar tu código de referido.",
        )

    try:
        resp_codigo = await _run(
            lambda: (
                admin.table("codigos_referido")
                .select("perfil_id, codigo")
                .eq("codigo", data.codigo)
                .maybe_single()
                .execute()
            )
        )
    except Exception as e:  # noqa: BLE001
        logger.error("[GAMI] Error buscando código %s: %s", data.codigo, e)
        raise HTTPException(status_code=500, detail="No se pudo registrar el referido.")

    codigo_row = getattr(resp_codigo, "data", None)
    if not codigo_row:
        raise HTTPException(status_code=404, detail="El código de referido no existe.")
    referente_id = str(codigo_row["perfil_id"])
    if referente_id == str(user.id):
        raise HTTPException(status_code=400, detail="No puedes registrarte con tu propio código.")

    ahora_iso = datetime.now(timezone.utc).isoformat()
    fila_referido = {
        "referente_id": referente_id,
        "referido_id": str(user.id),
        "codigo": data.codigo,
        "registrado_at": ahora_iso,
        "onboarding_verificado_at": ahora_iso,
        "recompensa_otorgada_at": ahora_iso,
    }

    ya_registrado = False
    try:
        await _run(
            lambda: admin.table("referidos").insert(fila_referido).select("id").single().execute()
        )
    except Exception as e:  # noqa: BLE001
        if not _es_violacion_unica(e):
            logger.error("[GAMI] Error insertando referido %s: %s", user.id, e)
            raise HTTPException(status_code=500, detail="No se pudo registrar el referido.")
        ya_registrado = True  # ya había sido atribuido (concurrencia o reintento)

    xp_otorgado = 0
    try:
        await _run(
            lambda: (
                admin.table("registro_puntos")
                .insert(
                    {
                        "perfil_id": referente_id,
                        "tipo": "referido_verificado",
                        "cantidad": XP_REFERIDO,
                        "referencia_tipo": "referido",
                        "referencia_id": str(user.id),
                        "idempotency_key": f"referido:{user.id}",
                        "metadata": {"codigo": data.codigo},
                    }
                )
                .execute()
            )
        )
        xp_otorgado = XP_REFERIDO
    except Exception as e:  # noqa: BLE001
        if not _es_violacion_unica(e):
            logger.error("[GAMI] Error otorgando bono de referido: %s", e)

    alias_referente = None
    try:
        resp_alias = await _run(
            lambda: (
                admin.table("gamificacion_usuarios")
                .select("alias_publico")
                .eq("perfil_id", referente_id)
                .maybe_single()
                .execute()
            )
        )
        alias_referente = (getattr(resp_alias, "data", None) or {}).get("alias_publico")
    except Exception as e:  # noqa: BLE001
        logger.warning("[GAMI] No se pudo leer alias del referente: %s", e)

    return ResultadoReferido(
        registrado=not ya_registrado,
        ya_registrado=ya_registrado,
        referente_alias=alias_referente,
        xp_otorgado=xp_otorgado,
    )


# ---------------------------------------------------------------------------
# Ranking
# ---------------------------------------------------------------------------

def _codificar_cursor(xp_total: int, perfil_id: str) -> str:
    """Cursor opaco base64url para paginación keyset: `xp:perfil_id`."""
    raw = f"{xp_total}:{perfil_id}".encode("utf-8")
    return base64.urlsafe_b64encode(raw).decode("ascii").rstrip("=")


def _decodificar_cursor(cursor: str):
    """Decodifica el cursor interno; 422 si el formato es inválido."""
    try:
        relleno = "=" * (-len(cursor) % 4)
        raw = base64.urlsafe_b64decode(cursor + relleno).decode("utf-8")
        xp_s, pid = raw.split(":", 1)
        return int(xp_s), str(pid)
    except Exception:  # noqa: BLE001
        raise HTTPException(status_code=422, detail="Cursor de paginación inválido.")


def _validar_periodo(periodo: str) -> str:
    p = (periodo or "").strip().lower()
    if p not in ("global", "semanal"):
        raise HTTPException(status_code=422, detail="periodo debe ser 'global' o 'semanal'.")
    return p


@router.get("/ranking", response_model=RespuestaRanking)
@limiter.limit("120/minute")
async def get_ranking(
    request: Request,
    periodo: str = Query("global"),
    limite: int = Query(50, ge=1, le=100),
    cursor: "str | None" = Query(None),
    user_data=Depends(get_current_user),
):
    """Ranking global o semanal paginado por cursor. Solo alias, avatar, XP y nivel."""
    p = _validar_periodo(periodo)
    user, token = user_data
    supabase = get_supabase(token)

    params = {"p_periodo": p, "p_limite": limite, "p_offset": 0}
    if cursor:
        xp_desde, perfil_desde = _decodificar_cursor(cursor)
        params["p_desde_xp"] = xp_desde
        params["p_desde_perfil"] = perfil_desde

    filas = await invocar_rpc(supabase, "fase10_ranking", params)

    items = [
        EntradaRanking(
            perfil_id=str(fila["perfil_id"]),
            alias_publico=fila["alias_publico"],
            avatar_url=fila.get("avatar_url"),
            xp_total=int(fila.get("xp_total") or 0),
            nivel=int(fila.get("nivel") or 1),
            puesto=int(fila["puesto"]) if fila.get("puesto") is not None else None,
        )
        for fila in filas
    ]

    tiene_mas = len(items) >= limite
    next_cursor = None
    if tiene_mas and filas:
        ultimo = filas[-1]
        next_cursor = _codificar_cursor(
            int(ultimo.get("xp_total") or 0), str(ultimo.get("perfil_id"))
        )

    return RespuestaRanking(
        periodo=p,
        items=items,
        next_cursor=next_cursor,
        tiene_mas=tiene_mas,
    )


@router.get("/ranking/mi-posicion", response_model=MiPosicionRanking)
async def get_mi_posicion(
    periodo: str = Query("global"),
    user_data=Depends(get_current_user),
):
    """Puesto y métricas del usuario autenticado en el periodo indicado."""
    p = _validar_periodo(periodo)
    user, token = user_data
    supabase = get_supabase(token)

    filas = await invocar_rpc(supabase, "fase10_mi_posicion", {"p_periodo": p})
    if not filas:
        return MiPosicionRanking()

    fila = filas[0]
    return MiPosicionRanking(
        alias_publico=fila.get("alias_publico"),
        avatar_url=fila.get("avatar_url"),
        xp_total=int(fila.get("xp_total") or 0),
        nivel=int(fila.get("nivel") or 1),
        puesto=int(fila["puesto"]) if fila.get("puesto") is not None else None,
    )


# ---------------------------------------------------------------------------
# Compartir (telemetría; sin XP por el clic)
# ---------------------------------------------------------------------------

@router.post("/compartir/evento", response_model=ResultadoCompartir, status_code=201)
@limiter.limit("30/minute")
async def registrar_evento_compartir(
    request: Request,
    data: EventoCompartir,
    user_data=Depends(get_current_user),
):
    """Registra la intención de compartir (una por día en hora Lima).

    Telemetría pura: el XP de compartir se concede exclusivamente cuando el
    referido completa onboarding (endpoint /referidos/registrar-onboarding).
    """
    user, token = user_data
    admin = get_admin_client()

    hoy = _hoy_lima()
    inicio = datetime.combine(hoy, datetime.min.time(), tzinfo=_zona_lima()).astimezone(timezone.utc)
    fin = datetime.combine(hoy, datetime.max.time(), tzinfo=_zona_lima()).astimezone(timezone.utc)

    try:
        resp_cont = await _run(
            lambda: (
                admin.table("eventos_compartir")
                .select("id", count="exact")
                .eq("perfil_id", str(user.id))
                .gte("created_at", inicio.isoformat())
                .lte("created_at", fin.isoformat())
                .execute()
            )
        )
    except Exception as e:  # noqa: BLE001
        logger.error("[GAMI] Error contando eventos de %s: %s", user.id, e)
        raise HTTPException(status_code=500, detail="No se pudo registrar el evento.")

    if int(getattr(resp_cont, "count", 0) or 0) >= 1:
        return ResultadoCompartir(registrado=False, canal=data.canal, limite_diario=True)

    try:
        await _run(
            lambda: (
                admin.table("eventos_compartir")
                .insert({"perfil_id": str(user.id), "canal": data.canal})
                .execute()
            )
        )
    except Exception as e:  # noqa: BLE001
        logger.error("[GAMI] Error insertando evento de %s: %s", user.id, e)
        raise HTTPException(status_code=500, detail="No se pudo registrar el evento.")

    return ResultadoCompartir(canal=data.canal, limite_diario=False)