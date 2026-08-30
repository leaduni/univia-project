import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()
sb = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_ROLE_KEY"))

# Traer recursos en estado pending
res = sb.table("recursos").select("curso_id").eq("rag_status", "pending").not_.is_("curso_id", "null").execute()

conteo = {}
for r in res.data:
    cid = r["curso_id"]
    conteo[cid] = conteo.get(cid, 0) + 1

# Ordenar de mayor a menor y tomar el TOP 10
top_cursos = sorted(conteo.items(), key=lambda x: x[1], reverse=True)[:10]

print("\n--- TOP CURSOS CON MÁS RECURSOS PENDIENTES ---")
for cid, total in top_cursos:
    c_info = sb.table("cursos").select("*").eq("id", cid).maybe_single().execute()
    data = c_info.data or {}
    nombre = data.get("name") or data.get("nombre") or "Desconocido"
    codigo = data.get("code") or data.get("codigo") or "N/A"
    print(f"ID: {cid} | Código: {codigo} | Nombre: {nombre} | Pendientes: {total}")