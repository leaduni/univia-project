import logging
from fastapi import APIRouter, HTTPException, Depends, Query
from app.core.database import get_supabase
from app.core.auth_utils import get_current_user
from app.core.prereqs import resolve_prereq_chain
from app.schemas.onboarding import (
    OnboardingCompleteRequest,
    CursosPorCarreraResponse,
    CursoPrereqItem,
)
from typing import Dict, Set, List

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/onboarding/data")
async def get_onboarding_data(user_data=Depends(get_current_user)):
    user, token = user_data
    supabase = get_supabase(token)

    try:
        carreras_resp = supabase.table("carreras").select("id, name, codigo").execute()
        return {"carreras": carreras_resp.data}
    except Exception as e:
        logger.error(f"Error fetching onboarding data: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/onboarding/cursos", response_model=CursosPorCarreraResponse)
async def get_cursos_por_carrera(
    carrera_id: int = Query(..., description="ID de la carrera"),
    ciclo_actual: int = Query(1, description="Ciclo actual del usuario para filtrar disponibilidad"),
    user_data=Depends(get_current_user),
):
    user, token = user_data
    supabase = get_supabase(token)

    try:
        cursos_raw = (
            supabase.table("cursos")
            .select("id, code, name, credits, ciclo, carrera_id")
            .eq("carrera_id", carrera_id)
            .lte("ciclo", ciclo_actual)
            .order("ciclo")
            .order("code")
            .execute()
        )
        if not cursos_raw.data:
            return CursosPorCarreraResponse(carrera_id=carrera_id, cursos=[])

        prereq_resp = supabase.table("curso_prerrequisitos").select("*").execute()
        prereq_map: Dict[int, List[int]] = {}
        for p in prereq_resp.data or []:
            cid = p["curso_id"]
            if any(c["id"] == cid for c in cursos_raw.data):
                prereq_map.setdefault(cid, []).append(p["prerrequisito_id"])

        progreso_resp = (
            supabase.table("progreso_cursos")
            .select("curso_id, status")
            .eq("perfil_id", user.id)
            .execute()
        )
        progreso_raw = progreso_resp.data or []
        es_usuario_nuevo = len(progreso_raw) == 0
        progreso_map: Dict[int, str] = {p["curso_id"]: p["status"] for p in progreso_raw}
        in_progress_ids: Set[int] = {p["curso_id"] for p in progreso_raw if p["status"] == "in_progress"}

        cursos = []
        for c in cursos_raw.data:
            cid = c["id"]

            if cid in progreso_map:
                status = progreso_map[cid]
            elif es_usuario_nuevo:
                status = "available"
            else:
                chain = resolve_prereq_chain(cid, prereq_map)
                if any(pre_id in in_progress_ids for pre_id in chain):
                    status = "locked"
                else:
                    status = "available"

            cursos.append(
                CursoPrereqItem(
                    id=cid,
                    code=c["code"],
                    name=c["name"],
                    credits=c["credits"],
                    ciclo=c["ciclo"],
                    carrera_id=c["carrera_id"],
                    prerrequisito_ids=prereq_map.get(cid, []),
                    status=status,
                )
            )

        return CursosPorCarreraResponse(carrera_id=carrera_id, cursos=cursos)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching cursos por carrera: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/onboarding/complete")
async def complete_onboarding(
    data: OnboardingCompleteRequest,
    user_data=Depends(get_current_user),
):
    user, token = user_data
    supabase = get_supabase(token)

    try:
        carrera_id = data.carrera_id
        ciclo_actual = data.ciclo_actual
        cursos_inscritos = data.cursos_inscritos
        inscritos_set: Set[int] = set(cursos_inscritos)

        if not cursos_inscritos:
            raise HTTPException(status_code=400, detail="Debes inscribirte en al menos 1 curso.")

        # --- Cargar datos de la carrera ---
        cursos_resp = supabase.table("cursos").select("*").eq("carrera_id", carrera_id).execute()
        cursos_en_carrera: Dict[int, dict] = {}
        for c in cursos_resp.data or []:
            cid = c["id"]
            cursos_en_carrera[cid] = c

        prereq_resp = supabase.table("curso_prerrequisitos").select("*").execute()
        prereq_map: Dict[int, List[int]] = {}
        for p in prereq_resp.data or []:
            cid = p["curso_id"]
            if cid in cursos_en_carrera:
                prereq_map.setdefault(cid, []).append(p["prerrequisito_id"])

        # --- Cargar estado actual del usuario en DB ---
        progreso_db = supabase.table("progreso_cursos") \
            .select("curso_id, status") \
            .eq("perfil_id", user.id) \
            .execute()
        db_status: Dict[int, str] = {p["curso_id"]: p["status"] for p in (progreso_db.data or [])}

        def nombre_curso(cid: int) -> str:
            return cursos_en_carrera.get(cid, {}).get("name", str(cid))

        # --- REGLA A: Exclusión mutua simultánea (solo directos) ---
        for curso_id in cursos_inscritos:
            for prereq_id in prereq_map.get(curso_id, []):
                if prereq_id in inscritos_set:
                    raise HTTPException(
                        status_code=400,
                        detail=(
                            f"No puedes matricularte simultáneamente en "
                            f"'{nombre_curso(prereq_id)}' y '{nombre_curso(curso_id)}'."
                        ),
                    )

        # --- Filtrar cursos ya existentes en DB (evitar 23505) ---
        cursos_inscritos = [cid for cid in cursos_inscritos if cid not in db_status]

        if not cursos_inscritos:
            raise HTTPException(status_code=400, detail="Debes inscribirte en al menos 1 curso nuevo.")

        # --- PASO I: Antecedentes transitivos de los cursos inscritos ---
        cursos_a_completar: Set[int] = set()

        for curso_id in cursos_inscritos:
            chain = resolve_prereq_chain(curso_id, prereq_map)
            for prereq_id in chain:
                if prereq_id in cursos_en_carrera:
                    cursos_a_completar.add(prereq_id)

        # --- Filtrar completados contra DB (evitar 23505) ---
        cursos_a_completar = {cid for cid in cursos_a_completar if cid not in db_status}

        # --- Persistir progreso (insert puro, solo novedades) ---
        progreso_items: List[dict] = []

        for curso_id in cursos_a_completar:
            progreso_items.append({
                "perfil_id": user.id,
                "curso_id": curso_id,
                "status": "completed",
                "fecha_completado": "now()",
            })

        for curso_id in cursos_inscritos:
            progreso_items.append({
                "perfil_id": user.id,
                "curso_id": curso_id,
                "status": "in_progress",
            })

        if progreso_items:
            supabase.table("progreso_cursos").insert(progreso_items).execute()

        # --- Actualizar perfil ---
        supabase.table("perfiles").update({
            "carrera_id": carrera_id,
            "ciclo_actual": ciclo_actual,
            "onboarding_completado": True,
            "updated_at": "now()",
        }).eq("id", user.id).execute()

        # --- Logro de bienvenida ---
        try:
            supabase.table("logros_usuarios").upsert({
                "perfil_id": user.id,
                "logro_id": 1,
                "unlocked_at": "now()",
            }).execute()
        except Exception as ae:
            logger.warning(f"No se pudo otorgar el logro: {ae}")

        completados_final = list(cursos_a_completar)
        inscritos_final = cursos_inscritos
        logger.info(
            f"Onboarding OK. Usuario={user.id}, "
            f"completados={[nombre_curso(c) for c in completados_final]}, "
            f"en_progreso={inscritos_final}"
        )

        return {
            "status": "success",
            "message": "Onboarding completado exitosamente",
            "completados": completados_final,
            "inscritos": inscritos_final,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error en onboarding: {e}")
        raise HTTPException(status_code=500, detail=f"Error al guardar datos: {str(e)}")
