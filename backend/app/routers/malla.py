from fastapi import APIRouter, Depends, HTTPException
from app.core.database import get_supabase
from app.core.auth_utils import get_current_user
from app.core.prereqs import check_course_status
from app.schemas.malla import CicloDetail, CourseDetail, PrerrequisitoInfo, StatusCurso
from typing import List, Dict, Set

router = APIRouter(prefix="/malla", tags=["Academic Curriculum"])


@router.get("/", response_model=List[CicloDetail])
async def get_malla(user_data=Depends(get_current_user)) -> List[CicloDetail]:
    user, token = user_data
    supabase = get_supabase(token)

    try:
        # 1. Obtener carrera del usuario
        profile_resp = (
            supabase.table("perfiles")
            .select("carrera_id")
            .eq("id", user.id)
            .single()
            .execute()
        )
        carrera_id = profile_resp.data.get("carrera_id") if profile_resp.data else None

        if not carrera_id:
            return []

        # 2. Obtener todos los cursos de la carrera
        cursos_resp = (
            supabase.table("cursos")
            .select("*")
            .eq("carrera_id", carrera_id)
            .execute()
        )
        if not cursos_resp.data:
            return []

        # 3. Construir dict de cursos para lookup O(1)
        cursos_dict: Dict[str, dict] = {
            str(c["id"]): c for c in cursos_resp.data
        }
        curso_ids_en_carrera = set(cursos_dict.keys())

        # 4. Obtener prerrequisitos (solo de cursos en esta carrera)
        prereq_resp = supabase.table("curso_prerrequisitos").select("*").execute()
        prereq_map: Dict[str, List[str]] = {}
        for p in prereq_resp.data or []:
            cid = str(p["curso_id"])
            pid = str(p["prerrequisito_id"])
            if cid in curso_ids_en_carrera:
                prereq_map.setdefault(cid, []).append(pid)

        # 5. Obtener progreso del usuario (usar str keys para consistencia)
        progreso_resp = supabase.table("progreso_cursos") \
            .select("curso_id, status") \
            .eq("perfil_id", user.id) \
            .execute()

        progreso_data: Dict[str, str] = {}
        for p in progreso_resp.data or []:
            progreso_data[str(p["curso_id"])] = p["status"]

        completed_courses: Set[str] = {
            str(p["curso_id"]) for p in (progreso_resp.data or []) if p["status"] == "completed"
        }

        # 6. Construir malla por ciclos
        malla_dict: Dict[int, CicloDetail] = {}

        for curso_raw in cursos_resp.data or []:
            ciclo_num = curso_raw.get("ciclo")
            if ciclo_num is None:
                continue

            if ciclo_num not in malla_dict:
                malla_dict[ciclo_num] = CicloDetail(
                    ciclo=f"Ciclo {ciclo_num}",
                    credits=0,
                    courses=[],
                )

            curso_id_str = str(curso_raw["id"])
            db_status = progreso_data.get(curso_id_str)
            progreso_val = 100 if db_status == "completed" else 0

            final_status, prereq_raw, prereqs_ok = check_course_status(
                curso_id=curso_id_str,
                db_status=db_status,
                completed_courses=completed_courses,
                prereq_map=prereq_map,
                cursos_dict=cursos_dict,
            )

            course_detail = CourseDetail(
                id=curso_id_str,
                code=curso_raw["code"],
                name=curso_raw["name"],
                credits=curso_raw["credits"],
                status=StatusCurso(final_status),
                description=curso_raw.get("description"),
                progreso=progreso_val,
                prerequisitos=[PrerrequisitoInfo(**p) for p in prereq_raw],
                prerequisitos_cumplidos=prereqs_ok,
            )

            malla_dict[ciclo_num].courses.append(course_detail)
            malla_dict[ciclo_num].credits += curso_raw["credits"]

        return [malla_dict[c] for c in sorted(malla_dict.keys())]

    except Exception:
        import traceback
        print("========== ERROR MALLA ==========")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Error al construir la malla curricular.")
