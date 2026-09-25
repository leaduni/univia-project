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
        df = pd.read_excel(excel_path, header=7)
    except Exception as e:
        print(f"Error al leer el archivo Excel: {e}")
        sys.exit(1)

    # Renombrar columnas por índice para evitar problemas de codificación ()
    df.columns = [
        "codigo", "nombre_curso", "seccion", "eval", 
        "docente", "tipo_clase", "aula", "dia", 
        "hora_inicio", "hora_fin", "dni", "vacantes"
    ] + list(df.columns[12:])
    
    required_cols = ["codigo", "nombre_curso", "seccion", "docente", "tipo_clase", "aula", "dia", "hora_inicio", "hora_fin"]
    missing = [c for c in required_cols if c not in df.columns]
    if missing:
        print(f"Faltan columnas requeridas en el Excel: {missing}")
        print("Columnas actuales:", list(df.columns))
        sys.exit(1)

    df = df[required_cols].copy()
    
    df['ciclo'] = '2026-II'
    
    def parse_time(val):
        if pd.isna(val):
            return None
        # Convert floats like 9.0 to 9
        if isinstance(val, float) and val.is_integer():
            val = int(val)
        s = str(val).strip()
        if len(s) <= 2 and s.isdigit():
            return f"{int(s):02d}:00:00"
        return s[:8] if len(s) >= 5 else None

    df['hora_inicio'] = df['hora_inicio'].apply(parse_time)
    df['hora_fin'] = df['hora_fin'].apply(parse_time)
    
    df = df.dropna(subset=['codigo', 'seccion', 'hora_inicio', 'hora_fin', 'dia', 'tipo_clase'])

    def normalize_tipo(t):
        t = str(t).strip().upper()
        if "PRA" in t or "P" == t: return "P"
        if "LAB" in t or "PC" in t: return "LAB"
        if "TEO" in t or "T" == t: return "T"
        return "T" # fallback

    df['tipo_clase'] = df['tipo_clase'].apply(normalize_tipo)
    
    # Limpiar espacios extra y mayúsculas en 'dia', 'codigo'
    df['dia'] = df['dia'].apply(lambda x: str(x).strip().upper() if pd.notnull(x) else x)
    df['codigo'] = df['codigo'].apply(lambda x: str(x).strip() if pd.notnull(x) else x)

    # Convertir todo a object y reemplazar nan con None estrictamente
    import numpy as np
    df = df.replace({np.nan: None})
    # Asegurar que floats sueltos se limpien de nan
    for col in df.columns:
        df[col] = df[col].apply(lambda x: None if pd.isna(x) else x)

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
