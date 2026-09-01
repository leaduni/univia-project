"""
Diagnóstico de solo lectura: cursos de ciclo 1 en mallas vigentes, cruzados
con su estado de ingesta (recursos existentes / rag_status) y ruta de
aprendizaje. No escribe nada en la base.
"""
import os
import sys
from collections import defaultdict

sys.stdout.reconfigure(encoding="utf-8")
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

from app.core.database import get_admin_client


def main():
    sb = get_admin_client()

    carreras = {c["id"]: c for c in sb.table("carreras").select("id, codigo, name").execute().data}
    cursos_por_id = {c["id"]: c for c in sb.table("cursos").select("id, code, name").execute().data}

    mallas = sb.table("mallas").select("id, carrera_id, es_vigente").execute().data
    malla_a_carrera = {m["id"]: m["carrera_id"] for m in mallas if m["es_vigente"]}
    print(f"Mallas vigentes: {len(malla_a_carrera)} / {len(mallas)} totales")

    malla_cursos = sb.table("malla_cursos").select("malla_id, curso_id, ciclo").execute().data

    # (carrera_id, curso_id) -> ciclo, solo ciclo 1 en mallas vigentes
    ciclo1 = []
    for mc in malla_cursos:
        carrera_id = malla_a_carrera.get(mc["malla_id"])
        if carrera_id is None or mc["ciclo"] != 1:
            continue
        ciclo1.append((carrera_id, mc["curso_id"]))

    curso_ids_ciclo1 = sorted({cid for _, cid in ciclo1})
    print(f"\nCursos únicos de ciclo 1 (mallas vigentes): {len(curso_ids_ciclo1)}")

    # recursos: todos los tipos, para saber si el curso tiene material mapeado
    # (paginado: PostgREST limita a 1000 filas por página por defecto)
    recursos = []
    page_size = 1000
    inicio = 0
    while True:
        resp = (
            sb.table("recursos")
            .select("curso_id, tipo, rag_status")
            .in_("curso_id", curso_ids_ciclo1)
            .range(inicio, inicio + page_size - 1)
            .execute()
        )
        pagina = resp.data or []
        recursos.extend(pagina)
        if len(pagina) < page_size:
            break
        inicio += page_size
    por_curso = defaultdict(list)
    for r in recursos:
        por_curso[r["curso_id"]].append(r)

    steps = sb.table("learning_path_steps").select("curso_id").in_("curso_id", curso_ids_ciclo1).execute().data
    con_ruta = {s["curso_id"] for s in steps}

    sin_recursos = []
    con_pendientes = []
    todo_completo = []

    for cid in curso_ids_ciclo1:
        c = cursos_por_id.get(cid, {"code": "?", "name": f"id={cid}"})
        filas = por_curso.get(cid, [])
        if not filas:
            sin_recursos.append(c)
            continue
        objetivo = [f for f in filas if f["tipo"] in ("Examen", "Practica", "examen", "practica")]
        pendientes = [f for f in objetivo if f.get("rag_status") in ("pending", "failed", None)]
        if pendientes:
            con_pendientes.append((c, len(pendientes), len(objetivo)))
        else:
            todo_completo.append((c, len(objetivo)))

    print(f"\n=== SIN NINGÚN RECURSO MAPEADO (necesitan ingestar_recursos_drive.py primero) ===")
    for c in sorted(sin_recursos, key=lambda c: c["code"]):
        print(f"  {c['code']:<12} {c['name']}")
    print(f"  Total: {len(sin_recursos)}")

    print(f"\n=== CON RECURSOS PENDIENTES DE CHUNKING (candidatos a generar_chunks_desde_drive.py) ===")
    for c, n_pend, n_obj in sorted(con_pendientes, key=lambda x: x[0]["code"]):
        print(f"  {c['code']:<12} {c['name']:<45} pendientes: {n_pend}/{n_obj}")
    print(f"  Total cursos: {len(con_pendientes)} | recursos pendientes: {sum(n for _, n, _ in con_pendientes)}")

    print(f"\n=== YA COMPLETOS (Examen/Practica ya en rag_status=complete) ===")
    for c, n_obj in sorted(todo_completo, key=lambda x: x[0]["code"]):
        print(f"  {c['code']:<12} {c['name']:<45} recursos objetivo: {n_obj}")
    print(f"  Total: {len(todo_completo)}")

    print(f"\n=== RUTA DE APRENDIZAJE (learning_path_steps) ===")
    sin_ruta = [cursos_por_id[cid] for cid in curso_ids_ciclo1 if cid not in con_ruta and cid in cursos_por_id]
    print(f"  Con ruta: {len(con_ruta & set(curso_ids_ciclo1))} / {len(curso_ids_ciclo1)}")
    for c in sorted(sin_ruta, key=lambda c: c["code"]):
        print(f"  SIN RUTA: {c['code']:<12} {c['name']}")

    ids_pendientes = sorted({c["id"] for c, _, _ in [(cursos_por_id[cid], 0, 0) for cid, _ in [] ]})  # placeholder unused
    print("\nIDs de curso con pendientes (para --course_id):")
    print(",".join(str(cursos_por_id_id) for cursos_por_id_id in sorted({cid for cid in curso_ids_ciclo1 if any(f["curso_id"] == cid and f["tipo"] in ("Examen","Practica","examen","practica") and f.get("rag_status") in ("pending","failed",None) for f in por_curso.get(cid, []))})))


if __name__ == "__main__":
    main()
