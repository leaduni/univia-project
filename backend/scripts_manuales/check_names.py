import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))
from app.core.database import get_supabase
sb = get_supabase()

print('Verificando chunks por nombre de curso...')
res = sb.table('cursos').select('id, name').in_('id', [12, 18]).execute()
for c in res.data:
    print(f"Curso ID {c['id']}: {c['name']}")

res2 = sb.table('resource_chunks').select('id, nombre_curso').eq('curso_id', 12).limit(3).execute()
print('Muestra de resource_chunks para curso 12 (Diferencial):')
for r in res2.data:
    print(r)
