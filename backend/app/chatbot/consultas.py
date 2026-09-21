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
import re
from typing import Optional

from app.chatbot.handlers import (
    Contexto,
    _detectar_curso,
    _resolver_profesor,
    _sin_tildes,
)

logger = logging.getLogger(__name__)

MAX_FILAS_PAGINA = 1000
MAX_DOCENTES_VISTA_PREVIA = 25


def _traer_todas_paginas(crear_consulta) -> list:
    """Ejecuta una consulta paginada hasta agotar todas sus filas."""
    filas: list = []
    inicio = 0
    while True:
        pagina = getattr(
            crear_consulta().range(inicio, inicio + MAX_FILAS_PAGINA - 1).execute(),
            "data",
            None,
        ) or []
        filas.extend(pagina)
        if len(pagina) < MAX_FILAS_PAGINA:
            return filas
        inicio += MAX_FILAS_PAGINA


def _consultar_catalogo_global(supabase) -> list:
    """Catálogo completo de cursos (id, code, name).

    A diferencia de `_cursos_de_la_facultad`, no se acota a la facultad del
    estudiante: preguntar quién enseña un curso o qué prerrequisitos tiene es
    información institucional, no personal, y un estudiante puede querer
    consultar un curso de otra carrera sin saber antes la suya.
    """
    return _traer_todas_paginas(
        lambda: supabase.table("cursos").select("id, code, name").order("id")
    )


def _es_consulta_listado_docentes(mensaje: str) -> bool:
    """True si el mensaje pide enumerar docentes de una facultad o carrera.

    Genérico (sin nombres): detecta el plural de docente ("profesores",
    "docentes", "catedráticos") precedido de una señal de inventario ("qué",
    "cuántos", "lista", "hay", "todos"...), o el plural al inicio de la frase
    ("profesores de la fiis"). Una mención singular con nombre ("la profesora
    Doris") ya la resuelve `_resolver_profesor` antes de llegar aquí.
    """
    texto = _sin_tildes(mensaje or "").strip()
    if not texto:
        return False

    plural = r"\b(profesores|docentes|catedraticos|profesorado)\b"
    senal = (
        r"(?:que|quienes|cuantos|cuales|lista|listado|todos|todas|"
        r"dime|menciona|nombrar|conoces|hay|tienes|registrados|existen|los|las|y)"
    )
    if re.search(rf"{senal}.{{0,80}}?{plural}", texto, re.IGNORECASE):
        return True
    # "profesores de la fiis" -> plural al inicio sin verbo previo.
    return bool(re.match(rf"(?:{senal}\s+)?{plural}", texto, re.IGNORECASE))


def _combinar_contextos(relacional: Contexto, rag: Contexto) -> Contexto:
    """Complementa datos estructurados con RAG sin alterar el contrato existente."""
    if not rag.bloque:
        return relacional
    return Contexto(
        system_extra=f"{relacional.system_extra}\n\n{rag.system_extra}".strip(),
        bloque=f"{relacional.bloque}\n\n{rag.bloque}".strip(),
        adjuntos={**relacional.adjuntos, **rag.adjuntos},
    )


def _fallback_rag(mensaje: str, supabase, user, token: str, **filtros) -> Contexto:
    from app.chatbot.handlers import _handler_duda_academica

    return _handler_duda_academica(
        mensaje,
        supabase,
        user,
        token,
        fallback_relacional=True,
        **filtros,
    )


def _sin_resultados_multicapa(detalle: str) -> Contexto:
    return Contexto(
        system_extra=(
            f"La consulta relacional {detalle} y la búsqueda de respaldo en documentos RAG "
            "no devolvieron resultados. Informa esta ausencia con precisión, sin afirmar que "
            "la entidad no existe fuera de los datos actualmente registrados en UniVia, y "
            "sugiere verificar la escritura o aportar un filtro más específico."
        )
    )


def _resolver_facultad_del_mensaje(mensaje: str, supabase) -> Optional[dict]:
    """Resuelve globalmente una facultad explícita por código o nombre."""
    texto = _sin_tildes(mensaje)
    facultades = _traer_todas_paginas(
        lambda: supabase.table("facultades")
        .select("id, codigo, nombre")
        .order("id")
    )
    candidatas = []
    for facultad in facultades:
        codigo = _sin_tildes(facultad.get("codigo") or "")
        nombre = _sin_tildes(facultad.get("nombre") or "")
        if codigo and re.search(rf"\b{re.escape(codigo)}\b", texto):
            candidatas.append(facultad)
            continue
        palabras = [p for p in re.findall(r"[a-z0-9]+", nombre) if len(p) > 3]
        if palabras and sum(p in texto for p in palabras) >= min(2, len(palabras)):
            candidatas.append(facultad)
    return candidatas[0] if len(candidatas) == 1 else None


def _cursos_de_facultad_global(facultad_id: int, supabase) -> list[int]:
    carreras = _traer_todas_paginas(
        lambda: supabase.table("carreras")
        .select("id")
        .eq("facultad_id", facultad_id)
        .order("id")
    )
    carrera_ids = [fila["id"] for fila in carreras]
    malla_ids: list[int] = []
    for inicio in range(0, len(carrera_ids), 200):
        mallas = _traer_todas_paginas(
            lambda lote=carrera_ids[inicio:inicio + 200]: supabase.table("mallas")
            .select("id")
            .in_("carrera_id", lote)
            .order("id")
        )
        malla_ids.extend(fila["id"] for fila in mallas)

    curso_ids: set[int] = set()
    for inicio in range(0, len(malla_ids), 200):
        filas = _traer_todas_paginas(
            lambda lote=malla_ids[inicio:inicio + 200]: supabase.table("malla_cursos")
            .select("curso_id")
            .in_("malla_id", lote)
            .order("id")
        )
        curso_ids.update(fila["curso_id"] for fila in filas if fila.get("curso_id"))
    return list(curso_ids)


def _contexto_docente_identificado(profesor_id: int, supabase) -> Contexto:
    """Respuesta para "¿conoces a <profesor>?": perfil + asignaturas que dicta.

    CAMBIO A: cuando el mensaje nombra a un docente y no hay código de curso, se
    lee `profesores` (perfil) y todos sus cursos vía `curso_profesores` ->
    `cursos` (datos relacionales verificados), en vez de caer en el fallback que
    pedía el código del curso. Nunca lanza: ante error devuelve un Contexto de
    fallo honesto.
    """
    try:
        perfil_resp = (
            supabase.table("profesores")
            .select("id, nombre_completo")
            .eq("id", profesor_id)
            .maybe_single()
            .execute()
        )
        profesor = getattr(perfil_resp, "data", None) or {}
        nombre = profesor.get("nombre_completo")
        if not nombre:
            return Contexto(
                system_extra=(
                    "No se pudo confirmar la identidad del docente en la base de datos. "
                    "Dilo con honestidad y sugiere verificar el nombre."
                )
            )

        filas = _traer_todas_paginas(
            lambda: supabase.table("curso_profesores")
            .select("curso_id, cursos(code, name)")
            .eq("profesor_id", profesor_id)
            .order("id")
        )
        cursos = [
            {
                "id": f.get("curso_id"),
                "code": (f.get("cursos") or {}).get("code"),
                "name": (f.get("cursos") or {}).get("name"),
            }
            for f in filas
            if f.get("curso_id") is not None and (f.get("cursos") or {}).get("name")
        ]
    except Exception as e:
        logger.error(f"Error consultando el docente {profesor_id}: {e}")
        return Contexto(
            system_extra="Falló la consulta del docente. Dilo y sugiere reintentar."
        )

    if not cursos:
        return Contexto(
            system_extra=(
                f"{nombre} está registrado como docente en la base de datos de UniVia, "
                "pero aún no tiene cursos vinculados en el sistema. Dilo así, sin "
                "inventar asignaturas, y sugiere consultar a soporte."
            ),
            adjuntos={
                "docente": {"id": profesor_id, "nombre": nombre},
                "profesor_id": profesor_id,
                "cursos": [],
            },
        )

    orden = sorted(cursos, key=lambda c: (c.get("code") or ""))
    listado = "\n".join(f"- {c.get('code')} — {c.get('name')}" for c in orden)
    return Contexto(
        system_extra=(
            "El estudiante preguntó por un docente concreto. Estos son los datos "
            "verificados de la base de datos de la universidad: el docente y las "
            "asignaturas que dicta. Preséntalo así, sin inventar secciones ni "
            "horarios, y sin pedir el código de un curso."
        ),
        bloque=f"Docente: {nombre}\nCursos que dicta:\n{listado}",
        adjuntos={
            "docente": {"id": profesor_id, "nombre": nombre},
            "profesor_id": profesor_id,
            "cursos": cursos,
        },
    )


def _contexto_docentes_por_facultad(mensaje: str, supabase, user) -> Optional[Contexto]:
    """Listado relacional y completo de docentes de la facultad del estudiante.

    CAMBIO B: para preguntas como "qué profesores conoces de la [facultad]", el
    RAG de chunks (pocos fragmentos vectoriales) fragmenta y omite docentes.
    Aquí se consulta `curso_profesores` + `profesores` + `cursos` (JOIN
    relacional) y se devuelve el listado completo verificado. Devuelve None si
    la facultad no se puede resolver (onboarding incompleto), para que el
    llamador decida el siguiente paso.
    """
    from app.routers.recursos import _alcance_de_facultad

    try:
        facultad = _resolver_facultad_del_mensaje(mensaje, supabase)
        if facultad:
            curso_ids = _cursos_de_facultad_global(facultad["id"], supabase)
            nombre_facultad = facultad.get("nombre")
        else:
            curso_ids, nombre_facultad = _alcance_de_facultad(supabase, user)
    except Exception as e:
        logger.error(f"Error resolviendo la facultad para el listado de docentes: {e}")
        return None
    if not curso_ids:
        return None

    docentes: dict = {}
    try:
        # curso_profesores es N:M; un docente puede dictar varios cursos de la
        # misma facultad. Se agrupa por profesor_id y luego se rellenan nombres.
        for inicio in range(0, len(curso_ids), 200):
            filas_relacion = _traer_todas_paginas(
                lambda lote=curso_ids[inicio:inicio + 200]: supabase.table("curso_profesores")
                .select("profesor_id, curso_id, cursos(code, name)")
                .in_("curso_id", lote)
                .order("id")
            )
            for fila in filas_relacion:
                pid = fila.get("profesor_id")
                if pid is None:
                    continue
                curso = fila.get("cursos") or {}
                if not curso.get("name"):
                    continue
                entrada = docentes.setdefault(pid, {"id": pid, "nombre": None, "cursos": []})
                entrada["cursos"].append(
                    {
                        "id": fila.get("curso_id"),
                        "code": curso.get("code"),
                        "name": curso.get("name"),
                    }
                )

        if not docentes:
            return None

        ids = list(docentes)
        for inicio in range(0, len(ids), 200):
            filas_profesores = _traer_todas_paginas(
                lambda lote=ids[inicio:inicio + 200]: supabase.table("profesores")
                .select("id, nombre_completo")
                .in_("id", lote)
                .order("id")
            )
            for fila in filas_profesores:
                if fila.get("id") in docentes:
                    docentes[fila["id"]]["nombre"] = fila.get("nombre_completo")
    except Exception as e:
        logger.error(f"Error consultando docentes de la facultad: {e}")
        return Contexto(
            system_extra="Falló la consulta de docentes. Dilo y sugiere reintentar."
        )

    lista = [d for d in docentes.values() if d.get("nombre")]
    if not lista:
        return None

    lista.sort(key=lambda d: d["nombre"])
    etiqueta = nombre_facultad or "la facultad"
    lineas = []
    for d in lista[:MAX_DOCENTES_VISTA_PREVIA]:
        cursos_txt = "; ".join(
            f"{c['code']} — {c['name']}"
            for c in sorted(d["cursos"], key=lambda c: c.get("code") or "")
        )
        lineas.append(f"- {d['nombre']}: {cursos_txt}")
    listado = "\n".join(lineas)

    return Contexto(
        system_extra=(
            f"Se recuperaron {len(lista)} docentes verificados de la base de datos. El "
            f"bloque contiene una vista previa ordenada de hasta {MAX_DOCENTES_VISTA_PREVIA}. "
            "Si el usuario requiere ver más datos o buscar por un filtro específico, "
            "indícaselo abiertamente. JAMÁS afirmes que los docentes mostrados son los "
            "únicos registros existentes en el sistema. No inventes nombres."
        ),
        bloque=(
            f"Vista previa de docentes registrados ({etiqueta}) "
            f"[{min(len(lista), MAX_DOCENTES_VISTA_PREVIA)} de {len(lista)}]:\n{listado}"
        ),
        adjuntos={"docentes": lista, "facultad": nombre_facultad, "total": len(lista)},
    )


def _handler_consulta_docentes(
    mensaje: str,
    supabase,
    user,
    token: str,
    profesor_id_forzado: Optional[int] = None,
    curso_id_forzado: Optional[int] = None,
) -> Contexto:
    """Quién dicta un curso: lectura de curso_profesores + profesores."""
    try:
        cursos = _consultar_catalogo_global(supabase)
    except Exception as e:
        logger.error(f"No se pudo cargar el catálogo de cursos: {e}")
        return Contexto(
            system_extra="No pudiste consultar los docentes. Dilo y sugiere reintentar."
        )

    curso = next(
        (c for c in cursos if c.get("id") == curso_id_forzado),
        None,
    ) if curso_id_forzado is not None else _detectar_curso(mensaje, cursos)
    if curso is None:
        # Consulta abierta sobre docentes sin curso específico: el RAG puede
        # recuperar fragmentos cuyo metadato trae el profesor, así que mejor
        # probarlo que responder de inmediato una negativa.
        # CAMBIO A: si el mensaje nombra a un docente concreto, se devuelve su
        # identidad y las asignaturas que dicta desde la tabla relacional, sin
        # caer en el fallback que pide el código de un curso.
        profesor_id = profesor_id_forzado or _resolver_profesor(mensaje, supabase)
        if profesor_id:
            relacional = _contexto_docente_identificado(profesor_id, supabase)
            rag = _fallback_rag(
                mensaje,
                supabase,
                user,
                token,
                profesor_id_forzado=profesor_id,
            )
            return _combinar_contextos(relacional, rag)

        # CAMBIO B: pedido explícito de listar docentes (facultad/carrera). El
        # RAG de chunks fragmenta la respuesta en pocos [F#]; la consulta
        # relacional devuelve el listado completo y verificado.
        if _es_consulta_listado_docentes(mensaje):
            contexto = _contexto_docentes_por_facultad(mensaje, supabase, user)
            if contexto:
                return contexto

        from app.chatbot import intents

        if intents._es_busqueda_contenido_abierta(mensaje):
            rag = _fallback_rag(mensaje, supabase, user, token)
            if rag.bloque:
                return rag
            return _sin_resultados_multicapa("no identificó al docente o curso solicitado")
        return Contexto(
            system_extra=(
                "No identificaste de qué curso pregunta por docentes. Pídele que lo diga "
                "con su nombre o código (por ejemplo 'Cálculo Numérico' o 'FB402'). "
                "No inventes nombres de profesores."
            )
        )

    etiqueta = f"{curso.get('code')} — {curso.get('name')}"
    try:
        filas = _traer_todas_paginas(
            lambda: supabase.table("curso_profesores")
            .select("profesor_id, profesores(nombre_completo)")
            .eq("curso_id", curso["id"])
            .order("id")
        )
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
        rag = _fallback_rag(
            mensaje,
            supabase,
            user,
            token,
            curso_id_forzado=curso["id"],
        )
        if rag.bloque:
            rag.system_extra = (
                f"El curso {etiqueta} no tiene docentes vinculados en la capa relacional. "
                "Usa únicamente las menciones verificables recuperadas de los documentos; "
                "no las presentes como una asignación oficial vigente.\n\n"
                f"{rag.system_extra}"
            )
            rag.adjuntos.update({"docentes": [], "curso": curso})
            return rag
        return _sin_resultados_multicapa(
            f"encontró el curso {etiqueta}, pero no encontró docentes vinculados"
        )

    listado = "\n".join(f"- {d['nombre']}" for d in docentes)
    relacional = Contexto(
        system_extra=(
            "Estos son los docentes registrados del curso: datos verificados de la base "
            "de datos de la universidad. Preséntalos como lista; no los amplíes con "
            "nombres inventados ni confirmes secciones u horarios que no vienen aquí."
        ),
        bloque=f"Docentes de {etiqueta}:\n{listado}",
        adjuntos={"docentes": docentes, "curso": curso},
    )
    rag = _fallback_rag(
        mensaje,
        supabase,
        user,
        token,
        curso_id_forzado=curso["id"],
    )
    return _combinar_contextos(relacional, rag)


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
