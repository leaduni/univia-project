from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import FileResponse
from app.core.database import get_supabase
from app.core.auth_utils import get_current_user
import os
import logging
from pathlib import Path

logger = logging.getLogger(__name__)
router = APIRouter()

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
        # 1. Obtener detalles del curso básico
        course_resp = supabase.table("cursos").select("*").eq("id", course_id).single().execute()
        if not course_resp.data:
            raise HTTPException(status_code=404, detail="Curso no encontrado")
        
        # 2. Obtener pasos de la ruta (sílabo)
        steps_resp = supabase.table("learning_path_steps").select("*").eq("curso_id", course_id).order("order_index").execute()
        
        # 3. Obtener progreso del usuario para este curso
        progreso_resp = supabase.table("progreso_cursos").select("*").eq("perfil_id", user.id).eq("curso_id", course_id).maybe_single().execute()
        
        # 4. Obtener progreso de unidades individuales
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
        
        # 5. Obtener recursos vinculados (Banco de exámenes)
        exams_resp = supabase.table("recursos").select("*").eq("curso_id", course_id).eq("tipo", "examen").execute()
        exam_bank = [
            {
                "id": str(r.get("id", "")),
                "title": r.get("titulo", "Sin título"),
                "type": "practice",
                "year": 2024,
                "difficulty": "medium",
                "questions": 0,
                "duration": 0,
                "downloads": 0,
                "hasAnswers": False,
            }
            for r in (exams_resp.data or [])
            if r.get("titulo")
        ]

        # 6. Calcular status de los pasos
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

        # 7. Lógica de "IA Insights"
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
            "ai_insights": ai_insights,
            "exam_bank": exam_bank
        }
    except Exception as e:
        print(f"Error fetching learning path for {course_id}: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/curso/{course_id}/step/{step_id}/complete")
async def complete_step(course_id: int, step_id: int, user_data = Depends(get_current_user)):
    user, token = user_data
    supabase = get_supabase(token)
    
    try:
        step_resp = supabase.table("learning_path_steps").select("*").eq("id", step_id).eq("curso_id", course_id).maybe_single().execute()
        if not step_resp.data:
            raise HTTPException(status_code=404, detail="Unidad no encontrada")
        
        # Intentar marcar como completado en progreso_unidades
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
        
        # Verificar si todas las unidades están completadas (solo si tabla existe)
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
    except Exception as e:
        print(f"Error completing step {step_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


CURSO_PLANCHA_SUBDIR = {
    11: "geometria analitica",
    31: "geometria analitica",
    54: "geometria analitica",
    12: "calculo diferencial",
    32: "calculo diferencial",
    50: "calculo diferencial",
}

@router.get("/curso/{course_id}/plancha/{filename}")
async def download_plancha(course_id: int, filename: str):
    subdir = CURSO_PLANCHA_SUBDIR.get(course_id, "geometria analitica")
    plancha_path = PLANCHAS_DIR / subdir / filename

    if not plancha_path.exists():
        # Intento case-insensitive: buscar en el directorio
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
