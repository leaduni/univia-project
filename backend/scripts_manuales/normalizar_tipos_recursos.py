import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

from app.core.database import get_supabase
from app.core.tipos_recursos import normalizar_tipo

sb = get_supabase()

r1 = sb.table("recursos").select("id, tipo").execute()
cambios = 0
for row in r1.data:
    tipo_actual = row.get("tipo", "")
    tipo_norm = normalizar_tipo(tipo_actual)
    if tipo_norm and tipo_norm != tipo_actual:
        sb.table("recursos").update({"tipo": tipo_norm}).eq("id", row["id"]).execute()
        print(f"  ID {row['id']}: '{tipo_actual}' -> '{tipo_norm}'")
        cambios += 1

print(f"\nTotal normalizados: {cambios}")
r2 = sb.table("recursos").select("tipo").execute()
conteo = {}
for row in r2.data:
    t = row["tipo"]
    conteo[t] = conteo.get(t, 0) + 1
print("Tipos actuales en BD:", conteo)
