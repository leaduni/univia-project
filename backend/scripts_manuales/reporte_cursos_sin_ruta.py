"""
Reporte de solo lectura: por cada carrera, cuántos cursos no tienen
`learning_path_steps` (ruta de aprendizaje), y de esos, cuántos ya tienen un
recurso tipo Silabo en Drive (candidatos a generar con
generar_silabos_faltantes.py) vs. cuántos no tienen ni sílabo (necesitan
ingesta primero).

No escribe nada en la base de datos.
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
    cursos_raw = sb.table("cursos").select("id, code, name").execute().data
    cursos_por_id = {c["id"]: c for c in cursos_raw}

    # cursos no tiene carrera_id/ciclo propios (N:N vía malla_cursos->mallas).
    # Un mismo curso puede repetirse en varias mallas vigentes de una misma
    # carrera (distintos planes conviviendo) con ciclo distinto; se toma el
    # ciclo de la primera malla vigente encontrada solo para mostrarlo.
    mallas = sb.table("mallas").select("id, carrera_id, es_vigente").execute().data
    malla_a_carrera = {m["id"]: m["carrera_id"] for m in mallas if m["es_vigente"]}

    malla_cursos = (
        sb.table("malla_cursos")
        .select("malla_id, curso_id, ciclo")
        .execute()
        .data
    )

    # curso_id -> {carrera_id: ciclo}, restringido a mallas vigentes.
    curso_en_carrera: dict[int, dict[int, int]] = defaultdict(dict)
    for mc in malla_cursos:
        carrera_id = malla_a_carrera.get(mc["malla_id"])
        if carrera_id is None:
            continue
        curso_en_carrera[mc["curso_id"]].setdefault(carrera_id, mc["ciclo"])

    steps = sb.table("learning_path_steps").select("curso_id").execute().data
    con_ruta = {s["curso_id"] for s in steps}

    silabos = (
        sb.table("recursos")
        .select("curso_id, drive_file_id")
        .eq("tipo", "Silabo")
        .execute()
        .data
    )
    con_silabo = {s["curso_id"] for s in silabos if s.get("drive_file_id")}

    por_carrera = defaultdict(list)
    total_por_carrera = defaultdict(int)
    for curso_id, carreras_del_curso in curso_en_carrera.items():
        c = cursos_por_id.get(curso_id)
        if not c:
            continue
        for carrera_id, ciclo in carreras_del_curso.items():
            total_por_carrera[carrera_id] += 1
            if curso_id not in con_ruta:
                por_carrera[carrera_id].append({**c, "ciclo": ciclo})

    total_sin_ruta_cursos_unicos = len({c["id"] for lst in por_carrera.values() for c in lst})

    print(f"Total cursos en el catálogo: {len(cursos_raw)}")
    print(f"Cursos únicos sin ninguna fila en learning_path_steps: {total_sin_ruta_cursos_unicos}")
    print("(un mismo curso puede listarse en más de una carrera si es compartido, ej. cursos de FB)\n")

    for carrera_id, faltantes in sorted(por_carrera.items(), key=lambda kv: -len(kv[1])):
        carrera = carreras.get(carrera_id, {"codigo": "?", "name": f"carrera_id={carrera_id}"})
        total_carrera = total_por_carrera[carrera_id]
        con_silabo_pero_sin_ruta = [c for c in faltantes if c["id"] in con_silabo]
        sin_silabo = [c for c in faltantes if c["id"] not in con_silabo]

        print(f"=== {carrera['codigo']} — {carrera['name']} ===")
        print(f"  {len(faltantes)}/{total_carrera} cursos sin ruta de aprendizaje")
        print(f"    - {len(con_silabo_pero_sin_ruta)} tienen sílabo en Drive (generables ya)")
        print(f"    - {len(sin_silabo)} NO tienen sílabo (requieren ingesta primero)")
        print()

        for c in sorted(faltantes, key=lambda c: (c["ciclo"] or 0, c["code"])):
            marca = "OK sílabo " if c["id"] in con_silabo else "SIN sílabo"
            print(f"    Ciclo {c['ciclo']:>2} · {c['code']:<10} {c['name']:<50} [{marca}]")
        print()


if __name__ == "__main__":
    main()
