#Generador aumentado de texto
import os
from dotenv import load_dotenv
import google.generativeai as genai 
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from retriever import SyllabusRetriever

load_dotenv()

class SyllabusGenerator:
    def __init__(self, model_name="gemini-2.5-flash"):
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            print("No se encontró la API KEY de Gemini. ")
        
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel(model_name)
        self.retriever = SyllabusRetriever()
    
    def generar_respuesta(self, pregunta: str) -> str:
        print(f"Pregunta del usuario: {pregunta}")

        fragmentos = self.retriever.buscar_contexto(pregunta, limit=4, umbral_similitud=0.4)
        if not fragmentos:
            return "Lo siento, no he podido encontrar información en los compendios y sílabos registrados."
        
        contexto_unido = ""
        for i, frag in enumerate(fragmentos):
            contexto_unido += f"--- Fragmento {i+1} ---\n{frag.get('contenido')}\n\n"
        
        prompt_maestro = f"""
        Eres un tutor académico virtual especializado en cursos universitarios de ciencias e ingeniería.
        Tu tarea es responder utilizando PRIORITARIAMENTE la información recuperada desde los documentos académicos vectorizados del sistema RAG.
        INSTRUCCIONES IMPORTANTES:
        1. Usa siempre el contexto recuperado como fuente principal de información.
        2. Si el contexto contiene ejercicios incompletos o sin solución, puedes resolverlos usando razonamiento matemático, físico o lógico coherente con el problema original.
        3. NO respondas diciendo únicamente que “no hay suficiente información” si el contexto contiene al menos parte relevante del problema o tema. En ese caso:
        * interpreta el ejercicio,
        * completa los pasos faltantes,
        * explica el procedimiento,
        * y genera una respuesta útil para el estudiante.
        4. Si el usuario solicita ejercicios similares:
        * genera nuevas variantes basadas en los ejercicios encontrados,
        * mantén el mismo tema y dificultad,
        * cambia valores numéricos, funciones o condiciones cuando sea apropiado.
        5. Si el contexto contiene fórmulas:
        * explícalas claramente,
        * usa notación matemática legible,
        * y relaciona las fórmulas con el problema.
        6. Si existen múltiples fragmentos relacionados:
        * combina la información de forma coherente,
        * evitando repetir texto innecesariamente.
        7. Si el contexto recuperado es ambiguo o mezcla varios ejercicios:
        * identifica el fragmento más relacionado con la pregunta del usuario,
        * prioriza ese contenido,
        * y utiliza los demás solo como apoyo contextual.
        8. Nunca inventes temas completamente ajenos al contexto recuperado.
        Puedes extender, explicar o resolver el contenido, pero siempre manteniendo coherencia con los documentos encontrados.
        9. Responde de forma:
        * clara,
        * estructurada,
        * pedagógica,
        * y detallada.
        10. Cuando sea útil:
        * usa pasos numerados,
        * viñetas,
        * tablas,
        * o explicaciones intermedias.
        11. Si el usuario hace preguntas vagas o generales:
        * intenta igualmente ayudar utilizando los fragmentos más cercanos encontrados en la base vectorial,
        * en lugar de rechazar la consulta inmediatamente.
        12. Prioriza siempre ayudar al estudiante a comprender y continuar el ejercicio, incluso si el documento original no incluye la solución completa.

        CONTEXTO RECUPERADO:
        {contexto_unido}

        PREGUNTA DEL USUARIO:
        {pregunta}

        RESPUESTA:

        """
        print("Generando respuesta ...")
        try:
            respuesta = self.model.generate_content(prompt_maestro)
            return respuesta.text
        except Exception as e:
            print(f"Error generando la respuesta: {e}")
            return "Hubo un error interno al intentar procesar la respuesta. "
        
if __name__ == "__main__":
    print("Iniciando prueba ... ")
    pregunta_prueba = "Problema sobre hallar valores de a y b para que una función definida por partes sea derivable."
    generador = SyllabusGenerator()
    respuesta_ia = generador.generar_respuesta(pregunta_prueba)
    
    print("\nRespuesta")
    print(respuesta_ia)