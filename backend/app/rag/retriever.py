import os
import logging
from dotenv import load_dotenv
from supabase import Client, create_client

from app.rag.embedder import SyllabusEmbedder

load_dotenv()

logger = logging.getLogger(__name__)

class SyllabusRetriever:
    def __init__(self, model_name=None, expected_dimensions=1536, token=None):
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_ANON_KEY")
        if not supabase_url or not supabase_key:
            logger.error("No se encontraron las credenciales de usuario para supabase.")

        self.supabase: Client = create_client(supabase_url, supabase_key)
        if token:
            # Consulta la base de datos con la sesión del usuario autenticado
            # (se respetan las políticas RLS) en vez de la clave anónima.
            self.supabase.postgrest.auth(token)
        self.expected_dimensions = expected_dimensions

        # La pregunta se vectoriza con el MISMO embedder que ingiere el corpus.
        # No se elige proveedor acá: hacerlo por separado fue justo el bug que
        # dejó el corpus en Gemini y las consultas en OpenAI, comparando
        # vectores de espacios distintos sin que nada fallara visiblemente.
        self.embedder = SyllabusEmbedder(
            model_name=model_name, expected_dimensions=expected_dimensions,
        )
        self.model_name = self.embedder.model_name

    def vectorizar_pregunta(self, pregunta: str) -> list:
        logger.debug("Vectorizando el query ...")
        return self.embedder.vectorizar_consulta(pregunta)

    def buscar_contexto(self, pregunta: str, limit: int = 5, umbral_similitud: float = 0.5, curso_id: int = None) -> list:
        pregunta_vectorizada = self.vectorizar_pregunta(pregunta)

        if not pregunta_vectorizada:
            return []

        logger.info(f"Buscando en supabase los {limit} fragmentos más relevantes ...")

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
                logger.warning("No se encontró información suficientemente relevante.")

            logger.info(f"Se encontraron {len(resultados)} fragmentos de contexto.")
            return resultados

        except Exception as e:
            logger.error(f"Error en la base de datos al buscar contexto: {e}")
            return []

    def buscar_contexto_por_nombre(self, pregunta: str, curso_nombre: str = None, limit: int = 5, umbral_similitud: float = 0.5, profesor_id: int = None) -> list:
        pregunta_vectorizada = self.vectorizar_pregunta(pregunta)

        if not pregunta_vectorizada:
            return []

        logger.info(f"Buscando en supabase los {limit} fragmentos más relevantes para el curso '{curso_nombre}'"
                    + (f" (profesor_id={profesor_id})" if profesor_id else "") + " ...")

        try:
            respuesta = self.supabase.rpc(
                "search_resource_chunks_by_nombre",
                {
                    "query_embedding": pregunta_vectorizada,
                    "match_threshold": umbral_similitud,
                    "match_count": limit,
                    "filter_curso_nombre": curso_nombre,
                    "filter_profesor_id": profesor_id,
                }
            ).execute()

            resultados = respuesta.data

            if not resultados:
                logger.warning("No se encontró información suficientemente relevante.")

            logger.info(f"Se encontraron {len(resultados)} fragmentos de contexto.")
            return resultados

        except Exception as e:
            logger.error(f"Error en la base de datos al buscar contexto por nombre: {e}")
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
