from fastapi import APIRouter, HTTPException, Depends
from database import get_supabase
from auth_utils import get_current_user

router = APIRouter()

@router.get("/dashboard/summary")
async def get_dashboard_summary(user_data = Depends(get_current_user)):
    user, token = user_data
    supabase = get_supabase(token)
    
    try:
        # 1. Obtener Perfil (para carrera_id)
        profile_resp = supabase.table("perfiles").select("carrera_id").eq("id", user.id).single().execute()
        carrera_id = profile_resp.data.get("carrera_id")
        
        # 2. Obtener Estadísticas
        progreso_resp = supabase.table("progreso_cursos").select("status").eq("perfil_id", user.id).execute()
        
        total_cursos = 0
        if carrera_id:
            cursos_resp = supabase.table("cursos").select("id", count="exact").eq("carrera_id", carrera_id).execute()
            total_cursos = cursos_resp.count if cursos_resp.count is not None else 0
            
        completados = sum(1 for p in progreso_resp.data if p["status"] == "completed")
        en_progreso = sum(1 for p in progreso_resp.data if p["status"] == "in_progress")
        porcentaje = (completados / total_cursos * 100) if total_cursos > 0 else 0

        # 3. Obtener Logros
        logros_resp = supabase.table("logros").select("*").execute()
        unlocked_resp = supabase.table("logros_usuarios").select("logro_id, unlocked_at").eq("perfil_id", user.id).execute()
        unlocked_map = {item["logro_id"]: item["unlocked_at"] for item in unlocked_resp.data}
        
        logros_lista = []
        for logro in logros_resp.data:
            unlocked = logro["id"] in unlocked_map
            logros_lista.append({
                "id": logro["id"],
                "nombre": logro["nombre"],
                "descripcion": logro["descripcion"],
                "icon": logro["icon"],
                "unlocked": unlocked,
                "unlocked_at": unlocked_map.get(logro["id"]) if unlocked else None
            })

        return {
            "stats": {
                "cursosCompletados": completados,
                "totalCursos": total_cursos,
                "porcentajeProgreso": round(porcentaje, 1),
                "promedioPonderado": 16.5,
                "horasEstudio": 120
            },
            "logros": logros_lista
        }
    except Exception as e:
        print(f"Error in dashboard summary: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/dashboard/logros")
async def get_logros(user_data = Depends(get_current_user)):
    user, token = user_data
    supabase = get_supabase(token)
    
    try:
        # 1. Obtener todos los logros posibles
        logros_resp = supabase.table("logros").select("*").execute()
        
        # 2. Obtener logros desbloqueados por el usuario
        unlocked_resp = supabase.table("logros_usuarios").select("logro_id, unlocked_at").eq("perfil_id", user.id).execute()
        
        unlocked_map = {item["logro_id"]: item["unlocked_at"] for item in unlocked_resp.data}
        
        # 3. Combinar datos
        result = []
        for logro in logros_resp.data:
            unlocked = logro["id"] in unlocked_map
            result.append({
                "id": logro["id"],
                "nombre": logro["nombre"],
                "descripcion": logro["descripcion"],
                "icon": logro["icon"],
                "unlocked": unlocked,
                "unlocked_at": unlocked_map.get(logro["id"]) if unlocked else None
            })
            
        return result
    except Exception as e:
        print(f"Error fetching logros: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/dashboard/stats")
async def get_stats(user_data = Depends(get_current_user)):
    user, token = user_data
    supabase = get_supabase(token)
    
    try:
        # Obtener progreso total
        progreso_resp = supabase.table("progreso_cursos").select("status").eq("perfil_id", user.id).execute()
        
        # Obtener total de cursos de la carrera del usuario
        # Primero necesitamos la carrera_id del usuario
        profile_resp = supabase.table("perfiles").select("carrera_id").eq("id", user.id).single().execute()
        
        carrera_id = profile_resp.data.get("carrera_id")
        
        total_cursos = 0
        if carrera_id:
            cursos_resp = supabase.table("cursos").select("id", count="exact").eq("carrera_id", carrera_id).execute()
            total_cursos = cursos_resp.count if cursos_resp.count is not None else 0
            
        completados = sum(1 for p in progreso_resp.data if p["status"] == "completed")
        en_progreso = sum(1 for p in progreso_resp.data if p["status"] == "in_progress")
        
        porcentaje = (completados / total_cursos * 100) if total_cursos > 0 else 0
        
        return {
            "cursosCompletados": completados,
            "totalCursos": total_cursos,
            "porcentajeProgreso": round(porcentaje, 1),
            "promedioPonderado": 16.5, # Mock por ahora hasta tener notas
            "horasEstudio": 120 # Mock
        }
    except Exception as e:
        print(f"Error fetching stats: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
