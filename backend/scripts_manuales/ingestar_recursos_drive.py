"""
Barre la carpeta pública de Drive con los PDFs de recursos por curso y hace
upsert de cada archivo en la tabla `recursos`.

Requiere:
  - GOOGLE_DRIVE_API_KEY en .env (ver .env.example: no hace falta service
    account porque la carpeta es pública, alcanza con una API key con
    "Google Drive API" habilitada en Google Cloud Console).
  - Haber corrido antes base_de_datos/esquema/migracion_fase4_recursos.sql
    (agrega las columnas url_drive/drive_file_id/nombre_curso/codigo_curso).

Reintentable: usa curso_id resuelto para elegir entre insertar o actualizar,
así que correrlo de nuevo no duplica filas.
"""
import os
import re
import sys
from collections import defaultdict

sys.stdout.reconfigure(encoding="utf-8")
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import requests
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

from app.core.database import get_admin_client
from app.core.tipos_recursos import normalizar_tipo

ROOT_FOLDER_ID = "1EY6Bm0NXTm85VkVLIC7T4-lilubKDQDV"
API_KEY = os.getenv("GOOGLE_DRIVE_API_KEY")

MIME_FOLDER = "application/vnd.google-apps.folder"
MIME_PDF = "application/pdf"

# Carpetas que no representan un curso vigente y no deben ingerirse.
SKIP_FOLDER_NAMES = {"AA000 - Cursos eliminados"}

# "Álgebra lineal - BMA03" -> ("Álgebra lineal", "BMA03")
FOLDER_PATTERN = re.compile(r"^(.*?)\s*-\s*([A-Za-z0-9]+)\s*$")


def drive_list(folder_id: str) -> list:
    """Lista (paginando) los items directos de una carpeta de Drive."""
    if not API_KEY:
        raise RuntimeError("Falta GOOGLE_DRIVE_API_KEY en el .env")

    items = []
    page_token = None
    while True:
        params = {
            "q": f"'{folder_id}' in parents and trashed=false",
            "key": API_KEY,
            "fields": "nextPageToken, files(id,name,mimeType,createdTime)",
            "pageSize": 1000,
        }
        if page_token:
            params["pageToken"] = page_token
        resp = requests.get(
            "https://www.googleapis.com/drive/v3/files", params=params, timeout=30
        )
        resp.raise_for_status()
        data = resp.json()
        items.extend(data.get("files", []))
        page_token = data.get("nextPageToken")
        if not page_token:
            break
    return items


def collect_pdfs(folder_id: str, depth: int = 1, max_depth: int = 3) -> list:
    """Recolecta PDFs de una carpeta, bajando hasta max_depth niveles."""
    items = drive_list(folder_id)
    pdfs = [f for f in items if f.get("mimeType") == MIME_PDF]
    subfolders = [f for f in items if f.get("mimeType") == MIME_FOLDER]

    if subfolders and depth + 1 >= max_depth:
        print(f"  [WARN] Subcarpetas no exploradas por profundidad máxima ({max_depth}): "
              f"{[f['name'] for f in subfolders]}")
    else:
        for sf in subfolders:
            pdfs.extend(collect_pdfs(sf["id"], depth + 1, max_depth))
    return pdfs


def inferir_tipo(filename: str) -> str:
    name = filename.lower()
    # Abreviaturas típicas de la UNI: EP/EF/ES = Examen Parcial/Final/Sustitutorio,
    # PC(n) = Práctica Calificada, PD(n) = Práctica Dirigida.
    if any(k in name for k in ("examen", "parcial", "final")) or re.search(r"\b(ep|ef|es)\b", name):
        return "examen"
    if "practica" in name or "práctica" in name or re.search(r"\bp[cd]\d*\b", name):
        return "practica"
    if "silabo" in name or "sílabo" in name:
        return "silabo"
    if "compendio" in name:
        return "compendio"
    if "libro" in name or "texto" in name:
        return "libro"
    if any(k in name for k in ("apunte", "clase", "teoria", "teoría")):
        return "apunte"
    if "video" in name:
        return "video"
    return "pdf"


def parse_year(text: str):
    if not text:
        return None
    m = re.search(r"(19|20)\d{2}", text)
    return int(m.group(0)) if m else None


def main():
    sb = get_admin_client()

    print("Cargando cursos...")
    cursos_resp = sb.table("cursos").select("id, code, name").execute()
    prefix_map = defaultdict(list)
    for c in cursos_resp.data or []:
        code = (c.get("code") or "").strip()
        if not code:
            continue
        prefix = code.split("_")[0].upper()
        prefix_map[prefix].append(c)

    # El ciclo vive en malla_cursos (esquema actual), no en `cursos`.
    ciclo_por_curso = {}
    mc_resp = sb.table("malla_cursos").select("curso_id, ciclo").execute()
    for m in mc_resp.data or []:
        if m.get("ciclo") is not None:
            ciclo_por_curso.setdefault(m["curso_id"], m["ciclo"])

    print(f"  {len(cursos_resp.data or [])} cursos cargados, {len(prefix_map)} prefijos de código.")

    print("\nListando carpetas de Drive...")
    root_items = drive_list(ROOT_FOLDER_ID)
    folders = [f for f in root_items if f.get("mimeType") == MIME_FOLDER]
    print(f"  {len(folders)} carpetas encontradas en la raíz.")

    rows = []
    stats = {"carpetas_ok": 0, "carpetas_sin_match": 0, "carpetas_omitidas": 0, "archivos": 0}

    for folder in folders:
        nombre_carpeta = folder["name"]
        if nombre_carpeta in SKIP_FOLDER_NAMES:
            print(f"\n[SKIP] {nombre_carpeta}")
            stats["carpetas_omitidas"] += 1
            continue

        print(f"\n[Carpeta] {nombre_carpeta}")
        match = FOLDER_PATTERN.match(nombre_carpeta)
        if match:
            nombre_curso, codigo_folder = match.group(1).strip(), match.group(2).strip()
        else:
            nombre_curso, codigo_folder = nombre_carpeta, None
            print(f"  [WARN] No matchea el patrón 'Nombre - CODIGO', se ingresa como huérfano.")

        cursos_match = prefix_map.get(codigo_folder.upper()) if codigo_folder else None
        if cursos_match:
            print(f"  Match: código '{codigo_folder}' -> {len(cursos_match)} curso(s) "
                  f"{[c['id'] for c in cursos_match]}")
            stats["carpetas_ok"] += 1
            target_cursos = cursos_match
        else:
            print(f"  [WARN] Sin curso emparejado para carpeta '{nombre_carpeta}' "
                  f"(código '{codigo_folder}'). Se ingresa con curso_id=None para revisión manual.")
            stats["carpetas_sin_match"] += 1
            target_cursos = [None]

        pdfs = collect_pdfs(folder["id"])
        print(f"  {len(pdfs)} PDFs encontrados.")

        for pdf in pdfs:
            titulo = re.sub(r"\.pdf$", "", pdf["name"], flags=re.IGNORECASE)
            tipo = normalizar_tipo(inferir_tipo(pdf["name"]))
            has_solucionario = bool(re.search(r"solucionario|resuelto", pdf["name"], re.IGNORECASE))
            year = parse_year(pdf["name"]) or parse_year(pdf.get("createdTime", ""))
            url_drive = f"https://drive.google.com/file/d/{pdf['id']}/view"

            for curso in target_cursos:
                rows.append({
                    "titulo": titulo,
                    "tipo": tipo,
                    "curso_id": curso["id"] if curso else None,
                    "ciclo": ciclo_por_curso.get(curso["id"]) if curso else None,
                    "year": year,
                    "url_drive": url_drive,
                    "preview_url": url_drive,
                    "drive_file_id": pdf["id"],
                    "nombre_curso": nombre_curso,
                    "codigo_curso": codigo_folder,
                    "has_solucionario": has_solucionario,
                })
                stats["archivos"] += 1

    print(f"\n\nUpsert de {len(rows)} filas...")
    rows_con_curso = [r for r in rows if r["curso_id"] is not None]
    rows_huerfanas = [r for r in rows if r["curso_id"] is None]

    insertadas = 0
    actualizadas = 0

    if rows_con_curso:
        sb.table("recursos").upsert(rows_con_curso, on_conflict="drive_file_id,curso_id").execute()
        actualizadas += len(rows_con_curso)

    for row in rows_huerfanas:
        existente = (
            sb.table("recursos")
            .select("id")
            .eq("drive_file_id", row["drive_file_id"])
            .is_("curso_id", "null")
            .execute()
        )
        if existente.data:
            sb.table("recursos").update(row).eq("id", existente.data[0]["id"]).execute()
            actualizadas += 1
        else:
            sb.table("recursos").insert(row).execute()
            insertadas += 1

    print("\n=== Resumen ===")
    print(f"Carpetas emparejadas: {stats['carpetas_ok']}")
    print(f"Carpetas sin emparejar (huérfanas): {stats['carpetas_sin_match']}")
    print(f"Carpetas omitidas: {stats['carpetas_omitidas']}")
    print(f"Archivos procesados: {stats['archivos']}")
    print(f"Filas nuevas insertadas: {insertadas}")
    print(f"Filas existentes actualizadas: {actualizadas}")


if __name__ == "__main__":
    main()
