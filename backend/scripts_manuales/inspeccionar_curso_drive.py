"""Muestra el árbol de una carpeta de curso del Drive.

Sirve para decidir si un curso sin sílabo tiene material lo bastante ordenado
(por semana, unidad o clase) como para derivar de ahí su ruta de aprendizaje.
Solo lee: no escribe nada ni descarga archivos.

Uso:
    python inspeccionar_curso_drive.py --codigos BRC01 BEF01
    python inspeccionar_curso_drive.py --codigos BRC01 --archivos 40
"""
import argparse
import os
import re
import sys
from collections import Counter

sys.stdout.reconfigure(encoding="utf-8")
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import requests
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

API_KEY = os.getenv("GOOGLE_DRIVE_API_KEY")
ROOT = "1EY6Bm0NXTm85VkVLIC7T4-lilubKDQDV"
FOLDER = "application/vnd.google-apps.folder"
PATRON_CODIGO = re.compile(r"([A-Za-z0-9]+)\s*$")

# Señales de que el material lleva un orden temporal o temático propio: si
# abundan, el temario se puede reconstruir sin sílabo.
PATRON_ORDEN = re.compile(r"\b(semana|unidad|clase|sesi[oó]n|cap[ií]tulo|tema)\s*\.?\s*(\d+)", re.IGNORECASE)


def listar(folder_id: str) -> list:
    items, token = [], None
    while True:
        params = {
            "q": f"'{folder_id}' in parents and trashed=false",
            "key": API_KEY,
            "fields": "nextPageToken,files(id,name,mimeType)",
            "pageSize": 1000,
        }
        if token:
            params["pageToken"] = token
        r = requests.get("https://www.googleapis.com/drive/v3/files",
                         params=params, timeout=30)
        r.raise_for_status()
        d = r.json()
        items += d.get("files", [])
        token = d.get("nextPageToken")
        if not token:
            return items


def arbol(folder_id: str, prefijo: str = "", profundidad: int = 0, maximo: int = 2,
          acumulador: list = None) -> list:
    """Imprime el árbol hasta `maximo` niveles y acumula todos los archivos."""
    if acumulador is None:
        acumulador = []
    if profundidad > maximo:
        return acumulador

    items = listar(folder_id)
    carpetas = [i for i in items if i["mimeType"] == FOLDER]
    archivos = [i for i in items if i["mimeType"] != FOLDER]
    acumulador.extend(archivos)

    for c in sorted(carpetas, key=lambda x: x["name"]):
        hijos = listar(c["id"])
        n_arch = len([h for h in hijos if h["mimeType"] != FOLDER])
        n_carp = len([h for h in hijos if h["mimeType"] == FOLDER])
        detalle = f"{n_arch} archivos" + (f", {n_carp} subcarpetas" if n_carp else "")
        print(f"{prefijo}  |- [{c['name']}]  ({detalle})")
        arbol(c["id"], prefijo + "  |", profundidad + 1, maximo, acumulador)

    return acumulador


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--codigos", nargs="+", required=True)
    p.add_argument("--archivos", type=int, default=25,
                   help="Cuántos nombres de archivo mostrar como muestra.")
    args = p.parse_args()

    if not API_KEY:
        raise SystemExit("Falta GOOGLE_DRIVE_API_KEY en backend/.env")

    filtro = {c.upper() for c in args.codigos}
    carpetas = [f for f in listar(ROOT) if f["mimeType"] == FOLDER]

    for carpeta in sorted(carpetas, key=lambda f: f["name"]):
        m = PATRON_CODIGO.search(carpeta["name"].strip())
        codigo = m.group(1).upper() if m else None
        if codigo not in filtro:
            continue

        print(f"\n{'=' * 70}")
        print(f"{carpeta['name']}")
        print("=" * 70)

        archivos = arbol(carpeta["id"])

        # ¿El material lleva numeración propia?
        con_orden = [a for a in archivos if PATRON_ORDEN.search(a["name"])]
        tipos = Counter(a["name"].rsplit(".", 1)[-1].lower()
                        if "." in a["name"] else "(sin ext)"
                        for a in archivos)

        print(f"\n  Total archivos: {len(archivos)}")
        print(f"  Formatos: {dict(tipos.most_common(8))}")
        print(f"  Con numeración (semana/unidad/clase/sesión): {len(con_orden)}")

        if con_orden:
            print(f"\n  Muestra de archivos numerados:")
            for a in sorted(con_orden, key=lambda x: x["name"])[:args.archivos]:
                print(f"    - {a['name']}")
        else:
            print(f"\n  Muestra de archivos:")
            for a in sorted(archivos, key=lambda x: x["name"])[:args.archivos]:
                print(f"    - {a['name']}")


if __name__ == "__main__":
    main()
