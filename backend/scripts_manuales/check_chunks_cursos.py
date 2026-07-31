import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))
from app.core.database import get_supabase
sb = get_supabase()

ids = [11, 12, 13, 26]
res = sb.table('cursos').select('id, code, name, ciclo').in_('id', ids).execute()
for c in res.data:
    print(f"curso_id={c['id']}: {c['code']} - {c['name']}")
