import asyncio
from typing import Any

from app.core.avance import calcular_avance, promedio_ponderado
from app.core.diagnostico import generar_diagnostico
from app.core.prereqs import build_prereq_map_from_malla, resolve_prereq_chain


async def cargar_contexto_usuario(supabase, user) -> dict[str, Any]:
    contexto: dict[str, Any] = {
        "disponible": False,
        "nombre": None,
        "porcentaje": 0.0,
        "creditos_aprobados": 0,
        "creditos_totales": 0,
        "cursos_aprobados": 0,
        "cursos_totales": 0,
        "cursos_activos": [],
        "recomendacion": None,
    }

    perfil: dict = {}
    malla_id = None
    cursos: dict = {}
    progreso: dict = {}
    mc_data: list[dict] = []
    prereq_filas: list[dict] = []
    prerequisitos_disponibles = False

    try:
        perfil_resp = await asyncio.to_thread(
            lambda: supabase.table("perfiles")
            .select("nombre_completo, carrera_id, malla_id, ciclo_actual")
            .eq("id", user.id)
            .maybe_single()
            .execute()
        )
        perfil = getattr(perfil_resp, "data", None) or {}
        if perfil:
            contexto["nombre"] = perfil.get("nombre_completo")
            contexto["disponible"] = True
            malla_id = perfil.get("malla_id")
    except Exception:
        pass

    if not malla_id and perfil.get("carrera_id"):
        try:
            malla_resp = await asyncio.to_thread(
                lambda: supabase.table("mallas")
                .select("id")
                .eq("carrera_id", perfil["carrera_id"])
                .eq("es_vigente", True)
                .order("id")
                .limit(1)
                .execute()
            )
            mallas = getattr(malla_resp, "data", None) or []
            malla_id = mallas[0]["id"] if mallas else None
        except Exception:
            pass

    if malla_id:
        try:
            mc_resp = await asyncio.to_thread(
                lambda: supabase.table("malla_cursos")
                .select("id, curso_id, ciclo, credits, cursos(code, name)")
                .eq("malla_id", malla_id)
                .execute()
            )
            mc_data = getattr(mc_resp, "data", None) or []
            cursos = {
                mc["curso_id"]: {
                    "code": (mc.get("cursos") or {}).get("code"),
                    "name": (mc.get("cursos") or {}).get("name"),
                    "credits": mc.get("credits") or 0,
                    "ciclo": mc.get("ciclo"),
                }
                for mc in mc_data
            }
            if mc_data:
                contexto["disponible"] = True
        except Exception:
            pass

    try:
        progreso_resp = await asyncio.to_thread(
            lambda: supabase.table("progreso_cursos")
            .select("curso_id, status, nota")
            .eq("perfil_id", user.id)
            .execute()
        )
        progreso_filas = getattr(progreso_resp, "data", None) or []
        progreso = {
            fila["curso_id"]: {
                "status": fila.get("status"),
                "nota": fila.get("nota"),
            }
            for fila in progreso_filas
        }
        if progreso_filas:
            contexto["disponible"] = True
    except Exception:
        pass

    if mc_data:
        mc_ids = [mc["id"] for mc in mc_data]
        try:
            prereq_resp = await asyncio.to_thread(
                lambda: supabase.table("malla_curso_prerrequisitos")
                .select("malla_curso_id, prerrequisito_malla_curso_id")
                .in_("malla_curso_id", mc_ids)
                .execute()
            )
            prereq_filas = getattr(prereq_resp, "data", None) or []
            prerequisitos_disponibles = True
        except Exception:
            pass

    if cursos:
        avance = calcular_avance(
            cursos,
            {
                curso_id: registro.get("status")
                for curso_id, registro in progreso.items()
            },
        )
        contexto.update({
            "porcentaje": avance.porcentaje_avance,
            "creditos_aprobados": avance.creditos_aprobados,
            "creditos_totales": avance.creditos_totales,
            "cursos_aprobados": avance.cursos_aprobados,
            "cursos_totales": avance.cursos_totales,
        })

        contexto["cursos_activos"] = [
            f"{curso.get('code')} — {curso.get('name')}"
            for curso_id, curso in cursos.items()
            if (progreso.get(curso_id) or {}).get("status") == "in_progress"
        ]

        prereq_map = build_prereq_map_from_malla(
            mc_data,
            prereq_filas,
            use_curso_id=True,
        )

        aprobados = {
            curso_id
            for curso_id, registro in progreso.items()
            if registro.get("status") == "completed"
        }
        disponibles = (
            [
                curso_id
                for curso_id in cursos
                if curso_id not in progreso
                and all(
                    prereq_id in aprobados
                    for prereq_id in resolve_prereq_chain(curso_id, prereq_map)
                )
            ]
            if prerequisitos_disponibles
            else []
        )

        diagnostico = generar_diagnostico(
            cursos=cursos,
            progreso=progreso,
            prereq_map=prereq_map,
            disponibles=disponibles,
            ciclo_actual=perfil.get("ciclo_actual") or 1,
            avance=avance,
            promedio=promedio_ponderado(cursos, progreso),
        )

        if (
            prerequisitos_disponibles
            or diagnostico["cursos_atrasados"]
            or diagnostico["a_reforzar"]
        ):
            contexto["recomendacion"] = diagnostico["recomendacion"]["mensaje"]

    return contexto
