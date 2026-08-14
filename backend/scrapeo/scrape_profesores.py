"""Scraper de profesores por curso desde Horext (sistema de horarios de la UNI).

Fuente: https://horext.octatec.io/generator/subjects — API pública en
api.horext.octatec.io, sin autenticación. Por cada curso de las 3 carreras
(Sistemas, Software, Industrial) trae las secciones/horarios y extrae el
profesor de cada sesión.

El curso se empareja con la base de datos por `cursos.code` == Horext
`course.id` (ambos son el código real de la UNI sin sufijo de carrera, desde
la migración fase 8: base_de_datos/esquema/migracion_fase8_consolidar_cursos.sql).
Un mismo código puede aparecer en las 3 carreras con distintos profesores por
sección; todos se asocian a la misma materia (curso_profesores es N:N, ver
migracion_fase6_profesores.sql).

Pausa entre peticiones porque la API no es nuestra: no hay necesidad de
golpearla más rápido de lo que un usuario navegando la página lo haría.
"""
import os
import re
import sys
import time

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

import requests

from app.core.database import get_admin_client

API_BASE = "https://api.horext.octatec.io"
HOURLY_LOAD = 332
SPECIALITIES = {
    2: "Ingeniería de Software",
    11: "Ingeniería Industrial",
    12: "Ingeniería de Sistemas",
}
HEADERS = {"User-Agent": "Mozilla/5.0"}
PAUSA = 0.25


def obtener_cursos_de_especialidad(speciality: int) -> list:
    resp = requests.get(
        f"{API_BASE}/subjects",
        params={"speciality": speciality, "hourlyLoad": HOURLY_LOAD},
        headers=HEADERS,
        timeout=20,
    )
    resp.raise_for_status()
    return resp.json()


def normalizar_nombre(nombre: str) -> str:
    """Colapsa espacios (incluye NBSP \\xa0, que Horext mezcla con espacios
    normales de forma inconsistente en algunos registros) a uno solo.

    Sin esto, el mismo profesor puede quedar como dos filas distintas en
    `profesores` porque el UNIQUE es por string literal, no por contenido
    normalizado (ej. "ACOSTA DE LA CRUZ, PEDRO RAUL" vs "ACOSTA DE LA CRUZ,
    \\xa0PEDRO RAUL").
    """
    return re.sub(r"\s+", " ", nombre.replace("\xa0", " ")).strip()


def obtener_profesores_de_curso(horext_subject_id: int) -> set:
    resp = requests.get(
        f"{API_BASE}/scheduleSubjects",
        params={"subject": horext_subject_id, "hourlyLoad": HOURLY_LOAD},
        headers=HEADERS,
        timeout=20,
    )
    resp.raise_for_status()
    nombres = set()
    for entrada in resp.json():
        sesiones = (entrada.get("schedule") or {}).get("sessions") or []
        for sesion in sesiones:
            docente = (sesion.get("teacher") or {}).get("fullName")
            if not docente:
                continue
            docente = normalizar_nombre(docente)
            # "NN" es el placeholder de Horext para sección sin docente asignado.
            if docente and docente.upper() != "NN":
                nombres.add(docente)
    return nombres


def main():
    sb = get_admin_client()

    cursos_resp = sb.table("cursos").select("id, code").execute()
    cursos_por_code = {c["code"]: c["id"] for c in (cursos_resp.data or [])}
    print(f"{len(cursos_por_code)} cursos en la BD para emparejar por code.")

    # code -> set(nombres de profesores), acumulado a través de las 3 carreras
    profesores_por_code = {}
    codigos_sin_match = set()

    for speciality, nombre_carrera in SPECIALITIES.items():
        cursos_horext = obtener_cursos_de_especialidad(speciality)
        print(f"\n{nombre_carrera} (speciality={speciality}): {len(cursos_horext)} cursos en Horext")

        for i, item in enumerate(cursos_horext, 1):
            code = (item.get("course") or {}).get("id")
            horext_subject_id = item.get("id")
            if not code or horext_subject_id is None:
                continue

            if code not in cursos_por_code:
                codigos_sin_match.add(code)
                continue

            time.sleep(PAUSA)
            try:
                nombres = obtener_profesores_de_curso(horext_subject_id)
            except requests.RequestException as e:
                print(f"  [{i}/{len(cursos_horext)}] {code}: error consultando horario ({e})")
                continue

            if nombres:
                profesores_por_code.setdefault(code, set()).update(nombres)
                print(f"  [{i}/{len(cursos_horext)}] {code}: {len(nombres)} docente(s)")

    print(f"\nCódigos de Horext sin curso equivalente en la BD (se omiten): {len(codigos_sin_match)}")
    if codigos_sin_match:
        print("  " + ", ".join(sorted(codigos_sin_match)))

    # --- Insertar profesores (dedup por nombre) ---
    todos_los_nombres = sorted({n for nombres in profesores_por_code.values() for n in nombres})
    print(f"\n{len(todos_los_nombres)} profesores distintos encontrados.")

    if todos_los_nombres:
        sb.table("profesores").upsert(
            [{"nombre_completo": n} for n in todos_los_nombres],
            on_conflict="nombre_completo",
        ).execute()

    profesores_resp = sb.table("profesores").select("id, nombre_completo").execute()
    profesor_id_por_nombre = {p["nombre_completo"]: p["id"] for p in (profesores_resp.data or [])}

    # --- Insertar relaciones curso_profesores ---
    relaciones = []
    for code, nombres in profesores_por_code.items():
        curso_id = cursos_por_code[code]
        for nombre in nombres:
            profesor_id = profesor_id_por_nombre.get(nombre)
            if profesor_id:
                relaciones.append({"curso_id": curso_id, "profesor_id": profesor_id})

    print(f"{len(relaciones)} relaciones curso-profesor a insertar.")
    if relaciones:
        sb.table("curso_profesores").upsert(
            relaciones, on_conflict="curso_id, profesor_id"
        ).execute()

    print("\nListo.")


if __name__ == "__main__":
    main()
