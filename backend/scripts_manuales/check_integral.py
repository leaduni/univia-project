import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))
from app.core.database import get_supabase
sb = get_supabase()
res = sb.table('cursos').select('id, code, name, ciclo').ilike('name', '%Integral%').execute()
for c in res.data:
    print(c)
