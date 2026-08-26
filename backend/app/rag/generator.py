from dotenv import load_dotenv

from app.core.llm import MODELO_GENERACION, generar
from app.rag.retriever import SyllabusRetriever

load_dotenv()


class SyllabusGenerator:
    """Tutor RAG: recupera contexto con Gemini (embeddings) y responde con Claude."""

    def __init__(self, model_name=None):
        self.model_name = model_name or MODELO_GENERACION
        self.retriever = SyllabusRetriever()

    def generar_respuesta(self, pregunta: str) -> str:
        print(f"Pregunta del usuario: {pregunta}")

        fragmentos = self.retriever.buscar_contexto(pregunta, limit=4, umbral_similitud=0.4)
        if not fragmentos:
            return "Lo siento, no he podido encontrar información en los compendios y sílabos registrados."

        contexto_unido = ""
        for i, frag in enumerate(fragmentos):
            contexto_unido += f"--- Fragmento {i+1} ---\n{frag.get('contenido')}\n\n"

        SYSTEM_TUTOR = """
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
        """

        mensaje = f"""CONTEXTO RECUPERADO:
{contexto_unido}

PREGUNTA DEL USUARIO:
{pregunta}

RESPUESTA:"""

        print("Generando respuesta ...")
        try:
            return generar(
                prompt=mensaje,
                system=SYSTEM_TUTOR,
                max_tokens=8000,
                modelo=self.model_name,
            )
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
