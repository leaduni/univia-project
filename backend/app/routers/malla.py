import asyncio
import logging
from typing import Dict, List, Set

from fastapi import APIRouter, Depends, HTTPException

from app.core.auth_utils import get_current_user
from app.core.avance import calcular_avance
from app.core.database import get_supabase
from app.core.exceptions import raise_field_error
from app.core.prereqs import check_course_status, direct_prereq_info
from app.schemas.malla import (
    CicloDetail,
    CourseDetail,
    PrerrequisitoInfo,
    ResumenCiclo,
    StatusCurso,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/malla", tags=["Academic Curriculum"])


async def _run_rpc(supabase, nombre: str, params: dict) -> dict:
    """Ejecuta un RPC 1-RTT de Supabase en un hilo aparte (no bloquea el loop)."""
    resp = await asyncio.to_thread(
        lambda: supabase.rpc(nombre, params).execute()
    )
    data = getattr(resp, "data", None)
    if data is None:
        raise HTTPException(status_code=500, detail="No se pudieron cargar los datos.")
    return data


def _datos_malla_o_error(datos: dict, user) -> tuple[int, int]:
    """Carrera y malla resueltas desde el RPC, replicando los errores previos."""
    carrera_id = datos.get("carrera_id")
    malla_id = datos.get("malla_id")
    if carrera_id is None:
        return None, None
    if malla_id is None:
        raise_field_error(
            "malla_id",
            "Aún no eliges tu carrera o plan de estudios. Completa tu onboarding para ver tu malla.",
            status_code=400,
        )
    return carrera_id, malla_id


def _cargar_prerrequisitos(mc_data: List[dict], prereq_filas: List[dict]) -> Dict[str, List[str]]:
    """Mapa curso_id (str) -> prerrequisitos (str) desde filas ya cargadas (1-RTT)."""
    if not mc_data:
        return {}

    mc_ids = [mc["id"] for mc in mc_data if "id" in mc]
    if not mc_ids:
        return {}

    mc_map = {mc["id"]: str(mc["curso_id"]) for mc in mc_data if "id" in mc and "curso_id" in mc}
    prereq_map: Dict[str, List[str]] = {}
    for f in prereq_filas:
        mc_id = f.get("malla_curso_id")
        p_mc_id = f.get("prerrequisito_malla_curso_id")
        if mc_id in mc_map and p_mc_id in mc_map:
            prereq_map.setdefault(mc_map[mc_id], []).append(mc_map[p_mc_id])
    return prereq_map


@router.get("/avance")
async def get_avance_carrera(user_data=Depends(get_current_user)) -> dict:
    """Avance de carrera sobre el total de créditos del plan (RF-07)."""
    user, token = user_data
    supabase = get_supabase(token)

    datos = await _run_rpc(supabase, "get_malla_datos", {"p_user": user.id})
    carrera_id, malla_id = _datos_malla_o_error(datos, user)
    if carrera_id is None:
        return {
            "carrera_id": None,
            "malla_id": None,
            "porcentaje_avance": 0,
            "creditos_totales": 0,
            "creditos_aprobados": 0,
        }

    try:
        cursos = {
            c["curso_id"]: {"credits": c.get("credits") or 0}
            for c in datos["malla_cursos"]
        }
        progreso = {p["curso_id"]: p["status"] for p in datos["progreso"]}
        avance = calcular_avance(cursos, progreso)
    except Exception:
        raise HTTPException(status_code=500, detail="No se pudo calcular tu avance de carrera.")

    return {"carrera_id": carrera_id, "malla_id": malla_id, **avance.to_dict()}


def _acumular_en_resumen(resumen: ResumenCiclo, estado: str, creditos: int) -> None:
    """Suma un curso al conteo del ciclo."""
    resumen.total += 1

    if estado == "completed":
        resumen.aprobados += 1
        resumen.creditos_aprobados += creditos
    elif estado == "in_progress":
        resumen.en_curso += 1
    elif estado == "locked":
        resumen.bloqueados += 1
    else:
        resumen.disponibles += 1


@router.get("/", response_model=List[CicloDetail])
async def get_malla(user_data=Depends(get_current_user)) -> List[CicloDetail]:
    """Malla curricular completa de la carrera del estudiante (RF-04)."""
    user, token = user_data
    supabase = get_supabase(token)

    datos = await _run_rpc(supabase, "get_malla_datos", {"p_user": user.id})
    carrera_id, malla_id = _datos_malla_o_error(datos, user)
    if carrera_id is None:
        return []

    try:
        mc_data = datos["malla_cursos"]
    except Exception as e:
        logger.error(f"Error cargando cursos de la malla {malla_id}: {e}")
        raise HTTPException(status_code=500, detail="No se pudo cargar tu malla curricular.")

    if not mc_data:
        return []

    cursos_raw = []
    for mc in mc_data:
        cursos_raw.append({
            "id": mc["curso_id"],
            "mc_id": mc["id"],
            "code": mc.get("code", ""),
            "name": mc.get("name", ""),
            "credits": mc.get("credits") or 0,
            "ciclo": mc.get("ciclo"),
            "description": mc.get("description"),
            "tipo": mc.get("tipo"),
        })

    cursos_dict: Dict[str, dict] = {str(c["id"]): c for c in cursos_raw}
    prereq_map = _cargar_prerrequisitos(mc_data, datos["prerequisitos"])

    try:
        progreso_raw = datos["progreso"]
    except Exception as e:
        logger.error(f"Error cargando progreso de {user.id}: {e}")
        raise HTTPException(status_code=500, detail="No se pudo cargar tu avance académico.")

    historial: Dict[str, dict] = {str(p["curso_id"]): p for p in progreso_raw}
    completados: Set[str] = {
        cid for cid, p in historial.items() if p.get("status") == "completed"
    }

    malla: Dict[int, CicloDetail] = {}

    for curso_raw in cursos_raw:
        ciclo_num = curso_raw.get("ciclo")
        if ciclo_num is None:
            logger.warning(f"Curso {curso_raw.get('code')} sin ciclo asignado; se omite.")
            continue

        if ciclo_num not in malla:
            malla[ciclo_num] = CicloDetail(
                ciclo=f"Ciclo {ciclo_num}",
                ciclo_num=ciclo_num,
                credits=0,
                resumen=ResumenCiclo(),
                courses=[],
            )

        curso_id = str(curso_raw["id"])
        registro = historial.get(curso_id) or {}

        estado, cadena_info, prereqs_ok = check_course_status(
            curso_id=curso_id,
            db_status=registro.get("status"),
            completed_courses=completados,
            prereq_map=prereq_map,
            cursos_dict=cursos_dict,
        )
        directos = direct_prereq_info(curso_id, prereq_map, cursos_dict, completados)
        faltantes = [p for p in cadena_info if not p["completado"]]

        creditos = curso_raw.get("credits") or 0
        nota = registro.get("nota")

        malla[ciclo_num].courses.append(
            CourseDetail(
                id=curso_id,
                code=curso_raw["code"],
                name=curso_raw["name"],
                credits=creditos,
                status=StatusCurso(estado),
                description=curso_raw.get("description"),
                progreso=100 if estado == "completed" else 0,
                nota=float(nota) if nota is not None else None,
                fecha_completado=registro.get("fecha_completado"),
                prerequisitos=[PrerrequisitoInfo(**p) for p in directos],
                prerequisitos_faltantes=[PrerrequisitoInfo(**p) for p in faltantes],
                prerequisitos_cumplidos=prereqs_ok,
            )
        )

        ciclo_detail = malla[ciclo_num]
        ciclo_detail.credits += creditos
        _acumular_en_resumen(ciclo_detail.resumen, estado, creditos)

    return [malla[ciclo] for ciclo in sorted(malla)]
