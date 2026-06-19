# Buscador de los fragmentos más relevante
import os
import google.generativeai as genai
from dotenv import load_dotenv
from supabase import Client, create_client

load_dotenv()

class SyllabusRetriever:
    def __init__(self, model_name="models/gemini-embedding-2", expected_dimensions=1536):
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_ANON_KEY")
        if not supabase_url or not supabase_key:
            print("No se encontraron las credenciales de usuario para supabase. ")
        
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            print("No se encontró la API KEY de Gemini. ")
        
        genai.configure(api_key=api_key)

        self.supabase: Client = create_client(supabase_url, supabase_key)
        self.expected_dimensions = expected_dimensions
        self.model_name = model_name
    
    def vectorizar_pregunta(self, pregunta: str) -> list:
        print("Vectorizando el query ... ")

        try:
            respuesta = genai.embed_content(
                model=self.model_name,
                content=pregunta,
                task_type="RETRIEVAL_QUERY"
            )

            vector = respuesta["embedding"]
            return vector[:self.expected_dimensions]
        except Exception as e:
            print(f"Error al vectorizar la pregunta: {e}")
            return []
    
    def buscar_contexto(self, pregunta: str, limit: int = 5, umbral_similitud: float = 0.5, curso_id: int = None) -> list:
        pregunta_vectorizada = self.vectorizar_pregunta(pregunta)

        if not pregunta_vectorizada:
            return []

        print(f"Buscando en supabase los {limit} fragmentos más relevantes ...")

        try:
            respuesta = self.supabase.rpc(
                "search_resource_chunks",
                {
                    "query_embedding": pregunta_vectorizada,
                    "match_threshold": umbral_similitud,
                    "match_count": limit,
                    "filter_curso_id": curso_id,
                }
            ).execute()

            resultados = respuesta.data

            if not resultados:
                print("No se encontró información suficientemente relevante. ")
            
            print(f"Se encontraron {len(resultados)} fragmentos de contexto.")
            return resultados

        except Exception as e:
            print(f"Error en la base de datos al buscar contexto: {e}")
            return []

    def buscar_contexto_por_nombre(self, pregunta: str, curso_nombre: str = None, limit: int = 5, umbral_similitud: float = 0.5) -> list:
        """Busca fragmentos relevantes filtrando por el NOMBRE del curso.

        A diferencia de buscar_contexto (que filtra por curso_id), esto permite que
        un mismo material ingestado bajo un único curso_id sea recuperado para todas
        las versiones del curso que compartan el mismo nombre (ej. las variantes por
        carrera _SIS / _SOFT / _IND de "Geometría Analítica").
        """
        pregunta_vectorizada = self.vectorizar_pregunta(pregunta)

        if not pregunta_vectorizada:
            return []

        print(f"Buscando en supabase los {limit} fragmentos más relevantes para el curso '{curso_nombre}' ...")

        try:
            respuesta = self.supabase.rpc(
                "search_resource_chunks_by_nombre",
                {
                    "query_embedding": pregunta_vectorizada,
                    "match_threshold": umbral_similitud,
                    "match_count": limit,
                    "filter_curso_nombre": curso_nombre,
                }
            ).execute()

            resultados = respuesta.data

            if not resultados:
                print("No se encontró información suficientemente relevante. ")

            print(f"Se encontraron {len(resultados)} fragmentos de contexto.")
            return resultados

        except Exception as e:
            print(f"Error en la base de datos al buscar contexto por nombre: {e}")
            return []

if __name__ == "__main__":
    print("Iniciando prueba del retriever ... ")

    pregunta_prueba = "¿Cuántas horas tiene el curso?"
    retriever = SyllabusRetriever()
    fragmentos_encontrados = retriever.buscar_contexto(pregunta_prueba, limit=3)

    if fragmentos_encontrados:
        print("\nMejores resultados: ")
        for i, frag in enumerate(fragmentos_encontrados):
            similitud = round(frag.get('similarity', 0) * 100, 2)
            print(f"\n[{i+1}] Similitud: {similitud}% | Curso ID: {frag.get('curso_id')}")
            print(f"Contenido: {frag.get('contenido')[:200]}...")

