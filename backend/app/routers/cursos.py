from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import FileResponse
from app.core.database import get_supabase
from app.core.auth_utils import get_current_user
from app.core.prereqs import check_course_status, resolve_prereq_chain
from typing import Dict, List, Set
import os
import logging
from pathlib import Path

logger = logging.getLogger(__name__)
router = APIRouter()


def _verificar_acceso_curso(supabase, user, course_id: int | str) -> None:
    """Verifica si el usuario tiene acceso al curso.
    Guard clause: si el curso está in_progress/completed en DB → retorna de inmediato.
    En otro caso, evalúa prerrequisitos y lanza HTTP 403 si está bloqueado."""
    cid_int = int(course_id)

    # Short-circuit: acceso inmediato si el usuario ya cursa o completó el curso
    progreso_check = (
        supabase.table("progreso_cursos")
        .select("status")
        .eq("perfil_id", user.id)
        .eq("curso_id", cid_int)
        .execute()
    )
    if progreso_check.data:
        status_actual = progreso_check.data[0].get("status")
        if status_actual in ("in_progress", "completed"):
            return

    profile_resp = supabase.table("perfiles").select("carrera_id, malla_id").eq("id", user.id).maybe_single().execute()
    perfil = profile_resp.data if profile_resp else None
    if not perfil:
        raise HTTPException(status_code=403, detail="No se encontró tu perfil.")

    carrera_id = perfil.get("carrera_id")
    malla_id = perfil.get("malla_id")
    if not malla_id and carrera_id:
        try:
            m_resp = supabase.table("mallas").select("id").eq("carrera_id", carrera_id).eq("es_vigente", True).order("id").limit(1).execute()
            filas = getattr(m_resp, "data", None) or []
            malla_id = filas[0]["id"] if filas else None
        except Exception:
            pass

    if not malla_id:
        raise HTTPException(status_code=403, detail="No tienes un plan de estudios asignado.")

    mc_resp = supabase.table("malla_cursos").select("id, curso_id, ciclo, credits, cursos(code, name)").eq("malla_id", malla_id).execute()
    mc_data = mc_resp.data or []
    cursos_en_carrera = {
        str(mc["curso_id"]): {
            "id": str(mc["curso_id"]),
            "code": (mc.get("cursos") or {}).get("code"),
            "name": (mc.get("cursos") or {}).get("name"),
        }
        for mc in mc_data
    }

    cid_str = str(cid_int)
    if cid_str not in cursos_en_carrera:
        raise HTTPException(status_code=404, detail="Curso no encontrado en tu plan de estudios.")

    mc_ids = [mc["id"] for mc in mc_data]
    prereq_resp = supabase.table("malla_curso_prerrequisitos").select("malla_curso_id, prerrequisito_malla_curso_id").in_("malla_curso_id", mc_ids).execute()
    from app.core.prereqs import build_prereq_map_from_malla
    prereq_map = build_prereq_map_from_malla(mc_data, prereq_resp.data or [], use_curso_id=True)
    prereq_map_str = {str(k): [str(v) for v in vals] for k, vals in prereq_map.items()}

    progreso_resp = supabase.table("progreso_cursos").select("curso_id, status").eq("perfil_id", user.id).execute()
    progreso_data: Dict[str, str] = {str(p["curso_id"]): p["status"] for p in (progreso_resp.data or [])}
    completed_courses: Set[str] = {str(p["curso_id"]) for p in (progreso_resp.data or []) if p["status"] == "completed"}
    db_status = progreso_data.get(cid_str)

    final_status, _, _ = check_course_status(
        curso_id=cid_str,
        db_status=db_status,
        completed_courses=completed_courses,
        prereq_map=prereq_map_str,
        cursos_dict=cursos_en_carrera,
    )

    if final_status == "locked":
        nombre = cursos_en_carrera.get(cid_str, {}).get("name", cid_str)
        raise HTTPException(
            status_code=403,
            detail=f"El curso '{nombre}' se encuentra bloqueado. Debes completar sus prerrequisitos para acceder al contenido.",
        )

REPO_ROOT = Path(__file__).resolve().parents[3]
PLANCHAS_DIR = REPO_ROOT / "ingesta_silabos" / "planchas"

# Mapa de unidades de Geometría Analítica a sus planchas PDFs
PLANCHA_MAP = {
    11: {  # FB101_SIS
        "Vectores": ["VECTORES.pdf"],
        "Producto Escalar": ["COMPONENTE Y PROD. ESCALAR.pdf"],
        "Proyección": ["PROYECCION ORTOGONAL.pdf"],
        "Independencia Lineal": ["RAZON DE DIVISION.pdf"],
        "La Recta": ["RECTA.pdf", "RECTA-COMPLEMENTO.pdf"],
        "Transformación": ["ROTACION Y TRASLACION DE COORDS.pdf"],
        "La Circunferencia": ["CIRCUNFERENCIA.pdf"],
        "La Parábola": ["PARABOLA.pdf"],
        "La Elipse": ["ELIPSE.pdf", "ELIPSE E HIPÉRBOLA.pdf"],
        "La Hipérbola": ["HIPÉRBOLA.pdf"],
        "Ecuación General": ["ECUACION DE SEGUNDO GRADO.pdf"],
    },
    31: {  # FB101_SOFT
        "Vectores": ["VECTORES.pdf"],
        "Producto Escalar": ["COMPONENTE Y PROD. ESCALAR.pdf"],
        "Proyección": ["PROYECCION ORTOGONAL.pdf"],
        "Independencia Lineal": ["RAZON DE DIVISION.pdf"],
        "La Recta": ["RECTA.pdf", "RECTA-COMPLEMENTO.pdf"],
        "Transformación": ["ROTACION Y TRASLACION DE COORDS.pdf"],
        "La Circunferencia": ["CIRCUNFERENCIA.pdf"],
        "La Parábola": ["PARABOLA.pdf"],
        "La Elipse": ["ELIPSE.pdf", "ELIPSE E HIPÉRBOLA.pdf"],
        "La Hipérbola": ["HIPÉRBOLA.pdf"],
        "Ecuación General": ["ECUACION DE SEGUNDO GRADO.pdf"],
    },
    54: {  # FB101_IND
        "Vectores": ["VECTORES.pdf"],
        "Producto Escalar": ["COMPONENTE Y PROD. ESCALAR.pdf"],
        "Proyección": ["PROYECCION ORTOGONAL.pdf"],
        "Independencia Lineal": ["RAZON DE DIVISION.pdf"],
        "La Recta": ["RECTA.pdf", "RECTA-COMPLEMENTO.pdf"],
        "Transformación": ["ROTACION Y TRASLACION DE COORDS.pdf"],
        "La Circunferencia": ["CIRCUNFERENCIA.pdf"],
        "La Parábola": ["PARABOLA.pdf"],
        "La Elipse": ["ELIPSE.pdf", "ELIPSE E HIPÉRBOLA.pdf"],
        "La Hipérbola": ["HIPÉRBOLA.pdf"],
        "Ecuación General": ["ECUACION DE SEGUNDO GRADO.pdf"],
    },
}

def get_planchas_for_step(course_id: int, step_title: str) -> list:
    planchas_dir = PLANCHAS_DIR / "geometria analitica"
    if not planchas_dir.exists():
        return []
    
    course_map = PLANCHA_MAP.get(course_id, {})
    for keyword, files in course_map.items():
        if keyword.lower() in step_title.lower():
            return files
    
    return []

@router.get("/curso/{course_id}/learning-path")
async def get_learning_path(course_id: int, user_data = Depends(get_current_user)):
    user, token = user_data
    supabase = get_supabase(token)

    try:
        _verificar_acceso_curso(supabase, user, course_id)

        course_resp = supabase.table("cursos").select("*").eq("id", course_id).single().execute()
        if not course_resp.data:
            raise HTTPException(status_code=404, detail="Curso no encontrado")

        steps_resp = supabase.table("learning_path_steps").select("*").eq("curso_id", course_id).order("order_index").execute()

        progreso_resp = supabase.table("progreso_cursos").select("*").eq("perfil_id", user.id).eq("curso_id", course_id).maybe_single().execute()

        step_ids = [s["id"] for s in steps_resp.data]
        unidades_completadas = {}
        try:
            unidades_resp = supabase.table("progreso_unidades").select("*").eq("perfil_id", user.id).in_("step_id", step_ids).execute()
            unidades_completadas = {u["step_id"]: u for u in (unidades_resp.data or [])}
        except Exception as table_err:
            err_str = str(table_err)
            if "PGRST205" in err_str or "Could not find the table" in err_str:
                logger.warning("Tabla 'progreso_unidades' no existe. Se usa progreso por defecto (ninguna unidad completada).")
            else:
                raise

        course_status = (
            progreso_resp.data.get("status")
            if progreso_resp and progreso_resp.data
            else "available"
        )

        timeline_steps = []
        all_completed = True
        for i, step in enumerate(steps_resp.data):
            step_completado = unidades_completadas.get(step["id"], {}).get("completado", False)

            if course_status == "completed":
                step_status = "completed"
            elif step_completado:
                step_status = "completed"
            elif all_completed and course_status == "in_progress":
                step_status = "current"
                all_completed = False
            elif not all_completed:
                step_status = "locked"
            else:
                step_status = "upcoming"

            planchas = get_planchas_for_step(course_id, step.get("title", ""))

            timeline_steps.append({
                **step,
                "status": step_status,
                "completado": step_completado,
                "planchas": [{
                    "nombre": p.replace(".pdf", ""),
                    "archivo": p,
                    "url": f"/api/curso/{course_id}/plancha/{p}"
                } for p in planchas]
            })

        course_name = course_resp.data.get("name", "el curso")
        ai_insights = [
            {
                "id": 1,
                "type": "recommendation",
                "title": "Estrategia de Estudio",
                "description": f"Para {course_name}, enfócate en los ejercicios prácticos de las semanas 4 a 7. Suelen ser la base de los exámenes parciales de la UNI.",
                "action": "Ver Ejercicios"
            },
            {
                "id": 2,
                "type": "opportunity",
                "title": "Material Recomendado",
                "description": "Revisa el problemario de la CEPRE-UNI para reforzar los temas de algoritmos secuenciales.",
                "action": "Ir a Biblioteca"
            }
        ]

        completed_count = sum(1 for s in timeline_steps if s["status"] == "completed")
        total_count = len(timeline_steps)
        progress_pct = round((completed_count / total_count) * 100) if total_count > 0 else 0

        return {
            "curso": {
                "id": course_resp.data["id"],
                "code": course_resp.data["code"],
                "name": course_resp.data["name"],
                "professor": "Ing. Docente UNI",
                "progress": progress_pct
            },
            "timeline": timeline_steps,
            "ai_insights": ai_insights
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching learning path for {course_id}: {e}")
        raise HTTPException(status_code=500, detail="Error interno al procesar la ruta de aprendizaje.")


@router.post("/curso/{course_id}/step/{step_id}/complete")
async def complete_step(course_id: int, step_id: int, user_data = Depends(get_current_user)):
    user, token = user_data
    supabase = get_supabase(token)

    try:
        _verificar_acceso_curso(supabase, user, course_id)
        step_resp = supabase.table("learning_path_steps").select("*").eq("id", step_id).eq("curso_id", course_id).maybe_single().execute()
        if not step_resp.data:
            raise HTTPException(status_code=404, detail="Unidad no encontrada")

        tabla_existe = True
        try:
            existing = supabase.table("progreso_unidades").select("*").eq("perfil_id", user.id).eq("step_id", step_id).maybe_single().execute()

            if existing and existing.data:
                supabase.table("progreso_unidades").update({
                    "completado": True,
                    "fecha_completado": "now()"
                }).eq("id", existing.data["id"]).execute()
            else:
                supabase.table("progreso_unidades").insert({
                    "perfil_id": user.id,
                    "step_id": step_id,
                    "curso_id": course_id,
                    "completado": True,
                    "fecha_completado": "now()"
                }).execute()
        except Exception as table_err:
            err_str = str(table_err)
            if "PGRST205" in err_str or "Could not find the table" in err_str:
                logger.warning("Tabla 'progreso_unidades' no existe. El progreso no se persistirá hasta crear la tabla.")
                tabla_existe = False
            else:
                raise

        if tabla_existe:
            steps_resp = supabase.table("learning_path_steps").select("id").eq("curso_id", course_id).execute()
            all_step_ids = [s["id"] for s in steps_resp.data]

            completed_resp = supabase.table("progreso_unidades").select("*").eq("perfil_id", user.id).eq("completado", True).in_("step_id", all_step_ids).execute()

            if len(completed_resp.data) >= len(all_step_ids):
                supabase.table("progreso_cursos").update({
                    "status": "completed",
                    "fecha_completado": "now()"
                }).eq("perfil_id", user.id).eq("curso_id", course_id).execute()
            else:
                supabase.table("progreso_cursos").update({
                    "status": "in_progress"
                }).eq("perfil_id", user.id).eq("curso_id", course_id).execute()

        return {
            "success": True,
            "message": "Unidad marcada como completada",
            "warning": "El progreso no se persistirá en base de datos hasta que se ejecute la migración SQL." if not tabla_existe else None
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error completing step {step_id}: {e}")
        raise HTTPException(status_code=500, detail="Error interno al completar la unidad.")


CURSO_PLANCHA_SUBDIR = {
    11: "geometria analitica",
    31: "geometria analitica",
    54: "geometria analitica",
    12: "calculo diferencial",
    32: "calculo diferencial",
    50: "calculo diferencial",
}

@router.post("/cursos/{curso_id}/completar")
async def completar_curso(curso_id: int, user_data = Depends(get_current_user)):
    user, token = user_data
    supabase = get_supabase(token)

    profile_resp = supabase.table("perfiles").select("carrera_id, malla_id").eq("id", user.id).maybe_single().execute()
    perfil = profile_resp.data if profile_resp else None
    malla_id = perfil.get("malla_id") if perfil else None
    if not malla_id and perfil and perfil.get("carrera_id"):
        try:
            m_resp = supabase.table("mallas").select("id").eq("carrera_id", perfil["carrera_id"]).eq("es_vigente", True).order("id").limit(1).execute()
            filas = getattr(m_resp, "data", None) or []
            malla_id = filas[0]["id"] if filas else None
        except Exception:
            malla_id = None

    prereq_map: Dict[int, List[int]] = {}
    if malla_id:
        mc_resp = supabase.table("malla_cursos").select("id, curso_id").eq("malla_id", malla_id).execute()
        mc_data = mc_resp.data or []
        mc_ids = [mc["id"] for mc in mc_data]
        if mc_ids:
            prereq_resp = supabase.table("malla_curso_prerrequisitos").select("malla_curso_id, prerrequisito_malla_curso_id").in_("malla_curso_id", mc_ids).execute()
            from app.core.prereqs import build_prereq_map_from_malla
            prereq_map = build_prereq_map_from_malla(mc_data, prereq_resp.data or [], use_curso_id=True)

    chain = resolve_prereq_chain(curso_id, prereq_map)
    cursos_a_completar = {curso_id, *chain}

    progreso_items = [
        {
            "perfil_id": user.id,
            "curso_id": cid,
            "status": "completed",
        }
        for cid in cursos_a_completar
    ]

    if progreso_items:
        supabase.table("progreso_cursos").upsert(
            progreso_items,
            on_conflict="perfil_id, curso_id"
        ).execute()

    return {"status": "success", "message": "Curso marcado como completado exitosamente"}


@router.get("/curso/{course_id}/plancha/{filename}")
async def download_plancha(course_id: int, filename: str):
    subdir = CURSO_PLANCHA_SUBDIR.get(course_id, "geometria analitica")
    plancha_path = PLANCHAS_DIR / subdir / filename

    if not plancha_path.exists():
        parent = PLANCHAS_DIR / subdir
        if parent.exists():
            match = next((f for f in parent.iterdir() if f.name.lower() == filename.lower()), None)
            if match:
                plancha_path = match

    if not plancha_path.exists():
        raise HTTPException(status_code=404, detail=f"Archivo no encontrado: {filename}")

    return FileResponse(
        path=str(plancha_path),
        media_type="application/pdf",
        filename=filename,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )
