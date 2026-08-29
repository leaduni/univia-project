"""Busca sílabos dentro de las carpetas de curso del Drive.

Sirve para saber, antes de generar rutas, de qué cursos hay sílabo disponible.
Solo lee: no escribe en la base ni descarga nada.

Uso:
    python buscar_silabos_drive.py                 # todas las carpetas
    python buscar_silabos_drive.py --codigos BQU01 BEF01
"""
import argparse
import os
import re
import sys

sys.stdout.reconfigure(encoding="utf-8")
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import requests
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

API_KEY = os.getenv("GOOGLE_DRIVE_API_KEY")
ROOT = "1EY6Bm0NXTm85VkVLIC7T4-lilubKDQDV"
FOLDER = "application/vnd.google-apps.folder"

# Los nombres reales están llenos de variantes y erratas: "Sylabo.pdf",
# "Syllabus rev 2025", "SILABO POR COMPETENCIA". Un patrón estrecho se salta
# sílabos que sí existen (pasó con BEF01), y eso empuja a reconstruir el
# temario adivinando. Se busca ancho: el falso positivo se descarta de un
# vistazo, el falso negativo cuesta mucho más caro.
PATRON_SILABO = re.compile(
    r"s[iyíé]l+[aá]b|s[yi]l+ab|sumilla|temario|plan\s*de\s*(clase|curso)",
    re.IGNORECASE,
)
PATRON_CODIGO = re.compile(r"([A-Za-z0-9]+)\s*$")


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


def recorrer(folder_id: str, profundidad: int = 0, maximo: int = 6) -> list:
    """Todos los archivos (no carpetas) bajo folder_id."""
    if profundidad > maximo:
        return []
    archivos = []
    for item in listar(folder_id):
        if item["mimeType"] == FOLDER:
            archivos += recorrer(item["id"], profundidad + 1, maximo)
        else:
            archivos.append(item)
    return archivos


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--codigos", nargs="*", help="Filtra por códigos de curso.")
    args = p.parse_args()

    if not API_KEY:
        raise SystemExit("Falta GOOGLE_DRIVE_API_KEY en backend/.env")

    filtro = {c.upper() for c in (args.codigos or [])}
    carpetas = [f for f in listar(ROOT) if f["mimeType"] == FOLDER]

    con_silabo, sin_silabo = [], []

    for carpeta in sorted(carpetas, key=lambda f: f["name"]):
        m = PATRON_CODIGO.search(carpeta["name"].strip())
        codigo = m.group(1).upper() if m else None
        if not codigo or (filtro and codigo not in filtro):
            continue

        archivos = recorrer(carpeta["id"])
        silabos = [a for a in archivos if PATRON_SILABO.search(a["name"])]

        if silabos:
            con_silabo.append(codigo)
            print(f"[OK]   {codigo}: {len(silabos)} candidato(s)", flush=True)
            for s in silabos[:5]:
                print(f"         {s['name']}", flush=True)
                print(f"         https://drive.google.com/file/d/{s['id']}/view", flush=True)
        else:
            sin_silabo.append(codigo)
            print(f"[--]   {codigo}: sin sílabo ({len(archivos)} archivos)", flush=True)

    print(f"\n=== Resumen ===")
    print(f"Con sílabo ({len(con_silabo)}): {' '.join(con_silabo)}")
    print(f"Sin sílabo ({len(sin_silabo)}): {' '.join(sin_silabo)}")


if __name__ == "__main__":
    main()
