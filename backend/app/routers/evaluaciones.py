import os
import json
import re
import asyncio
import logging
import traceback
import sys
import random

from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Union, AsyncGenerator
from dotenv import load_dotenv
load_dotenv()

from app.core.llm import MODELO_GENERACION, generar, get_claude
from app.rag.retriever import SyllabusRetriever
from app.core.auth_utils import get_current_user

logger = logging.getLogger("evaluaciones_tracer")
logger.setLevel(logging.DEBUG)
if not logger.handlers:
    handler = logging.StreamHandler(sys.stdout)
    formatter = logging.Formatter(
        "\n[TRACE-EVALUACIONES] %(asctime)s | %(levelname)s | %(message)s",
        datefmt="%H:%M:%S"
    )
    handler.setFormatter(formatter)
    logger.addHandler(handler)

router = APIRouter()

_retriever: Optional[SyllabusRetriever] = None

def get_retriever(token: Optional[str] = None) -> Optional[SyllabusRetriever]:
    """Inicializa el retriever de RAG de forma diferida (lazy) y reutilizable.

    Si se recibe un token de sesión se devuelve un retriever autenticado con la
    identidad del usuario (las RPC de búsqueda respetan las políticas RLS).
    """
    global _retriever
    if token:
        try:
            return SyllabusRetriever(token=token)
        except Exception as e:
            print(f"Error al inicializar SyllabusRetriever autenticado: {e}")
            return None
    if _retriever is None:
        try:
            _retriever = SyllabusRetriever()
        except Exception as e:
            print(f"Error al inicializar SyllabusRetriever: {e}")
            return None
    return _retriever





# Modelos de datos
class ConfiguracionEvaluacion(BaseModel):
    """Configuración previa para la evaluación"""
    curso_id: int
    modulo: str
    temas: List[str]
    num_preguntas: int = Field(default=4, ge=3, le=6)
    observaciones: Optional[str] = None
    tipo_evaluacion: str = "mixta"
    # Filtra el contexto RAG a documentos etiquetados con este profesor
    # (recursos.profesor_id). None = sin filtro, busca en todo el curso.
    profesor_id: Optional[int] = None

class CasoDeEjemplo(BaseModel):
    input: str
    output: str

class Pregunta(BaseModel):
    """Modelo de una pregunta de evaluación"""
    id: int
    pregunta: Optional[str] = None
    contexto_markdown: Optional[str] = None
    input_markdown: Optional[str] = None
    output_markdown: Optional[str] = None
    tipo: str 
    opciones: Optional[List[str]] = None
    respuesta_correcta: Any 
    explicacion: Optional[str] = None
    codigo_base: Optional[str] = None
    caso_de_ejemplo: Optional[CasoDeEjemplo] = None
    origen: str = "ia"
    fuente_detalle: Optional[str] = None

class Evaluacion(BaseModel):
    """Evaluación completa generada"""
    curso_id: int
    modulo: str
    temas: List[str]
    preguntas: List[Pregunta]
    tiempo_estimado: int

class RespuestaEstudiante(BaseModel):
    """Respuesta de un estudiante a una pregunta"""
    pregunta_id: int
    respuesta: Any 

class EnvioEvaluacion(BaseModel):
    """Envío completo de una evaluación"""
    evaluacion_id: str
    respuestas: List[RespuestaEstudiante]

class ResultadoEvaluacion(BaseModel):
    """Resultado de la evaluación"""
    puntaje: float
    total: int
    porcentaje: float
    respuestas_correctas: int
    respuestas_incorrectas: int
    detalles: List[Dict[str, Any]]
    retroalimentacion: str

# Lista de IDs de materia (cursos.id) de programación. Antes eran ids de
# curso_carrera (uno por variante de carrera); tras la consolidación de la
# fase 8, Introducción a la Computación y Algoritmia y Estructura de Datos
# pasaron a ser una sola materia cada una, así que la lista se redujo.
CURSOS_PROGRAMACION_IDS = [19, 2, 25, 3, 22]

def obtener_nombre_curso(curso_id: int, token: Optional[str] = None) -> Optional[str]:
    """Resuelve el nombre de la materia a partir de su id (cursos.id).

    Se usa para recuperar contexto por NOMBRE de curso: la materia es
    carrera-agnóstica desde la migración N:N, así que el material ingestado
    bajo un único curso_id de materia se recupera para cualquier carrera que
    la dicte.
    """
    try:
        from app.core.database import get_supabase
        supabase = get_supabase(token)
        respuesta = supabase.table("cursos").select("name").eq("id", curso_id).limit(1).execute()
        if respuesta.data:
            return respuesta.data[0]["name"]
    except Exception as e:
        print(f"Error al obtener el nombre del curso {curso_id}: {e}")
    return None

def recuperar_contexto_semantico(
    tema_consulta: str, curso_id: int, profesor_id: Optional[int] = None, token: Optional[str] = None
) -> List[Dict[str, Any]]:
    """Usa el SyllabusRetriever del módulo RAG para buscar los fragmentos más relevantes del curso.

    Recupera el contexto filtrando por NOMBRE de curso (no por curso_id), de modo que
    un mismo compendio/examen sirva a todas las variantes del curso por carrera.
    Si se pasa profesor_id, además restringe a documentos etiquetados con ese
    profesor (recursos.profesor_id); si ese profesor no tiene documentos
    etiquetados para el tema, el resultado queda vacío en vez de caer de
    vuelta a la búsqueda sin filtrar — el llamador decide qué hacer con eso.
    """
    retriever = get_retriever(token)
    if not retriever:
        return []

    curso_nombre = obtener_nombre_curso(curso_id, token)
    if not curso_nombre:
        print(f"No se pudo resolver el nombre del curso {curso_id}; se omite el filtro por nombre.")

    try:
        # Recuperar pool de alta calidad (hasta 10, umbral 0.4) y muestrear de
        # forma inteligente: el fragmento de mayor similitud (rank #1, primero
        # del resultado ordenado de la RPC) siempre se incluye; los otros 4 se
        # sortean del resto del pool.
        resultados = retriever.buscar_contexto_por_nombre(
            tema_consulta,
            curso_nombre=curso_nombre,
            limit=10,
            umbral_similitud=0.4,
            profesor_id=profesor_id,
        )
        if len(resultados) > 5:
            mejor_fragmento = resultados[0]
            resto = random.sample(resultados[1:], k=4)
            resultados = [mejor_fragmento] + resto
        return resultados

    except Exception as e:
        print(f"Error al recuperar contexto: {e}")
        return []

# Categorías de enfoque agnósticas al curso: sirven igual para Cálculo,
# Álgebra, Física, Química, Economía, etc. Se asignan por índice para forzar
# diversidad ESTRUCTURAL (no solo pedirla como sugerencia que el modelo puede
# ignorar), tanto en el prompt de una sola llamada como en las llamadas
# paralelas independientes del modo streaming.
ENFOQUES_PREGUNTA = [
    "aplicación numérica directa: datos concretos que llevan a un valor final",
    "problema de demostración o verificación lógica de una propiedad o condición",
    "problema de optimización o valores extremos (máximo, mínimo, óptimo)",
    "comparación entre dos escenarios o configuraciones distintas",
    "problema inverso: se da el resultado y se pide reconstruir un dato de partida",
    "interpretación de un modelo o resultado en un contexto aplicado",
]


def _enfoque_para_indice(idx: int) -> str:
    """Devuelve el enfoque asignado a la pregunta idx (0-based), rotando la lista."""
    return ENFOQUES_PREGUNTA[idx % len(ENFOQUES_PREGUNTA)]


def DIVERSIDAD_POR_INDICE_BLOQUE(num_preguntas: int) -> str:
    """Bloque de prompt que asigna un enfoque obligatorio y distinto a cada
    pregunta por su número de orden, para el modo de una sola llamada JSON.

    Pedir "diversidad" de forma genérica no es suficiente: el modelo puede
    igual repetir la misma plantilla narrativa cambiando solo nombres de
    variables (el caso "cuadrado ABCD" / "cuadrado EFGH" reportado). Asignar
    un enfoque concreto y distinto a cada número de pregunta lo obliga por
    construcción, no por sugerencia.
    """
    lineas = [
        f"- Pregunta {i + 1}: enfoque obligatorio = {_enfoque_para_indice(i)}."
        for i in range(num_preguntas)
    ]
    return (
        "\nASIGNACIÓN OBLIGATORIA DE ENFOQUE POR PREGUNTA (evita plantillas repetidas):\n"
        + "\n".join(lineas)
        + "\nCada pregunta DEBE usar un contexto/escenario distinto de las demás "
        "(no reutilices el mismo tipo de figura, situación o nombres de variables "
        "cambiando solo las letras).\n"
    )


DIRECTIVA_VARIABILIDAD_PREGUNTAS = (
    "DIRECTIVA DE VARIABILIDAD ENTRE PREGUNTAS: si varias preguntas de la "
    "evaluación versan sobre un mismo tema, DEBES variar los enfoques y "
    "profundizar en distintos aspectos del contexto recuperado. En ejercicios "
    "prácticos, altera los datos/valores numéricos del material de referencia "
    "y entre pregunta y pregunta, para evitar preguntas idénticas o repetitivas."
)


def generar_prompt_teorico(config: ConfiguracionEvaluacion, contexto_recuperado: List[str] = None) -> str:
    """Genera el prompt para un curso teórico."""

    tipos_pregunta = {
        "multiple": "selección múltiple (varias respuestas correctas)",
        "unica": "única respuesta correcta",
        "verdadero_falso": "verdadero o falso",
        "mixta": "combinación de selección múltiple, única respuesta y verdadero/falso"
    }

    tema_unico = config.temas[0] if len(config.temas) == 1 else None
    temas_str = config.temas[0] if tema_unico else ', '.join(config.temas)

    restriccion_tema = ""
    if tema_unico:
        restriccion_tema = f"""
RESTRICCIÓN DE TEMA (OBLIGATORIA E INNEGOCIABLE):
- TODAS las {config.num_preguntas} preguntas deben ser sobre: "{tema_unico}".
- NINGUNA pregunta puede ser sobre otro tema diferente a "{tema_unico}", aunque esté relacionado.
- Si tienes duda de si una pregunta pertenece a "{tema_unico}", descártala y genera otra sobre ese mismo tema.
"""

    contexto_bloque = ""
    if contexto_recuperado and len(contexto_recuperado) > 0:
        contenidos = [c.get("contenido", "") for c in contexto_recuperado]
        contexto_str = "\n\n---\n".join(contenidos)
        contexto_bloque = f"""
### EJERCICIOS REALES DE EXAMENES UNI - REFERENCIA OBLIGATORIA ###
{contexto_str}
### FIN DE REFERENCIA ###

INSTRUCCION CRITICA: Los ejercicios anteriores son examenes REALES de la UNI.
Toma cada ejercicio y TRANSFORMALO: mantén exactamente la misma estructura lógica y cantidad de pasos,
el mismo tipo de datos (coordenadas, vectores, razones, distancias), y cambia SOLO los valores numéricos.
NUNCA generes algo más simple que el ejercicio más sencillo de la referencia.
"""

    prompt = rf"""Eres un profesor del Departamento de Ciencias Básicas de la UNI generando una Práctica Calificada REAL.
{contexto_bloque}
TEMA: {temas_str}
{restriccion_tema}
CANTIDAD: {config.num_preguntas} preguntas | TIPO: {tipos_pregunta.get(config.tipo_evaluacion, 'mixta')}

### ESTANDAR DE DIFICULTAD - OBLIGATORIO SIN EXCEPCION ###
Cada pregunta DEBE cumplir TODOS estos requisitos:
1. LONGITUD: el enunciado debe tener al menos 4 datos numéricos concretos (coordenadas, vectores, razones, distancias, parámetros).
2. CADENA DE CÁLCULO: resolver la pregunta requiere mínimo 4 pasos algebraicos encadenados donde cada resultado alimenta el siguiente.
3. INCÓGNITAS MÚLTIPLES: se deben determinar al menos 2 valores desconocidos a partir de condiciones geométricas.
4. CONTEXTO GEOMÉTRICO COMPLEJO: usar configuraciones como triángulos/cuadriláteros con puntos definidos por intersecciones, divisiones de segmentos en razón dada, proyecciones, ángulos entre rectas, distancias punto-recta.
5. DISTRACTORES TRAMPA: las 4 opciones deben ser resultados numéricos donde los 3 incorrectos corresponden a errores de cálculo específicos (signo cambiado, componente equivocada, confusión de índice, error de sustitución).
6. PROHIBIDO ABSOLUTAMENTE: "halla la pendiente de y=mx+b", "dados dos puntos halla la recta", definiciones, fórmulas directas. Si una pregunta se puede resolver en 1 paso, DESÉCHALA.
7. Genera un conjunto de N preguntas estrictamente ÚNICAS y DISTINTAS entre sí. Está prohibido repetir el mismo ejercicio o generar variantes triviales del mismo problema dentro del mismo lote.
{DIVERSIDAD_POR_INDICE_BLOQUE(config.num_preguntas)}
{DIRECTIVA_VARIABILIDAD_PREGUNTAS}

FORMATO LaTeX — KaTeX COMPATIBLE ÚNICAMENTE:
COMANDOS PERMITIDOS: \frac, \vec, \mathbf, \overline, \left(, \right), \mid, \mathbb, \sqrt, \cdot, \times, \alpha, \beta, \theta, \pi, \perp, \parallel, \in, \mathbb{{R}}, \leq, \geq, \neq, \pm
COMANDOS PROHIBIDOS (rompen KaTeX): \begin, \end, \matrix, \Bmatrix, \bigg, \Big, \bigr, \bigl, \rfloor, \lfloor, \textbf, \bar, \dfrac, \text
- Rectas vectoriales: "$L: (2,1) + t(3,n),\ t \in \mathbb{{R}}$" — SIN \begin{{Bmatrix}}, SIN \bigg, SIN \rfloor
- Prosa FUERA de $...$: CORRECTO: "La recta $L_1$ pasa por $A=(2,3)$" / INCORRECTO: "$L_1 \text{{pasa por}} A$"
- Segmentos: $\overline{{AC}}$ (no \bar{{AC}})
- Vectores: $\vec{{v}}$ o $\mathbf{{v}}$ (no \textbf)
- Fracciones: $\frac{{p}}{{q}}$ (no \dfrac). Queda estrictamente prohibido usar corchetes en lugar de llaves en fracciones (usa siempre \frac{{a}}{{b}}).
- Módulos: $|\vec{{v}}| = 3$
- Coordenadas: $A = (2, 1)$
- Formatea toda expresión matemática en notación KaTeX válida delimitada ÚNICAMENTE por $ para expresiones inline (ej. $f(x) = \sin(x)$) o $$ para ecuaciones centradas en bloque.

RESPONDE ÚNICAMENTE con este JSON:
{{
  "preguntas": [
    {{
      "id": 1,
      "pregunta": "enunciado completo y largo con todos los datos",
      "tipo": "unica|multiple|verdadero_falso",
      "opciones": ["opción A", "opción B", "opción C", "opción D"],
      "respuesta_correcta": 0,
      "explicacion": "**Paso 1: Planteamiento e Identificación de Datos.**\nIdentifica las variables, coordenadas, fórmulas clave y condiciones del problema. Explica qué información se extrae del enunciado.\n\n**Paso 2: Desarrollo algebraico detallado.**\nMuestra cada operación y transformación paso a paso usando LaTeX. Incluye sustituciones numéricas, simplificaciones y cálculos intermedios.\n\n**Paso 3: Conclusión y Respuesta Final.**\nPresenta el resultado numérico o vectorial final e indica cuál opción es la correcta."
    }}
  ]
}}

REGLAS JSON: "unica" → respuesta_correcta es índice 0-3. "multiple" → lista [0,2]. "verdadero_falso" → opciones ["Verdadero","Falso"].
REGLA DE AISLAMIENTO DE OPCIONES (CRÍTICO):
1. Si el contexto RAG contiene una página con varios ejercicios, debes elegir ÚNICAMENTE UN ejercicio.
2. El arreglo 'opciones' DEBE CONTENER EXACTAMENTE 4 ELEMENTOS.
3. Queda ESTRICTAMENTE PROHIBIDO concatenar opciones de otros ejercicios vecinos.
4. NO incluyas letras de prefijo como 'A)', 'a.', '1.' dentro del texto de la opción. Pon solo la expresión o respuesta directas.

INSTRUCCIONES UNIVERSALES DE FORMATO Y ESTRUCTURA (MULTICURSO):

1. SINTAXIS LATEX EN TODO EL EXAMEN:
   - Cualquier fórmula matemática, expresión algebraica, ecuación, integral, matriz o vector en 'questionText', 'options' y 'explanation' DEBE IR DENTRO DE SIGNOS DE DÓLAR $...$.
   - EJEMPLOS CORRECTOS: "Calcule $\int_0^1 x^2 dx$", "Determine el valor de $k$", "Ajuste el modelo $Y = \beta_0 + \beta_1 X$".
   - PROHIBIDO escribir comandos LaTeX (\frac, \sqrt, \int, \vec, \matrix) sin delimitadores $...$.
   - Usa estrictamente $...$ para matemáticas en línea y $$...$$ para bloques independientes.
   - NUNCA uses triple dólar ($$$) ni pegues palabras de texto plano a comandos LaTeX (ejemplo correcto: "Halle $\vec{{QS}}$", incorrecto: "Halle\vec{{QS}}").
   - Asegúrate de cerrar todos los delimitadores matemáticos abiertos antes de finalizar cada respuesta.

2. COHERENCIA COMPLETA ENTRE PREGUNTA Y OPCIONES:
   - Si la pregunta pide determinar $N$ variables, elementos o componentes, CADA opción en 'options' DEBE proporcionar la solución completa para los $N$ elementos solicitados.
   - PROHIBIDO etiquetar problemas de cálculo complejo como "Verdadero o Falso".

3. DIVERSIDAD ESTRICTA DE ENUNCIADOS Y PLANTILLAS (PROHIBIDO MONOTONÍA):
   - Queda ESTRICTAMENTE PROHIBIDO repetir la misma plantilla, contexto o estructura narrativa en más de UNA pregunta del examen.
   - Cada pregunta del examen DEBE explorar un subtema o aplicación distinta dentro del temario/curso solicitado.
   - Alterna entre: problemas teóricos de demostración/concepto, problemas de aplicación directa, problemas numéricos y problemas de interpretación de modelos.

INSTRUCCIÓN PARA EL CAMPO 'explicacion':
El campo 'explicacion' DEBE seguir estrictamente esta estructura Markdown con doble salto de línea entre pasos:

### Paso 1: Planteamiento e Identificación de Datos
[Explicación con fórmulas en $...$]

### Paso 2: Desarrollo algebraico detallado
[Explicación paso a paso con fórmulas en $...$]

### Paso 3: Conclusión
[Respuesta final clara]

REGLA ESTRICTA: Queda PROHIBIDO mencionar 'opción 0', 'opción 1', 'opción A', etc. Menciona únicamente el valor o vector solución final.

REGLA CRÍTICA PARA LA SOLUCIÓN (explicacion):
CADA variable, fórmula o comando LaTeX (\vec, \sqrt, \frac, \text, etc.) DEBE estar estrictamente envuelto entre signos de dólar ($ ... $). Separa siempre con un espacio en blanco los delimitadores de las palabras en español. Ejemplo CORRECTO: "La recta $L_1$ pasa por $A=(2,3)$". Ejemplo INCORRECTO: "La recta$L_1$pasa por$A$". NUNCA generes comandos LaTeX sueltos sin delimitador $.
"""
    return prompt

def generar_prompt_programacion(config: ConfiguracionEvaluacion, contexto_recuperado: List[str] = None) -> str:
    """Genera el prompt para un curso de programación."""
    
    prompt = f"""Eres un Arquitecto de Software diseñando retos técnicos para evaluar candidatos. Tu tono es directo, técnico y sin ambigüedades.

Genera {config.num_preguntas} retos de programación de nivel 'Senior Universitario' sobre los siguientes temas:
{', '.join(config.temas)}

"""
    
    if config.observaciones:
        prompt += f"\nRequerimientos adicionales del cliente (lenguaje, etc.):\n{config.observaciones}\n"
    
    if contexto_recuperado and len(contexto_recuperado) > 0:
        contenidos = [c.get("contenido", "") for c in contexto_recuperado]
        contexto_str = "\n\n---\n".join(contenidos)
        prompt += f"""
Contexto (Ejemplos de problemas o material de referencia):
A continuación tienes material de referencia para que el estilo, nivel de dificultad y tipo de reto se parezca al material del curso:
---
{contexto_str}
---
Utiliza este contexto como inspiración para formular el reto de código. No copies exactamente, pero mantén la misma temática y nivel.
"""

    prompt += f"\n{DIRECTIVA_VARIABILIDAD_PREGUNTAS}\n"

    prompt += """
IMPORTANTE: La respuesta debe ser un objeto JSON válido.
NO generes preguntas teóricas. Solo retos de código con especificaciones técnicas rigurosas.

{
  "preguntas": [
    {
      "id": 1,
      "contexto_markdown": "Breve descripción del problema de negocio o técnico a resolver. Ej: 'En un sistema de procesamiento de datos, necesitamos validar que los números de serie siguen un formato específico.'",
      "input_markdown": "Descripción de los datos de entrada del programa. Ej: 'La función recibirá un único string.'",
      "output_markdown": "Descripción exacta de lo que el programa debe imprimir o retornar. Ej: 'Debe retornar `True` si el string es válido, `False` en caso contrario.'",
      "tipo": "codigo",
      "opciones": [],
      "caso_de_ejemplo": {
          "input": "print(validar_serial('SN-123-A'))",
          "output": "True"
      },
      "codigo_base": "def validar_serial(serial):\\n  # Tu código aquí\\n\\n# No modifiques la siguiente línea, es para tu validación",
      "respuesta_correcta": "True",
      "explicacion": "La solución más eficiente es usar una expresión regular para validar el formato del string de entrada."
    }
  ]
}

REGLAS ESTRICTAS PARA LA GENERACIÓN DEL JSON:
- La respuesta DEBE ser un objeto JSON válido y nada más.
- Para fórmulas matemáticas en explicaciones, usa $...$ para las de en línea y $$...$$ para las de bloque. NO uses `(...)` para las fórmulas.
- DEBES proveer "contexto_markdown", "input_markdown" y "output_markdown" como campos de primer nivel (NO anidados).
- DEBE existir un campo "caso_de_ejemplo" que sea un objeto con "input" y "output". El "input" del caso de ejemplo debe ser el código ejecutable que el estudiante usará para probar.
- "tipo" DEBE ser siempre "codigo".
- "opciones" DEBE ser siempre una lista vacía [].
- "codigo_base" DEBE contener solo la definición de la función con un comentario '# Tu código aquí'. NO debe incluir la lógica de la solución ni el 'return' ni la llamada a la función.
- "respuesta_correcta" DEBE ser el string EXACTO que resulta de la ejecución del "input" del "caso_de_ejemplo".
- Los retos deben requerir lógica de programación real y no ser triviales.
- Usa '\\n' para los saltos de línea dentro de los strings. No uses saltos de línea literales.
"""
    
    return prompt

def reparar_escapes_json_latex(raw_text: str) -> str:
    """Restaura comandos LaTeX dañados por interpretación de secuencias de escape JSON/Python.

    Corrige caracteres de control que Python/JSON introdujo al interpretar
    backslashes de comandos LaTeX como escapes de string.
    """
    raw_text = _fix_json_latex_escapes(raw_text)

    # Re-escapar TODOS los comandos LaTeX comunes desescapados
    latex_cmds = (
        r'frac|vec|text|cdot|perp|hat|over|comp|proy|left|right|'
        r'implies|sqrt|quad|qquad|times|theta|alpha|beta|gamma|'
        r'delta|lambda|sigma|omega|sum|int|lim|overline|cap|cup|'
        r'varphi|nabla|angle|perp|simeq|cong|approx|equiv|sim|'
        r'Rightarrow|Leftrightarrow|rightarrow|leftrightarrow|'
        r'mathbb|mathbf|mathcal|mathscr|'
        r'subset|supset|subseteq|supseteq|'
        r'partial|nabla|prod|coprod|bigcap|bigcup|'
        r'binom|choose|'
        r'dots|cdots|vdots|ddots'
    )
    raw_text = re.sub(fr'(?<!\\)\b({latex_cmds})\b', r'\\\1', raw_text)

    return raw_text


def _fix_json_latex_escapes(text: str) -> str:
    """Corrige escapes de control Python/JSON que corroen comandos LaTeX.

    Convierte caracteres de control invisibles (formfeed, vertical-tab,
    backspace, bell) de vuelta a sus secuencias \\f, \\v, \\b, \\a,
    y restaura \\r, \\t que se comieron comandos como \\right y \\text.
    """
    if not text:
        return text
    text = text.replace('\x0c', '\\f')    # \f -> \frac, \varphi, \forall
    text = text.replace('\x0b', '\\v')    # \v -> \vec, \vee, \nabla
    text = text.replace('\x07', '\\a')    # \a -> \alpha, \angle
    text = text.replace('\x08', '\\b')    # \b -> \beta, \bar
    text = re.sub(r'\r(?=ight|oot|enorm|angle|floor|ceil)', r'\\r', text)
    text = re.sub(r'\t(?=ext|imes|heta|au|riangle|ilde|o$)', r'\\t', text)
    return text


# ─── ÚNICA FUNCIÓN CENTRALIZADA DE SANITIZACIÓN LaTeX ────────────────
# Reemplaza a TODAS las anteriores: _sanitizar_latex_str, sanitize_latex_string,
# _sanitizar_latex_dict, _ensure_math_delimiters, _wrap_math_runs_in_text,
# reparar_cadena_latex. Un solo pase determinista, sin re-aplicación.

_LATEX_COMMON_CMDS = (
    r'vec|frac|sqrt|perp|cdot|implies|int|sum|lim|partial|infty|'
    r'alpha|beta|theta|gamma|delta|lambda|sigma|omega|'
    r'times|overline|hat|left|right|'
    r'mathbf|mathbb|mathcal|mathscr|'
    r'rightarrow|leftrightarrow|Rightarrow|Leftrightarrow|'
    r'simeq|cong|approx|equiv|sim|'
    r'subset|supset|subseteq|supseteq|'
    r'cap|cup|nabla|varphi|angle|'
    r'prod|coprod|bigcap|bigcup|'
    r'binom|choose|'
    r'dots|cdots|vdots|ddots'
)

# Comandos para ENVOLVER en $...$: incluye \text y \operatorname, que NO deben
# usarse en el paso de restauración de barras (evita corromper la palabra "text").
_LATEX_WRAP_CMDS = _LATEX_COMMON_CMDS + r'|text|operatorname'

def _wrap_unwrapped_latex(text: str) -> str:
    """Envuelve en $...$ los comandos LaTeX que quedaron fuera de bloques
    matemáticos y normaliza los delimitadores de dólar en un único pase
    protegido por placeholders:

    - NO toca lo que ya está dentro de $...$ o $$...$$ (splitting).
    - Evita el doble envolvimiento con lookbehind (?<!\\$).
    - Limpia triple $$$ y pares vacíos ($ $, $$) fuera de bloques.
    - Separa con un espacio defensivo los bloques en línea contiguos
      ($a$$b$ -> $a$ $b$) para que Markdown no los confunda con $$...$$.
    """
    if '\\' not in text and '$' not in text:
        return text

    # 1. Extraer bloques matemáticos existentes y reemplazar con placeholders
    #    ($[^$\s]...$ exige contenido no vacío: `$$` suelto NO se protege)
    blocks = []
    def _save(m):
        blocks.append(m.group(0))
        return f'\x00MATH{len(blocks)-1}\x00'

    text = re.sub(r'\$\$[^$]*\$\$', _save, text)
    text = re.sub(r'\$[^$\s][^$]*\$', _save, text)

    # 2. En el texto restante (sin bloques), limpiar delimitadores corruptos
    text = re.sub(r'\$\$\$', '$$', text)
    text = re.sub(r'\$\s*\$', '', text)

    # 3. Envolver comandos LaTeX sueltos en $...$
    #    (?<!\$) evita re-procesar $ recién insertados (corrupción tipo $$\vec{...}).
    if '\\' in text:
        # 3a. Comandos con argumentos {..} y/o sub/superíndices: \frac{1}{2}, \vec{v}, \operatorname{proy}_{AB}
        text = re.sub(
            fr'(?<!\$)\\(?:{_LATEX_WRAP_CMDS})\{{[^{{}}]+\}}(?:\{{[^{{}}]+\}})?(?:(?:[_\^])(?:\{{[^{{}}]*}}|[^\s])?)*',
            r'$\g<0>$', text
        )
        # 3b. Comandos con sub/superíndices sin llaves o desnudos: \int_0^1, \lim_{x\to0}, \partial
        text = re.sub(
            fr'(?<!\$)\\(?:{_LATEX_WRAP_CMDS})(?:(?:[_\^])(?:\{{[^{{}}]*}}|[^\s])?)*[^\s.,;:!?)]*',
            r'$\g<0>$', text
        )

    # 4. Restaurar bloques
    for i, b in enumerate(blocks):
        text = text.replace(f'\x00MATH{i}\x00', b)

    # 5. Espacio defensivo entre bloques en línea contiguos ($a$$b$ → $a$ $b$).
    #    Se protegen los $$...$$ para que el patrón no los rompa (un bloque $$
    #    contiene un '$...$' interno que de otro modo sería capturado).
    display_blocks = []
    def _save_disp(m):
        display_blocks.append(m.group(0))
        return f'\x00DISPLY{len(display_blocks)-1}\x00'
    text = re.sub(r'\$\$[^$]*\$\$', _save_disp, text)
    text = re.sub(r'(\$[^$]+\$)(?=\$[^$]+\$)', r'\1 ', text)
    for i, b in enumerate(display_blocks):
        text = text.replace(f'\x00DISPLY{i}\x00', b)

    return text


def sanitize_latex_string(text: str) -> str:
    """Única función de normalización de LaTeX. Aplica correcciones
    deterministas en un solo pase, sin re-aplicar ni llamar a otros
    sanitizadores.

    Cubre:
    - Decodificación \\uXXXX
    - Reparación de escapes Python corruptos (\x0c→\\f, etc.)
    - Corrección de patrones LaTeX malformados comunes
    - Envolvimiento de comandos sueltos en $...$ (sin tocar los ya envueltos)
    - Limpieza de parásitos (Rpta., triple $, vacíos, etc.)
    """
    if not text:
        return ""

    # 1. Decodificar \\uXXXX escapes unicode literales
    text = re.sub(r'\\u([0-9a-fA-F]{4})', lambda m: chr(int(m.group(1), 16)), text)

    # 2. Restaurar barras en comandos dañados por escapes de control Python
    text = text.replace('\x0c', '\\f')
    text = text.replace('\x0b', '\\v')
    text = text.replace('\x07', '\\a')
    text = text.replace('\x08', '\\b')

    # 3. Corregir patrones comunes malformados
    text = re.sub(r'\\frac\[([^\]]*)\]\[([^\]]*)\]', r'\\frac{\1}{\2}', text)
    text = re.sub(r'\\left\$', r'\\left(', text)
    text = re.sub(r'\\right\$', r'\\right)', text)
    text = re.sub(r'\\left\)', r'\\left(', text)
    text = re.sub(r'\\right\)', r'\\right)', text)

    # 4. Eliminar \big/\Big/\bigg/\Bigg (rompen KaTeX)
    text = re.sub(r'\\[Bb]i(?:g{1,2})[lr]?', '', text)

    # 5. Eliminar envoltorios de matriz malformados
    text = re.sub(r'\\begin\{[BpV]?matrix\}', '', text)
    text = re.sub(r'\\end\{[BpV]?matrix\}', '', text)
    text = re.sub(r'\\[lr](?:floor|ceil)', '', text)

    # 6. \text{, } y \text{ } sobrantes
    text = re.sub(r'\\text\{,\s*\}', ', ', text)
    text = re.sub(r'\\text\{\s*\}', ' ', text)

    # 7. Limpiar $ inyectados dentro de llaves LaTeX: \vec{$v$} → \vec{v}
    text = re.sub(r'\\([a-zA-Z]+)\{\$([^$]+)\$\}', r'\\\1{\2}', text)

    # 8. $$ antes de \right) → quitarlo
    text = re.sub(r'\$\$\\right\)', '\\right)', text)

    # 9. Restaurar barra en comandos que la perdieron
    text = re.sub(
        fr'(?<!\\)({_LATEX_COMMON_CMDS})(?![a-zA-Z])',
        r'\\\1', text
    )

    # 9b. Reemplazar operadores de proyección no estándar por \operatorname
    # (el LLM puede generar \proy, \comp, proy_, comp_ que no son nativos de LaTeX)
    text = re.sub(r'\\proy(?:{\s*([^}]+)\s*})?', r'\\operatorname{proy}_{\1}', text)
    text = re.sub(r'(?<!\\)proy_(?![a-zA-Z])', r'\\operatorname{proy}_', text)
    text = re.sub(r'\\comp(?:{\s*([^}]+)\s*})?', r'\\operatorname{comp}_{\1}', text)
    text = re.sub(r'(?<!\\)comp_(?![a-zA-Z])', r'\\operatorname{comp}_', text)

    # 10. Envolver comandos LaTeX sueltos en $...$ y normalizar delimitadores
    #     (limpia $$$, pares vacíos y separa bloques contiguos con espacio defensivo)
    text = _wrap_unwrapped_latex(text)

    # 11. Remover parásitos comunes (Rpta., guillemets, trailing asteriscos)
    text = text.replace('\u00ab', '').replace('\u00bb', '')
    text = re.sub(r'\s+\(?\s*Rpta\.?\s*:?\s*[A-Za-z0-9)\)\.\-]+\)?\s*$', '', text)
    text = re.sub(r'\s*\*+\s*$', '', text)

    return text


def _sanitize_latex_dict(obj: Any) -> Any:
    """Aplica sanitize_latex_string recursivamente a todos los strings de un
    objeto anidado (dict, list, str)."""
    if isinstance(obj, str):
        return sanitize_latex_string(obj)
    if isinstance(obj, dict):
        return {k: _sanitize_latex_dict(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_sanitize_latex_dict(v) for v in obj]
    return obj


def sanitizar_pregunta_alucinada(pregunta_dict: dict) -> dict:
    """Corrige alucinaciones numéricas en preguntas sintéticas (ej. 'valor de 2')."""
    q_text = pregunta_dict.get("pregunta", "") or pregunta_dict.get("contexto_markdown", "")

    if re.search(r'determine el valor de \d+\b|valor de \d+ es', q_text, re.IGNORECASE):
        q_text = re.sub(
            r'determine el valor de \d+\b',
            r'determine el valor del parámetro $k$',
            q_text,
            flags=re.IGNORECASE,
        )
        if "pregunta" in pregunta_dict:
            pregunta_dict["pregunta"] = q_text
        else:
            pregunta_dict["contexto_markdown"] = q_text

        opciones = pregunta_dict.get("opciones", [])
        if opciones:
            pregunta_dict["opciones"] = [
                re.sub(r'El valor de \d+ es', r'El valor de $k$ es', o, flags=re.IGNORECASE)
                for o in opciones
            ]

    return pregunta_dict


def parse_llm_json_response(raw_response: str) -> dict:
    """Limpia bloques de código markdown, repara escapes inválidos (LaTeX)
    y extrae un diccionario JSON válido de la respuesta del modelo."""
    logger.debug(f"[JSON_PARSER] Analizando respuesta de longitud {len(raw_response) if raw_response else 0} caracteres")
    if not raw_response or not raw_response.strip():
        logger.error("[JSON_PARSER] El texto recibido está completamente vacío.")
        raise ValueError("La respuesta del modelo de IA está vacía.")

    # 0. Reparar escapes LaTeX corruptos antes de cualquier parseo
    raw_response = reparar_escapes_json_latex(raw_response)

    # 1. Eliminar bloques de código markdown ```json ... ```
    cleaned = re.sub(r"^```(?:json)?\s*", "", raw_response.strip(), flags=re.MULTILINE)
    cleaned = re.sub(r"\s*```$", "", cleaned, flags=re.MULTILINE).strip()

    # 2. Intentar extraer el primer bloque de objeto/array JSON
    json_text = cleaned
    json_match = re.search(r'(\{[\s\S]*\}|\[[\s\S]*\])', cleaned)
    if json_match:
        json_text = json_match.group(1)

    # 3. State machine: recorre caracter a caracter.
    #    Dentro de strings JSON: escapa backslashes inválidos y caracteres de control.
    result = []
    in_string = False
    i = 0
    while i < len(json_text):
        ch = json_text[i]

        if not in_string:
            if ch == '"':
                in_string = True
            result.append(ch)
            i += 1
            continue

        # Dentro de un string JSON
        if ch == '\\':
            nxt = json_text[i + 1] if i + 1 < len(json_text) else ''
            if nxt == '"' or nxt == '\\' or nxt == '/':
                result.append(ch); result.append(nxt); i += 2
            elif nxt in 'bfnrt':
                after = json_text[i + 2] if i + 2 < len(json_text) else ''
                if after.isalpha():
                    result.append('\\\\'); i += 1
                else:
                    result.append(ch); result.append(nxt); i += 2
            elif nxt == 'u' and i + 5 < len(json_text) and re.match(r'[0-9a-fA-F]{4}', json_text[i+2:i+6]):
                result.append(json_text[i:i+6]); i += 6
            else:
                result.append('\\\\'); i += 1
        elif ch == '"':
            in_string = False
            result.append(ch); i += 1
        elif ord(ch) < 0x20:
            if ch == '\n': result.append('\\n')
            elif ch == '\r': result.append('\\r')
            elif ch == '\t': result.append('\\t')
            else: result.append(f'\\u{ord(ch):04x}')
            i += 1
        else:
            result.append(ch); i += 1

    sanitized = ''.join(result)

    # 4. Intentar parsear
    try:
        data = json.loads(sanitized)
        logger.info(f"[JSON_PARSER] Éxito al parsear JSON: {len(data.get('preguntas', []))} preguntas extraídas.")
        return _sanitize_latex_dict(data)
    except json.JSONDecodeError as e:
        logger.error(f"[JSON_PARSER ERROR] No se pudo parsear el JSON.")
        logger.error(f"[JSON_PARSER TEXTO CRUDO QUE FALLÓ]:\n>>>\n{raw_response}\n<<<")
        logger.error(f"[JSON_PARSER TEXTO TRAS LIMPIEZA]:\n>>>\n{sanitized}\n<<<")
        json_match = re.search(r"(\{.*\}|\[.*\])", sanitized, re.DOTALL)
        if json_match:
            try:
                fallback = json.loads(json_match.group(1))
                logger.warning(f"[JSON_PARSER] Fallback regex exitoso: {len(fallback.get('preguntas', []))} preguntas.")
                return fallback
            except json.JSONDecodeError:
                pass
        raise ValueError(f"No se pudo extraer un JSON válido de la respuesta de la IA: {str(e)}")

def _deduplicar_preguntas(preguntas: List[Pregunta]) -> List[Pregunta]:
    """Elimina preguntas duplicadas por enunciado normalizado."""
    vistos = set()
    resultado = []
    for p in preguntas:
        texto = (p.pregunta or p.contexto_markdown or "").strip().lower()
        normalizado = re.sub(r'\s+', ' ', texto) if texto else ""
        if normalizado not in vistos:
            vistos.add(normalizado)
            resultado.append(p)
    if len(resultado) < len(preguntas):
        logger.info(f"[DEDUP] Eliminadas {len(preguntas) - len(resultado)} preguntas duplicadas.")
    return resultado


def _limpiar_prefijo_opcion(texto: str) -> str:
    """Elimina prefijos como 'A)', 'a.', '1.', 'A)' del inicio de una opción."""
    return re.sub(r'^[A-Za-z0-9]+[\)\.]\s*', '', texto).strip()


def _tipo_valor(texto: str) -> str:
    """Clasifica el tipo de valor de una opción: 'numero', 'vector', 'expresion', 'otro'."""
    t = texto.strip()
    if re.search(r'\([\d\.\-]+', t):
        return 'vector'
    if re.match(r'^-?\d+(?:[\.,]\d+)?$', t):
        return 'numero'
    if re.match(r'^-?\d+/\d+$', t):
        return 'numero'
    return 'expresion'


def _limpiar_opciones(preguntas: List[Pregunta]) -> List[Pregunta]:
    """Limpia y normaliza las opciones de cada pregunta."""
    resultado = []
    for p in preguntas:
        if not p.opciones or p.tipo == "codigo":
            resultado.append(p)
            continue

        opciones = [_limpiar_prefijo_opcion(o) for o in p.opciones]
        opciones = [o for o in opciones if o]

        if len(opciones) == 4 or (p.tipo == "verdadero_falso" and len(opciones) == 2):
            p.opciones = opciones
            resultado.append(p)
            continue

        if p.tipo == "verdadero_falso":
            if len(opciones) >= 2:
                p.opciones = opciones[:2]
                resultado.append(p)
            continue

        if len(opciones) < 4:
            logger.warning(f"[OPCIONES] Pregunta {p.id} descartada: solo {len(opciones)} opciones.")
            continue

        rc = p.respuesta_correcta
        if isinstance(rc, list):
            idx_correcta = rc[0] if rc else 0
        else:
            idx_correcta = int(rc) if rc is not None else 0

        opcion_correcta = opciones[idx_correcta] if idx_correcta < len(opciones) else opciones[0]
        tipo_correcta = _tipo_valor(opcion_correcta)

        distractores = [o for i, o in enumerate(opciones) if i != idx_correcta]
        if tipo_correcta != 'otro':
            distractores_filtrados = [o for o in distractores if _tipo_valor(o) == tipo_correcta]
            if len(distractores_filtrados) >= 3:
                distractores = distractores_filtrados
            elif len(distractores_filtrados) >= 2:
                mezcla = distractores_filtrados + [o for o in distractores if _tipo_valor(o) != tipo_correcta]
                distractores = mezcla[:3]

        nuevas_opciones = [opcion_correcta] + distractores[:3]
        p.opciones = nuevas_opciones
        p.respuesta_correcta = 0
        resultado.append(p)

    return resultado


def _asignar_origen(preguntas: List[Pregunta], contexto: List[Dict[str, Any]]) -> List[Pregunta]:
    """Asigna origen y fuente_detalle a cada pregunta según disponibilidad de contexto RAG."""
    if contexto and len(contexto) > 0:
        fuente = "Material de referencia del curso"
        for item in contexto:
            if item.get("curso_nombre"):
                fuente = f"Compendio de {item['curso_nombre']}"
                break

        n = len(preguntas)
        num_sinteticas = min(2, max(1, n // 3))
        for i, p in enumerate(preguntas):
            if i < n - num_sinteticas:
                p.origen = "compendio"
                p.fuente_detalle = fuente
            else:
                p.origen = "ia"
                p.fuente_detalle = "Generado sintéticamente por IA con nivel UNI"
    else:
        for p in preguntas:
            p.origen = "ia"
            p.fuente_detalle = "Generado sintéticamente por IA"
    return preguntas


# ─── ENDPOINTS ────────────────────────────────────────────────────────

SYSTEM_MSG_EVALUACION = (
    "Eres un profesor de la UNI (Universidad Nacional de Ingeniería, Perú). "
    "Tu única función es generar preguntas de examen IDÉNTICAS en complejidad a los ejercicios reales proporcionados. "
    "NUNCA simplifiques. Transforma los ejercicios de referencia cambiando solo los valores numéricos. "
    "LaTeX KaTeX ÚNICAMENTE: \\frac, \\vec, \\mathbf, \\overline, \\left(, \\right), \\mid, \\mathbb, \\sqrt, \\alpha, \\beta, \\theta, \\perp, \\in. "
    "PROHIBIDO ABSOLUTO (rompen KaTeX): \\begin, \\end, \\matrix, \\Bmatrix, \\bigg, \\Big, \\rfloor, \\lfloor, \\textbf, \\bar, \\dfrac, \\text. "
    "Rectas vectoriales: '$(2,1) + t(3,n),\\ t \\in \\mathbb{R}$' — NUNCA \\begin{Bmatrix}. "
    "Prosa FUERA de $...$: escribe texto normal entre expresiones math. "
    "Formatea toda expresión matemática en notación KaTeX válida delimitada ÚNICAMENTE por $ para expresiones inline "
    "(ej. $f(x) = \\sin(x)$) o $$ para ecuaciones centradas en bloque. "
    "Queda estrictamente prohibido usar corchetes en lugar de llaves en fracciones (usa siempre \\frac{a}{b}). "
    "Genera un conjunto de N preguntas estrictamente ÚNICAS y DISTINTAS entre sí. "
    "Está prohibido repetir el mismo ejercicio o generar variantes triviales del mismo problema dentro del mismo lote. "
    "INSTRUCCIONES UNIVERSALES DE FORMATO Y ESTRUCTURA (MULTICURSO): "
    "1. SINTAXIS LATEX EN TODO EL EXAMEN: Cualquier fórmula matemática, expresión algebraica, "
    "ecuación, integral, matriz o vector DEBE IR DENTRO DE $...$. "
    "CORRECTO: \"Calcule $\\int_0^1 x^2 dx$\" / \"Determine el valor de $k$\". "
    "PROHIBIDO escribir \\frac, \\sqrt, \\int, \\vec, \\matrix sin $...$. "
    "Usa estrictamente $...$ para matemáticas en línea y $$...$$ para bloques independientes. "
    "NUNCA uses triple dólar ($$$) ni pegues palabras de texto plano a comandos LaTeX "
    "(ejemplo correcto: 'Halle $\\vec{QS}$', incorrecto: 'Halle\\vec{QS}'). "
    "Asegúrate de cerrar todos los delimitadores matemáticos abiertos antes de finalizar cada respuesta. "
    "2. COHERENCIA COMPLETA ENTRE PREGUNTA Y OPCIONES: Si la pregunta pide N variables, "
    "CADA opción DEBE dar la solución completa. "
    "PROHIBIDO etiquetar problemas de cálculo complejo como verdadero/falso. "
    "3. DIVERSIDAD ESTRICTA DE ENUNCIADOS Y PLANTILLAS: Queda PROHIBIDO repetir la misma "
    "plantilla en más de UNA pregunta. Cada pregunta DEBE explorar un subtema distinto. "
    "Alterna entre problemas teóricos, de aplicación directa, numéricos y de interpretación. "
    "REGLA DE AISLAMIENTO DE OPCIONES (CRÍTICO): "
    "1. Si el contexto RAG contiene una página con varios ejercicios, debes elegir ÚNICAMENTE UN ejercicio. "
    "2. El arreglo 'opciones' DEBE CONTENER EXACTAMENTE 4 ELEMENTOS. "
    "3. Queda ESTRICTAMENTE PROHIBIDO concatenar opciones de otros ejercicios vecinos. "
    "4. NO incluyas letras de prefijo como 'A)', 'a.', '1.' dentro del texto de la opción. Pon solo la expresión o respuesta directas. "
    "El campo 'explicacion' DEBE seguir estrictamente esta estructura Markdown con doble salto de línea entre pasos:\n"
    "\n"
    "### Paso 1: Planteamiento e Identificación de Datos\n"
    "[Explicación con fórmulas en $...$]\n"
    "\n"
    "### Paso 2: Desarrollo algebraico detallado\n"
    "[Explicación paso a paso con fórmulas en $...$]\n"
    "\n"
    "### Paso 3: Conclusión\n"
    "[Respuesta final clara]\n"
    "\n"
    "REGLA CRÍTICA PARA LA SOLUCIÓN (explicacion): CADA variable, fórmula o comando LaTeX "
    "(\\vec, \\sqrt, \\frac, \\text, etc.) DEBE estar estrictamente envuelto entre signos de dólar ($ ... $). "
    "Separa siempre con un espacio en blanco los delimitadores de las palabras en español. "
    "CORRECTO: 'La recta $L_1$ pasa por $A=(2,3)$'. INCORRECTO: 'La recta$L_1$pasa por$A$'. "
    "NUNCA generes comandos LaTeX sueltos sin delimitador $. "
    "REGLA ESTRICTA: Queda PROHIBIDO mencionar 'opción 0', 'opción 1', 'opción A', etc. Menciona únicamente el valor o vector solución final. "
    "Responde ÚNICAMENTE con JSON válido, sin texto adicional."
)

@router.post("/evaluaciones/generar", response_model=Evaluacion)
async def generar_evaluacion(config: ConfiguracionEvaluacion, user_data=Depends(get_current_user)):
    """
    RF-APR-02, RF-APR-03, RF-APR-04: Genera una evaluación con IA
    basada en el módulo, temas y configuración del estudiante
    """
    
    user, token = user_data

    if not get_claude():
        raise HTTPException(status_code=500, detail="API Key de Claude no configurada")

    try:
        if len(config.temas) == 1:
            tema_completo = config.temas[0]
        else:
            tema_completo = f"{config.modulo}: {', '.join(config.temas)}"
        contexto = recuperar_contexto_semantico(tema_completo, config.curso_id, config.profesor_id, token)

        print("\n" + "="*50)
        print(f"RAG: Se recuperaron {len(contexto)} fragmentos del PDF.")
        print("="*50 + "\n")

        if config.curso_id in CURSOS_PROGRAMACION_IDS:
            print(f"DEBUG: Activando flujo de PROGRAMACIÓN para curso {config.curso_id}")
            prompt = generar_prompt_programacion(config, contexto)
        else:
            prompt = generar_prompt_teorico(config, contexto)

        # El system prompt va aparte y se cachea: son >2.000 tokens que se
        # reenvían idénticos en cada generación (ver app/core/llm.py).
        raw_content = generar(
            prompt=prompt,
            system=SYSTEM_MSG_EVALUACION,
            max_tokens=16000,
            stream=True,
        )

        data = parse_llm_json_response(raw_content)
        
        if "preguntas" not in data or not data["preguntas"]:
            raise ValueError("No se generaron preguntas válidas")
            
        for p in data["preguntas"]:
            if p.get("tipo") == "codigo":
                if not isinstance(p.get("contexto_markdown"), str):
                    raise ValueError(f"Falta contexto_markdown en la pregunta {p.get('id')}")
                if not isinstance(p.get("input_markdown"), str):
                    raise ValueError(f"Falta input_markdown en la pregunta {p.get('id')}")
                if not isinstance(p.get("output_markdown"), str):
                    raise ValueError(f"Falta output_markdown en la pregunta {p.get('id')}")
        
        preguntas = [
            Pregunta(**sanitizar_pregunta_backend(sanitizar_pregunta_alucinada(p)))
            for p in data["preguntas"]
        ]
        preguntas = _asignar_origen(preguntas, contexto)
        preguntas = _deduplicar_preguntas(preguntas)
        preguntas = _limpiar_opciones(preguntas)
        
        if not preguntas:
            raise ValueError("No se generaron preguntas válidas tras la deduplicación.")
        
        tiempo_estimado = 0
        for p in preguntas:
            if p.tipo == 'codigo':
                tiempo_estimado += 5
            else:
                tiempo_estimado += 2

        evaluacion = Evaluacion(
            curso_id=config.curso_id,
            modulo=config.modulo,
            temas=config.temas,
            preguntas=preguntas,
            tiempo_estimado=tiempo_estimado
        )
        
        return evaluacion
        
    except (json.JSONDecodeError, ValueError) as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error al parsear respuesta de IA: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error al generar evaluación: {str(e)}"
        )

SYSTEM_MSG_TEORICO = (
    "Eres un profesor del Departamento de Ciencias Básicas de la UNI. "
    "Genera EXACTAMENTE 1 pregunta de examen de nivel universitario avanzado. "
    "NUNCA simplifiques. "
    "REGLA CRÍTICA DE LaTeX: TODO símbolo matemático o lógico DEBE estar dentro de $...$. "
    "NUNCA escribas \\neg, \\to, \\equiv, \\lor, \\land, \\Delta, \\leftrightarrow fuera de $...$. "
    "CORRECTO: 'Sean $p \\equiv [\\neg q \\to r]$ y $M \\equiv [p \\lor q]$' "
    "INCORRECTO: 'Sean p \\equiv [\\neg q \\to r] y M \\equiv [p \\lor q]' "
    "LaTeX KaTeX ÚNICAMENTE: \\frac, \\vec, \\mathbf, \\overline, \\left(, \\right), \\mid, \\mathbb, \\sqrt, \\alpha, \\beta, \\theta, \\perp, \\in, \\neg, \\to, \\equiv, \\lor, \\land, \\leftrightarrow, \\Delta. "
    "PROHIBIDO ABSOLUTO (rompen KaTeX): \\begin, \\end, \\matrix, \\Bmatrix, \\bigg, \\Big, \\rfloor, \\lfloor, \\textbf, \\bar, \\dfrac, \\text. "
    "Rectas vectoriales: '$(2,1) + t(3,n),\\ t \\in \\mathbb{R}$' — NUNCA \\begin{Bmatrix}. "
    "Prosa FUERA DE $...$: 'La recta $L_1$ pasa por $A=(2,3)$' — NUNCA '$L_1 \\text{pasa por} A$'. "
    "Formatea toda expresión matemática en notación KaTeX válida delimitada ÚNICAMENTE por $ para expresiones inline "
    "(ej. $f(x) = \\sin(x)$) o $$ para ecuaciones centradas en bloque. "
    "Queda estrictamente prohibido usar corchetes en lugar de llaves en fracciones (usa siempre \\frac{a}{b}). "
    "Genera un conjunto de N preguntas estrictamente ÚNICAS y DISTINTAS entre sí. "
    "Está prohibido repetir el mismo ejercicio o generar variantes triviales del mismo problema dentro del mismo lote. "
    "INSTRUCCIONES UNIVERSALES DE FORMATO Y ESTRUCTURA (MULTICURSO): "
    "1. SINTAXIS LATEX EN TODO EL EXAMEN: Cualquier fórmula matemática, expresión algebraica, ecuación, "
    "integral, matriz o vector DEBE IR DENTRO DE $...$. CORRECTO: \"Calcule $\\int_0^1 x^2 dx$\" / \"Determine el valor de $k$\". "
    "PROHIBIDO escribir \\frac, \\sqrt, \\int, \\vec, \\matrix sin $...$. "
    "Usa estrictamente $...$ para matemáticas en línea y $$...$$ para bloques independientes. "
    "NUNCA uses triple dólar ($$$) ni pegues palabras de texto plano a comandos LaTeX "
    "(ejemplo correcto: 'Halle $\\vec{QS}$', incorrecto: 'Halle\\vec{QS}'). "
    "Asegúrate de cerrar todos los delimitadores matemáticos abiertos antes de finalizar cada respuesta. "
    "2. COHERENCIA COMPLETA: Si la pregunta pide N variables, CADA opción DEBE dar la solución completa. "
    "PROHIBIDO etiquetar problemas de cálculo complejo como verdadero/falso. "
    "3. DIVERSIDAD ESTRICTA: Queda PROHIBIDO repetir la misma plantilla en más de UNA pregunta. "
    "Cada pregunta DEBE explorar un subtema distinto. "
    "Alterna entre problemas teóricos, de aplicación directa, numéricos y de interpretación. " 
    "REGLA DE AISLAMIENTO DE OPCIONES (CRÍTICO): "
    "1. Si el contexto RAG contiene una página con varios ejercicios, debes elegir ÚNICAMENTE UN ejercicio. "
    "2. El arreglo 'opciones' DEBE CONTENER EXACTAMENTE 4 ELEMENTOS. "
    "3. Queda ESTRICTAMENTE PROHIBIDO concatenar opciones de otros ejercicios vecinos. "
    "4. NO incluyas letras de prefijo como 'A)', 'a.', '1.' dentro del texto de la opción. Pon solo la expresión o respuesta directas. "
    "El campo 'explicacion' DEBE seguir estrictamente esta estructura Markdown con doble salto de línea entre pasos:\n"
    "\n"
    "### Paso 1: Planteamiento e Identificación de Datos\n"
    "[Explicación con fórmulas en $...$]\n"
    "\n"
    "### Paso 2: Desarrollo algebraico detallado\n"
    "[Explicación paso a paso con fórmulas en $...$]\n"
    "\n"
    "### Paso 3: Conclusión\n"
    "[Respuesta final clara]\n"
    "\n"
    "REGLA CRÍTICA PARA LA SOLUCIÓN (explicacion): CADA variable, fórmula o comando LaTeX "
    "(\\vec, \\sqrt, \\frac, \\text, etc.) DEBE estar estrictamente envuelto entre signos de dólar ($ ... $). "
    "Separa siempre con un espacio en blanco los delimitadores de las palabras en español. "
    "CORRECTO: 'La recta $L_1$ pasa por $A=(2,3)$'. INCORRECTO: 'La recta$L_1$pasa por$A$'. "
    "NUNCA generes comandos LaTeX sueltos sin delimitador $. "
    "REGLA ESTRICTA: Queda PROHIBIDO mencionar 'opción 0', 'opción 1', 'opción A', etc. Menciona únicamente el valor o vector solución final. "
    "Responde SIEMPRE en el formato de texto plano con marcadores @@...@@ que se te indica. NUNCA uses JSON."
)

def _prompt_una_pregunta_teorica(
    idx: int,
    temas_str: str,
    tipo: str,
    contexto_bloque: str,
) -> str:
    tipos_map = {
        "multiple": "selección múltiple (varias respuestas correctas)",
        "unica": "única respuesta correcta",
        "verdadero_falso": "verdadero o falso",
    }
    tipos_rota = ["unica", "unica", "multiple", "unica", "verdadero_falso"]
    tipo_real = tipo if tipo != "mixta" else tipos_rota[idx % len(tipos_rota)]
    tipo_desc = tipos_map.get(tipo_real, "única respuesta correcta")

    if tipo_real == "multiple":
        correcta_instr = "(índices de las opciones correctas separados por coma, ej: 0,2)"
    elif tipo_real == "verdadero_falso":
        correcta_instr = "(0 si es Verdadero, 1 si es Falso). Las 2 opciones deben ser exactamente: Verdadero y Falso."
    else:
        correcta_instr = "(un solo número del 0 al 3 indicando la opción correcta)"

    prompt = rf"""
{contexto_bloque}
TEMA: {temas_str}
TIPO DE PREGUNTA: {tipo_desc}
NÚMERO DE PREGUNTA: {idx + 1}

ENFOQUE OBLIGATORIO PARA ESTA PREGUNTA (debe ser distinto al de las demás
preguntas del examen, que se generan en paralelo): {_enfoque_para_indice(idx)}.
No reutilices el mismo tipo de figura, situación o nombres de variables que
usarías para un enfoque distinto (ej. evita repetir "sea el cuadrado ABCD..."
con solo las letras cambiadas).

{DIRECTIVA_VARIABILIDAD_PREGUNTAS}

### ESTÁNDAR DE DIFICULTAD OBLIGATORIO ###
- Mínimo 4 datos numéricos concretos en el enunciado.
- Mínimo 4 pasos algebraicos encadenados para resolver.
- Al menos 2 incógnitas a determinar.
- Contexto geométrico complejo (intersecciones, razones, proyecciones, distancias).
- 3 opciones incorrectas que corresponden a errores de cálculo específicos.
- PROHIBIDO: preguntas de 1 paso, definiciones, fórmulas directas.

FORMATO LaTeX — PLANTILLA OBLIGATORIA (KaTeX):
REGLA #1 — TODO símbolo matemático o lógico DENTRO de $...$:
- Lógica: CORRECTO "Sean $M \equiv [\neg p \to q]$ y $N \equiv [p \lor r]$" / INCORRECTO "Sean M \equiv [\neg p \to q]"
- Lógica: CORRECTO "Analice si $M \to (N \leftrightarrow P)$ es una tautología" / INCORRECTO "Analice si M \to (N \leftrightarrow P)"
- Recta vectorial: "$L: (2,1) + t(3,-4)$" con $t \in \mathbb{{R}}$ como texto aparte.
- Parábola: "$\frac{{(x-2)^2}}{{8}} = y-1$" o "$(y-k)^2 = 4p(x-h)$".
- Punto: "$A = (2, 3)$". Vector: "$\vec{{v}} = (3, -4)$".
- Prosa SIEMPRE fuera de $...$: CORRECTO "La recta $L_1$ pasa por $A=(2,3)$" / INCORRECTO "$L_1 \text{{pasa por}} A$".
PROHIBIDO ABSOLUTO (rompen el render): \begin, \end, \matrix, \Bmatrix, \pmatrix, \big, \bigg, \Big, \Bigg, \rfloor, \lfloor, \backslash, \{{ , \}} para conjuntos, \text con comas.
NO uses notación de conjunto con llaves. Para una recta escribe solo "$L: P + t\vec{{d}}$".

FORMATO DE RESPUESTA — TEXTO PLANO CON MARCADORES (NO uses JSON, NO uses markdown):
Copia EXACTAMENTE esta estructura, rellenando el contenido después de cada marcador.
El LaTeX va tal cual, con un solo backslash, sin escapar nada.

@@PREGUNTA@@
(enunciado completo con todos los datos y LaTeX)
@@OPCION@@
(opción A)
@@OPCION@@
(opción B)
@@OPCION@@
(opción C)
@@OPCION@@
(opción D)
@@CORRECTA@@
{correcta_instr}
@@EXPLICACION@@
### Paso 1: Planteamiento e Identificación de Datos
Explica qué datos da el problema y qué fórmulas se usarán con $...$ cuando corresponda.

### Paso 2: Desarrollo algebraico detallado
Muestra cada operación paso a paso con $...$ LaTeX. Incluye sustituciones y cálculos.

### Paso 3: Conclusión
Indica el resultado final. PROHIBIDO mencionar 'opción 0', 'opción 1', etc. Solo el valor solución.
@@FIN@@

REGLAS: pon exactamente 4 marcadores @@OPCION@@ (o 2 si es verdadero/falso). No añadas texto fuera de los marcadores.
REGLA DE AISLAMIENTO DE OPCIONES (CRÍTICO):
1. Si el contexto RAG tiene varios ejercicios, elige ÚNICAMENTE UNO.
2. Debes escribir EXACTAMENTE 4 opciones (o 2 para verdadero/falso).
3. ESTRICTAMENTE PROHIBIDO mezclar opciones de otros ejercicios.
4. NO uses prefijos como 'A)', 'a.', '1.' en las opciones. Solo la expresión o respuesta directa.
"""
    return prompt, tipo_real


def sanitizar_pregunta_backend(p: dict) -> dict:
    """Solo valida coherencia tipo/opciones. El LaTeX ya se sanitizó UNA
    VEZ en parse_llm_json_response / _parsear_pregunta_delimitada — no se
    reaplica aquí (evita doble-envolvimiento y $ desbalanceados)."""
    opciones = p.get("opciones") or p.get("options")
    tipo = str(p.get("tipo") or p.get("questionType") or "").lower()
    num_opts = len(opciones) if opciones else 0
    if num_opts > 2 and tipo in ("verdadero_falso", "true_false"):
        p["tipo"] = "unica"
        p["questionType"] = "multiple_choice"
    return p


def _parsear_pregunta_delimitada(texto: str, idx: int, tipo_real: str) -> dict:
    """Parsea la respuesta con marcadores @@...@@. No usa JSON: el LaTeX pasa intacto."""
    texto = reparar_escapes_json_latex(texto)
    partes = re.split(r'@@(\w+)@@', texto)

    pregunta_txt = ""
    opciones: List[str] = []
    correcta_raw = ""
    explicacion = ""

    for i in range(1, len(partes) - 1, 2):
        clave = partes[i].strip().upper()
        valor = partes[i + 1].strip()
        if clave == "PREGUNTA":
            pregunta_txt = valor
        elif clave == "OPCION":
            if valor:
                opciones.append(valor)
        elif clave == "CORRECTA":
            correcta_raw = valor
        elif clave == "EXPLICACION":
            explicacion = valor

    if not pregunta_txt or len(opciones) < 2:
        raise ValueError(f"Respuesta incompleta: pregunta={bool(pregunta_txt)}, opciones={len(opciones)}")

    numeros = re.findall(r'\d+', correcta_raw)
    if tipo_real == "multiple":
        respuesta_correcta: Any = [int(n) for n in numeros] if numeros else [0]
    else:
        respuesta_correcta = int(numeros[0]) if numeros else 0

    data = {
        "id": idx + 1,
        "pregunta": pregunta_txt,
        "tipo": tipo_real,
        "opciones": opciones,
        "respuesta_correcta": respuesta_correcta,
        "explicacion": explicacion,
    }
    return _sanitize_latex_dict(data)


async def _generar_una_pregunta(idx: int, prompt: str, tipo_real: str) -> dict:
    """Genera 1 pregunta en texto plano con marcadores. Reintenta si la estructura falla."""
    loop = asyncio.get_running_loop()

    def _call():
        return generar(prompt=prompt, system=SYSTEM_MSG_TEORICO, max_tokens=4000)

    ultimo_error = None
    for intento in range(3):
        raw = await loop.run_in_executor(None, _call)
        try:
            return _parsear_pregunta_delimitada(raw, idx, tipo_real)
        except (ValueError, IndexError) as e:
            ultimo_error = e
            print(f"Pregunta {idx+1} intento {intento+1} falló: {e}. Reintentando...")

    raise ultimo_error or ValueError("No se pudo generar la pregunta")


@router.post("/evaluaciones/generar-stream")
async def generar_evaluacion_stream(config: ConfiguracionEvaluacion, user_data=Depends(get_current_user)):
    """Genera cada pregunta en paralelo (1 llamada por pregunta) y las envía por SSE conforme llegan."""
    user, token = user_data

    logger.info("=" * 60)
    logger.info(f"PASO 1: Nueva petición recibida | curso_id={config.curso_id}, modulo='{config.modulo}', "
                f"temas={config.temas}, num_preguntas={config.num_preguntas}")

    if not get_claude():
        logger.error("PASO 1 ERROR: cliente de Claude no inicializado - API Key no configurada")
        raise HTTPException(status_code=500, detail="API Key de Claude no configurada")

    try:
        logger.info("PASO 2: Buscando contexto semántico / sílabo (RAG)...")
        es_programacion = config.curso_id in CURSOS_PROGRAMACION_IDS
        tema_completo = config.temas[0] if len(config.temas) == 1 else f"{config.modulo}: {', '.join(config.temas)}"
        contexto = recuperar_contexto_semantico(tema_completo, config.curso_id, config.profesor_id, token)
        temas_str = config.temas[0] if len(config.temas) == 1 else ', '.join(config.temas)

        contexto_bloque = ""
        if contexto:
            contenidos = [c.get("contenido", "") for c in contexto]
            contexto_str = "\n\n---\n".join(contenidos)
            contexto_bloque = (
                f"### EJERCICIOS REALES DE EXÁMENES UNI — REFERENCIA OBLIGATORIA ###\n"
                f"{contexto_str}\n"
                f"### FIN DE REFERENCIA ###\n\n"
                f"Transforma estos ejercicios: misma estructura y dificultad, solo cambia valores numéricos.\n"
            )
            logger.info(f"PASO 2 COMPLETADO: {len(contexto)} fragmentos recuperados ({len(contexto_str)} caracteres).")
        else:
            logger.warning("PASO 2 ALERTA: No se recuperó contexto RAG. Continuando sin él...")

        logger.info("PASO 3: Verificando cliente de Claude...")
        if not get_claude():
            logger.error("PASO 3 ERROR: CLAUDE_GEN_API_KEY no está configurada en variables de entorno.")
            raise HTTPException(status_code=500, detail="Falta configuración de API Key de Claude en el servidor.")
        logger.info(f"PASO 3 OK: API Key presente (primeros caracteres: {api_key[:8]}...)")

    except Exception as e:
        stack_trace = traceback.format_exc()
        logger.error(f"💥 ERROR CRÍTICO PRE-STREAMING (HTTP 500):\n{stack_trace}")
        logger.info("=" * 60)
        raise HTTPException(
            status_code=500,
            detail=f"Error interno al generar la evaluación con IA: {str(e)}"
        )

    async def event_generator() -> AsyncGenerator[str, None]:
        logger.info("PASO 4: Iniciando streaming SSE event_generator...")
        try:
            if es_programacion:
                logger.info("PASO 5: Invocando API de OpenAI (flujo programación)...")
                cfg1 = ConfiguracionEvaluacion(
                    curso_id=config.curso_id, modulo=config.modulo, temas=config.temas,
                    num_preguntas=config.num_preguntas, observaciones=config.observaciones,
                    tipo_evaluacion=config.tipo_evaluacion,
                )
                prompt_prog = generar_prompt_programacion(cfg1, contexto)
                loop = asyncio.get_running_loop()
                def _call_prog():
                    return generar(
                        prompt=prompt_prog,
                        system="Eres un arquitecto de software senior. Responde ÚNICAMENTE con JSON válido, sin texto adicional ni bloques de código.",
                        max_tokens=6000,
                    )

                raw = await loop.run_in_executor(None, _call_prog)
                logger.info(f"PASO 5 COMPLETADO: Respuesta cruda recibida ({len(raw)} caracteres).")
                logger.info("PASO 6: Parseando JSON de respuesta...")
                data = parse_llm_json_response(raw)
                logger.info(f"PASO 6 COMPLETADO: {len(data.get('preguntas', []))} preguntas parseadas.")

                preguntas = [
                    Pregunta(**sanitizar_pregunta_backend(sanitizar_pregunta_alucinada(p)))
                    for p in data.get("preguntas", [])
                ]
                preguntas = _asignar_origen(preguntas, contexto)
                preguntas = _deduplicar_preguntas(preguntas)
                preguntas = _limpiar_opciones(preguntas)

                if preguntas:
                    preguntas_dicts = [p.model_dump() for p in preguntas]
                    data["preguntas"] = preguntas_dicts

                yield f"data: {json.dumps({'done': True, 'result': data})}\n\n"
                return

            logger.info(f"PASO 5: Generando {config.num_preguntas} preguntas teóricas en paralelo...")
            prompts_tipos = [
                _prompt_una_pregunta_teorica(i, temas_str, config.tipo_evaluacion, contexto_bloque)
                for i in range(config.num_preguntas)
            ]

            preguntas: List[dict] = [None] * config.num_preguntas
            tareas = [_generar_una_pregunta(i, p, t) for i, (p, t) in enumerate(prompts_tipos)]

            total_errores = 0
            for coro in asyncio.as_completed(tareas):
                try:
                    pregunta = await coro
                    pregunta = sanitizar_pregunta_backend(sanitizar_pregunta_alucinada(pregunta))
                    idx = pregunta.get("id", 1) - 1
                    preguntas[idx] = pregunta
                    logger.info(f"PASO 5 PROGRESO: Pregunta {idx + 1}/{config.num_preguntas} generada.")
                    yield f"data: {json.dumps({'pregunta': pregunta, 'total': config.num_preguntas})}\n\n"
                except Exception as e:
                    total_errores += 1
                    logger.error(f"PASO 5 ERROR generando pregunta: {type(e).__name__}: {e}")
                    logger.error(traceback.format_exc())
                    yield f"data: {json.dumps({'advertencia': f'Una pregunta falló: {str(e)}'})}\n\n"

            preguntas_ok = [p for p in preguntas if p is not None]
            if not preguntas_ok:
                logger.error("PASO 5 ERROR: No se pudo generar ninguna pregunta.")
                yield f"data: {json.dumps({'error': 'No se pudo generar ninguna pregunta'})}\n\n"
                return

            preguntas_obj = [
                Pregunta(**sanitizar_pregunta_backend(sanitizar_pregunta_alucinada(p)))
                for p in preguntas_ok
            ]
            preguntas_obj = _asignar_origen(preguntas_obj, contexto)
            preguntas_obj = _deduplicar_preguntas(preguntas_obj)
            preguntas_obj = _limpiar_opciones(preguntas_obj)
            preguntas_ok = [p.model_dump() for p in preguntas_obj]

            logger.info(f"PASO 5 COMPLETADO: {len(preguntas_ok)}/{config.num_preguntas} preguntas generadas "
                        f"({total_errores} errores).")

            resultado = {
                "curso_id": config.curso_id,
                "modulo": config.modulo,
                "temas": config.temas,
                "preguntas": preguntas_ok,
                "tiempo_estimado": len(preguntas_ok) * 5,
            }
            yield f"data: {json.dumps({'done': True, 'result': resultado})}\n\n"

        except Exception as stream_err:
            stack_trace = traceback.format_exc()
            logger.error(f"❌ ERROR DENTRO DEL GENERADOR STREAM:\n{stack_trace}")
            yield f"data: {json.dumps({'error': str(stream_err)})}\n\n"

    logger.info("PASO 4 COMPLETADO: StreamingResponse iniciado.")
    logger.info("=" * 60)
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"}
    )

@router.post("/evaluaciones/evaluar", response_model=ResultadoEvaluacion)
async def evaluar_respuestas(
    evaluacion: Evaluacion,
    envio: EnvioEvaluacion
):
    """
    Evalúa las respuestas del estudiante y genera retroalimentación
    """
    
    respuestas_correctas = 0
    detalles = []
    
    preguntas_map = {p.id: p for p in evaluacion.preguntas}
    
    for respuesta in envio.respuestas:
        pregunta = preguntas_map.get(respuesta.pregunta_id)
        
        if not pregunta:
            continue
        
        es_correcta = False
        if pregunta.tipo == 'codigo':
            es_correcta = str(respuesta.respuesta).strip() == str(pregunta.respuesta_correcta).strip()
        elif isinstance(pregunta.respuesta_correcta, list):
            es_correcta = set(respuesta.respuesta) == set(pregunta.respuesta_correcta)
        else:
            es_correcta = respuesta.respuesta == pregunta.respuesta_correcta
        
        if es_correcta:
            respuestas_correctas += 1
        
        detalles.append({
            "pregunta_id": respuesta.pregunta_id,
            "pregunta": pregunta.pregunta if pregunta.pregunta else pregunta.contexto_markdown,
            "pregunta_tipo": pregunta.tipo,
            "respuesta_estudiante": respuesta.respuesta,
            "respuesta_correcta": pregunta.respuesta_correcta,
            "es_correcta": es_correcta,
            "explicacion": pregunta.explicacion,
            "opciones": pregunta.opciones
        })
    
    total = len(envio.respuestas)
    porcentaje = (respuestas_correctas / total * 100) if total > 0 else 0
    
    retroalimentacion = await generar_retroalimentacion(
        evaluacion, detalles, porcentaje
    )
    
    return ResultadoEvaluacion(
        puntaje=respuestas_correctas,
        total=total,
        porcentaje=round(porcentaje, 2),
        respuestas_correctas=respuestas_correctas,
        respuestas_incorrectas=total - respuestas_correctas,
        detalles=detalles,
        retroalimentacion=retroalimentacion
    )

async def generar_retroalimentacion(
    evaluacion: Evaluacion,
    detalles: List[Dict],
    porcentaje: float
) -> str:
    """
    RF-APR-05: Genera retroalimentación personalizada con IA
    basada en los resultados del estudiante
    """
    
    if not get_claude():
        return "Retroalimentación no disponible"

    temas_dificultad = []
    for detalle in detalles:
        if not detalle["es_correcta"]:
            temas_dificultad.append(detalle["pregunta"])

    prompt = f"""Eres un tutor académico experto. Un estudiante acaba de completar una evaluación sobre {evaluacion.modulo}.

Resultados:
- Puntaje: {porcentaje:.1f}%
- Temas evaluados: {', '.join(evaluacion.temas)}

Preguntas con dificultad:
{chr(10).join(f'- {t}' for t in temas_dificultad) if temas_dificultad else 'Ninguna'}

Proporciona:
1. Retroalimentación motivacional y constructiva (2-3 líneas)
2. Áreas específicas a reforzar (si aplica)
3. Recomendaciones de estudio personalizadas
4. Recursos sugeridos (temas específicos para repasar)

Sé conciso, positivo y específico. Máximo 200 palabras.
Para cualquier fórmula matemática, usa la sintaxis de LaTeX: $...$ para fórmulas en línea y $$...$$ para bloques. No uses `(...)`.
"""

    try:
        return generar(prompt=prompt, max_tokens=1500)
    except Exception:
        return f"Retroalimentación automática: Has obtenido un {porcentaje:.1f}%. {'¡Excelente trabajo!' if porcentaje >= 70 else 'Sigue practicando para mejorar.'}"

@router.get("/evaluaciones/test")
async def test_claude():
    """Endpoint de prueba para verificar que la generación con Claude funciona."""

    if not get_claude():
        return {"status": "error", "message": "API Key de Claude no configurada"}

    try:
        texto = generar(
            prompt="Di 'Hola, UniVia está listo para generar evaluaciones!'",
            max_tokens=100,
        )
        return {
            "status": "success",
            "message": f"Claude ({MODELO_GENERACION}) funcionando correctamente",
            "response": texto,
        }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }