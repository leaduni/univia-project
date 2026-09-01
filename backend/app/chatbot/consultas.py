"""Consultas relacionales del chatbot: docentes y prerrequisitos.

Complementan al RAG semántico (`duda_academica`) con datos estructurados que no
viven en el corpus vectorizado: quién dicta cada curso (`curso_profesores` +
`profesores`) y de qué cursos cuelga cada materia (`malla_curso_prerrequisitos`).

Mismo contrato que el resto de handlers: devuelven un `Contexto` con el bloque
de datos y las instrucciones extra para el modelo; nunca lanzan. Si la fuente
falla o el dato no existe, se degrada a una explicación honesta en vez de dejar
que el modelo improvise nombres de profesores o requisitos.
"""

import logging

from app.chatbot.handlers import Contexto, _detectar_curso

logger = logging.getLogger(__name__)


def _consultar_catalogo_global(supabase) -> list:
    """Catálogo completo de cursos (id, code, name).

    A diferencia de `_cursos_de_la_facultad`, no se acota a la facultad del
    estudiante: preguntar quién enseña un curso o qué prerrequisitos tiene es
    información institucional, no personal, y un estudiante puede querer
    consultar un curso de otra carrera sin saber antes la suya.
    """
    resp = supabase.table("cursos").select("id").execute()
    ids = [f["id"] for f in (getattr(resp, "data", None) or [])]
    if not ids:
        return []

    cursos: list = []
    # PostgREST corta las URLs largas; el catálogo puede pasar de mil cursos
    # (mismo patrón de paginado que _cursos_de_la_facultad en handlers.py).
    for inicio in range(0, len(ids), 200):
        resp = (
            supabase.table("cursos")
            .select("id, code, name")
            .in_("id", ids[inicio:inicio + 200])
            .execute()
        )
        cursos.extend(getattr(resp, "data", None) or [])
    return cursos


def _handler_consulta_docentes(mensaje: str, supabase, user, token: str) -> Contexto:
    """Quién dicta un curso: lectura de curso_profesores + profesores."""
    try:
        cursos = _consultar_catalogo_global(supabase)
    except Exception as e:
        logger.error(f"No se pudo cargar el catálogo de cursos: {e}")
        return Contexto(
            system_extra="No pudiste consultar los docentes. Dilo y sugiere reintentar."
        )

    curso = _detectar_curso(mensaje, cursos)
    if curso is None:
        return Contexto(
            system_extra=(
                "No identificaste de qué curso pregunta por docentes. Pídele que lo diga "
                "con su nombre o código (por ejemplo 'Cálculo Numérico' o 'FB402'). "
                "No inventes nombres de profesores."
            )
        )

    etiqueta = f"{curso.get('code')} — {curso.get('name')}"
    try:
        resp = (
            supabase.table("curso_profesores")
            .select("profesor_id, profesores(nombre_completo)")
            .eq("curso_id", curso["id"])
            .execute()
        )
        filas = getattr(resp, "data", None) or []
    except Exception as e:
        logger.error(f"Error consultando docentes del curso {curso['id']}: {e}")
        return Contexto(
            system_extra="Falló la consulta de docentes. Dilo y sugiere reintentar."
        )

    docentes = [
        {
            "id": f.get("profesor_id"),
            "nombre": (f.get("profesores") or {}).get("nombre_completo"),
        }
        for f in filas
        if f.get("profesor_id") is not None
    ]
    docentes = [d for d in docentes if d.get("nombre")]

    if not docentes:
        return Contexto(
            system_extra=(
                f"El curso {etiqueta} existe pero no tiene docentes vinculados en la "
                "base de datos de UniVia. Dilo así, sin inventar nombres, y sugiere "
                "consultar a soporte o al área académica correspondiente."
            ),
            adjuntos={"docentes": [], "curso": curso},
        )

    listado = "\n".join(f"- {d['nombre']}" for d in docentes)
    return Contexto(
        system_extra=(
            "Estos son los docentes registrados del curso: datos verificados de la base "
            "de datos de la universidad. Preséntalos como lista; no los amplíes con "
            "nombres inventados ni confirmes secciones u horarios que no vienen aquí."
        ),
        bloque=f"Docentes de {etiqueta}:\n{listado}",
        adjuntos={"docentes": docentes, "curso": curso},
    )


def _handler_consulta_prerrequisitos(mensaje: str, supabase, user, token: str) -> Contexto:
    """Qué hay que llevar antes de X, según la malla del estudiante."""

    try:
        from app.routers.malla import _obtener_malla_del_perfil
        carrera_id, malla_id = _obtener_malla_del_perfil(supabase, user)
    except Exception as e:
        # _obtener_malla_del_perfil lanza HTTPException cuando falta el onboarding.
        logger.info(f"Malla no disponible para {user.id}: {e}")
        return Contexto(
            system_extra=(
                "El estudiante aún no tiene un plan de estudios asignado (onboarding "
                "incompleto). Los prerrequisitos dependen de su malla, así que pídele "
                "completar el onboarding. No inventes prerrequisitos."
            )
        )

    if carrera_id is None or malla_id is None:
        return Contexto(
            system_extra=(
                "El estudiante todavía no eligió carrera. Pídele que complete su "
                "onboarding para poder consultar prerrequisitos. No inventes datos."
            )
        )

    try:
        mcs_resp = (
            supabase.table("malla_cursos")
            .select("id, curso_id, ciclo")
            .eq("malla_id", malla_id)
            .execute()
        )
        malla_cursos = getattr(mcs_resp, "data", None) or []
        if not malla_cursos:
            return Contexto(
                system_extra=(
                    "El plan de estudios del estudiante está vacío. Dilo y pídele "
                    "contactar a soporte."
                )
            )

        curso_ids = [mc["curso_id"] for mc in malla_cursos if mc.get("curso_id")]
        cursos: list = []
        for inicio in range(0, len(curso_ids), 200):
            resp = (
                supabase.table("cursos")
                .select("id, code, name")
                .in_("id", curso_ids[inicio:inicio + 200])
                .execute()
            )
            cursos.extend(getattr(resp, "data", None) or [])

        curso = _detectar_curso(mensaje, cursos)
        if curso is None:
            return Contexto(
                system_extra=(
                    "No identificaste de qué curso del plan de estudios pregunta por "
                    "prerrequisitos. Pídele que lo diga con su nombre o código. Si no "
                    "está en su malla, dilo sin inventar requisitos."
                )
            )

        etiqueta = f"{curso.get('code')} — {curso.get('name')}"
        mc_ids = [mc["id"] for mc in malla_cursos]
        prereq_resp = (
            supabase.table("malla_curso_prerrequisitos")
            .select("malla_curso_id, prerrequisito_malla_curso_id")
            .in_("malla_curso_id", mc_ids)
            .execute()
        )
        from app.core.prereqs import build_prereq_map_from_malla, direct_prereq_info
        prereq_map = build_prereq_map_from_malla(
            malla_cursos,
            getattr(prereq_resp, "data", None) or [],
            use_curso_id=True,
        )
        cursos_dict = {c["id"]: c for c in cursos}

        try:
            prog_resp = (
                supabase.table("progreso_cursos")
                .select("curso_id")
                .eq("perfil_id", user.id)
                .execute()
            )
            completados = {f["curso_id"] for f in (getattr(prog_resp, "data", None) or [])}
        except Exception:
            completados = set()

        prereq_info = direct_prereq_info(
            curso["id"], prereq_map, cursos_dict, completados
        )

        if not prereq_info:
            return Contexto(
                system_extra=(
                    f"El curso {etiqueta} no tiene prerrequisitos en tu malla: puedes "
                    "llevarlo sin haber aprobado otro antes. Dilo así."
                ),
                adjuntos={"prerrequisitos": [], "curso": curso},
            )

        listado = "\n".join(
            f"- {p['code']} — {p['name']}"
            + ("" if p.get("completado") else " (pendiente)")
            for p in prereq_info
        )
        return Contexto(
            system_extra=(
                "Estos son los prerrequisitos del curso según el plan de estudios del "
                "estudiante (datos verificados). Preséntalos como lista; marca los que "
                "aún no ha aprobado como '(pendiente)'. No agrandes la lista ni inventes "
                "requisitos."
            ),
            bloque=f"Prerrequisitos de {etiqueta}:\n{listado}",
            adjuntos={"prerrequisitos": prereq_info, "curso": curso},
        )
    except Exception as e:
        logger.error(f"Error consultando prerrequisitos: {e}")
        return Contexto(
            system_extra="Falló la consulta de prerrequisitos. Dilo y sugiere reintentar."
        )