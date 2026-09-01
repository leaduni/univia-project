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
GENERAL = "general"
SOPORTE_HUMANO = "soporte_humano"

INTENTS = {
    RECURSO,
    DUDA_ACADEMICA,
    ESTADO_ACADEMICO,
    NAVEGACION_AYUDA,
    GENERAL,
    SOPORTE_HUMANO,
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

recurso: pide un archivo o dice "descargar"/"bajar" (examen, plancha, práctica, sílabo, libro, solucionario).
duda_academica: pregunta por contenido o teoría de un curso, o qué entra en un examen.
estado_academico: pregunta por SUS datos (sus notas, avance, créditos, si puede llevar un curso).
navegacion_ayuda: cómo usar la web de UniVia o dónde encontrar una sección.
general: cultura general, saludos, charla.
soporte_humano: algo falla, un dato está mal, o pide hablar con una persona.

Desempate:
- Pedir un archivo gana sobre explicar.
- "mi/me/llevo/aprobé" indica estado_academico, SALVO que diga que el dato está mal o algo falla: eso es soporte_humano.
- "cómo hago/genero/veo X" dentro de la plataforma es navegacion_ayuda, aunque mencione un examen o material."""


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


def clasificar(mensaje: str, historial: Optional[list] = None) -> str:
    """Devuelve la intención del mensaje.

    Args:
        mensaje: el turno actual del estudiante.
        historial: turnos previos en formato Groq ([{"role", "content"}]),
            para resolver mensajes que dependen de lo anterior.

    Returns:
        Una de las etiquetas de INTENTS. Nunca lanza: si la clasificación falla
        (cuota agotada, red caída, salida rara), devuelve INTENT_POR_DEFECTO y lo
        registra. Un chatbot que responde de más es mejor que uno que no responde.
    """
    contexto = []
    if historial:
        for turno in historial[-TURNOS_DE_CONTEXTO:]:
            contenido = (turno.get("content") or "").strip()
            if not contenido:
                continue
            # El texto previo se recorta fuerte: solo sirve para desambiguar de
            # qué se venía hablando, y una respuesta larga del bot ahogaría al
            # mensaje que de verdad hay que clasificar.
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
                # La etiqueta más larga son ~6 tokens, pero el margen cubre a los
                # modelos que razonan un poco antes de soltarla.
                max_tokens=300,
                # Determinista: la misma pregunta tiene que enrutar siempre igual.
                temperature=0.0,
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
            # El tope de 5s evita que un turno se quede colgado esperando: el
            # usuario está mirando la burbuja. Si Groq pide más, se abandona.
            espera = min(float(coincidencia.group(1)) + 0.25, 5.0) if coincidencia else 1.5
            logger.info("Clasificador limitado por cuota; reintento en %.1fs.", espera)
            time.sleep(espera)

    intent = _normalizar(salida)
    if intent is None:
        logger.warning(
            "Clasificador devolvió algo inesperado (%r); se usa '%s'.",
            (salida or "")[:120], INTENT_POR_DEFECTO,
        )
        return INTENT_POR_DEFECTO

    logger.info("Intent: %s", intent)
    return intent
