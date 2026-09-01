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
UMBRAL_SIMILITUD_RAG = 0.35


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


# ---------------------------------------------------------------------------
# Handlers
# ---------------------------------------------------------------------------

def _handler_recurso(mensaje: str, supabase, user, token: str) -> Contexto:
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

    curso = _detectar_curso(mensaje, cursos)
    tipo = _detectar_tipo(mensaje)

    if curso is None:
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
        if tipo:
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
    return Contexto(
        system_extra=(
            "Encontraste material y el estudiante YA VE las tarjetas de descarga debajo de tu "
            "mensaje. Presenta el hallazgo en una o dos frases; NO repitas la lista de archivos "
            "ni inventes enlaces."
        ),
        bloque=f"Material encontrado en {etiqueta_curso}:\n{listado}",
        adjuntos={
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
        },
    )


def _handler_duda_academica(mensaje: str, supabase, user, token: str) -> Contexto:
    """Recupera fragmentos del corpus vectorizado para responder con material real."""
    try:
        from app.rag.retriever import SyllabusRetriever

        curso = None
        try:
            curso = _detectar_curso(mensaje, _cursos_de_la_facultad(supabase, user))
        except Exception as e:
            # Sin curso el RAG busca en todo el corpus: peor foco, pero responde.
            logger.warning(f"No se pudo acotar la duda a un curso: {e}")

        fragmentos = SyllabusRetriever(token=token).buscar_contexto(
            mensaje,
            limit=MAX_FRAGMENTOS_RAG,
            umbral_similitud=UMBRAL_SIMILITUD_RAG,
            curso_id=curso["id"] if curso else None,  # type: ignore[arg-type]
        )
    except Exception as e:
        logger.error(f"Falló la búsqueda RAG: {e}")
        fragmentos = []

    if not fragmentos:
        # Buena parte del corpus todavía no está vectorizado, así que quedarse
        # sin fragmentos es lo normal, no una excepción: se responde con el
        # conocimiento del modelo en vez de decir que no se sabe.
        return Contexto(
            system_extra=(
                "No hay material de la universidad sobre esta consulta. Aplica una guía socrática: "
                "identifica qué concepto o paso necesita trabajar el estudiante, formula una pregunta "
                "orientadora y propón un primer paso antes de dar una respuesta directa. Si pregunta "
                "por ejercicios, exámenes o parciales pasados y no indicó un curso o tema específico, "
                "no te niegues de plano: pídele amablemente que indique el curso o tema para buscarlo "
                "en su banco de datos. Para otros casos, responde con tu propio conocimiento y aclara "
                "que no está sacado del material del curso."
            )
        )

    contenidos = "\n\n---\n".join(
        (f.get("contenido") or "").strip() for f in fragmentos if f.get("contenido")
    )
    return Contexto(
        system_extra=(
            "Responde apoyándote en el material del curso que viene abajo. Aplica una guía "
            "socrática: antes de revelar la solución completa, guía al estudiante con preguntas "
            "y pasos intermedios; luego ofrece el procedimiento si lo necesita. Este material "
            "proviene del banco verificado del propio estudiante; puedes resolver sus ejercicios, "
            "mostrar procedimientos paso a paso y generar variantes, sin tratarlo como material "
            "restringido. Si no alcanza para responder del todo, complétalo con tu conocimiento y dilo."
        ),
        bloque=f"Material del curso:\n{contenidos}",
        adjuntos={"fragmentos": len(fragmentos)},
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
    intents.CONSULTA_DOCENTES: _handler_consulta_docentes,
    intents.CONSULTA_PRERREQUISITOS: _handler_consulta_prerrequisitos,
    intents.SOPORTE_HUMANO: _handler_soporte_humano,
    intents.QUIZ: _handler_quiz,
    intents.CRONOGRAMA: _handler_cronograma,
    intents.FLASHCARDS: _handler_flashcards,
    intents.GENERAL: _handler_general,
}


def construir_contexto(intent: str, mensaje: str, supabase, user, token: str) -> Contexto:
    """Ejecuta el handler del intent y devuelve su contexto.

    Nunca lanza: si el handler revienta, se responde como conversación normal.
    """
    handler = _HANDLERS.get(intent, _handler_general)
    try:
        return handler(mensaje, supabase, user, token)
    except Exception as e:
        logger.error(f"Handler de '{intent}' falló: {e}", exc_info=True)
        return Contexto(
            system_extra="No pudiste consultar los datos necesarios. Dilo con honestidad."
        )
