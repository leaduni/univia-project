import logging
from fastapi import APIRouter, HTTPException, Depends, Query
from app.core.database import get_supabase
from app.core.auth_utils import get_current_user
from app.core.exceptions import raise_field_error
from app.core.prereqs import resolve_prereq_chain, check_course_status
from app.schemas.onboarding import (
    OnboardingCompleteRequest,
    CursosPorCarreraResponse,
    CursoPrereqItem,
    PrerrequisitoFaltante,
)
from typing import Dict, Set, List

logger = logging.getLogger(__name__)
router = APIRouter()


def _cargar_prerrequisitos(supabase, cursos_de_carrera: Set[int]) -> List[dict]:
    """Devuelve los prerrequisitos que aplican a los cursos de una carrera.

    La tabla es global, así que se filtra en memoria para no arrastrar
    relaciones de otras carreras a la resolución de cadenas.
    """
    try:
        resp = supabase.table("curso_prerrequisitos").select("curso_id, prerrequisito_id").execute()
        filas = getattr(resp, "data", None) or []
    except Exception as e:
        logger.error(f"Error cargando prerrequisitos: {e}")
        return []

    return [f for f in filas if f["curso_id"] in cursos_de_carrera]


def _obtener_carrera(supabase, carrera_id: int) -> dict:
    """Devuelve la carrera elegida o corta con 400 si no existe (RF-EST-01).

    Sin esta comprobación, un carrera_id inventado se guardaba igual en el
    perfil y dejaba al estudiante con una carrera que no existe.
    """
    try:
        resp = (
            supabase.table("carreras")
            .select("id, codigo, name, duracion_ciclos")
            .eq("id", carrera_id)
            .maybe_single()
            .execute()
        )
        carrera = getattr(resp, "data", None) if resp else None
    except Exception as e:
        logger.error(f"Error consultando carrera {carrera_id}: {e}")
        carrera = None

    if not carrera:
        raise_field_error("carrera_id", "La carrera seleccionada no existe.", status_code=400)

    return carrera


def _validar_ciclo(carrera: dict, ciclo_actual: int) -> None:
    """Comprueba que el ciclo relativo cabe dentro del plan de la carrera."""
    duracion = carrera.get("duracion_ciclos") or 10
    if ciclo_actual > duracion:
        raise_field_error(
            "ciclo_actual",
            f"{carrera['name']} tiene {duracion} ciclos, así que el ciclo "
            f"{ciclo_actual} no es válido.",
            status_code=400,
        )


def _validar_cursos_de_carrera(
    cursos_inscritos: List[int], cursos_en_carrera: Dict[int, dict], carrera: dict
) -> None:
    """Rechaza cursos que no pertenecen a la carrera elegida (RF-EST-01).

    Antes no se comprobaba: se podía inscribir cursos de otra carrera y la
    malla quedaba mostrando cursos que no son del plan del estudiante.
    """
    ajenos = [cid for cid in cursos_inscritos if cid not in cursos_en_carrera]
    if ajenos:
        raise_field_error(
            "cursos_inscritos",
            f"Seleccionaste {len(ajenos)} curso(s) que no pertenecen a "
            f"{carrera['name']}.",
            status_code=400,
        )


def _verificar_perfil_minimo(supabase, user) -> dict:
    """Exige que el perfil traiga los datos mínimos antes de cerrar el registro.

    RF-EST-01 pide código, correo y nombres; esos se capturan en el registro.
    Si faltan, el onboarding no debe marcarse como completado, porque dejaría
    un perfil a medias que la malla y el dashboard no pueden usar.
    """
    try:
        resp = (
            supabase.table("perfiles")
            .select("id, email, codigo_estudiante, nombre_completo")
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

    faltantes = [
        etiqueta
        for campo, etiqueta in (
            ("email", "correo institucional"),
            ("codigo_estudiante", "código universitario"),
            ("nombre_completo", "nombres y apellidos"),
        )
        if not perfil.get(campo)
    ]
    if faltantes:
        raise_field_error(
            "perfil",
            "Tu perfil está incompleto. Falta: " + ", ".join(faltantes) + ".",
            status_code=400,
        )

    return perfil


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
        # Se cargan TODOS los cursos de la carrera, no solo los visibles: la
        # cadena de prerrequisitos necesita resolver también los de ciclos que
        # el estudiante no verá en pantalla.
        todos_resp = (
            supabase.table("cursos")
            .select("id, code, name, credits, ciclo, carrera_id")
            .eq("carrera_id", carrera_id)
            .order("ciclo")
            .order("code")
            .execute()
        )
        todos_los_cursos = todos_resp.data or []
        if not todos_los_cursos:
            return CursosPorCarreraResponse(carrera_id=carrera_id, cursos=[])

        cursos_dict: Dict[int, dict] = {c["id"]: c for c in todos_los_cursos}
        visibles = [c for c in todos_los_cursos if c["ciclo"] <= ciclo_actual]

        prereq_map: Dict[int, List[int]] = {}
        for p in _cargar_prerrequisitos(supabase, set(cursos_dict)):
            prereq_map.setdefault(p["curso_id"], []).append(p["prerrequisito_id"])

        progreso_resp = (
            supabase.table("progreso_cursos")
            .select("curso_id, status")
            .eq("perfil_id", user.id)
            .execute()
        )
        progreso_raw = progreso_resp.data or []
        progreso_map: Dict[int, str] = {p["curso_id"]: p["status"] for p in progreso_raw}
        completadas: Set[int] = {
            p["curso_id"] for p in progreso_raw if p["status"] == "completed"
        }

        # El estudiante sin historial está haciendo su onboarding inicial: aún
        # no ha declarado qué aprobó, así que no hay nada contra qué bloquear.
        # Al confirmar, complete_onboarding marca como aprobada la cadena de
        # prerrequisitos de lo que eligió.
        sin_historial = not progreso_raw

        cursos = []
        for c in visibles:
            cid = c["id"]

            if sin_historial:
                status, faltantes = "available", []
            else:
                status, prereq_info, _ok = check_course_status(
                    curso_id=cid,
                    db_status=progreso_map.get(cid),
                    completed_courses=completadas,
                    prereq_map=prereq_map,
                    cursos_dict=cursos_dict,
                )
                faltantes = [
                    PrerrequisitoFaltante(
                        id=p["id"], code=p["code"], name=p["name"]
                    )
                    for p in prereq_info
                    if not p["completado"]
                ]

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
                    prerrequisitos_faltantes=faltantes,
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

        # --- Validaciones de RF-EST-01 antes de tocar nada ---
        perfil = _verificar_perfil_minimo(supabase, user)
        carrera = _obtener_carrera(supabase, carrera_id)
        _validar_ciclo(carrera, ciclo_actual)

        # --- Cargar datos de la carrera ---
        cursos_resp = supabase.table("cursos").select("*").eq("carrera_id", carrera_id).execute()
        cursos_en_carrera: Dict[int, dict] = {}
        for c in cursos_resp.data or []:
            cid = c["id"]
            cursos_en_carrera[cid] = c

        _validar_cursos_de_carrera(cursos_inscritos, cursos_en_carrera, carrera)

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
            # Perfil ya con los datos mínimos de RF-EST-01, para que el
            # frontend no tenga que volver a pedirlo tras el wizard.
            "perfil": {
                "codigo_estudiante": perfil.get("codigo_estudiante"),
                "email": perfil.get("email"),
                "nombre_completo": perfil.get("nombre_completo"),
                "carrera": {
                    "id": carrera["id"],
                    "codigo": carrera["codigo"],
                    "name": carrera["name"],
                },
                "ciclo_actual": ciclo_actual,
                "total_cursos_inscritos": len(inscritos_final),
            },
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error en onboarding: {e}")
        raise HTTPException(status_code=500, detail=f"Error al guardar datos: {str(e)}")
