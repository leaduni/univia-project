import os
import sys
import pandas as pd
from datetime import datetime
from dotenv import load_dotenv
from supabase import create_client, Client

# Cargar variables de entorno
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: Configura SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en el .env")
    sys.exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Mapeos
MAPA_DIAS = {
    "LU": 1, "LUN": 1, "LUNES": 1,
    "MA": 2, "MAR": 2, "MARTES": 2,
    "MI": 3, "MIE": 3, "MIERCOLES": 3,
    "JU": 4, "JUE": 4, "JUEVES": 4,
    "VI": 5, "VIE": 5, "VIERNES": 5,
    "SA": 6, "SAB": 6, "SABADO": 6,
    "DO": 7, "DOM": 7, "DOMINGO": 7
}

MAPA_TIPOS = {
    "T": "TEORIA",
    "P": "PRACTICA",
    "L": "LABORATORIO",
    "TEORIA": "TEORIA",
    "PRACTICA": "PRACTICA",
    "LABORATORIO": "LABORATORIO"
}

def parse_time(t):
    if pd.isna(t):
        return "00:00:00"
    if isinstance(t, datetime):
        return t.strftime("%H:%M:%S")
    # Si es string
    return str(t).strip()

def procesar_archivo(filepath: str, periodo: str):
    print(f"Leyendo archivo: {filepath}")
    
    if filepath.endswith(".csv"):
        df = pd.read_csv(filepath)
    else:
        df = pd.read_excel(filepath)
    
    # Estandarizar columnas (mayúsculas y sin espacios extras)
    df.columns = [str(c).strip().upper() for c in df.columns]
    
    # Renombrar heurísticamente si es necesario (asumiendo estructura solicitada)
    # [CÓDIGO, NOMBRE DEL CURSO, SECCIÓN, APELLIDOS Y NOMBRES DEL DOCENTE, TIPO CLASE, AULA, DÍA, HORA INICIO, HORA FINAL, VACANTES]
    
    # Mapeo flexible de columnas
    col_mapping = {
        "CÓDIGO": "curso_codigo", "CODIGO": "curso_codigo",
        "NOMBRE DEL CURSO": "curso_nombre",
        "SECCIÓN": "seccion", "SECCION": "seccion",
        "APELLIDOS Y NOMBRES DEL DOCENTE": "docente", "DOCENTE": "docente",
        "TIPO CLASE": "tipo_clase", "TIPO": "tipo_clase",
        "AULA": "aula",
        "DÍA": "dia", "DIA": "dia",
        "HORA INICIO": "hora_inicio",
        "HORA FINAL": "hora_final", "HORA FIN": "hora_final",
        "VACANTES": "vacantes"
    }
    
    # Renombrar columnas encontradas
    df.rename(columns=lambda x: col_mapping.get(x, x), inplace=True)
    
    secciones_creadas = {} # Cache local
    
    print(f"Procesando {len(df)} registros...")
    
    for idx, row in df.iterrows():
        try:
            codigo = str(row.get("curso_codigo", "")).strip()
            seccion = str(row.get("seccion", "")).strip()
            docente = str(row.get("docente", "")).strip()
            vacantes = int(row.get("vacantes", 40)) if not pd.isna(row.get("vacantes")) else 40
            
            tipo = str(row.get("tipo_clase", "")).strip().upper()
            aula = str(row.get("aula", "")).strip()
            dia_raw = str(row.get("dia", "")).strip().upper()
            
            hora_inicio = parse_time(row.get("hora_inicio"))
            hora_final = parse_time(row.get("hora_final"))
            
            if not codigo or not seccion:
                continue
                
            codigo_completo = f"{codigo}-{seccion}"
            
            # 1. Crear o recuperar la sección
            if codigo_completo not in secciones_creadas:
                # Intentar buscar primero
                resp = supabase.table("malla_secciones").select("id").eq("codigo_completo", codigo_completo).execute()
                if resp.data:
                    seccion_id = resp.data[0]["id"]
                else:
                    # Insertar nueva sección
                    payload_sec = {
                        "curso_codigo": codigo,
                        "seccion": seccion,
                        "codigo_completo": codigo_completo,
                        "docente": docente,
                        "vacantes": vacantes,
                        "periodo": periodo
                    }
                    insert_resp = supabase.table("malla_secciones").insert(payload_sec).execute()
                    seccion_id = insert_resp.data[0]["id"]
                
                secciones_creadas[codigo_completo] = seccion_id
            
            seccion_id = secciones_creadas[codigo_completo]
            
            # 2. Validar día y tipo
            dia_num = MAPA_DIAS.get(dia_raw, 1) # Default a lunes
            tipo_estandar = MAPA_TIPOS.get(tipo, "TEORIA")
            
            # 3. Crear el bloque horario
            payload_bloque = {
                "seccion_id": seccion_id,
                "tipo": tipo_estandar,
                "aula": aula,
                "dia_semana": dia_num,
                "hora_inicio": hora_inicio,
                "hora_fin": hora_final
            }
            supabase.table("malla_bloques_horario").insert(payload_bloque).execute()
            
        except Exception as e:
            print(f"Error procesando fila {idx+2}: {e}")

    print("✅ Ingesta masiva completada.")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Uso: python ingestar_carga_horaria.py <ruta_archivo.xlsx/csv> <periodo>")
        print("Ejemplo: python ingestar_carga_horaria.py horarios.xlsx 2026-1")
        sys.exit(1)
        
    archivo = sys.argv[1]
    periodo_acad = sys.argv[2]
    
    if not os.path.exists(archivo):
        print(f"Error: No se encontró el archivo {archivo}")
        sys.exit(1)
        
    procesar_archivo(archivo, periodo_acad)
