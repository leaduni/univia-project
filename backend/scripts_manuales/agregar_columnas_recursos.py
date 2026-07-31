"""
Agrega las columnas url_drive, nombre_curso y codigo_curso a la tabla recursos.
"""
import sys, os, requests
sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

SUPABASE_URL = os.getenv("SUPABASE_URL")
SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

headers = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
}

SQL_STATEMENTS = [
    "ALTER TABLE recursos ADD COLUMN IF NOT EXISTS url_drive TEXT",
    "ALTER TABLE recursos ADD COLUMN IF NOT EXISTS nombre_curso TEXT",
    "ALTER TABLE recursos ADD COLUMN IF NOT EXISTS codigo_curso TEXT",
]

for sql in SQL_STATEMENTS:
    resp = requests.post(
        f"{SUPABASE_URL}/rest/v1/rpc/exec",
        headers=headers,
        json={"sql": sql},
    )
    status = "OK" if resp.status_code in (200, 204) else f"ERROR {resp.status_code}: {resp.text[:100]}"
    print(f"[{status}] {sql[:60]}")

print("\nVerificando columnas actuales...")
from app.core.database import get_supabase
sb = get_supabase()
row = sb.table("recursos").select("*").limit(1).execute()
if row.data:
    print("Columnas:", list(row.data[0].keys()))
