# Ingesta de datos
import os
from dotenv import load_dotenv
from supabase import Client, create_client

load_dotenv()

class SyllabusIngestor:
    def __init__(self):
        url_supabase = os.getenv("SUPABASE_URL")
        anon_supabase = os.getenv("SUPABASE_ANON_KEY")

        if not url_supabase or not anon_supabase:
            print("Hubo un error estableciendo la conexion con el cliente de Supabase. ")
            raise ValueError("Faltan credenciales de Supabase")
        
        self.supabase: Client = create_client(url_supabase, anon_supabase)
    
    def ingest(self, chunks: list, recurso_id: str, curso_id: int, table_name: str = "resource_chunks", batch_size: int = 50) -> bool:
        if not chunks:
            print("No se encontraron chunks para hacer la ingesta. ")
            return False
        
        total_chunks = len(chunks)
        print(f"Iniciando ingesta de {total_chunks} fragmentos en Supabase (Tabla: {table_name})...")

        for i in range(0, total_chunks, batch_size):
            lote = chunks[i: i + batch_size]
            datos_insertar = []
            for chunk in lote:
                datos_insertar.append({
                    "recurso_id": recurso_id,
                    "curso_id": curso_id,
                    "contenido": chunk["contenido"],
                    "embedding": chunk["embedding"]
                })
            
            print(f"Subiendo lote {i//batch_size + 1} (Fragmentos {i+1} al {min(i+batch_size, total_chunks)})...")

            try:
                respuesta = self.supabase.table(table_name).insert(datos_insertar).execute()
                if not respuesta.data:
                    print("Advertencia: La inserción se ejecutó, pero Supabase no devolvió confirmación de datos.")

            except Exception as e:
                print(f"Error crítico al insertar el lote en Supabase: {e}")
                return False
        
        print(f"Ingesta exitosa! Todos los {total_chunks} fragmentos están en Supabase.")
        return True

if __name__ == "__main__":
    vector_prueba = [0.0] * 1536
    vector_prueba[0] = 0.123
    vector_prueba[1535] = 0.987
    
    chunks_simulados = [
        {
            "contenido": "[PRUEBA DE INGESTA] Este es un texto de prueba simulando Cinemática.",
            "embedding": vector_prueba
        },
        {
            "contenido": "[PRUEBA DE INGESTA] Este es otro texto simulando Dinámica.",
            "embedding": vector_prueba
        }
    ]

    try:
        ingestor = SyllabusIngestor()
        exito = ingestor.ingest(chunks_simulados, recurso_id, curso_id ,table_name="resource_chunks", batch_size=2)
        if exito:
            print("Ingesta completada. Revisar la tabla en supabase.")
    except Exception as e:
        print(f"Ocurrio una falla en la ingestion: {e}")