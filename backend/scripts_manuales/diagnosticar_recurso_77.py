import os
import re
import sys
import requests
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Faltan las credenciales de Supabase en el archivo .env")
    sys.exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def diagnosticar_recurso(recurso_id: int):
    # 1. Consultar la fila en Supabase
    res = supabase.table("recursos").select("*").eq("id", recurso_id).execute()
    if not res.data:
        print(f"❌ No se encontró ningún recurso con ID {recurso_id}")
        return
    
    recurso = res.data[0]
    preview_url = recurso.get("preview_url") or recurso.get("drive_path")
    
    print(f"📌 Recurso ID: {recurso['id']}")
    print(f"📝 Título: {recurso.get('titulo')}")
    print(f"🏷️ Estado actual: {recurso.get('rag_status')}")
    print(f"🔗 URL en base de datos: {preview_url}\n")
    
    if not preview_url:
        print("❌ El campo preview_url / drive_path está vacío.")
        return

    # 2. Extraer el File ID de la URL
    match = re.search(r'/d/([a-zA-Z0-9_-]+)', preview_url) or re.search(r'id=([a-zA-Z0-9_-]+)', preview_url)
    if not match:
        print("❌ No se pudo extraer el ID de Google Drive desde la URL.")
        return
    
    file_id = match.group(1)
    print(f"🆔 File ID de Drive: {file_id}")

    # 3. Simular la petición que realiza el script de ingesta
    download_url = f"https://drive.google.com/uc?export=download&id={file_id}"
    session = requests.Session()
    
    print(f"🌐 Solicitando descarga a: {download_url}")
    response = session.get(download_url, stream=True)
    
    content_type = response.headers.get("Content-Type", "")
    content_length = response.headers.get("Content-Length", "Desconocido")
    
    print(f"📊 Código de respuesta HTTP: {response.status_code}")
    print(f"📄 Tipo de Contenido (Content-Type): {content_type}")
    print(f"📦 Tamaño reportado: {content_length} bytes\n")

    # 4. Determinar la causa exacta
    if "text/html" in content_type:
        html_snippet = response.content[:1000].decode("utf-8", errors="ignore")
        print("⚠️ RESULTADO DEL DIAGNÓSTICO: Google entregó una página HTML en lugar del binario.")
        
        if "download-warning" in html_snippet or "confirm=" in html_snippet:
            print("💡 CAUSA REAL: El archivo supera el tamaño máximo permitido para descarga directa. Requiere token de confirmación de virus.")
        elif "429" in html_snippet or "Too Many Requests" in html_snippet:
            print("💡 CAUSA REAL: Límite de tasa alcanzado (Google bloqueó temporalmente tu IP por realizar demasiadas peticiones).")
        else:
            print("💡 CAUSA REAL: Google requiere autenticación de sesión o redirigió a una página de confirmación.")
    elif response.status_code == 200:
        print("✅ RESULTADO DEL DIAGNÓSTICO: El archivo se puede descargar directamente como binario.")
    else:
        print(f"❌ RESULTADO DEL DIAGNÓSTICO: Fallo en el servidor de Google con código HTTP {response.status_code}.")

if __name__ == "__main__":
    diagnosticar_recurso(77)