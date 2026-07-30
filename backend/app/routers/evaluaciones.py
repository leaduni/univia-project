import os
import json
import re
import asyncio
import logging
import traceback
import sys

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional, Dict, Any, Union, AsyncGenerator
from openai import OpenAI
from dotenv import load_dotenv
load_dotenv()

from app.rag.retriever import SyllabusRetriever

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

def get_retriever() -> Optional[SyllabusRetriever]:
    """Inicializa el retriever de RAG de forma diferida (lazy) y reutilizable."""
    global _retriever
    if _retriever is None:
        try:
            _retriever = SyllabusRetriever()
        except Exception as e:
            print(f"Error al inicializar SyllabusRetriever: {e}")
            return None
    return _retriever

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
openai_client = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None

OPENAI_MODEL = "gpt-4o-mini"

# Modelos de datos
class ConfiguracionEvaluacion(BaseModel):
    """Configuración previa para la evaluación"""
    curso_id: int
    modulo: str
    temas: List[str]
    num_preguntas: int = 5
    observaciones: Optional[str] = None
    tipo_evaluacion: str = "mixta"

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

# Lista de IDs de cursos de programación
CURSOS_PROGRAMACION_IDS = [14, 23, 30, 36, 43, 47, 49]

def obtener_nombre_curso(curso_id: int) -> Optional[str]:
    """Resuelve el nombre del curso a partir de su ID consultando la tabla 'cursos'.

    Se usa para recuperar contexto por NOMBRE de curso: como cada curso existe
    varias veces (una fila por carrera), el material ingestado bajo un único
    curso_id debe poder recuperarse para todas las variantes con el mismo nombre.
    """
    try:
        from app.core.database import get_supabase
        supabase = get_supabase()
        respuesta = supabase.table("cursos").select("name").eq("id", curso_id).limit(1).execute()
        if respuesta.data:
            return respuesta.data[0]["name"]
    except Exception as e:
        print(f"Error al obtener el nombre del curso {curso_id}: {e}")
    return None

def recuperar_contexto_semantico(tema_consulta: str, curso_id: int) -> List[str]:
    """Usa el SyllabusRetriever del módulo RAG para buscar los fragmentos más relevantes del curso.

    Recupera el contexto filtrando por NOMBRE de curso (no por curso_id), de modo que
    un mismo compendio/examen sirva a todas las variantes del curso por carrera.
    """
    retriever = get_retriever()
    if not retriever:
        return []

    curso_nombre = obtener_nombre_curso(curso_id)
    if not curso_nombre:
        print(f"No se pudo resolver el nombre del curso {curso_id}; se omite el filtro por nombre.")

    try:
        resultados = retriever.buscar_contexto_por_nombre(
            tema_consulta,
            curso_nombre=curso_nombre,
            limit=4,
            umbral_similitud=0.1,
        )
        return [item["contenido"] for item in resultados]

    except Exception as e:
        print(f"Error al recuperar contexto: {e}")
        return []

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
        contexto_str = "\n\n---\n".join(contexto_recuperado)
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

FORMATO LaTeX — KaTeX COMPATIBLE ÚNICAMENTE:
COMANDOS PERMITIDOS: \frac, \vec, \mathbf, \overline, \left(, \right), \mid, \mathbb, \sqrt, \cdot, \times, \alpha, \beta, \theta, \pi, \perp, \parallel, \in, \mathbb{{R}}, \leq, \geq, \neq, \pm
COMANDOS PROHIBIDOS (rompen KaTeX): \begin, \end, \matrix, \Bmatrix, \bigg, \Big, \bigr, \bigl, \rfloor, \lfloor, \textbf, \bar, \dfrac, \text
- Rectas vectoriales: "$L: (2,1) + t(3,n),\ t \in \mathbb{{R}}$" — SIN \begin{{Bmatrix}}, SIN \bigg, SIN \rfloor
- Prosa FUERA de $...$: CORRECTO: "La recta $L_1$ pasa por $A=(2,3)$" / INCORRECTO: "$L_1 \text{{pasa por}} A$"
- Segmentos: $\overline{{AC}}$ (no \bar{{AC}})
- Vectores: $\vec{{v}}$ o $\mathbf{{v}}$ (no \textbf)
- Fracciones: $\frac{{p}}{{q}}$ (no \dfrac)
- Módulos: $|\vec{{v}}| = 3$
- Coordenadas: $A = (2, 1)$

RESPONDE ÚNICAMENTE con este JSON:
{{
  "preguntas": [
    {{
      "id": 1,
      "pregunta": "enunciado completo y largo con todos los datos",
      "tipo": "unica|multiple|verdadero_falso",
      "opciones": ["opción A", "opción B", "opción C", "opción D"],
      "respuesta_correcta": 0,
      "explicacion": "solución paso a paso detallada"
    }}
  ]
}}

REGLAS JSON: "unica" → respuesta_correcta es índice 0-3. "multiple" → lista [0,2]. "verdadero_falso" → opciones ["Verdadero","Falso"].
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
        contexto_str = "\n\n---\n".join(contexto_recuperado)
        prompt += f"""
Contexto (Ejemplos de problemas o material de referencia):
A continuación tienes material de referencia para que el estilo, nivel de dificultad y tipo de reto se parezca al material del curso:
---
{contexto_str}
---
Utiliza este contexto como inspiración para formular el reto de código. No copies exactamente, pero mantén la misma temática y nivel.
"""

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

def parse_llm_json_response(raw_response: str) -> dict:
    """Limpia bloques de código markdown, repara escapes inválidos (LaTeX)
    y extrae un diccionario JSON válido de la respuesta del modelo."""
    logger.debug(f"[JSON_PARSER] Analizando respuesta de longitud {len(raw_response) if raw_response else 0} caracteres")
    if not raw_response or not raw_response.strip():
        logger.error("[JSON_PARSER] El texto recibido está completamente vacío.")
        raise ValueError("La respuesta del modelo de IA está vacía.")

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
                # Escapes siempre válidos
                result.append(ch); result.append(nxt); i += 2
            elif nxt in 'bfnrt':
                # \b \f \n \r \t son válidos SOLO si no hay más letras después
                # (si hay → es comando LaTeX como \beta, \frac, \rightarrow…)
                after = json_text[i + 2] if i + 2 < len(json_text) else ''
                if after.isalpha():
                    result.append('\\\\'); i += 1  # LaTeX cmd → escapar backslash
                else:
                    result.append(ch); result.append(nxt); i += 2
            elif nxt == 'u' and i + 5 < len(json_text) and re.match(r'[0-9a-fA-F]{4}', json_text[i+2:i+6]):
                # \uXXXX válido
                result.append(json_text[i:i+6]); i += 6
            else:
                # Cualquier otra cosa (\vec, \perp, \alpha, \p, \s…) → escapar backslash
                result.append('\\\\'); i += 1
        elif ch == '"':
            in_string = False
            result.append(ch); i += 1
        elif ord(ch) < 0x20:
            # Carácter de control literal dentro del string → escapar
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
        return data
    except json.JSONDecodeError as e:
        logger.error(f"[JSON_PARSER ERROR] No se pudo parsear el JSON.")
        logger.error(f"[JSON_PARSER TEXTO CRUDO QUE FALLÓ]:\n>>>\n{raw_response}\n<<<")
        logger.error(f"[JSON_PARSER TEXTO TRAS LIMPIEZA]:\n>>>\n{sanitized}\n<<<")
        # Último recurso: buscar cualquier {…} o […] en el texto limpio
        json_match = re.search(r"(\{.*\}|\[.*\])", sanitized, re.DOTALL)
        if json_match:
            try:
                fallback = json.loads(json_match.group(1))
                logger.warning(f"[JSON_PARSER] Fallback regex exitoso: {len(fallback.get('preguntas', []))} preguntas.")
                return fallback
            except json.JSONDecodeError:
                pass
        raise ValueError(f"No se pudo extraer un JSON válido de la respuesta de la IA: {str(e)}")

@router.post("/evaluaciones/generar", response_model=Evaluacion)
async def generar_evaluacion(config: ConfiguracionEvaluacion):
    """
    RF-APR-02, RF-APR-03, RF-APR-04: Genera una evaluación con IA
    basada en el módulo, temas y configuración del estudiante
    """
    
    if not openai_client:
        raise HTTPException(status_code=500, detail="API Key de OpenAI no configurada")

    try:
        # 1. Recuperar contexto semántico (RAG)
        # Si hay un solo tema, buscar directamente por ese tema para máxima precisión
        if len(config.temas) == 1:
            tema_completo = config.temas[0]
        else:
            tema_completo = f"{config.modulo}: {', '.join(config.temas)}"
        contexto = recuperar_contexto_semantico(tema_completo, config.curso_id)

        print("\n" + "="*50)
        print(f"RAG: Se recuperaron {len(contexto)} fragmentos del PDF.")
        print("="*50 + "\n")

        # Decidir qué prompt usar según el tipo de curso
        if config.curso_id in CURSOS_PROGRAMACION_IDS:
            print(f"DEBUG: Activando flujo de PROGRAMACIÓN para curso {config.curso_id}")
            prompt = generar_prompt_programacion(config, contexto)
        else:
            prompt = generar_prompt_teorico(config, contexto)

        # Generar contenido con OpenAI (streaming)
        stream = openai_client.chat.completions.create(
            model=OPENAI_MODEL,
            max_tokens=16000,
            stream=True,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "Eres un profesor de la UNI (Universidad Nacional de Ingeniería, Perú). "
                        "Tu única función es generar preguntas de examen IDÉNTICAS en complejidad a los ejercicios reales proporcionados. "
                        "NUNCA simplifiques. Transforma los ejercicios de referencia cambiando solo los valores numéricos. "
                        "LaTeX KaTeX ÚNICAMENTE: \\frac, \\vec, \\mathbf, \\overline, \\left(, \\right), \\mid, \\mathbb, \\sqrt, \\alpha, \\beta, \\theta, \\perp, \\in. "
                        "PROHIBIDO ABSOLUTO (rompen KaTeX): \\begin, \\end, \\matrix, \\Bmatrix, \\bigg, \\Big, \\rfloor, \\lfloor, \\textbf, \\bar, \\dfrac, \\text. "
                        "Rectas vectoriales: '$(2,1) + t(3,n),\\ t \\in \\mathbb{R}$' — NUNCA \\begin{Bmatrix}. "
                        "Prosa FUERA de $...$: escribe texto normal entre expresiones math. "
                        "Responde ÚNICAMENTE con JSON válido, sin texto adicional."
                    )
                },
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.3,
        )

        raw_content = ""
        for chunk in stream:
            delta = chunk.choices[0].delta.content
            if delta:
                raw_content += delta

        # Limpiar y parsear la respuesta
        data = parse_llm_json_response(raw_content)
        
        # Validar que tenemos preguntas
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
        
        # Construir la evaluación
        preguntas = [Pregunta(**p) for p in data["preguntas"]]
        
        # Calcular tiempo estimado (2 minutos por pregunta teórica, 5 por código)
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
    "Prosa FUERA de $...$: 'La recta $L_1$ pasa por $A=(2,3)$' — NUNCA '$L_1 \\text{pasa por} A$'. "
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
    # Para tipo mixta, rota entre los tipos
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
(solución paso a paso)
@@FIN@@

REGLAS: pon exactamente 4 marcadores @@OPCION@@ (o 2 si es verdadero/falso). No añadas texto fuera de los marcadores.
"""
    return prompt, tipo_real


def _wrap_math_runs_in_text(text: str) -> str:
    """
    Dentro de un segmento sin $...$, encuentra comandos LaTeX sueltos
    y envuelve el span matemático circundante en $...$.
    Solo expande hacia letras SUELTAS de 1 carácter (variables p, q, M, N...);
    las palabras de 2+ letras (prose español) detienen la expansión.
    """
    if not re.search(r'\\[a-zA-Z]', text):
        return text

    n = len(text)
    mask = bytearray(n)  # 1 = dentro de región matemática

    # Sembrar: marcar todos los \comando
    for m in re.finditer(r'\\[a-zA-Z]+', text):
        for i in range(m.start(), m.end()):
            mask[i] = 1

    # Expandir iterativamente la región matemática
    for _ in range(n + 1):
        changed = False
        for i in range(n):
            if mask[i] or text[i] == '\n':
                continue
            adj = (i > 0 and mask[i - 1]) or (i < n - 1 and mask[i + 1])
            if not adj:
                continue
            c = text[i]
            if c in '[](){}^_+=-.,!|~<>*/ \t':
                mask[i] = 1; changed = True
            elif c.isdigit():
                mask[i] = 1; changed = True
            elif c.isalpha():
                # Detectar la palabra completa (isalpha es unicode-aware: incluye á,é,ñ...)
                ws = i
                while ws > 0 and text[ws - 1].isalpha():
                    ws -= 1
                we = i + 1
                while we < n and text[we].isalpha():
                    we += 1
                # Solo letra sola = átomo matemático (p, q, M, N, t...)
                if we - ws == 1:
                    mask[i] = 1; changed = True
        if not changed:
            break

    # Construir resultado: envolver cada span continuo en $...$
    result = []
    i = 0
    while i < n:
        if not mask[i]:
            result.append(text[i])
            i += 1
        else:
            j = i
            while j < n and mask[j]:
                j += 1
            span = text[i:j]
            inner = span.strip()
            before = span[:len(span) - len(span.lstrip())]
            after = span[len(span.rstrip()):]
            if inner:
                result.append(before)
                result.append(f'${inner}$')
                result.append(after)
            else:
                result.append(span)
            i = j
    return ''.join(result)


def _ensure_math_delimiters(s: str) -> str:
    """
    Garantiza que todos los comandos LaTeX estén dentro de $...$.
    Divide por bloques $...$ existentes y procesa solo los segmentos externos.
    """
    if '\\' not in s:
        return s
    parts = re.split(r'(\$[^$\n]+\$)', s)
    out = []
    for part in parts:
        if part.startswith('$') and part.endswith('$') and len(part) >= 2:
            out.append(part)
        else:
            out.append(_wrap_math_runs_in_text(part))
    return ''.join(out)


def _sanitizar_latex_str(s: str) -> str:
    """Convierte LaTeX malformado en KaTeX válido de forma determinista."""
    # 1. Caracteres de control (colisión \b \t \f \r con LaTeX)
    s = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f]', '', s)

    # 2. Elimina la familia \big/\Big/\bigg/\Bigg (+ sufijos l/r) que el modelo
    #    usa mal antes de \text, \{, \backslash y rompe KaTeX.
    s = re.sub(r'\\[Bb]i(?:g{1,2})[lr]?', '', s)

    # 3. Matrices malformadas: \begin{Bmatrix}(a,b)+t(c,d) ... -> (a,b)+t(c,d)
    #    Quita los envoltorios de matriz que el modelo no cierra bien.
    s = re.sub(r'\\begin\{[BpV]?matrix\}', '', s)
    s = re.sub(r'\\end\{[BpV]?matrix\}', '', s)

    # 4a. \left\lfloor / \left\lceil / \left\rfloor / \left\rceil -> \left|
    #     \right\lfloor / \right\rfloor / etc. -> \right|
    #     El modelo a veces confunde piso/techo con valor absoluto. Si viene
    #     precedido de \left o \right, NO se puede borrar el token sin más:
    #     \left y \right exigen un delimitador inmediatamente después/antes,
    #     y dejarlos sueltos rompe KaTeX. Se convierte a barra de valor
    #     absoluto, que sí es un delimitador válido para \left/\right.
    s = re.sub(r'\\left\s*\\[lr](?:floor|ceil)', r'\\left|', s)
    s = re.sub(r'\\right\s*\\[lr](?:floor|ceil)', r'\\right|', s)

    # 4b. \rfloor / \lfloor / \rceil / \lceil sueltos que sobrevivieron (típicamente
    #     restos de una matriz eliminada en el paso 3, sin \left/\right delante) -> nada
    s = re.sub(r'\\[lr](?:floor|ceil)', '', s)

    # 5. \backslash suelto (el modelo lo usaba como separador de conjunto) -> \mid
    s = re.sub(r'\\backslash', r'\\mid', s)

    # 6. \text{, } y \text{ } sobrantes -> puntuación normal
    s = re.sub(r'\\text\{,\s*\}', ', ', s)
    s = re.sub(r'\\text\{\s*\}', ' ', s)

    # 7. Limpia dobles espacios y $ vacíos que puedan quedar
    s = re.sub(r'\$\s*\$', '', s)

    # 8. Envuelve comandos LaTeX que quedaron fuera de $...$ en $...$
    s = _ensure_math_delimiters(s)

    return s


def _sanitizar_latex_dict(obj: Any) -> Any:
    """Aplica _sanitizar_latex_str recursivamente a todos los strings de un dict/lista."""
    if isinstance(obj, str):
        return _sanitizar_latex_str(obj)
    if isinstance(obj, dict):
        return {k: _sanitizar_latex_dict(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_sanitizar_latex_dict(v) for v in obj]
    return obj


def _parsear_pregunta_delimitada(texto: str, idx: int, tipo_real: str) -> dict:
    """Parsea la respuesta con marcadores @@...@@. No usa JSON: el LaTeX pasa intacto."""
    # Divide por marcadores: ['prefacio', 'PREGUNTA', 'contenido', 'OPCION', '...', ...]
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

    # Interpreta la respuesta correcta según el tipo
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
    return _sanitizar_latex_dict(data)


async def _generar_una_pregunta(idx: int, prompt: str, tipo_real: str) -> dict:
    """Genera 1 pregunta en texto plano con marcadores. Reintenta si la estructura falla."""
    loop = asyncio.get_running_loop()

    def _call():
        resp = openai_client.chat.completions.create(
            model=OPENAI_MODEL,
            max_tokens=4000,
            messages=[
                {"role": "system", "content": SYSTEM_MSG_TEORICO},
                {"role": "user", "content": prompt},
            ],
            temperature=0.4,
        )
        return resp.choices[0].message.content

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
async def generar_evaluacion_stream(config: ConfiguracionEvaluacion):
    """Genera cada pregunta en paralelo (1 llamada por pregunta) y las envía por SSE conforme llegan."""

    logger.info("=" * 60)
    logger.info(f"PASO 1: Nueva petición recibida | curso_id={config.curso_id}, modulo='{config.modulo}', "
                f"temas={config.temas}, num_preguntas={config.num_preguntas}")

    if not openai_client:
        logger.error("PASO 1 ERROR: OpenAI client no inicializado - API Key no configurada")
        raise HTTPException(status_code=500, detail="API Key de OpenAI no configurada")

    try:
        # --- PASO 2: RAG / Recuperación de Contexto Semántico ---
        logger.info("PASO 2: Buscando contexto semántico / sílabo (RAG)...")

        es_programacion = config.curso_id in CURSOS_PROGRAMACION_IDS

        tema_completo = config.temas[0] if len(config.temas) == 1 else f"{config.modulo}: {', '.join(config.temas)}"
        contexto = recuperar_contexto_semantico(tema_completo, config.curso_id)

        temas_str = config.temas[0] if len(config.temas) == 1 else ', '.join(config.temas)

        contexto_bloque = ""
        if contexto:
            contexto_str = "\n\n---\n".join(contexto)
            contexto_bloque = (
                f"### EJERCICIOS REALES DE EXÁMENES UNI — REFERENCIA OBLIGATORIA ###\n"
                f"{contexto_str}\n"
                f"### FIN DE REFERENCIA ###\n\n"
                f"Transforma estos ejercicios: misma estructura y dificultad, solo cambia valores numéricos.\n"
            )
            logger.info(f"PASO 2 COMPLETADO: {len(contexto)} fragmentos recuperados ({len(contexto_str)} caracteres).")
        else:
            logger.warning("PASO 2 ALERTA: No se recuperó contexto RAG. Continuando sin él...")

        # --- PASO 3: Verificación de OpenAI ---
        logger.info("PASO 3: Verificando cliente OpenAI...")
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            logger.error("PASO 3 ERROR: OPENAI_API_KEY no está configurada en variables de entorno.")
            raise HTTPException(status_code=500, detail="Falta configuración de API Key de OpenAI en el servidor.")
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
                # --- PASO 5: Llamada a OpenAI (Programación) ---
                logger.info("PASO 5: Invocando API de OpenAI (flujo programación)...")

                cfg1 = ConfiguracionEvaluacion(
                    curso_id=config.curso_id,
                    modulo=config.modulo,
                    temas=config.temas,
                    num_preguntas=config.num_preguntas,
                    observaciones=config.observaciones,
                    tipo_evaluacion=config.tipo_evaluacion,
                )
                prompt_prog = generar_prompt_programacion(cfg1, contexto)

                loop = asyncio.get_running_loop()
                def _call_prog():
                    resp = openai_client.chat.completions.create(
                        model=OPENAI_MODEL,
                        max_tokens=6000,
                        messages=[
                            {"role": "system", "content": "Eres un arquitecto de software senior. Responde ÚNICAMENTE con JSON válido."},
                            {"role": "user", "content": prompt_prog},
                        ],
                        response_format={"type": "json_object"},
                        temperature=0.3,
                    )
                    return resp.choices[0].message.content

                raw = await loop.run_in_executor(None, _call_prog)
                logger.info(f"PASO 5 COMPLETADO: Respuesta cruda recibida ({len(raw)} caracteres).")

                # --- PASO 6: Parseo de JSON ---
                logger.info("PASO 6: Parseando JSON de respuesta...")
                data = parse_llm_json_response(raw)
                logger.info(f"PASO 6 COMPLETADO: {len(data.get('preguntas', []))} preguntas parseadas.")
                yield f"data: {json.dumps({'done': True, 'result': data})}\n\n"
                return

            # --- PASO 5 (teórico): N llamadas paralelas ---
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
    
    # Crear un mapa de preguntas para acceso rápido
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
    
    # Generar retroalimentación con IA
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
    
    if not openai_client:
        return "Retroalimentación no disponible"

    # Identificar temas con dificultad
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
        response = openai_client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
        )
        return response.choices[0].message.content
    except Exception as e:
        return f"Retroalimentación automática: Has obtenido un {porcentaje:.1f}%. {'¡Excelente trabajo!' if porcentaje >= 70 else 'Sigue practicando para mejorar.'}"

@router.get("/evaluaciones/test")
async def test_openai():
    """Endpoint de prueba para verificar que OpenAI está funcionando"""

    if not openai_client:
        return {"status": "error", "message": "API Key de OpenAI no configurada"}

    try:
        response = openai_client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[{"role": "user", "content": "Di 'Hola, UniVia está listo para generar evaluaciones!'"}],
            temperature=0.5,
        )
        return {
            "status": "success",
            "message": "OpenAI API funcionando correctamente",
            "response": response.choices[0].message.content
        }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }
