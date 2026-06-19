# Conversión del texto a vectores
import os
import google.generativeai as genai
from dotenv import load_dotenv
import time

load_dotenv()

class SyllabusEmbedder:
    def __init__(self, model_name="models/gemini-embedding-2", expected_dimensions=1536):
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            print("Error: No se detectó el API_KEY de Gemini. ")
        
        genai.configure(api_key=api_key)

        self.model_name = model_name
        self.expected_dimensions=expected_dimensions
    
    def embedding_generator(self, chunks: list, batch_size: int = 5) -> list:
        if not chunks:
            print("Error: No se encontraron chunks para convertir. ")
            return []
        
        print("Iniciando conversion de chunks a embeddings ... ")
        chunks_transformados = []

        for i in range(0, len(chunks), batch_size):
            lote_actual = chunks[i: i + batch_size]
            textos_lote = [chunk["contenido"] for chunk in lote_actual]

            print(f"Enviando lote {i//batch_size + 1} al modelo...")

            intentos = 0
            max_intentos = 3

            while intentos < max_intentos:
                try:
                    embeddings = genai.embed_content(
                        model=self.model_name,
                        content=textos_lote,
                        task_type="RETRIEVAL_DOCUMENT"
                    )

                    vectores = embeddings["embedding"]

                    for j, vector in enumerate(vectores):
                        vector_ajustado = vector[:self.expected_dimensions]
                        chunk_enriquecido = lote_actual[j].copy()
                        chunk_enriquecido["embedding"] = vector_ajustado
                        chunks_transformados.append(chunk_enriquecido)

                    break

                except Exception as e:
                    intentos += 1
                    error_str = str(e)

                    if "429" in error_str or "Quota" in error_str:
                        espera = 5 * intentos
                        print(f"Limite de cuota detectado. Esperando {espera} segundos (intento {intentos}/{max_intentos})")
                        time.sleep(espera)
                    
                    else:
                        print(f"Ocurrio un error inesperado: {e}")
                        break
            
            time.sleep(2)
        
        print(f"Vectorización completada para {len(chunks_transformados)} fragmentos.")
        return chunks_transformados

if __name__ == "__main__":
    import sys
    sys.path.append(os.path.dirname(os.path.abspath(__file__)))
    from chunker import SyllabusChunker

    root_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    test_pdf = os.path.join(root_dir, "silabos", "BF101-Fisica.pdf")

    chunker = SyllabusChunker()
    chunks_generados = chunker.chunk_text(test_pdf)

    if chunks_generados:
        embedder = SyllabusEmbedder()
        chunks_finales = embedder.embedding_generator(chunks_generados, batch_size=2)

    if chunks_finales:
        print("Contenido del primer chunk:")
        print(chunks_finales[0]["contenido"])
        print("\nDimensiones del vector generado:")
        print(len(chunks_finales[0]["embedding"])) 
        print("\nPrimeros 5 números del vector:")
        print(chunks_finales[0]["embedding"][:5])