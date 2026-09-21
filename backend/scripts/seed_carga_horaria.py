import os
import sys
import pandas as pd
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: Variables de entorno SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son requeridas.")
    sys.exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def seed_carga_horaria(excel_path: str):
    print(f"Leyendo archivo: {excel_path}...")
    try:
        df = pd.read_excel(excel_path)
    except Exception as e:
        print(f"Error al leer el archivo Excel: {e}")
        sys.exit(1)

    # Renombrar columnas esperadas al formato de la DB
    col_map = {
        "CÓDIGO": "codigo",
        "NOMBRE DEL CURSO": "nombre_curso",
        "SECCIÓN": "seccion",
        "DOCENTE": "docente",
        "TIPO CLASE (T/P/LAB)": "tipo_clase",
        "AULA": "aula",
        "DÍA": "dia",
        "HORA INICIO": "hora_inicio",
        "HORA FINAL": "hora_fin"
    }
    
    df = df.rename(columns=col_map)
    
    required_cols = list(col_map.values())
    missing = [c for c in required_cols if c not in df.columns]
    if missing:
        print(f"Faltan columnas requeridas en el Excel: {missing}")
        sys.exit(1)

    df = df[required_cols].copy()
    
    df['ciclo'] = '2026-II'
    
    def parse_time(val):
        if pd.isna(val):
            return None
        return str(val)[:8] if len(str(val)) >= 5 else None

    df['hora_inicio'] = df['hora_inicio'].apply(parse_time)
    df['hora_fin'] = df['hora_fin'].apply(parse_time)
    
    df = df.dropna(subset=['codigo', 'seccion', 'hora_inicio', 'hora_fin', 'dia', 'tipo_clase'])

    records = df.to_dict('records')
    print(f"Se procesarán {len(records)} registros.")
    
    batch_size = 100
    for i in range(0, len(records), batch_size):
        batch = records[i:i + batch_size]
        try:
            response = supabase.table("carga_horaria").insert(batch).execute()
            print(f"Insertados {len(batch)} registros (Lote {i//batch_size + 1})")
        except Exception as e:
            print(f"Error insertando lote {i//batch_size + 1}: {e}")

    print("Carga horaria importada exitosamente.")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        default_file = os.path.join(os.path.dirname(__file__), "..", "..", "CARGA-HORARIA-2026-II-OFICIAL.xlsx")
        if os.path.exists(default_file):
            seed_carga_horaria(default_file)
        else:
            print("Uso: python seed_carga_horaria.py <ruta_al_excel>")
    else:
        seed_carga_horaria(sys.argv[1])
