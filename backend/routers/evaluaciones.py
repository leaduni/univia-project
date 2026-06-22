from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any, Union
from google import genai
from google.genai import types
import os
from dotenv import load_dotenv
load_dotenv()   
import json
import re
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from rag.retriever import SyllabusRetriever

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

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
client = None
if GEMINI_API_KEY:
    client = genai.Client(api_key=GEMINI_API_KEY)

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
        from database import get_supabase
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
            limit=8,    
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
    
    prompt = rf"""Eres un profesor del Departamento de Ciencias Básicas de la Universidad Nacional de Ingeniería (UNI), diseñando una Práctica Calificada real.
Genera {config.num_preguntas} preguntas de evaluación sobre los siguientes temas:
{', '.join(config.temas)}

Tipo de preguntas: {tipos_pregunta.get(config.tipo_evaluacion, 'mixta')}

NIVEL DE EXIGENCIA (NO NEGOCIABLE):
- El nivel debe ser idéntico al de un examen de la UNI: problemas que combinan VARIOS conceptos a la vez (ej. razón de división + producto escalar + ecuación de recta en un mismo enunciado), no preguntas de definición ni de aplicación directa de una fórmula.
- Usa datos numéricos concretos (coordenadas, vectores, razones) que obliguen a resolver un sistema o despejar varias incógnitas, igual que en el contexto de referencia.
- PROHIBIDO generar preguntas triviales del tipo "¿cuál es la pendiente de la recta y=2x+3?" o "defina qué es una recta". Si una pregunta se puede responder sin plantear ecuaciones o sin combinar al menos dos propiedades/conceptos, es DEMASIADO FÁCIL y debes descartarla y generar otra más exigente.
- Las preguntas de selección única/múltiple deben tener distractores que sean errores de cálculo plausibles (no opciones absurdas obvias).

IMPORTANTE: Responde ÚNICAMENTE con un JSON que cumpla el esquema solicitado.

ESTRUCTURA DEL JSON:
{{
  "preguntas": [
    {{
      "id": 1,
      "pregunta": "texto de la pregunta",
      "tipo": "unica|multiple|verdadero_falso",
      "opciones": ["opción 1", "opción 2", "opción 3", "opción 4"],
      "respuesta_correcta": 0,
      "explicacion": "explicación detallada de por qué esta es la respuesta correcta"
    }}
  ]
}}

REGLAS CRÍTICAS DE FORMATO:
1. Para fórmulas en la misma línea (inline), usa un solo símbolo de dólar: $f(x) = x^2$.
2. Para fórmulas en bloque (centradas), usa doble símbolo de dólar: $$ \int_a^b x \, dx $$.
3. Escribe sintaxis de LaTeX estándar limpia. NO dupliques ni tripliques las barras invertidas.
4. En la explicación, usa saltos de línea normales (Enter) para separar párrafos. NO escribas "\n" de forma literal.

REGLAS DE EVALUACIÓN:
- Para tipo "unica": respuesta_correcta es el índice de la opción correcta (empezando en 0).
- Para tipo "multiple": respuesta_correcta es una lista de índices [0, 2].
- Para tipo "verdadero_falso": opciones debe ser ["Verdadero", "Falso"].
"""
    
    if contexto_recuperado and len(contexto_recuperado) > 0:
        contexto_str = "\n\n---\n".join(contexto_recuperado)
        prompt += f"""
EJERCICIOS REALES DE PRÁCTICAS CALIFICADAS DE LA UNI (referencia OBLIGATORIA de nivel):
---
{contexto_str}
---
INSTRUCCIÓN DE ANCLAJE (OBLIGATORIA): los ejercicios de arriba son el ÚNICO estándar de dificultad aceptable.
Cada pregunta que generes debe requerir una cantidad de pasos de razonamiento y manipulación algebraica/vectorial COMPARABLE a la de estos ejercicios (varios datos encadenados, varias incógnitas, varias propiedades combinadas).
No generes preguntas más simples que el ejemplo más sencillo del contexto. Si dudas si una pregunta es "demasiado fácil" comparada con el contexto, hazla más difícil, no más fácil.
Puedes inspirarte directamente en la estructura de estos ejercicios (mismo tipo de datos: razones de división, coordenadas, productos escalares, vectores dirección, etc.) pero cambia los valores numéricos y la situación geométrica para que no sea una copia literal.
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

def limpiar_json_response(text: str) -> str:
    """Limpia la respuesta de Gemini para extraer solo el JSON"""
    json_text = text
    json_match = re.search(r'```(?:json)?\s*(.*?)\s*```', text, re.DOTALL)
    if json_match:
        json_text = json_match.group(1)
    else:
        json_match = re.search(r'({[\s\S]*})', text)
        if json_match:
            json_text = json_match.group(1)
            
    return json_text

@router.post("/evaluaciones/generar", response_model=Evaluacion)
async def generar_evaluacion(config: ConfiguracionEvaluacion):
    """
    RF-APR-02, RF-APR-03, RF-APR-04: Genera una evaluación con IA
    basada en el módulo, temas y configuración del estudiante
    """
    
    if not client:
        raise HTTPException(status_code=500, detail="API Key de Gemini no configurada")
    
    try:
        # 1. Recuperar contexto semántico (RAG)
        tema_completo = f"{config.modulo}: {', '.join(config.temas)}"
        contexto = recuperar_contexto_semantico(tema_completo, config.curso_id)
        
        print("\n" + "="*50)
        print(f"RAG: Se recuperaron {len(contexto)} fragmentos del PDF.")
        print("="*50 + "\n")

        # Decidir qué prompt usar según el tipo de curso
        if config.curso_id in CURSOS_PROGRAMACION_IDS:
            print(f"DEBUG: Activando flujo de PROGRAMACIÓN para curso {config.curso_id}")
            prompt = generar_prompt_programacion(config, contexto)
            evaluacion_schema = types.Schema(
                type=types.Type.OBJECT,
                properties={
                    "preguntas": types.Schema(
                        type=types.Type.ARRAY,
                        items=types.Schema(
                            type=types.Type.OBJECT,
                            properties={
                                "id": types.Schema(type=types.Type.INTEGER),
                                "contexto_markdown": types.Schema(type=types.Type.STRING),
                                "input_markdown": types.Schema(type=types.Type.STRING),
                                "output_markdown": types.Schema(type=types.Type.STRING),
                                "tipo": types.Schema(type=types.Type.STRING),
                                "opciones": types.Schema(
                                    type=types.Type.ARRAY,
                                    items=types.Schema(type=types.Type.STRING)
                                ),
                                "respuesta_correcta": types.Schema(type=types.Type.STRING),
                                "explicacion": types.Schema(type=types.Type.STRING),
                                "codigo_base": types.Schema(type=types.Type.STRING),
                                "caso_de_ejemplo": types.Schema(
                                    type=types.Type.OBJECT,
                                    properties={
                                        "input": types.Schema(type=types.Type.STRING),
                                        "output": types.Schema(type=types.Type.STRING)
                                    }
                                )
                            },
                            required=["id", "contexto_markdown", "input_markdown", "output_markdown", "tipo", "opciones", "respuesta_correcta", "explicacion", "codigo_base", "caso_de_ejemplo"]
                        )
                    )
                },
                required=["preguntas"]
            )
        else:
            prompt = generar_prompt_teorico(config, contexto)
            evaluacion_schema = types.Schema(
                type=types.Type.OBJECT,
                properties={
                    "preguntas": types.Schema(
                        type=types.Type.ARRAY,
                        items=types.Schema(
                            type=types.Type.OBJECT,
                            properties={
                                "id": types.Schema(type=types.Type.INTEGER),
                                "pregunta": types.Schema(type=types.Type.STRING),
                                "tipo": types.Schema(type=types.Type.STRING),
                                "opciones": types.Schema(
                                    type=types.Type.ARRAY,
                                    items=types.Schema(type=types.Type.STRING)
                                ),
                                "respuesta_correcta": types.Schema(type=types.Type.INTEGER),
                                "explicacion": types.Schema(type=types.Type.STRING)
                            },
                            required=["id", "pregunta", "tipo", "opciones", "respuesta_correcta", "explicacion"]
                        )
                    )
                },
                required=["preguntas"]
            )

        # Generar contenido con Gemini
        gemini_config = types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=evaluacion_schema
        )
        response = client.models.generate_content(
            model='models/gemini-2.5-flash',
            contents=prompt,
            config=gemini_config
        )
        
        # Limpiar y parsear la respuesta
        json_text = limpiar_json_response(response.text)
        data = json.loads(json_text)
        
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
        
    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Error al parsear respuesta de IA: {str(e)}\nRespuesta: {response.text}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error al generar evaluación: {str(e)}"
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
    
    if not client:
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
        response = client.models.generate_content(
            model='models/gemini-2.5-flash',
            contents=prompt
        )
        return response.text
    except Exception as e:
        return f"Retroalimentación automática: Has obtenido un {porcentaje:.1f}%. {'¡Excelente trabajo!' if porcentaje >= 70 else 'Sigue practicando para mejorar.'}"

@router.get("/evaluaciones/test")
async def test_gemini():
    """Endpoint de prueba para verificar que Gemini está funcionando"""
    
    if not client:
        return {"status": "error", "message": "API Key no configurada"}
    
    try:
        response = client.models.generate_content(
            model='models/gemini-2.5-flash',
            contents="Di 'Hola, UniVia está listo para generar evaluaciones!'"
        )
        return {
            "status": "success",
            "message": "Gemini API funcionando correctamente",
            "response": response.text
        }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }
