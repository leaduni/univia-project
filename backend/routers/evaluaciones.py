from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from google import genai
from google.genai import types
import os
import json
import re

router = APIRouter()

# Configurar Gemini API
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
    num_preguntas: int = 5  # 5-10 preguntas
    observaciones: Optional[str] = None  # Metodología del profesor, lenguaje, etc.
    tipo_evaluacion: str = "mixta"  # "multiple", "unica", "verdadero_falso", "mixta"

class Pregunta(BaseModel):
    """Modelo de una pregunta de evaluación"""
    id: int
    pregunta: str
    tipo: str  # "multiple", "unica", "verdadero_falso"
    opciones: List[str]
    respuesta_correcta: Any  # Puede ser int (índice) o List[int] para múltiple
    explicacion: str

class Evaluacion(BaseModel):
    """Evaluación completa generada"""
    curso_id: int
    modulo: str
    temas: List[str]
    preguntas: List[Pregunta]
    tiempo_estimado: int  # En minutos

class RespuestaEstudiante(BaseModel):
    """Respuesta de un estudiante a una pregunta"""
    pregunta_id: int
    respuesta: Any  # int o List[int]

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

def generar_prompt_evaluacion(config: ConfiguracionEvaluacion) -> str:
    """Genera el prompt para Gemini basado en la configuración"""
    
    tipos_pregunta = {
        "multiple": "selección múltiple (varias respuestas correctas)",
        "unica": "única respuesta correcta",
        "verdadero_falso": "verdadero o falso",
        "mixta": "combinación de selección múltiple, única respuesta y verdadero/falso"
    }
    
    prompt = f"""Eres un profesor experto en {config.modulo}. 

Genera {config.num_preguntas} preguntas de evaluación sobre los siguientes temas:
{', '.join(config.temas)}

Tipo de preguntas: {tipos_pregunta.get(config.tipo_evaluacion, 'mixta')}

"""
    
    if config.observaciones:
        prompt += f"\nConsideraciones especiales del profesor:\n{config.observaciones}\n"
    
    prompt += """
IMPORTANTE: Responde ÚNICAMENTE con un JSON válido en este formato exacto:

{
  "preguntas": [
    {
      "id": 1,
      "pregunta": "texto de la pregunta",
      "tipo": "unica|multiple|verdadero_falso",
      "opciones": ["opción 1", "opción 2", "opción 3", "opción 4"],
      "respuesta_correcta": 0,
      "explicacion": "explicación detallada de por qué esta es la respuesta correcta"
    }
  ]
}

REGLAS:
- Para tipo "unica": respuesta_correcta es un número (índice de la opción correcta, empezando en 0)
- Para tipo "multiple": respuesta_correcta es una lista de números [0, 2] (múltiples opciones correctas)
- Para tipo "verdadero_falso": opciones debe ser ["Verdadero", "Falso"]
- Todas las preguntas deben tener explicaciones pedagógicas y detalladas
- Las preguntas deben ser de nivel universitario
- NO incluyas texto adicional fuera del JSON
- Asegúrate de que el JSON sea válido (comillas dobles, sin comas finales)
"""
    
    return prompt

def limpiar_json_response(text: str) -> str:
    """Limpia la respuesta de Gemini para extraer solo el JSON"""
    # Buscar JSON entre ```json y ``` o entre { y }
    json_match = re.search(r'```json\s*(.*?)\s*```', text, re.DOTALL)
    if json_match:
        return json_match.group(1)
    
    json_match = re.search(r'({[\s\S]*})', text)
    if json_match:
        return json_match.group(1)
    
    return text

@router.post("/evaluaciones/generar", response_model=Evaluacion)
async def generar_evaluacion(config: ConfiguracionEvaluacion):
    """
    RF-APR-02, RF-APR-03, RF-APR-04: Genera una evaluación con IA
    basada en el módulo, temas y configuración del estudiante
    """
    
    if not client:
        raise HTTPException(status_code=500, detail="API Key de Gemini no configurada")
    
    try:
        # Generar el prompt
        prompt = generar_prompt_evaluacion(config)
        
        # Generar contenido con Gemini
        response = client.models.generate_content(
            model='models/gemini-2.5-flash',
            contents=prompt
        )
        
        # Limpiar y parsear la respuesta
        json_text = limpiar_json_response(response.text)
        data = json.loads(json_text)
        
        # Validar que tenemos preguntas
        if "preguntas" not in data or not data["preguntas"]:
            raise ValueError("No se generaron preguntas válidas")
        
        # Construir la evaluación
        preguntas = [Pregunta(**p) for p in data["preguntas"]]
        
        # Calcular tiempo estimado (2 minutos por pregunta)
        tiempo_estimado = len(preguntas) * 2
        
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
        
        # Verificar si la respuesta es correcta
        es_correcta = False
        if isinstance(pregunta.respuesta_correcta, list):
            # Selección múltiple
            es_correcta = set(respuesta.respuesta) == set(pregunta.respuesta_correcta)
        else:
            # Única respuesta
            es_correcta = respuesta.respuesta == pregunta.respuesta_correcta
        
        if es_correcta:
            respuestas_correctas += 1
        
        detalles.append({
            "pregunta_id": respuesta.pregunta_id,
            "pregunta": pregunta.pregunta,
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
