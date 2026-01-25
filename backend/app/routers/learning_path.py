"""
Router for Learning Path endpoints
"""
from fastapi import APIRouter, HTTPException, Depends, Header
from app.database import get_supabase
from supabase import Client
from typing import Optional

router = APIRouter(prefix="/curso", tags=["Learning Path"])

@router.get("/{curso_id}/learning-path")
async def get_learning_path(
    curso_id: int,
    authorization: Optional[str] = Header(None),
    supabase: Client = Depends(get_supabase)
):
    """
    Get complete learning path for a course including timeline, AI insights, and exam bank
    """
    try:
        # TODO: Extract user_id from JWT token
        user_id = None
        
        # Get course basic info
        curso_result = supabase.table("cursos")\
            .select("*")\
            .eq("id", curso_id)\
            .single()\
            .execute()
        
        if not curso_result.data:
            raise HTTPException(status_code=404, detail="Curso not found")
        
        curso = curso_result.data
        
        # Get active section for this course
        seccion_result = supabase.table("secciones_curso")\
            .select("*, profesor:profesores(nombre_completo, titulo)")\
            .eq("curso_id", curso_id)\
            .eq("semestre", "2024-II")\
            .limit(1)\
            .execute()
        
        seccion = seccion_result.data[0] if seccion_result.data else None
        
        # Get student's matricula for this course (if authenticated)
        matricula = None
        progreso = 0
        if user_id and seccion:
            matricula_result = supabase.table("matriculas")\
                .select("*")\
                .eq("estudiante_id", user_id)\
                .eq("seccion_curso_id", seccion["id"])\
                .execute()
            
            if matricula_result.data:
                matricula = matricula_result.data[0]
                progreso = matricula.get("progreso_porcentaje", 0)
        
        # Build curso info
        curso_info = {
            "code": curso["codigo"],
            "name": curso["nombre"],
            "professor": f"{seccion['profesor']['titulo']} {seccion['profesor']['nombre_completo']}" if seccion and seccion.get("profesor") else "TBD",
            "description": curso.get("descripcion", ""),
            "credits": curso["creditos"],
            "progress": progreso,
            "startDate": str(seccion["fecha_inicio"]) if seccion and seccion.get("fecha_inicio") else None,
            "endDate": str(seccion["fecha_fin"]) if seccion and seccion.get("fecha_fin") else None
        }
        
        # Get timeline steps
        timeline = []
        if seccion:
            timeline_result = supabase.table("timeline_pasos")\
                .select("*, recursos:recursos_timeline(*)")\
                .eq("seccion_curso_id", seccion["id"])\
                .order("orden")\
                .execute()
            
            for step in timeline_result.data:
                # Get progress status for this step (if authenticated)
                status = "locked"
                if user_id and matricula:
                    progreso_result = supabase.table("progreso_timeline")\
                        .select("estado")\
                        .eq("matricula_id", matricula["id"])\
                        .eq("timeline_paso_id", step["id"])\
                        .execute()
                    
                    if progreso_result.data:
                        status = progreso_result.data[0]["estado"]
                
                timeline.append({
                    "id": step["id"],
                    "title": step["titulo"],
                    "description": step.get("descripcion", ""),
                    "duration": step.get("duracion", ""),
                    "status": status,
                    "topics": step.get("topicos", []),
                    "icon": step.get("icono", "Circle"),
                    "resources": [
                        {
                            "type": r["tipo"],
                            "title": r["titulo"],
                            "duration": r.get("duracion"),
                            "url": r.get("url")
                        }
                        for r in step.get("recursos", [])
                    ]
                })
        
        # Get AI insights (if authenticated and enrolled)
        ai_insights = []
        if user_id and matricula:
            insights_result = supabase.table("ai_insights")\
                .select("*")\
                .eq("matricula_id", matricula["id"])\
                .eq("activo", True)\
                .order("prioridad")\
                .execute()
            
            ai_insights = [
                {
                    "type": insight["tipo"],
                    "title": insight["titulo"],
                    "description": insight["descripcion"],
                    "impact": insight.get("impacto", ""),
                    "action": insight.get("accion_sugerida", "")
                }
                for insight in insights_result.data
            ]
        
        # Get exam bank
        exam_bank_result = supabase.table("banco_examenes")\
            .select("*")\
            .eq("curso_id", curso_id)\
            .order("anio", desc=True)\
            .execute()
        
        exam_bank = [
            {
                "id": exam["id"],
                "title": exam["titulo"],
                "type": exam["tipo"],
                "year": exam["anio"],
                "difficulty": exam.get("dificultad", ""),
                "questions": exam.get("num_preguntas", 0),
                "duration": exam.get("duracion_minutos", 0),
                "downloads": exam.get("descargas", 0),
                "hasAnswers": exam.get("tiene_respuestas", False)
            }
            for exam in exam_bank_result.data
        ]
        
        return {
            "curso": curso_info,
            "timeline": timeline,
            "ai_insights": ai_insights,
            "exam_bank": exam_bank
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching learning path: {str(e)}")
