import logging
from fastapi import APIRouter, HTTPException, Depends, Query
from app.core.avance import calcular_avance
from app.core.database import get_supabase
from app.core.auth_utils import get_current_user
from app.core.exceptions import raise_field_error
from app.core.onboarding_service import build_onboarding_courses
from app.core.prereqs import resolve_prereq_chain, check_course_status
from app.schemas.onboarding import (
    CICLO_POR_DEFECTO,
    ActualizarCursosRequest,
    OnboardingCompleteRequest,
    OnboardingDataResponse,
    CarreraItem,
    FacultadItem,
    RangoCiclos,
    CursosPorCarreraResponse,
    CursoPrereqItem,
    PrerrequisitoFaltante,
    MallaItem,
)
from typing import Dict, Set, List, Optional

logger = logging.getLogger(__name__)
router = APIRouter()


def _resolver_malla_id(supabase, carrera_id: int, malla_id: Optional[int] = None) -> Optional[int]:
    """Obtiene el malla_id directo o busca la malla vigente de la carrera.

    Si existen varias mallas vigentes (es_vigente = true) para la carrera, se
    toma la más antigua (id menor) como fallback determinista de migración; la
    asignación real de cada estudiante la decide el onboarding (perfiles.malla_id).
    """
    if malla_id:
        return malla_id
    if not carrera_id:
        return None
    try:
        resp = (
            supabase.table("mallas")
            .select("id")
            .eq("carrera_id", carrera_id)
            .eq("es_vigente", True)
            .order("id")
            .limit(1)
            .execute()
        )
        filas = getattr(resp, "data", None) or []
        return filas[0]["id"] if filas else None
    except Exception as e:
        logger.error(f"Error resolviendo malla vigente para carrera {carrera_id}: {e}")
        return None


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


def _verificar_perfil_minimo(supabase, user, codigo_entrante: str | None = None) -> dict:
    """Exige que el perfil traiga los datos mínimos antes de cerrar el registro.

    RF-EST-01 pide código, correo y nombres; esos se capturan en el registro.
    Si faltan, el onboarding no debe marcarse como completado, porque dejaría
    un perfil a medias que la malla y el dashboard no pueden usar.

    `codigo_entrante` es el valor que viene en el POST de finalización del
    onboarding y que va a persistirse en `perfiles.codigo_estudiante`. Se cuenta
    como presente para no bloquear a los usuarios de Google SSO antes de que
    ese valor se guarde.
    """
    try:
        resp = (
            supabase.table("perfiles")
            .select("id, email, codigo_estudiante, nombre_completo, carrera_id, ciclo_actual")
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
            # El código puede venir ya en el perfil (registro manual) o en la
            # propia petición de cierre (Google SSO, aún sin persistir).
            ("codigo_estudiante", "código universitario"),
            ("nombre_completo", "nombres y apellidos"),
        )
        if not (perfil.get(campo) or (campo == "codigo_estudiante" and codigo_entrante))
    ]
    if faltantes:
        raise_field_error(
            "perfil",
            "Tu perfil está incompleto. Falta: " + ", ".join(faltantes) + ".",
            status_code=400,
        )

    return perfil


@router.get("/onboarding/data", response_model=OnboardingDataResponse)
async def get_onboarding_data(user_data=Depends(get_current_user)):
    """Catálogo que alimenta los pasos de carrera y ciclo del wizard.

    Devuelve cada carrera con su facultad y la duración de su plan, más el
    rango de ciclos seleccionable, para que el frontend no tenga que asumir
    un número fijo de ciclos.
    """
    user, token = user_data
    supabase = get_supabase(token)

    try:
        carreras_resp = (
            supabase.table("carreras")
            .select("id, codigo, name, description, duracion_ciclos, facultad_id")
            .order("name")
            .execute()
        )
        carreras_raw = getattr(carreras_resp, "data", None) or []

        facultades_resp = (
            supabase.table("facultades").select("id, codigo, nombre").order("nombre").execute()
        )
        facultades_raw = getattr(facultades_resp, "data", None) or []
    except Exception as e:
        logger.error(f"Error fetching onboarding data: {e}")
        raise HTTPException(status_code=500, detail="No se pudo cargar el catálogo académico.")

    facultades = [FacultadItem(**f) for f in facultades_raw]
    facultades_por_id = {f.id: f for f in facultades}

    carreras = [
        CarreraItem(
            id=c["id"],
            codigo=c["codigo"],
            name=c["name"],
            description=c.get("description"),
            duracion_ciclos=c.get("duracion_ciclos") or CICLO_POR_DEFECTO,
            facultad=facultades_por_id.get(c.get("facultad_id")),
        )
        for c in carreras_raw
    ]

    # El tope global cubre el caso en que el frontend aún no sabe qué carrera
    # eligió el estudiante; cada carrera lleva además su propia duración.
    ciclo_max = max((c.duracion_ciclos for c in carreras), default=CICLO_POR_DEFECTO)

    return OnboardingDataResponse(
        carreras=carreras,
        facultades=facultades,
        ciclos=RangoCiclos(min=1, max=ciclo_max),
    )


@router.get("/onboarding/mallas", response_model=List[MallaItem])
async def get_mallas_por_carrera(
    carrera_id: int = Query(..., description="ID de la carrera"),
    user_data=Depends(get_current_user),
):
    """Lista las mallas/planes de estudio de una carrera (RF-EST-01)."""
    user, token = user_data
    supabase = get_supabase(token)
    try:
        resp = (
            supabase.table("mallas")
            .select("id, carrera_id, nombre, codigo_plan, es_vigente")
            .eq("carrera_id", carrera_id)
            .order("es_vigente", desc=True)
            .execute()
        )
        return getattr(resp, "data", None) or []
    except Exception as e:
        logger.error(f"Error fetching mallas para carrera {carrera_id}: {e}")
        raise HTTPException(status_code=500, detail="No se pudieron cargar las mallas de la carrera.")



def _cargar_prerrequisitos(supabase, mc_data: List[dict]) -> Dict[int, List[int]]:
    """Prerrequisitos a nivel de malla (usado por complete_onboarding y cambio de ciclo).

    get_cursos_por_carrera ya no usa esta función: delegó a la RPC get_malla_onboarding.
    """
    if not mc_data:
        return {}

    mc_ids = [mc["id"] for mc in mc_data if "id" in mc]
    if not mc_ids:
        return {}

    try:
        resp = (
            supabase.table("malla_curso_prerrequisitos")
            .select("malla_curso_id, prerrequisito_malla_curso_id")
            .in_("malla_curso_id", mc_ids)
            .execute()
        )
        filas = getattr(resp, "data", None) or []
    except Exception as e:
        logger.error(f"Error cargando prerrequisitos: {e}")
        return {}

    mc_map = {mc["id"]: mc["curso_id"] for mc in mc_data if "id" in mc and "curso_id" in mc}
    prereq_map: Dict[int, List[int]] = {}
    for f in filas:
        mc_id = f.get("malla_curso_id")
        p_mc_id = f.get("prerrequisito_malla_curso_id")
        if mc_id in mc_map and p_mc_id in mc_map:
            prereq_map.setdefault(mc_map[mc_id], []).append(mc_map[p_mc_id])

    return prereq_map


@router.get("/onboarding/cursos", response_model=CursosPorCarreraResponse)
async def get_cursos_por_carrera(
    carrera_id: int = Query(..., description="ID de la carrera"),
    ciclo_actual: int = Query(1, description="Ciclo actual del usuario para filtrar disponibilidad"),
    malla_id: Optional[int] = Query(None, description="ID de la malla/plan de estudios (opcional)"),
    user_data=Depends(get_current_user),
):
    """Cursos de la malla con estado de prerrequisitos resuelto por la RPC.

    Reemplaza las 3 consultas anteriores (malla_cursos, malla_curso_prerrequisitos,
    progreso_cursos) + BFS en Python por una sola llamada a get_malla_onboarding().
    """
    user, token = user_data
    supabase = get_supabase(token)

    real_malla_id = _resolver_malla_id(supabase, carrera_id, malla_id)
    if not real_malla_id:
        return CursosPorCarreraResponse(carrera_id=carrera_id, cursos=[])

    try:
        resp = (
            supabase.rpc(
                "get_malla_onboarding",
                {
                    "p_malla_id": real_malla_id,
                    "p_perfil_id": str(user.id),
                    "p_ciclo_actual": ciclo_actual,
                },
            )
            .execute()
        )
        rows = getattr(resp, "data", None) or []
    except Exception as e:
        logger.error(
            f"RPC get_malla_onboarding failed for malla={real_malla_id} "
            f"perfil={user.id}: {e}"
        )
        raise HTTPException(
            status_code=502,
            detail="El servicio de validación de prerrequisitos no está disponible. "
                   "Intenta de nuevo en unos minutos.",
        )

    cursos = build_onboarding_courses(rows, carrera_id)
    return CursosPorCarreraResponse(carrera_id=carrera_id, cursos=cursos)


def calcular_resumen_academico(supabase, user, perfil: dict) -> dict:
    """Resumen del estado académico del estudiante (RF-07)."""
    carrera_id = perfil.get("carrera_id")
    malla_id = _resolver_malla_id(supabase, carrera_id, perfil.get("malla_id"))
    if not carrera_id or not malla_id:
        return {
            "carrera": None,
            "ciclo_actual": perfil.get("ciclo_actual"),
            "cursos_aprobados": [],
            "cursos_en_curso": [],
            "cursos_disponibles": [],
            "creditos_aprobados": 0,
            "creditos_totales": 0,
            "porcentaje_avance": 0.0,
        }

    carrera = _obtener_carrera(supabase, carrera_id)

    try:
        mc_resp = (
            supabase.table("malla_cursos")
            .select("id, curso_id, ciclo, credits, cursos(code, name)")
            .eq("malla_id", malla_id)
            .execute()
        )
        mc_data = getattr(mc_resp, "data", None) or []
        cursos_dict: Dict[int, dict] = {}
        for mc in mc_data:
            c_info = mc.get("cursos") or {}
            cursos_dict[mc["curso_id"]] = {
                "id": mc["curso_id"],
                "code": c_info.get("code", ""),
                "name": c_info.get("name", ""),
                "credits": mc.get("credits") or 0,
                "ciclo": mc.get("ciclo"),
            }

        progreso_resp = (
            supabase.table("progreso_cursos")
            .select("curso_id, status")
            .eq("perfil_id", user.id)
            .execute()
        )
        progreso_raw = getattr(progreso_resp, "data", None) or []
    except Exception as e:
        logger.error(f"Error calculando resumen de {user.id}: {e}")
        raise HTTPException(status_code=500, detail="No se pudo calcular tu avance académico.")

    progreso_map: Dict[int, str] = {p["curso_id"]: p["status"] for p in progreso_raw}
    aprobados: Set[int] = {c for c, s in progreso_map.items() if s == "completed"}
    en_curso: Set[int] = {c for c, s in progreso_map.items() if s == "in_progress"}

    prereq_map = _cargar_prerrequisitos(supabase, mc_data)

    disponibles = [
        cid
        for cid in cursos_dict
        if cid not in progreso_map
        and all(pid in aprobados for pid in resolve_prereq_chain(cid, prereq_map))
    ]

    def resumir(ids) -> List[dict]:
        return [
            {
                "id": cid,
                "code": cursos_dict[cid]["code"],
                "name": cursos_dict[cid]["name"],
                "credits": cursos_dict[cid]["credits"],
            }
            for cid in sorted(ids, key=lambda c: (cursos_dict[c]["ciclo"] or 99, cursos_dict[c]["code"]))
            if cid in cursos_dict
        ]

    avance = calcular_avance(cursos_dict, progreso_map)

    return {
        "carrera": {"id": carrera["id"], "codigo": carrera["codigo"], "name": carrera["name"]},
        "ciclo_actual": perfil.get("ciclo_actual"),
        "cursos_aprobados": resumir(aprobados),
        "cursos_en_curso": resumir(en_curso),
        "cursos_disponibles": resumir(disponibles),
        "creditos_aprobados": avance.creditos_aprobados,
        "creditos_totales": avance.creditos_totales,
        "porcentaje_avance": avance.porcentaje_avance,
    }


@router.get("/onboarding/resumen")
async def get_resumen_onboarding(user_data=Depends(get_current_user)):
    """Resumen del paso final del wizard: qué aprobó, qué puede llevar y su avance."""
    user, token = user_data
    supabase = get_supabase(token)
    perfil = _verificar_perfil_minimo(supabase, user)
    return calcular_resumen_academico(supabase, user, perfil)


@router.put("/perfil/cursos")
async def actualizar_cursos_del_ciclo(
    data: ActualizarCursosRequest,
    user_data=Depends(get_current_user),
):
    user, token = user_data
    supabase = get_supabase(token)

    perfil = _verificar_perfil_minimo(supabase, user)

    carrera_id = perfil.get("carrera_id")
    malla_id = _resolver_malla_id(supabase, carrera_id, perfil.get("malla_id"))
    if not carrera_id or not malla_id:
        raise_field_error(
            "carrera_id",
            "Aún no completaste tu registro inicial. Termina el onboarding primero.",
            status_code=400,
        )

    carrera = _obtener_carrera(supabase, carrera_id)
    _validar_ciclo(carrera, data.ciclo_actual)

    try:
        mc_resp = (
            supabase.table("malla_cursos")
            .select("id, curso_id, ciclo, credits, cursos(code, name)")
            .eq("malla_id", malla_id)
            .execute()
        )
        mc_data = getattr(mc_resp, "data", None) or []
        cursos_en_carrera: Dict[int, dict] = {}
        for mc in mc_data:
            c_info = mc.get("cursos") or {}
            cursos_en_carrera[mc["curso_id"]] = {
                "id": mc["curso_id"],
                "code": c_info.get("code", ""),
                "name": c_info.get("name", ""),
                "credits": mc.get("credits") or 0,
                "ciclo": mc.get("ciclo"),
            }

        progreso_resp = (
            supabase.table("progreso_cursos")
            .select("curso_id, status")
            .eq("perfil_id", user.id)
            .execute()
        )
        progreso_raw = getattr(progreso_resp, "data", None) or []
    except Exception as e:
        logger.error(f"Error cargando datos para actualizar cursos de {user.id}: {e}")
        raise HTTPException(status_code=500, detail="No se pudo cargar tu progreso académico.")

    nuevos = data.cursos_inscritos
    _validar_cursos_de_carrera(nuevos, cursos_en_carrera, carrera)

    aprobados: Set[int] = {p["curso_id"] for p in progreso_raw if p["status"] == "completed"}
    en_curso: Set[int] = {p["curso_id"] for p in progreso_raw if p["status"] == "in_progress"}
    nuevos_set: Set[int] = set(nuevos)

    def nombre(cid: int) -> str:
        return cursos_en_carrera.get(cid, {}).get("name", str(cid))

    ya_aprobados = [cid for cid in nuevos if cid in aprobados]
    if ya_aprobados:
        raise_field_error(
            "cursos_inscritos",
            "Ya aprobaste: " + ", ".join(nombre(c) for c in ya_aprobados) + ".",
            status_code=400,
        )

    a_cerrar = en_curso - nuevos_set
    aprobados_tras_cierre = aprobados | a_cerrar

    prereq_map = _cargar_prerrequisitos(supabase, mc_data)

    for curso_id in nuevos:
        faltantes = [
            pid
            for pid in resolve_prereq_chain(curso_id, prereq_map)
            if pid not in aprobados_tras_cierre and pid not in nuevos_set
        ]
        if faltantes:
            raise_field_error(
                "cursos_inscritos",
                f"No puedes llevar '{nombre(curso_id)}': te falta aprobar "
                + ", ".join(nombre(f) for f in faltantes)
                + ".",
                status_code=400,
            )

    for curso_id in nuevos:
        for prereq_id in prereq_map.get(curso_id, []):
            if prereq_id in nuevos_set:
                raise_field_error(
                    "cursos_inscritos",
                    f"No puedes matricularte simultáneamente en "
                    f"'{nombre(prereq_id)}' y '{nombre(curso_id)}'.",
                    status_code=400,
                )

    try:
        if a_cerrar:
            (
                supabase.table("progreso_cursos")
                .update({"status": "completed", "fecha_completado": "now()"})
                .eq("perfil_id", user.id)
                .in_("curso_id", list(a_cerrar))
                .execute()
            )

        a_insertar = [cid for cid in nuevos if cid not in en_curso]
        if a_insertar:
            supabase.table("progreso_cursos").insert(
                [
                    {"perfil_id": user.id, "curso_id": cid, "status": "in_progress"}
                    for cid in a_insertar
                ]
            ).execute()

        supabase.table("perfiles").update(
            {"ciclo_actual": data.ciclo_actual, "updated_at": "now()"}
        ).eq("id", user.id).execute()
    except Exception as e:
        logger.error(f"Error actualizando cursos de {user.id}: {e}")
        raise HTTPException(status_code=500, detail="No se pudieron guardar tus cursos.")

    logger.info(
        f"Cursos actualizados. Usuario={user.id}, ciclo={data.ciclo_actual}, "
        f"cerrados={len(a_cerrar)}, activos={len(nuevos)}"
    )

    return {
        "status": "success",
        "message": "Tus cursos se actualizaron para el ciclo nuevo.",
        "ciclo_actual": data.ciclo_actual,
        "cursos_activos": [
            {"id": cid, "code": cursos_en_carrera[cid]["code"], "name": nombre(cid)}
            for cid in nuevos
        ],
        "cursos_aprobados_al_cerrar": [
            {"id": cid, "code": cursos_en_carrera[cid]["code"], "name": nombre(cid)}
            for cid in sorted(a_cerrar)
        ],
        "total_aprobados": len(aprobados_tras_cierre),
    }


@router.post("/onboarding/complete")
async def complete_onboarding(
    data: OnboardingCompleteRequest,
    user_data=Depends(get_current_user),
):
    user, token = user_data
    supabase = get_supabase(token)

    try:
        carrera_id = data.carrera_id
        malla_id = _resolver_malla_id(supabase, carrera_id, getattr(data, "malla_id", None))
        ciclo_actual = data.ciclo_actual
        cursos_inscritos = data.cursos_inscritos
        inscritos_set: Set[int] = set(cursos_inscritos)

        perfil = _verificar_perfil_minimo(supabase, user, codigo_entrante=data.codigo_estudiante)
        carrera = _obtener_carrera(supabase, carrera_id)
        _validar_ciclo(carrera, ciclo_actual)

        if not malla_id:
            raise_field_error("malla_id", "No se encontró una malla curricular activa para esta carrera.", status_code=400)

        mc_resp = (
            supabase.table("malla_cursos")
            .select("id, curso_id, ciclo, credits, cursos(code, name)")
            .eq("malla_id", malla_id)
            .execute()
        )
        mc_data = getattr(mc_resp, "data", None) or []
        cursos_en_carrera: Dict[int, dict] = {}
        for mc in mc_data:
            c_info = mc.get("cursos") or {}
            cursos_en_carrera[mc["curso_id"]] = {
                "id": mc["curso_id"],
                "code": c_info.get("code", ""),
                "name": c_info.get("name", ""),
                "credits": mc.get("credits") or 0,
                "ciclo": mc.get("ciclo"),
            }

        _validar_cursos_de_carrera(cursos_inscritos, cursos_en_carrera, carrera)

        prereq_map = _cargar_prerrequisitos(supabase, mc_data)

        progreso_db = supabase.table("progreso_cursos") \
            .select("curso_id, status") \
            .eq("perfil_id", user.id) \
            .execute()
        db_status: Dict[int, str] = {p["curso_id"]: p["status"] for p in (progreso_db.data or [])}

        def nombre_curso(cid: int) -> str:
            return cursos_en_carrera.get(cid, {}).get("name", str(cid))

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

        cursos_inscritos = [cid for cid in cursos_inscritos if cid not in db_status]

        if not cursos_inscritos:
            logger.info("All courses already persisted, skipping enrollment")

        cursos_a_completar: Set[int] = set()

        for curso_id in cursos_inscritos:
            chain = resolve_prereq_chain(curso_id, prereq_map)
            for prereq_id in chain:
                if prereq_id in cursos_en_carrera:
                    cursos_a_completar.add(prereq_id)

        cursos_a_completar = {cid for cid in cursos_a_completar if cid not in db_status}

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

        perfil_update: dict = {
            "carrera_id": carrera_id,
            "malla_id": malla_id,
            "ciclo_actual": ciclo_actual,
            "onboarding_completado": True,
            "updated_at": "now()",
        }
        # Los usuarios de Google SSO no traen código: se completa aquí. Se omite
        # si viene vacío para no pisar el código ya registrado (registro manual).
        if data.codigo_estudiante:
            perfil_update["codigo_estudiante"] = data.codigo_estudiante
        supabase.table("perfiles").update(perfil_update).eq("id", user.id).execute()

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
            "perfil": {
                "codigo_estudiante": perfil.get("codigo_estudiante"),
                "email": perfil.get("email"),
                "nombre_completo": perfil.get("nombre_completo"),
                "carrera": {
                    "id": carrera["id"],
                    "codigo": carrera["codigo"],
                    "name": carrera["name"],
                },
                "malla_id": malla_id,
                "ciclo_actual": ciclo_actual,
                "total_cursos_inscritos": len(inscritos_final),
            },
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error en onboarding: {e}")
        raise HTTPException(status_code=500, detail=f"Error al guardar datos: {str(e)}")
