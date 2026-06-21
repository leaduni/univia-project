from fastapi import APIRouter, Depends, HTTPException
from database import get_supabase
from auth_utils import get_current_user
from typing import List, Dict, Any, Optional
from pydantic import BaseModel

router = APIRouter(prefix="/malla", tags=["Academic Curriculum"])

# --- Esquemas de Datos ---

class Course(BaseModel):
    id: str
    code: str
    name: str
    credits: int
    status: str  # available, in_progress, completed, locked
    description: Optional[str] = None
    progreso: Optional[int] = 0

class Ciclo(BaseModel):
    ciclo: str
    credits: int
    courses: List[Course]

# --- Endpoints ---

@router.get("/", response_model=List[Ciclo])
async def get_malla(user_data = Depends(get_current_user)) -> List[Ciclo]:
    """
    Construye la malla curricular usando las tablas:
    perfiles, cursos, curso_prerrequisitos, progreso_cursos.
    """
    user, token = user_data
    supabase = get_supabase(token)

    try:
        # 1. Obtener carrera del usuario (Tabla: perfiles)
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

        # 2. Obtener todos los cursos de la carrera (Tabla: cursos)
        # Campos: id, carrera_id, code, name, credits, description, ciclo
        cursos_resp = (
            supabase.table("cursos")
            .select("*")
            .eq("carrera_id", carrera_id)
            .execute()
        )
        if not cursos_resp.data:
            return []

        # 3. Obtener prerrequisitos (Tabla: curso_prerrequisitos)
        # Campos: curso_id, prerrequisito_id
        prereq_resp = supabase.table("curso_prerrequisitos").select("*").execute()
        prereq_map: Dict[str, List[str]] = {}
        for p in (prereq_resp.data or []):
            prereq_map.setdefault(p["curso_id"], []).append(p["prerrequisito_id"])

        # 4. Obtener progreso del usuario (Tabla: progreso_cursos)
        # Campos: curso_id, status, progreso
        progreso_resp = (
            supabase.table("progreso_cursos")
            .select("curso_id, status")
            .eq("perfil_id", user.id)
            .execute()
        )
        
        progreso_data = {
            p["curso_id"]: {
                "status": p["status"]
            }
            for p in (progreso_resp.data or [])
        }
        
        completed_courses = {
            p["curso_id"] for p in (progreso_resp.data or []) if p["status"] == "completed"
        }

        # 5. Organizar Malla por Ciclos
        malla_dict: Dict[int, Ciclo] = {}
        
        for curso_raw in (cursos_resp.data or []):
            ciclo_num = curso_raw.get("ciclo")
            if ciclo_num is None: continue

            if ciclo_num not in malla_dict:
                malla_dict[ciclo_num] = Ciclo(
                    ciclo=f"Ciclo {ciclo_num}",
                    credits=0,
                    courses=[]
                )

            # Lógica de Estado (Status)
            user_prog = progreso_data.get(curso_raw["id"])
            status = user_prog["status"] if user_prog else "available"
            progreso_val = 0

            # Validación de Prerrequisitos para 'available'
            if status == "available":
                prereqs = prereq_map.get(curso_raw["id"], [])
                if any(pid not in completed_courses for pid in prereqs):
                    status = "locked"

            curso_obj = Course(
                id=str(curso_raw["id"]),
                code=curso_raw["code"],
                name=curso_raw["name"],
                credits=curso_raw["credits"],
                status=status,
                description=curso_raw.get("description"),
                progreso=progreso_val
            )

            malla_dict[ciclo_num].courses.append(curso_obj)
            malla_dict[ciclo_num].credits += curso_raw["credits"]

        # 6. Ordenar por Ciclo y retornar
        return [malla_dict[c] for c in sorted(malla_dict.keys())]

    except Exception as e:
        import traceback

        print("========== ERROR MALLA ==========")
        traceback.print_exc()

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )