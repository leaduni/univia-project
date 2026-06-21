from fastapi import APIRouter, HTTPException, Depends
from database import get_supabase
from auth_utils import get_current_user

router = APIRouter()

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
        
        # 4. Obtener recursos vinculados (Banco de exámenes)
        exams_resp = supabase.table("recursos").select("*").eq("curso_id", course_id).eq("tipo", "examen").execute()
        
        # 5. Calcular status de los pasos
        course_status = (
            progreso_resp.data.get("status")
            if progreso_resp and progreso_resp.data
            else "available"
        )
        timeline_steps = []
        for i, step in enumerate(steps_resp.data):
            step_status = "upcoming"
            if course_status == "completed":
                step_status = "completed"
            elif course_status == "in_progress":
                if i == 0: # Simplificación: Primera semana es la actual
                    step_status = "current"
                elif i < 0: # Lógica para semanas pasadas (a implementar después)
                    step_status = "completed"
                else:
                    step_status = "upcoming"
            
            timeline_steps.append({
                **step,
                "status": step_status
            })

        # 6. Lógica de "IA Insights" (Mock por ahora, pero con datos del curso)
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

        return {
            "curso": {
                "id": course_resp.data["id"],
                "code": course_resp.data["code"],
                "name": course_resp.data["name"],
                "professor": "Ing. Docente UNI",
                "progress": 0 if not progreso_resp.data else (100 if progreso_resp.data["status"] == "completed" else 30)
            },
            "timeline": timeline_steps,
            "ai_insights": ai_insights,
            "exam_bank": exams_resp.data
        }
    except Exception as e:
        print(f"Error fetching learning path for {course_id}: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
