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
        Eres un tutor académico virtual altamente capacitado. Tu objetivo es responder la pregunta del estudiante utilizando ÚNICAMENTE la información del contexto proporcionado.

        REGLAS ESTRICTAS:
        1. Si la respuesta no está en el contexto, di exactamente: "No tengo suficiente información en los documentos registrados para responder esto."
        2. No inventes datos, ni uses tu conocimiento previo externo.
        3. Si hay fórmulas matemáticas en el contexto, escríbelas claramente.
        4. Responde de forma clara, directa y estructurada (usa viñetas si ayuda).

        CONTEXTO RECUPERADO DE LA BASE DE DATOS:
        {contexto_unido}

        PREGUNTA DEL ESTUDIANTE:
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
    pregunta_prueba = "¿Qué temas principales de Física se exploran en el sílabo?"
    generador = SyllabusGenerator()
    respuesta_ia = generador.generar_respuesta(pregunta_prueba)
    
    print("\nRespuesta")
    print(respuesta_ia)