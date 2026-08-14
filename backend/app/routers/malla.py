import logging
from typing import Dict, List, Set

from fastapi import APIRouter, Depends, HTTPException

from app.core.auth_utils import get_current_user
from app.core.avance import cargar_avance
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


def _obtener_malla_del_perfil(supabase, user) -> tuple[int, int]:
    """Carrera y Malla del estudiante, o corta si no completó el onboarding."""
    try:
        resp = (
            supabase.table("perfiles")
            .select("carrera_id, malla_id")
            .eq("id", user.id)
            .maybe_single()
            .execute()
        )
        perfil = getattr(resp, "data", None) if resp else None
    except Exception as e:
        logger.error(f"Error consultando perfil {user.id}: {e}")
        raise HTTPException(status_code=500, detail="No se pudo verificar tu perfil.")

    if not perfil:
        raise_field_error(
            "perfil", "No encontramos tu perfil. Vuelve a iniciar sesión.", status_code=400
        )

    carrera_id = perfil.get("carrera_id")
    malla_id = perfil.get("malla_id")

    if not malla_id and carrera_id:
        try:
            m_resp = (
                supabase.table("mallas")
                .select("id")
                .eq("carrera_id", carrera_id)
                .eq("es_vigente", True)
                .order("id")
                .limit(1)
                .execute()
            )
            filas = getattr(m_resp, "data", None) or []
            malla_id = filas[0]["id"] if filas else None
        except Exception as e:
            logger.error(f"Error buscando malla vigente de carrera {carrera_id}: {e}")

    if not carrera_id or not malla_id:
        raise_field_error(
            "malla_id",
            "Aún no eliges tu carrera o plan de estudios. Completa tu onboarding para ver tu malla.",
            status_code=400,
        )

    return carrera_id, malla_id


def _cargar_prerrequisitos(supabase, mc_data: List[dict]) -> Dict[str, List[str]]:
    """Mapa curso_id (str) -> prerrequisitos (str) usando malla_curso_prerrequisitos."""
    if not mc_data:
        return {}

    mc_ids = [mc["id"] for mc in mc_data if "id" in mc]
    if not mc_ids:
        return {}

    try:
        resp = (
            supabase.table("malla_curso_prerrequisitos")
            .select("malla_curso_id, prerrequisito_malla_curso_id")
            .in_("malla_curso_id", mc_ids)
            .execute()
        )
        filas = getattr(resp, "data", None) or []
    except Exception as e:
        logger.error(f"Error cargando prerrequisitos de la malla: {e}")
        return {}

    mc_map = {mc["id"]: str(mc["curso_id"]) for mc in mc_data if "id" in mc and "curso_id" in mc}
    prereq_map: Dict[str, List[str]] = {}
    for f in filas:
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

    carrera_id, malla_id = _obtener_malla_del_perfil(supabase, user)

    try:
        avance = cargar_avance(supabase, user.id, malla_id)
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

    carrera_id, malla_id = _obtener_malla_del_perfil(supabase, user)

    try:
        mc_resp = (
            supabase.table("malla_cursos")
            .select("id, curso_id, ciclo, credits, tipo, cursos(code, name, description)")
            .eq("malla_id", malla_id)
            .order("ciclo")
            .execute()
        )
        mc_data = getattr(mc_resp, "data", None) or []
    except Exception as e:
        logger.error(f"Error cargando cursos de la malla {malla_id}: {e}")
        raise HTTPException(status_code=500, detail="No se pudo cargar tu malla curricular.")

    if not mc_data:
        return []

    cursos_raw = []
    for mc in mc_data:
        c_info = mc.get("cursos") or {}
        cursos_raw.append({
            "id": mc["curso_id"],
            "mc_id": mc["id"],
            "code": c_info.get("code", ""),
            "name": c_info.get("name", ""),
            "credits": mc.get("credits") or 0,
            "ciclo": mc.get("ciclo"),
            "description": c_info.get("description"),
            "tipo": mc.get("tipo"),
        })

    cursos_dict: Dict[str, dict] = {str(c["id"]): c for c in cursos_raw}
    prereq_map = _cargar_prerrequisitos(supabase, mc_data)

    try:
        progreso_resp = (
            supabase.table("progreso_cursos")
            .select("curso_id, status, nota, fecha_completado")
            .eq("perfil_id", user.id)
            .execute()
        )
        progreso_raw = getattr(progreso_resp, "data", None) or []
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
