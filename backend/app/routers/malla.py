import logging
from typing import Dict, List, Set

from fastapi import APIRouter, Depends, HTTPException

from app.core.auth_utils import get_current_user
from app.core.database import get_supabase
from app.core.exceptions import raise_field_error
from app.core.prereqs import check_course_status
from app.schemas.malla import CicloDetail, CourseDetail, PrerrequisitoInfo, StatusCurso

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/malla", tags=["Academic Curriculum"])


def _obtener_carrera_del_perfil(supabase, user) -> int:
    """Carrera del estudiante, o corta si todavía no completó el onboarding.

    Antes esto devolvía una malla vacía, que el frontend no podía distinguir
    de 'tu carrera no tiene cursos cargados'. Un error explícito le permite
    mandar al estudiante a terminar su onboarding.
    """
    try:
        resp = (
            supabase.table("perfiles")
            .select("carrera_id")
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
    if not carrera_id:
        raise_field_error(
            "carrera_id",
            "Aún no eliges tu carrera. Completa tu onboarding para ver tu malla.",
            status_code=400,
        )

    return carrera_id


def _cargar_prerrequisitos(supabase, curso_ids: List[str]) -> Dict[str, List[str]]:
    """Mapa curso -> prerrequisitos, restringido a los cursos de la carrera.

    El filtro va en la consulta y no en memoria: la tabla es global y traerla
    entera para descartar la mayoría no escala cuando entren más carreras.
    """
    if not curso_ids:
        return {}

    try:
        resp = (
            supabase.table("curso_prerrequisitos")
            .select("curso_id, prerrequisito_id")
            .in_("curso_id", curso_ids)
            .execute()
        )
        filas = getattr(resp, "data", None) or []
    except Exception as e:
        # Sin prerrequisitos la malla sigue siendo útil: todo aparece como
        # disponible. Es preferible a no mostrar nada.
        logger.error(f"Error cargando prerrequisitos de la malla: {e}")
        return {}

    prereq_map: Dict[str, List[str]] = {}
    for fila in filas:
        prereq_map.setdefault(str(fila["curso_id"]), []).append(str(fila["prerrequisito_id"]))
    return prereq_map


@router.get("/", response_model=List[CicloDetail])
async def get_malla(user_data=Depends(get_current_user)) -> List[CicloDetail]:
    """Malla curricular completa de la carrera del estudiante (RF-04).

    Devuelve los cursos agrupados por ciclo, en orden, con el estado de cada
    uno para este estudiante y los créditos acumulados por ciclo.
    """
    user, token = user_data
    supabase = get_supabase(token)

    carrera_id = _obtener_carrera_del_perfil(supabase, user)

    try:
        cursos_resp = (
            supabase.table("cursos")
            .select("id, code, name, credits, ciclo, description")
            .eq("carrera_id", carrera_id)
            .order("ciclo")
            .order("code")
            .execute()
        )
        cursos_raw = getattr(cursos_resp, "data", None) or []
    except Exception as e:
        logger.error(f"Error cargando cursos de la carrera {carrera_id}: {e}")
        raise HTTPException(status_code=500, detail="No se pudo cargar tu malla curricular.")

    if not cursos_raw:
        return []

    cursos_dict: Dict[str, dict] = {str(c["id"]): c for c in cursos_raw}
    prereq_map = _cargar_prerrequisitos(supabase, list(cursos_dict))

    try:
        progreso_resp = (
            supabase.table("progreso_cursos")
            .select("curso_id, status")
            .eq("perfil_id", user.id)
            .execute()
        )
        progreso_raw = getattr(progreso_resp, "data", None) or []
    except Exception as e:
        logger.error(f"Error cargando progreso de {user.id}: {e}")
        raise HTTPException(status_code=500, detail="No se pudo cargar tu avance académico.")

    progreso_map: Dict[str, str] = {str(p["curso_id"]): p["status"] for p in progreso_raw}
    completados: Set[str] = {cid for cid, s in progreso_map.items() if s == "completed"}

    malla: Dict[int, CicloDetail] = {}

    for curso_raw in cursos_raw:
        ciclo_num = curso_raw.get("ciclo")
        if ciclo_num is None:
            # Un curso sin ciclo no pertenece a ningún punto de la malla; se
            # omite en vez de inventarle una ubicación.
            logger.warning(f"Curso {curso_raw.get('code')} sin ciclo asignado; se omite.")
            continue

        if ciclo_num not in malla:
            malla[ciclo_num] = CicloDetail(
                ciclo=f"Ciclo {ciclo_num}",
                ciclo_num=ciclo_num,
                credits=0,
                courses=[],
            )

        curso_id = str(curso_raw["id"])
        db_status = progreso_map.get(curso_id)

        estado, prereq_info, prereqs_ok = check_course_status(
            curso_id=curso_id,
            db_status=db_status,
            completed_courses=completados,
            prereq_map=prereq_map,
            cursos_dict=cursos_dict,
        )

        creditos = curso_raw.get("credits") or 0

        malla[ciclo_num].courses.append(
            CourseDetail(
                id=curso_id,
                code=curso_raw["code"],
                name=curso_raw["name"],
                credits=creditos,
                status=StatusCurso(estado),
                description=curso_raw.get("description"),
                progreso=100 if estado == "completed" else 0,
                prerequisitos=[PrerrequisitoInfo(**p) for p in prereq_info],
                prerequisitos_cumplidos=prereqs_ok,
            )
        )
        malla[ciclo_num].credits += creditos

    return [malla[ciclo] for ciclo in sorted(malla)]
