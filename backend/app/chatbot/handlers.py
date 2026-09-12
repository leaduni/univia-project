"""Handlers por intención (Paso 4 de docs/PLAN_CHATBOT.md).

Cada handler arma el CONTEXTO con el que se va a responder: de dónde salen los
datos, qué instrucciones extra necesita el modelo, y qué adjuntos viajan al
frontend. No generan el texto —eso sigue siendo una sola llamada a Groq en el
router—, salvo `soporte_humano`, que responde sin modelo porque su respuesta no
depende de nada que haya que redactar.

Ninguna función de aquí lanza: un handler que falla degrada a una conversación
normal, con el modelo avisado de que no pudo consultar el dato. Es preferible a
romper el turno, porque el estudiante ya está esperando con la burbuja abierta.
"""

import logging
import os
import re
import unicodedata
from dataclasses import dataclass, field
from typing import Optional

from app.chatbot import intents
from app.core.avance import cargar_avance, promedio_ponderado
from app.core.tipos_recursos import normalizar_tipo

logger = logging.getLogger(__name__)


# Canal de soporte. Se deja en el entorno porque es un dato del despliegue, no
# del código, y porque escribir aquí un correo inventado sería peor que no dar
# ninguno: el estudiante escribiría a una dirección que no existe.
CONTACTO_SOPORTE = os.getenv("SOPORTE_CONTACTO", "").strip()

# Recursos que se le ofrecen al estudiante de una vez. Más que esto convierte la
# burbuja en un listado y le quita sentido a la biblioteca.
MAX_RECURSOS = 5

# Fragmentos del RAG que se inyectan como contexto. Cada uno puede pesar cientos
# de tokens y el free tier limita por minuto (ver Paso 9 del plan).
MAX_FRAGMENTOS_RAG = 4
MAX_CANDIDATOS_RAG = 8
MAX_CARACTERES_CONTEXTO_RAG = 6000
UMBRAL_SIMILITUD_RAG = 0.40
# Consultas abiertas (sin curso detectado): se afloja el umbral y se piden más
# candidatos para que la búsqueda híbrida recupere material de varias materias
# en vez de caer en 0 resultados.
UMBRAL_SIMILITUD_SIN_CURSO = 0.25
MAX_CANDIDATOS_SIN_CURSO = 12
# Varios chunks de un mismo recurso (ej. un examen con varias páginas): así no
# se colapsa a solo el encabezado al recuperar material.
MAX_CHUNKS_POR_RECURSO_SIN_CURSO = 3
MAX_CHUNKS_POR_RECURSO_CON_CURSO = 2


@dataclass
class Contexto:
    """Lo que un handler le entrega al router para armar la respuesta."""

    # Instrucciones que se suman al system prompt base para este turno.
    system_extra: str = ""
    # Bloque de datos que se antepone al mensaje del usuario.
    bloque: str = ""
    # Viaja al frontend y se persiste en chat_mensajes.metadata: es lo que
    # permite repintar las tarjetas de descarga al recargar el hilo.
    adjuntos: dict = field(default_factory=dict)
    # Si viene, se responde esto tal cual y no se llama al modelo.
    respuesta_fija: Optional[str] = None


# ---------------------------------------------------------------------------
# Utilidades
# ---------------------------------------------------------------------------

def _sin_tildes(texto: str) -> str:
    """Normaliza para comparar: sin tildes, en minúsculas.

    Los estudiantes escriben "algebra lineal" y el catálogo dice "Álgebra
    Lineal"; sin esto, ninguna búsqueda de recursos encontraría el curso.
    """
    descompuesto = unicodedata.normalize("NFD", (texto or "").lower())
    return "".join(c for c in descompuesto if unicodedata.category(c) != "Mn")


def _valor_fuente(valor) -> str:
    """Mantiene cada metadato en una sola celda del encabezado [F#]."""
    return str(valor or "no disponible").replace("|", "/").replace("\n", " ").strip()


def _armar_contexto_rag(fragmentos: list) -> str:
    """Empaqueta fuentes identificables sin superar el presupuesto del prompt."""
    bloques: list[str] = []
    caracteres = 0

    for indice, fragmento in enumerate(fragmentos[:MAX_FRAGMENTOS_RAG], start=1):
        metadata = fragmento.get("metadata") or {}
        campos = [
            f"F{indice}",
            f"recurso={_valor_fuente(fragmento.get('titulo_recurso'))}",
            f"curso={_valor_fuente(fragmento.get('curso_nombre'))}",
            f"tipo={_valor_fuente(fragmento.get('tipo_recurso'))}",
            f"año={_valor_fuente(fragmento.get('year_recurso'))}",
            f"profesor={_valor_fuente(fragmento.get('profesor'))}",
        ]
        if fragmento.get("ciclo_recurso") is not None:
            campos.append(f"ciclo={_valor_fuente(fragmento.get('ciclo_recurso'))}")
        if metadata.get("pagina") is not None:
            campos.append(f"página={_valor_fuente(metadata.get('pagina'))}")

        encabezado = "[" + "|".join(campos) + "]\n"
        disponible = MAX_CARACTERES_CONTEXTO_RAG - caracteres - len(encabezado)
        if disponible <= 0:
            break

        contenido = (fragmento.get("contenido") or "").strip()[:disponible]
        if not contenido:
            continue
        bloque = encabezado + contenido
        bloques.append(bloque)
        caracteres += len(bloque) + 2

    return "\n\n".join(bloques)


def _referencias_rag(fragmentos: list) -> list[dict]:
    """Conserva una referencia estructurada por recurso recuperado."""
    referencias: dict[int, dict] = {}
    for indice, fragmento in enumerate(fragmentos[:MAX_FRAGMENTOS_RAG], start=1):
        recurso_id = fragmento.get("recurso_id")
        if recurso_id is None:
            continue
        if recurso_id in referencias:
            referencias[recurso_id]["fuentes"].append(f"F{indice}")
            continue
        referencias[recurso_id] = {
            "fuente": f"F{indice}",
            "fuentes": [f"F{indice}"],
            "recurso_id": recurso_id,
            "curso_id": fragmento.get("curso_id"),
            "curso_code": fragmento.get("curso_code"),
            "curso_nombre": fragmento.get("curso_nombre"),
            "titulo_recurso": fragmento.get("titulo_recurso"),
            "tipo_documento": fragmento.get("tipo_recurso"),
            "año": fragmento.get("year_recurso"),
        }
    return list(referencias.values())


def _fragmentos_recurso_exacto(recurso_id: int, supabase) -> list:
    """Recupera únicamente los chunks del recurso confirmado por el historial."""
    recurso_resp = (
        supabase.table("recursos")
        .select("id, curso_id, profesor_id, titulo, tipo, ciclo, year")
        .eq("id", recurso_id)
        .maybe_single()
        .execute()
    )
    recurso = getattr(recurso_resp, "data", None) or {}
    if not recurso:
        return []

    curso_resp = (
        supabase.table("cursos")
        .select("id, code, name")
        .eq("id", recurso.get("curso_id"))
        .maybe_single()
        .execute()
    )
    curso = getattr(curso_resp, "data", None) or {}
    profesor = None
    if recurso.get("profesor_id"):
        profesor_resp = (
            supabase.table("profesores")
            .select("nombre_completo")
            .eq("id", recurso["profesor_id"])
            .maybe_single()
            .execute()
        )
        profesor = (getattr(profesor_resp, "data", None) or {}).get("nombre_completo")

    chunks_resp = (
        supabase.table("resource_chunks")
        .select("id, recurso_id, curso_id, contenido, chunk_index")
        .eq("recurso_id", recurso_id)
        .order("chunk_index")
        .limit(MAX_CANDIDATOS_SIN_CURSO)
        .execute()
    )
    return [
        {
            **chunk,
            "curso_code": curso.get("code"),
            "curso_nombre": curso.get("name"),
            "metadata": {"pagina": chunk.get("chunk_index")},
            "titulo_recurso": recurso.get("titulo"),
            "tipo_recurso": recurso.get("tipo"),
            "ciclo_recurso": recurso.get("ciclo"),
            "year_recurso": recurso.get("year"),
            "profesor": profesor,
        }
        for chunk in (getattr(chunks_resp, "data", None) or [])
    ]


# Palabras que aparecen en casi toda pregunta y no distinguen un curso de otro.
# Sin filtrarlas, "el curso de fisica" emparejaría con cualquier fila cuyo
# nombre contenga "de".
_PALABRAS_VACIAS = {
    "el", "la", "los", "las", "de", "del", "un", "una", "y", "o", "en", "para",
    "por", "con", "que", "cual", "cuales", "me", "mi", "mis", "tu", "su", "al",
    "curso", "cursos", "materia", "ramo", "profesor", "quiero", "necesito",
    "dame", "pasame", "busco", "tienes", "hay", "algun", "alguna", "sobre",
    "porfa", "favor", "gracias", "hola", "examen", "examenes", "practica",
    "practicas", "silabo", "silabos", "libro", "libros", "apunte", "apuntes",
    "solucionario", "material", "materiales", "archivo", "archivos", "pdf",
    "plancha", "planchas", "descargar", "descarga", "bajar",
}


def _detectar_tipo(mensaje: str) -> Optional[str]:
    """Tipo de recurso pedido, si el mensaje lo dice sin ambigüedad."""
    texto = _sin_tildes(mensaje)
    # El orden importa: "examen final" tiene que resolver a Examen y no quedar
    # atrapado por otra palabra del mensaje.
    for clave, tipo in (
        ("solucionario", "Examen"),
        # "Plancha" es como se le dice coloquialmente en Perú a un examen
        # pasado; el catálogo no tiene ese tipo, así que resuelve a Examen.
        ("plancha", "Examen"),
        ("examen", "Examen"),
        ("parcial", "Examen"),
        ("final", "Examen"),
        ("practica", "Practica"),
        ("silabo", "Silabo"),
        ("compendio", "Compendio"),
        ("libro", "Libro"),
        ("apunte", "Apunte"),
    ):
        if clave in texto:
            return normalizar_tipo(tipo)
    return None


def _detectar_curso(mensaje: str, cursos: list) -> Optional[dict]:
    """Empareja el mensaje con un curso del catálogo.

    Primero por código (BMA02, FB401), que es inequívoco, y si no por
    coincidencia de palabras del nombre. Se exige que el mejor candidato
    comparta al menos una palabra significativa: sin ese piso, un mensaje sin
    curso alguno igual devolvería el primer curso de la lista.
    """
    texto = _sin_tildes(mensaje)

    for curso in cursos:
        codigo = _sin_tildes(curso.get("code") or "")
        # El código va delimitado para que "BMA0" no empareje con "BMA02".
        if codigo and re.search(rf"\b{re.escape(codigo)}\b", texto):
            return curso

    palabras_mensaje = {
        p for p in re.findall(r"[a-z0-9]+", texto)
        if len(p) > 2 and p not in _PALABRAS_VACIAS
    }
    if not palabras_mensaje:
        return None

    mejor, mejor_puntaje = None, 0
    for curso in cursos:
        palabras_curso = {
            p for p in re.findall(r"[a-z0-9]+", _sin_tildes(curso.get("name") or ""))
            if len(p) > 2 and p not in _PALABRAS_VACIAS
        }
        puntaje = len(palabras_mensaje & palabras_curso)
        if puntaje > mejor_puntaje:
            mejor, mejor_puntaje = curso, puntaje

    return mejor if mejor_puntaje else None


def _cursos_de_la_facultad(supabase, user) -> list:
    """Catálogo visible para el estudiante, con código y nombre.

    Reusa el mismo alcance por facultad que GET /api/recursos: el chatbot no
    puede ofrecer material que la biblioteca le esconde.
    """
    from app.routers.recursos import _alcance_de_facultad

    curso_ids, _facultad = _alcance_de_facultad(supabase, user)
    if not curso_ids:
        return []

    cursos: list = []
    # PostgREST corta las URLs largas; el catálogo puede pasar de mil cursos.
    for inicio in range(0, len(curso_ids), 200):
        resp = (
            supabase.table("cursos")
            .select("id, code, name")
            .in_("id", curso_ids[inicio:inicio + 200])
            .execute()
        )
        cursos.extend(getattr(resp, "data", None) or [])
    return cursos


def _resolver_profesor(mensaje: str, supabase) -> Optional[int]:
    """Devuelve el id del profesor cuyo nombre aparece en el mensaje.

    Un mensaje como "¿tienes exámenes de la profesora Doris Rojas?" nombra al
    docente, pero ese nombre no vive en el contenido de los chunks: es una
    relación `curso_profesores` -> `profesores`. Sin resolverlo, la búsqueda
    híbrida no puede filtrar por docente y el RAG responde que no existe nada.
    Se prefiere la zona del mensaje que sigue al rol ("profesora", "docente",
    ...) y se exigen al menos dos coincidencias de sus palabras en el nombre
    para no emparejar por casualidad. Nunca lanza: sin profesor no hay filtro.
    """
    try:
        texto = _sin_tildes(mensaje)

        # Tras el rol suele venir el nombre ("...la profesora Doris Rojas"); si
        # aparece, solo se consideran los tokens de esa zona. Esto evita que
        # "examen" o "tienes" ensucien el emparejamiento.
        corte = 0
        for rol in (
            "profesora", "profesor", "docente", "catedratica", "catedratico",
            "ingeniera", "ingeniero", "doctora", "doctor",
        ):
            pos = texto.find(rol)
            if pos != -1:
                corte = max(corte, pos + len(rol))

        fragmento = texto[corte:] or texto
        tokens = [
            p for p in re.findall(r"[a-z0-9]+", fragmento)
            if len(p) >= 4
            and p not in _PALABRAS_VACIAS
            and p not in (
                "tienes", "alguna", "algun", "prueba", "pruebas", "examen",
                "examenes", "material", "cual", "cuales", "sobre", "ella", "del",
                "conoces", "conocer",
            )
        ]
        if not tokens:
            return None

        # OR de ILIKE en SQL en lugar de traer todo el catálogo de profesores.
        condiciones = ",".join(f"nombre_completo.ilike.%{t}%" for t in tokens)
        resp = (
            supabase.table("profesores")
            .select("id, nombre_completo")
            .or_(condiciones)
            .execute()
        )
        filas = getattr(resp, "data", None) or []

        # Tras un rol ("profesora", "docente"...), basta un término. Sin rol,
        # un solo término también es válido únicamente si identifica a un
        # docente de forma inequívoca; nunca se elige una fila arbitraria.
        # Tras un rol ("profesora", "docente"...) o sin el, basta un unico
        # termino que aparezca en un nombre completo (ej. "doris" sin rol).
        # La guarda `len(mejores) == 1` asegura elegir solo si es inequivoco.
        minimo = 1
        mejores: list[int] = []
        mejor_puntaje = 0
        for fila in filas:
            nombre = _sin_tildes(fila.get("nombre_completo") or "")
            puntaje = sum(1 for t in tokens if t in nombre)
            if puntaje < minimo:
                continue
            if puntaje > mejor_puntaje:
                mejores = [fila.get("id")]
                mejor_puntaje = puntaje
            elif puntaje == mejor_puntaje:
                mejores.append(fila.get("id"))
        return mejores[0] if len(mejores) == 1 else None
    except Exception as e:
        logger.warning("No se pudo resolver el profesor del mensaje: %s", e)
        return None


# ---------------------------------------------------------------------------
# Handlers
# ---------------------------------------------------------------------------

def _handler_recurso(
    mensaje: str,
    supabase,
    user,
    token: str,
    curso_id_forzado: Optional[int] = None,
    recurso_id_forzado: Optional[int] = None,
) -> Contexto:
    """Busca material descargable y lo devuelve como tarjetas."""
    try:
        cursos = _cursos_de_la_facultad(supabase, user)
    except Exception as e:
        logger.error(f"No se pudo cargar el catálogo de cursos: {e}")
        return Contexto(system_extra="No pudiste consultar la biblioteca. Dilo y sugiere reintentar.")

    if not cursos:
        return Contexto(
            system_extra=(
                "El estudiante no tiene una carrera asignada todavía, así que no puedes "
                "buscar material. Pídele que complete su onboarding."
            )
        )

    curso = next(
        (c for c in cursos if c.get("id") == curso_id_forzado),
        None,
    ) if curso_id_forzado is not None else _detectar_curso(mensaje, cursos)
    tipo = _detectar_tipo(mensaje)

    if curso is None:
        # Consulta abierta de contenido académico sin curso (ej. "dame un
        # ejercicio de la FIIS"): mejor probar el RAG en todo el corpus que
        # responder una negativa del catálogo.
        if intents._es_busqueda_contenido_abierta(mensaje):
            return _handler_duda_academica(mensaje, supabase, user, token)
        return Contexto(
            system_extra=(
                "No identificaste de qué curso te habla. Pídele que lo diga con su nombre "
                "o código (por ejemplo 'Cálculo Integral' o 'BMA02'). No inventes archivos."
            )
        )

    try:
        # Solo columnas que existen en la tabla: `url_solucionario` NO es una de
        # ellas. GET /api/recursos la deriva emparejando el archivo "…
        # Solucionario" con su documento principal por nomenclatura, y aquí no
        # se replica esa lógica: la tarjeta enlaza al recurso y el solucionario,
        # si existe, se ve desde la biblioteca.
        consulta = (
            supabase.table("recursos")
            .select("id, titulo, tipo, year, url_drive, has_solucionario")
            .eq("curso_id", curso["id"])
            # Filas de antes del script de ingesta de Drive (o cargadas a mano)
            # pueden no tener url_drive. La burbuja de descarga no tiene a
            # dónde apuntar sin él: sin este filtro, el chat sugiere una
            # tarjeta que el estudiante no puede abrir ni descargar.
            .not_.is_("url_drive", "null")
        )
        if recurso_id_forzado is not None:
            consulta = consulta.eq("id", recurso_id_forzado)
        elif tipo:
            consulta = consulta.eq("tipo", tipo)
        # Los más recientes primero: un examen de este año es más útil que uno
        # de hace ocho, y el estudiante rara vez mira más allá de los primeros.
        filas = getattr(
            consulta.order("year", desc=True).limit(MAX_RECURSOS).execute(),
            "data", None,
        ) or []
    except Exception as e:
        logger.error(f"Error buscando recursos del curso {curso['id']}: {e}")
        return Contexto(system_extra="Falló la consulta a la biblioteca. Dilo y sugiere reintentar.")

    etiqueta_curso = f"{curso.get('code')} — {curso.get('name')}"
    if not filas:
        detalle = f" de tipo {tipo}" if tipo else ""
        return Contexto(
            system_extra=(
                f"No hay material{detalle} de {etiqueta_curso} en la biblioteca. Dilo con "
                f"claridad, sin inventar archivos, y ofrece buscar otro tipo de material."
            )
        )

    # Las tarjetas las pinta el frontend desde `adjuntos`. El bloque de texto
    # existe para que el modelo escriba una frase de presentación coherente con
    # lo que el usuario va a ver, no para que repita la lista.
    listado = "\n".join(
        f"- {f.get('titulo')} ({f.get('tipo')}{', ' + str(f['year']) if f.get('year') else ''})"
        for f in filas
    )
    referencias = [
        {
            "recurso_id": f.get("id"),
            "curso_id": curso.get("id"),
            "curso_code": curso.get("code"),
            "curso_nombre": curso.get("name"),
            "titulo_recurso": f.get("titulo"),
            "tipo_documento": f.get("tipo"),
            "año": f.get("year"),
        }
        for f in filas
    ]
    adjuntos = {
        "recursos": [
            {
                "id": f.get("id"),
                "titulo": f.get("titulo"),
                "tipo": f.get("tipo"),
                "year": f.get("year"),
                "url_drive": f.get("url_drive"),
                "has_solucionario": f.get("has_solucionario") or False,
            }
            for f in filas
        ],
        "curso": {"id": curso["id"], "code": curso.get("code"), "name": curso.get("name")},
        "curso_id": curso.get("id"),
        "referencias": referencias,
    }
    if len(referencias) == 1:
        adjuntos.update(referencias[0])

    return Contexto(
        system_extra=(
            "Encontraste material y el estudiante YA VE las tarjetas de descarga debajo de tu "
            "mensaje. Presenta el hallazgo en una o dos frases; NO repitas la lista de archivos "
            "ni inventes enlaces."
        ),
        bloque=f"Material encontrado en {etiqueta_curso}:\n{listado}",
        adjuntos=adjuntos,
    )


def _handler_duda_academica(
    mensaje: str,
    supabase,
    user,
    token: str,
    curso_id_forzado: Optional[int] = None,
    profesor_id_forzado: Optional[int] = None,
    recurso_id_forzado: Optional[int] = None,
    fallback_relacional: bool = False,
) -> Contexto:
    """Recupera fragmentos del corpus vectorizado para responder con material real."""
    try:
        from app.rag.retriever import SyllabusRetriever

        curso = {"id": curso_id_forzado} if curso_id_forzado is not None else None
        if curso is None:
            try:
                curso = _detectar_curso(mensaje, _cursos_de_la_facultad(supabase, user))
            except Exception as e:
                # Sin curso el RAG busca en todo el corpus: peor foco, pero responde.
                logger.warning(f"No se pudo acotar la duda a un curso: {e}")

        profesor_id = profesor_id_forzado or _resolver_profesor(mensaje, supabase)
        if recurso_id_forzado is not None:
            fragmentos = _fragmentos_recurso_exacto(recurso_id_forzado, supabase)
        else:
            retriever = SyllabusRetriever(token=token)
            # Un curso heredado desde metadata es confiable. Un tipo documental
            # sin ese slot continúa buscando globalmente para no arrastrar el
            # curso obsoleto de una conversación anterior.
            curso_contextual_confirmado = curso_id_forzado is not None
            busqueda_global = profesor_id is not None or (
                _detectar_tipo(mensaje) is not None and not curso_contextual_confirmado
            )
            sin_curso = curso is None or busqueda_global
            pregunta_vectorizada = retriever.vectorizar_pregunta(mensaje)
            fragmentos = []
            if pregunta_vectorizada:
                respuesta = retriever.supabase.rpc(
                    "search_chatbot_resource_chunks",
                    {
                        "query_text": mensaje,
                        "query_embedding": pregunta_vectorizada,
                        "match_threshold": (
                            UMBRAL_SIMILITUD_SIN_CURSO if sin_curso else UMBRAL_SIMILITUD_RAG
                        ),
                        "match_count": (
                            MAX_CANDIDATOS_SIN_CURSO if sin_curso else MAX_CANDIDATOS_RAG
                        ),
                        "filter_curso_id": curso["id"] if curso and not busqueda_global else None,
                        "filter_profesor_id": profesor_id,
                        "max_chunks_per_resource": (
                            MAX_CHUNKS_POR_RECURSO_SIN_CURSO if sin_curso else MAX_CHUNKS_POR_RECURSO_CON_CURSO
                        ),
                    },
                ).execute()
                fragmentos = getattr(respuesta, "data", None) or []
    except Exception as e:
        logger.error(f"Falló la búsqueda RAG: {e}")
        fragmentos = []

    if not fragmentos:
        if fallback_relacional:
            return Contexto(
                system_extra=(
                    "La búsqueda de respaldo en documentos RAG tampoco encontró referencias "
                    "para esta consulta. No inventes entidades ni documentos."
                ),
                adjuntos={"fragmentos": 0},
            )
        # Buena parte del corpus todavía no está vectorizado, así que quedarse
        # sin fragmentos es lo normal, no una excepción: se responde con el
        # conocimiento del modelo en vez de decir que no se sabe.
        return Contexto(
            system_extra=(
                "No se recuperaron fragmentos del banco para esta consulta. Respóndele igual: "
                "identifica qué concepto o paso necesita trabajar el estudiante, aplica una guía "
                "socrática y propón un primer paso antes de la respuesta directa. No digas que 'no "
                "hay datos en la app' ni que solo tienes su perfil: son correctos solo para datos "
                "estructurales. Si la consulta es abierta (sin curso o tema), pídele amablemente que "
                "indique el curso o tema para buscarlo en su banco de datos, y aclara que tu respuesta "
                "no proviene del material del curso."
            )
        )

    contenidos = _armar_contexto_rag(fragmentos)
    if not contenidos:
        return Contexto(
            system_extra=(
                "La búsqueda encontró referencias sin contenido utilizable. Responde con tu "
                "conocimiento general y aclara que no proviene del material del curso."
            )
        )
    referencias = _referencias_rag(fragmentos)
    adjuntos = {
        "fragmentos": min(len(fragmentos), MAX_FRAGMENTOS_RAG),
        "referencias": referencias,
    }
    if profesor_id:
        adjuntos["profesor_id"] = profesor_id
    if len(referencias) == 1:
        adjuntos.update(referencias[0])

    return Contexto(
        system_extra=(
            "Responde apoyándote en el material del curso que viene abajo. Aplica una guía "
            "socrática: antes de revelar la solución completa, guía al estudiante con preguntas "
            "y pasos intermedios; luego ofrece el procedimiento si lo necesita. Este material "
            "proviene del banco verificado del propio estudiante; puedes resolver sus ejercicios, "
            "mostrar procedimientos paso a paso y generar variantes, sin tratarlo como material "
            "restringido. Conserva la procedencia [F#] al mencionar profesores, fechas, ciclos "
            "o datos documentales. Si no alcanza para responder del todo, complétalo con tu "
            "conocimiento y dilo."
        ),
        bloque=f"Fuentes recuperadas del curso:\n{contenidos}",
        adjuntos=adjuntos,
    )


def _handler_estado_academico(mensaje: str, supabase, user, token: str) -> Contexto:
    """Arma el expediente del estudiante: avance, promedio y cursos."""
    try:
        from app.routers.malla import _obtener_malla_del_perfil

        carrera_id, malla_id = _obtener_malla_del_perfil(supabase, user)
    except Exception as e:
        # _obtener_malla_del_perfil lanza HTTPException cuando falta el
        # onboarding. Aquí no se propaga: en un chat eso se dice hablando.
        logger.info(f"Estado académico no disponible para {user.id}: {e}")
        return Contexto(
            system_extra=(
                "El estudiante aún no completó su onboarding (no tiene carrera ni plan de "
                "estudios), así que no puedes ver su avance. Explícaselo y pídele que lo "
                "complete. No inventes notas ni cursos."
            )
        )

    if carrera_id is None or malla_id is None:
        return Contexto(
            system_extra=(
                "El estudiante todavía no eligió carrera. Pídele que complete su onboarding. "
                "No inventes datos académicos."
            )
        )

    try:
        avance = cargar_avance(supabase, user.id, malla_id).to_dict()

        catalogo = {
            c["curso_id"]: {"credits": c.get("credits") or 0}
            for c in (getattr(
                supabase.table("malla_cursos").select("curso_id, credits")
                .eq("malla_id", malla_id).execute(),
                "data", None,
            ) or [])
        }
        progreso_filas = getattr(
            supabase.table("progreso_cursos").select("curso_id, status, nota")
            .eq("perfil_id", user.id).execute(),
            "data", None,
        ) or []
        progreso = {
            p["curso_id"]: {"status": p.get("status"), "nota": p.get("nota")}
            for p in progreso_filas
        }
        promedio = promedio_ponderado(catalogo, progreso)

        # Solo se nombran los cursos en curso: la lista de aprobados puede tener
        # decenas de filas y el conteo ya va en el avance.
        en_curso_ids = [
            cid for cid, p in progreso.items() if p.get("status") == "in_progress"
        ]
        nombres = {}
        if en_curso_ids:
            nombres = {
                c["id"]: f"{c.get('code')} — {c.get('name')}"
                for c in (getattr(
                    supabase.table("cursos").select("id, code, name")
                    .in_("id", en_curso_ids).execute(),
                    "data", None,
                ) or [])
            }
    except Exception as e:
        logger.error(f"Error armando el estado académico de {user.id}: {e}")
        return Contexto(system_extra="No pudiste consultar su expediente. Dilo y sugiere reintentar.")

    lineas = [
        f"Avance de carrera: {avance['porcentaje_avance']}%",
        f"Créditos aprobados: {avance['creditos_aprobados']} de {avance['creditos_totales']} "
        f"(faltan {avance['creditos_restantes']})",
        f"Cursos aprobados: {avance['cursos_aprobados']} de {avance['cursos_totales']}",
    ]
    if promedio:
        lineas.append(f"Promedio ponderado: {promedio} / 20")
    if nombres:
        lineas.append("Cursos que lleva ahora: " + "; ".join(nombres.values()))
    else:
        lineas.append("No tiene cursos marcados como en curso.")

    return Contexto(
        system_extra=(
            "Abajo va el expediente REAL del estudiante. Responde SOLO con esos números; "
            "no estimes, no completes lo que falte y no inventes notas de cursos que no "
            "aparecen. Si te preguntan algo que el expediente no dice, dilo."
        ),
        bloque="Expediente del estudiante:\n" + "\n".join(lineas),
    )


def _handler_catalogo(mensaje: str, supabase, user, token: str) -> Contexto:
    """Devuelve el catálogo real de facultades y carreras de UniVia."""
    try:
        facultades = getattr(
            supabase.table("facultades")
            .select("id, codigo, nombre, carreras(id, codigo, nombre)")
            .execute(),
            "data",
            None,
        ) or []
    except Exception as e:
        logger.error(f"No se pudo consultar el catálogo académico: {e}")
        return Contexto(
            system_extra=(
                "No pudiste consultar el catálogo académico. Dilo con honestidad "
                "y sugiere reintentar."
            )
        )

    if not facultades:
        return Contexto(
            system_extra=(
                "El catálogo académico no tiene facultades ni carreras registradas. "
                "Dilo con claridad; no inventes datos."
            )
        )

    lineas = []
    for facultad in facultades:
        etiqueta = f"{facultad.get('codigo')} — {facultad.get('nombre')}"
        carreras = facultad.get("carreras") or []
        if carreras:
            lineas.append(f"Facultad: {etiqueta}")
            lineas.extend(
                f"  - {carrera.get('codigo')} — {carrera.get('nombre')}"
                for carrera in carreras
            )
        else:
            lineas.append(f"Facultad: {etiqueta} (sin carreras registradas)")

    return Contexto(
        system_extra=(
            "Esta es la lista real de facultades y carreras registrada en UniVia. "
            "Responde al usuario ÚNICAMENTE con estos datos; no agregues ni inventes "
            "facultades u ordenamientos de otras universidades."
        ),
        bloque="Catálogo académico de UniVia:\n" + "\n".join(lineas),
    )


# Mapa de la aplicación. Es un texto fijo y no una consulta porque la estructura
# de la web no vive en la base de datos; si cambia el frontend, se actualiza acá.
MAPA_DE_LA_APP = """Secciones de UniVia:
- Dashboard (inicio): resumen de avance, cursos activos, racha y estadísticas.
- Malla: la malla curricular completa, con el estado de cada curso (aprobado, en curso, disponible, bloqueado) y sus prerrequisitos. Al hacer clic en un curso se abre su detalle.
- Curso: ruta de aprendizaje del curso, con sus unidades, material y el generador de evaluaciones de práctica.
- Recursos (biblioteca): banco de exámenes, prácticas, sílabos y libros, con filtros por curso, tipo, ciclo y año. Desde ahí se descargan los archivos.
- Perfil: datos personales, carrera, plan de estudios y preferencias.
- Onboarding: se completa al registrarse; define carrera, plan de estudios y situación académica."""


def _handler_navegacion_ayuda(mensaje: str, supabase, user, token: str) -> Contexto:
    return Contexto(
        system_extra=(
            "Explica cómo usar UniVia guiándote por el mapa de abajo. Sé concreto: di en qué "
            "sección está y qué hacer al llegar. No inventes botones ni pantallas que no "
            "figuren en el mapa."
        ),
        bloque=MAPA_DE_LA_APP,
    )


def _handler_soporte_humano(mensaje: str, supabase, user, token: str) -> Contexto:
    """Deriva a una persona. No pasa por el modelo.

    Es el único handler con respuesta fija: cuando algo falló, improvisar una
    explicación es exactamente lo que no se quiere. Un texto estable también
    evita prometerle al estudiante una gestión que nadie va a hacer.
    """
    if CONTACTO_SOPORTE:
        cierre = f"Escríbenos a {CONTACTO_SOPORTE} contándonos qué pasó y lo revisamos."
    else:
        cierre = (
            "Repórtalo desde la sección de soporte de la plataforma contando qué pasó, "
            "y el equipo lo revisa."
        )

    return Contexto(
        respuesta_fija=(
            "Lamento el problema. Esto no lo puedo resolver yo: necesita que lo vea una "
            f"persona del equipo.\n\n{cierre}\n\n"
            "Si puedes, incluye en qué pantalla estabas y qué intentabas hacer: con eso lo "
            "ubican mucho más rápido."
        )
    )


def _handler_general(mensaje: str, supabase, user, token: str) -> Contexto:
    """Conversación normal: sin contexto extra."""
    return Contexto()


from app.chatbot.skills import (
    _handler_cronograma,
    _handler_flashcards,
    _handler_quiz,
)
from app.chatbot.consultas import (
    _handler_consulta_docentes,
    _handler_consulta_prerrequisitos,
)


_HANDLERS = {
    intents.RECURSO: _handler_recurso,
    intents.DUDA_ACADEMICA: _handler_duda_academica,
    intents.ESTADO_ACADEMICO: _handler_estado_academico,
    intents.NAVEGACION_AYUDA: _handler_navegacion_ayuda,
    intents.CATALOGO: _handler_catalogo,
    intents.CONSULTA_DOCENTES: _handler_consulta_docentes,
    intents.CONSULTA_PRERREQUISITOS: _handler_consulta_prerrequisitos,
    intents.SOPORTE_HUMANO: _handler_soporte_humano,
    intents.QUIZ: _handler_quiz,
    intents.CRONOGRAMA: _handler_cronograma,
    intents.FLASHCARDS: _handler_flashcards,
    intents.GENERAL: _handler_general,
}


def construir_contexto(
    intent: str,
    mensaje: str,
    supabase,
    user,
    token: str,
    slots_contextuales: Optional[dict] = None,
) -> Contexto:
    """Ejecuta el handler del intent y devuelve su contexto.

    Nunca lanza: si el handler revienta, se responde como conversación normal.
    """
    slots = slots_contextuales or {}
    if slots.get("recurso_ambiguo"):
        candidatos = [c for c in slots.get("candidatos", []) if c]
        detalle = ", ".join(candidatos[:3])
        sufijo = f" Opciones: {detalle}." if detalle else ""
        return Contexto(
            respuesta_fija="Encontré varios documentos posibles. ¿Cuál quieres ver?" + sufijo
        )
    if slots.get("seguimiento_docente"):
        intent = intents.CONSULTA_DOCENTES
    elif slots.get("profesor_id") and intent == intents.GENERAL:
        intent = intents.CONSULTA_DOCENTES
    if slots.get("recurso_id") and intent == intents.GENERAL:
        intent = intents.RECURSO

    # Guardarraíl defensivo: si el clasificador cayó en `general` pero el
    # mensaje indaga explícitamente por el catálogo de la UNI, redirigimos a
    # catalogo para servir el catálogo REAL de Supabase en vez de alucinar.
    if intent == intents.GENERAL and intents._es_consulta_catalogo(mensaje):
        intent = intents.CATALOGO
    # Misma idea para contenido académico: el clasificador no debe dejar escapar
    # a `general` una consulta abierta de material/ejercicios/profesores que el
    # RAG puede responder con material real del banco.
    if intent == intents.GENERAL and intents._es_busqueda_contenido_abierta(mensaje):
        intent = intents.DUDA_ACADEMICA
    handler = _HANDLERS.get(intent, _handler_general)
    try:
        if intent == intents.CONSULTA_DOCENTES and (
            slots.get("profesor_id") or slots.get("curso_id")
        ):
            return _handler_consulta_docentes(
                mensaje,
                supabase,
                user,
                token,
                profesor_id_forzado=slots.get("profesor_id"),
                curso_id_forzado=slots.get("curso_id"),
            )
        if intent == intents.RECURSO and slots.get("profesor_id") and not (
            slots.get("recurso_id") or slots.get("curso_id")
        ):
            return _handler_duda_academica(
                mensaje,
                supabase,
                user,
                token,
                profesor_id_forzado=slots["profesor_id"],
            )
        if intent == intents.RECURSO and (
            slots.get("recurso_id") or slots.get("curso_id")
        ):
            return _handler_recurso(
                mensaje,
                supabase,
                user,
                token,
                curso_id_forzado=slots.get("curso_id"),
                recurso_id_forzado=slots.get("recurso_id"),
            )
        if intent == intents.DUDA_ACADEMICA and slots:
            return _handler_duda_academica(
                mensaje,
                supabase,
                user,
                token,
                curso_id_forzado=slots.get("curso_id"),
                profesor_id_forzado=slots.get("profesor_id"),
                recurso_id_forzado=slots.get("recurso_id"),
            )
        return handler(mensaje, supabase, user, token)
    except Exception as e:
        logger.error(f"Handler de '{intent}' falló: {e}", exc_info=True)
        return Contexto(
            system_extra="No pudiste consultar los datos necesarios. Dilo con honestidad."
        )
