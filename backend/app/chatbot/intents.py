"""Clasificación de intención del chatbot (Paso 3 de docs/PLAN_CHATBOT.md).

Antes de responder, el backend decide de dónde sacar la información: el banco de
recursos, el RAG de sílabos, el expediente del estudiante, la guía de la
plataforma, el conocimiento del modelo, o una derivación a soporte. Esa decisión
es este módulo; los handlers que ejecutan cada rama son el Paso 4.

Por qué un clasificador y no un solo prompt gigante: las fuentes son
excluyentes y caras. Meter en cada petición el banco de recursos, la malla del
estudiante y el contexto RAG "por si acaso" gastaría la cuota del free tier en
datos que casi nunca se usan, y le daría al modelo material de sobra para
mezclar el progreso de un curso con el contenido de otro.

La clasificación corre con un modelo más chico que el de la respuesta: es una
elección entre seis etiquetas, no necesita al modelo grande, y va en el camino
crítico (el usuario espera con la burbuja abierta).
"""

import functools
import json
import logging
import os
import re
import time
from typing import Optional

from app.core.llm import chatear

logger = logging.getLogger(__name__)

# Reintentos ante 429. El free tier limita por tokens por minuto y una ráfaga
# corta (varios estudiantes escribiendo a la vez) lo roza con facilidad. Sin
# reintento, un 429 degradaría a `general` y una petición de "pásame el sílabo"
# se respondería como charla: el peor resultado posible, y silencioso.
MAX_REINTENTOS_429 = 2

# Groq dice en el mensaje del error cuánto falta ("try again in 4.09s").
_ESPERA_SUGERIDA = re.compile(r"try again in ([\d.]+)s")


# ---------------------------------------------------------------------------
# Catálogo de intenciones
# ---------------------------------------------------------------------------

RECURSO = "recurso"
DUDA_ACADEMICA = "duda_academica"
ESTADO_ACADEMICO = "estado_academico"
NAVEGACION_AYUDA = "navegacion_ayuda"
CATALOGO = "catalogo"
GENERAL = "general"
SOPORTE_HUMANO = "soporte_humano"
QUIZ = "quiz"
CRONOGRAMA = "cronograma"
FLASHCARDS = "flashcards"
CONSULTA_DOCENTES = "consulta_docentes"
CONSULTA_PRERREQUISITOS = "consulta_prerrequisitos"

INTENTS = {
    RECURSO,
    DUDA_ACADEMICA,
    ESTADO_ACADEMICO,
    NAVEGACION_AYUDA,
    CATALOGO,
    GENERAL,
    SOPORTE_HUMANO,
    QUIZ,
    CRONOGRAMA,
    FLASHCARDS,
    CONSULTA_DOCENTES,
    CONSULTA_PRERREQUISITOS,
}

# Adónde cae lo que no se pudo clasificar. `general` es el único que no toca
# datos del estudiante ni promete un archivo: si el clasificador falla, que
# falle hacia una conversación normal y no hacia una consulta de expediente.
INTENT_POR_DEFECTO = GENERAL

# Modelo del clasificador. Más chico que el de la respuesta a propósito (ver
# docstring); se deja configurable porque Groq rota su catálogo.
MODELO_CLASIFICADOR = os.getenv("GROQ_MODEL_CLASIFICADOR", "openai/gpt-oss-20b")

# Turnos previos que se le muestran al clasificador. Con dos alcanza para
# resolver un "¿y el de Cálculo 2?", que sin contexto es inclasificable, y evita
# que una conversación larga arrastre la etiqueta de hace diez mensajes.
TURNOS_DE_CONTEXTO = 4


# El prompt se mantiene corto a propósito: viaja completo en CADA turno y el
# free tier de Groq limita por tokens por minuto (8.000 TPM al escribir esto).
# Una versión con cuatro ejemplos por categoría pesaba ~700 tokens y dejaba al
# clasificador en ~11 mensajes por minuto para toda la plataforma.
PROMPT_CLASIFICADOR = """Clasifica el mensaje del estudiante de UniVia. Responde SOLO la etiqueta.

recurso: pide un archivo CONCRETO para descargar o dice "descargar"/"bajar" (examen, plancha, práctica, sílabo, libro, solucionario).
duda_academica: pregunta por contenido, teoría, ejercicios o prácticas de un curso, o qué entra en un examen (incluye pedir ejemplos, ejercicios o problemas aunque no nombre el curso exacto).
estado_academico: pregunta por SUS datos (sus notas, avance, créditos, si puede llevar un curso).
navegacion_ayuda: cómo usar la web de UniVia o dónde encontrar una sección.
catalogo: pregunta qué facultades, carreras, cursos o elementos del catálogo existen o están registrados en la plataforma.
general: cultura general, saludos, charla.
soporte_humano: algo falla, un dato está mal, o pide hablar con una persona.
quiz: pide una prueba, cuestionario, preguntas para practicar o autoevaluarse.
cronograma: pide un plan, calendario u organización de estudio.
flashcards: pide tarjetas de estudio, fichas de repaso o preguntas y respuestas breves.
consulta_docentes: pregunta por quién dicta/enseña un curso o los docentes/profesores/catedráticos de una materia.
consulta_prerrequisitos: pregunta por prerrequisitos, qué cursos hay que llevar antes de otro, requisitos previos de X.

Desempate:
- Pedir un archivo gana sobre explicar.
- "mi/me/llevo/aprobé" indica estado_academico, SALVO que diga que el dato está mal o algo falla: eso es soporte_humano.
- "cómo hago/genero/veo X" dentro de la plataforma es navegacion_ayuda, aunque mencione un examen o material.
- Si pregunta qué facultades, carreras o catálogo existen o están registradas en UniVia (p. ej. "¿qué facultades tiene UniVia?"), es catalogo. Trigger seguro: contiene "facultades", "carreras" o "catálogo".
- Si pide explícitamente tarjetas, cuestionario o cronograma, usa respectivamente flashcards, quiz o cronograma, aunque mencione un curso.
- Si pregunta por quién dicta/enseña o los docentes de un curso, es consulta_docentes, aunque mencione exámenes o material.
- Pedir un ejercicio, problema o ejemplo (aunque empiece con "dame un ejercicio...") es duda_academica, SALVO que pida un archivo exacto para descargar.
- Consulta abierta de contenido académico sin curso (ej. "dame un ejercicio de la FIIS" o "¿qué temas entran en el examen del curso?") es duda_academica: el RAG busca en todo el banco.
- "qué prerrequisitos tiene X" o "qué llevo antes de X" es consulta_prerrequisitos; "puedo llevar YO" o "mi avance" sigue siendo estado_academico."""


def _normalizar(salida: Optional[str]) -> Optional[str]:
    """Extrae la etiqueta de la respuesta del modelo.

    No se compara por igualdad: aunque el prompt pide solo la etiqueta, un
    modelo chico devuelve de vez en cuando comillas, un punto final o un
    "Categoría: recurso". Se busca la etiqueta dentro del texto y se exige que
    sea una sola, para no aceptar una respuesta que dude entre dos.
    """
    texto = (salida or "").strip().lower()
    if not texto:
        return None

    encontradas = {i for i in INTENTS if re.search(rf"\b{i}\b", texto)}
    if len(encontradas) == 1:
        return encontradas.pop()
    return None


# Palabras clave de rescate para catalogo. Se usan SOLO cuando el clasificador
# LLM no devuelve una etiqueta válida: preguntas explícitas sobre facultades,
# carreras o catálogo de la UNI no deben caer en `general`.
_RESCATE_CATALOGO = re.compile(
    r"\b(facultades|carreras|catálogo|registro de facultades)\b", re.IGNORECASE
)


def _es_consulta_catalogo(mensaje: str) -> bool:
    """True si el mensaje indaga explícitamente por el catálogo de la UNI."""
    return bool(_RESCATE_CATALOGO.search(mensaje or ""))


# Palabras que delatan una consulta ABIERTA de contenido académico (ejercicios,
# exámenes, temas, profesores) sin curso específico. Se usan como red de rescate:
# si el clasificador falla o una rama sin curso iba a responder negativa rígida,
# la consulta debe pasar por el RAG antes de darse por perdida.
_RESCATE_CONTENIDO_ABIERTO = re.compile(
    r"\b(ejercicio|ejercicios|problema|problemas|ejemplo|ejemplos|examen|examenes|"
    r"exámenes|parcial|parciales|práctica|practica|prácticas|practicas|tarea|tareas|"
    r"teoría|teoria|contenido|solucionario|docente|docentes|profesor|profesores|"
    r"catedrático|catedratico|qué entra)\b",
    re.IGNORECASE,
)


def _es_busqueda_contenido_abierta(mensaje: str) -> bool:
    """True si el mensaje pide contenido académico abierto (debe llegar al RAG)."""
    return bool(_RESCATE_CONTENIDO_ABIERTO.search(mensaje or ""))


# ---------------------------------------------------------------------------
# Reescritura contextual de la consulta (anáforas)
# ---------------------------------------------------------------------------

# Pronombres y demostrativos que delatan una pregunta de seguimiento que depende
# del turno anterior ("¿tienes algún examen de ella?", "¿y de ese curso?"). Sin
# reescritura, "ella" llegaría literal a la vectorización y al RAG, que no pueden
# mapearla al docente o curso mencionado antes.
_ANAFORAS = re.compile(
    r"\b(ella|él|ello|eso|esa|ese|aquel|aquella|estas|estos|sus|de ella|de él|"
    r"de esa|de ese|del profesor|de la profesora|del docente|de la docente|"
    r"dicha|dicho|mencionas|mencionaste|dijiste|anterior)\b",
    re.IGNORECASE,
)

_SEGUIMIENTO_DOCENTE = re.compile(
    r"\b(enseña|ensena|dicta|imparte)\s+(más|mas|otros?|otras?)\b|"
    r"\b(sus|otras?)\s+(cursos|materias|asignaturas)\b|"
    r"\b(ese|esa|aquel|aquella)\s+(profesor|profesora|docente)\b|"
    r"\b(ella|él|de ella|de él|de el|del profesor|de la profesora|del docente|de la docente)\b",
    re.IGNORECASE,
)

_REFERENCIA_DOCUMENTO = re.compile(
    r"\b(ese|esa|aquel|aquella|dicho|dicha)\s+"
    r"(parcial|examen|documento|archivo|práctica|practica|sílabo|silabo|libro)\b|"
    r"\b(documento|archivo|parcial|examen)\s+(anterior|mencionado|mencionada)\b|"
    r"\b(lo|el|la)\s+que\s+(mencionas|mencionaste|dijiste)\b",
    re.IGNORECASE,
)

# Prompt pequeño (mismo patrón que PROMPT_CLASIFICADOR). Solo pide sustituir las
# referencias implícitas por las entidades concretas de la conversación; se usa
# únicamente cuando hay anáfora + historial para no gastar cuota en cada turno.
PROMPT_REESCRITURA = """Reescribe la consulta del estudiante para una búsqueda académica, SOLO si contiene
pronombres, demostrativos o referencias implícitas (ella, él, ese curso, del profesor,
dicho, etc.) que dependen de la conversación previa. Sustitúyelas por las entidades
concretas ya mencionadas (nombre del profesor, curso, tipo de material). Si la consulta
no depende de lo anterior o no puedes resolver la referencia, devuélvela exactamente igual.
Debes responder SOLO con el texto reescrito, sin explicaciones."""


def _es_anforico(mensaje: str) -> bool:
    """True si el mensaje usa pronombres o demostrativos implícitos."""
    return bool(
        _ANAFORAS.search(mensaje or "")
        or _SEGUIMIENTO_DOCENTE.search(mensaje or "")
        or _REFERENCIA_DOCUMENTO.search(mensaje or "")
    )


def _referencias_del_turno(metadata: dict) -> list[dict]:
    referencias = metadata.get("referencias") or []
    if referencias:
        return [r for r in referencias if isinstance(r, dict) and r.get("recurso_id")]

    curso = metadata.get("curso") or {}
    return [
        {
            "recurso_id": recurso.get("id"),
            "curso_id": metadata.get("curso_id") or curso.get("id"),
            "curso_code": curso.get("code"),
            "curso_nombre": curso.get("name"),
            "titulo_recurso": recurso.get("titulo"),
            "tipo_documento": recurso.get("tipo"),
            "año": recurso.get("year"),
        }
        for recurso in (metadata.get("recursos") or [])
        if recurso.get("id")
    ]


def resolver_slots_contextuales(mensaje: str, historial: Optional[list] = None) -> dict:
    """Hereda entidades verificadas del último turno cuando existe anáfora."""
    if not historial or not _es_anforico(mensaje):
        return {}

    busca_docente = bool(_SEGUIMIENTO_DOCENTE.search(mensaje or ""))
    busca_documento = bool(_REFERENCIA_DOCUMENTO.search(mensaje or ""))
    slots: dict = {}

    for turno in reversed(historial):
        if turno.get("role") != "assistant":
            continue
        metadata = turno.get("metadata") or {}

        if busca_docente:
            docente = metadata.get("docente") or {}
            profesor_id = metadata.get("profesor_id") or docente.get("id")
            if profesor_id:
                slots["profesor_id"] = profesor_id
                slots["seguimiento_docente"] = True
                return slots

        if busca_documento:
            referencias = _referencias_del_turno(metadata)
            if not referencias:
                continue
            if len(referencias) == 1:
                referencia = referencias[0]
            else:
                contenido = (turno.get("content") or "").lower()
                puntuadas = []
                for referencia_actual in referencias:
                    fuentes = referencia_actual.get("fuentes") or [
                        referencia_actual.get("fuente")
                    ]
                    puntaje = 4 if any(
                        fuente and f"[{str(fuente).lower()}]" in contenido
                        for fuente in fuentes
                    ) else 0
                    valores = (
                        referencia_actual.get("titulo_recurso"),
                        referencia_actual.get("curso_code"),
                        referencia_actual.get("año"),
                    )
                    puntaje += sum(
                        1 for valor in valores
                        if valor is not None and str(valor).lower() in contenido
                    )
                    puntuadas.append((puntaje, referencia_actual))
                mejor = max(puntaje for puntaje, _ in puntuadas)
                candidatas = [r for puntaje, r in puntuadas if puntaje == mejor]
                if mejor == 0 or len(candidatas) != 1:
                    return {
                        "recurso_ambiguo": True,
                        "candidatos": [r.get("titulo_recurso") for r in referencias],
                    }
                referencia = candidatas[0]
            return {
                "recurso_id": referencia.get("recurso_id"),
                "curso_id": referencia.get("curso_id"),
                "profesor_id": metadata.get("profesor_id"),
                "tipo_documento": referencia.get("tipo_documento"),
                "año": referencia.get("año"),
            }

        curso = metadata.get("curso") or {}
        curso_id = metadata.get("curso_id") or curso.get("id")
        if not curso_id:
            curso_ids = {
                referencia.get("curso_id")
                for referencia in _referencias_del_turno(metadata)
                if referencia.get("curso_id")
            }
            curso_id = next(iter(curso_ids)) if len(curso_ids) == 1 else None
        if curso_id:
            slots["curso_id"] = curso_id
            return slots
    return slots


@functools.lru_cache(maxsize=128)
def _reformular_consulta_cacheada(mensaje: str, historial_json: str, api_key: Optional[str] = None) -> str:
    historial = json.loads(historial_json) if historial_json else None
    if not historial or not _es_anforico(mensaje):
        return mensaje

    contexto = []
    for turno in historial[-TURNOS_DE_CONTEXTO:]:
        contenido = (turno.get("content") or "").strip()
        if not contenido:
            continue
        quien = "Estudiante" if turno.get("role") == "user" else "Asistente"
        contexto.append(f"{quien}: {contenido[:200]}")
        metadata = turno.get("metadata") or {}
        if metadata:
            entidades = {
                clave: metadata.get(clave)
                for clave in (
                    "recurso_id", "curso_id", "profesor_id", "tipo_documento", "año",
                    "docente", "curso",
                )
                if metadata.get(clave) is not None
            }
            referencias = _referencias_del_turno(metadata)
            if referencias:
                entidades["referencias"] = referencias
            contexto.append(
                "Entidades verificadas del turno: "
                + json.dumps(entidades, ensure_ascii=False, separators=(",", ":"))
            )

    partes = ["Conversación previa (solo para contexto):"]
    partes.extend(contexto)
    partes.append(f"Consulta actual:\n{mensaje.strip()}")

    try:
        salida = chatear(
            [{"role": "user", "content": "\n\n".join(partes)}],
            system=PROMPT_REESCRITURA,
            modelo=MODELO_CLASIFICADOR,
            max_tokens=120,
            temperature=0.0,
            api_key=api_key,
        )
    except Exception as e:
        logger.warning(
            "Reescritura de consulta no disponible (%s); se usa el texto literal.",
            str(e)[:200],
        )
        return mensaje

    reescrito = (salida or "").strip().strip('"')
    if not reescrito or reescrito.lower() == mensaje.strip().lower():
        return mensaje
    logger.info("Consulta reformulada para el RAG: %r -> %r", mensaje, reescrito)
    return reescrito


def reformular_consulta(mensaje: str, historial: Optional[list] = None, api_key: Optional[str] = None) -> str:
    """Reescribe el mensaje del usuario si depende del turno anterior.

    Args:
        mensaje: turno actual del estudiante.
        historial: turnos previos en formato Groq ([{"role", "content"}]).

    Returns:
        El mensaje reescrito para la búsqueda RAG, o el original si no hay
        anáfora, no hay historial, o la llamada al modelo falla.
    """
    historial_json = json.dumps(historial, sort_keys=True) if historial else ""
    return _reformular_consulta_cacheada(mensaje, historial_json, api_key)


@functools.lru_cache(maxsize=128)
def _clasificar_cacheada(mensaje: str, historial_json: str, api_key: Optional[str] = None) -> str:
    historial = json.loads(historial_json) if historial_json else None
    contexto = []
    if historial:
        for turno in historial[-TURNOS_DE_CONTEXTO:]:
            contenido = (turno.get("content") or "").strip()
            if not contenido:
                continue
            quien = "Estudiante" if turno.get("role") == "user" else "Asistente"
            contexto.append(f"{quien}: {contenido[:200]}")

    partes = []
    if contexto:
        partes.append("Conversación previa (solo para dar contexto):\n" + "\n".join(contexto))
    partes.append(f"Mensaje a clasificar:\n{mensaje.strip()}")

    salida = None
    for intento in range(MAX_REINTENTOS_429 + 1):
        try:
            salida = chatear(
                [{"role": "user", "content": "\n\n".join(partes)}],
                system=PROMPT_CLASIFICADOR,
                modelo=MODELO_CLASIFICADOR,
                max_tokens=300,
                temperature=0.0,
                api_key=api_key,
            )
            break
        except Exception as e:
            texto_error = str(e)
            es_429 = "429" in texto_error or "rate_limit" in texto_error
            if not es_429 or intento == MAX_REINTENTOS_429:
                logger.warning(
                    "Clasificador de intent no disponible (%s); se usa '%s'.",
                    texto_error[:200], INTENT_POR_DEFECTO,
                )
                return INTENT_POR_DEFECTO

            coincidencia = _ESPERA_SUGERIDA.search(texto_error)
            espera = min(float(coincidencia.group(1)) + 0.25, 5.0) if coincidencia else 1.5
            logger.info("Clasificador limitado por cuota; reintento en %.1fs.", espera)
            import time
            time.sleep(espera)

    intent = _normalizar(salida)
    if intent is None:
        if _es_consulta_catalogo(mensaje):
            logger.info("Clasificador falló; rescue por keyword → 'catalogo'.")
            return CATALOGO
        if _es_busqueda_contenido_abierta(mensaje):
            logger.info("Clasificador falló; rescue por keyword → 'duda_academica'.")
            return DUDA_ACADEMICA
        logger.warning("Clasificador de intent falló parseo (%r); se usa '%s'.", salida, INTENT_POR_DEFECTO)
        return INTENT_POR_DEFECTO

    logger.info("Intent: %s", intent)
    return intent


def clasificar(mensaje: str, historial: Optional[list] = None, api_key: Optional[str] = None) -> str:
    """Devuelve la intención del mensaje.

    Args:
        mensaje: el turno actual del estudiante.
        historial: turnos previos en formato Groq ([{"role", "content"}]),
            para resolver mensajes que dependen de lo anterior.

    Returns:
        Una de las etiquetas de INTENTS. Nunca lanza: si la clasificación falla
        (cuota agotada, red caída, salida rara), devuelve INTENT_POR_DEFECTO y lo
        registra.
    """
    historial_json = json.dumps(historial, sort_keys=True) if historial else ""
    return _clasificar_cacheada(mensaje, historial_json, api_key)
