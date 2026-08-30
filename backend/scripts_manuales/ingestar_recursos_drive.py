"""
Barre una carpeta pública de Drive con los PDFs de recursos por curso y hace
upsert de cada archivo en la tabla `recursos`.

Uso:
    python ingestar_recursos_drive.py                      # banco por defecto
    python ingestar_recursos_drive.py --carpeta <ID|URL>   # otra carpeta
    python ingestar_recursos_drive.py --carpeta <ID> --simular   # sin escribir

Requiere:
  - GOOGLE_DRIVE_API_KEY en .env (ver .env.example: no hace falta service
    account porque la carpeta es pública, alcanza con una API key con
    "Google Drive API" habilitada en Google Cloud Console).
  - Haber corrido antes base_de_datos/esquema/migracion_fase4_recursos.sql
    (agrega las columnas url_drive/drive_file_id/nombre_curso/codigo_curso).

Reintentable: usa curso_id resuelto para elegir entre insertar o actualizar,
así que correrlo de nuevo no duplica filas.
"""
import argparse
import os
import re
import sys
from collections import defaultdict
from typing import Optional

sys.stdout.reconfigure(encoding="utf-8")
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import requests
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

from app.core.database import get_admin_client
from app.core.tipos_recursos import normalizar_tipo

ROOT_FOLDER_ID = "1EY6Bm0NXTm85VkVLIC7T4-lilubKDQDV"
API_KEY = os.getenv("GOOGLE_DRIVE_API_KEY")

# Valor de .env.example: si sigue ahí, nadie configuró la key todavía y las
# llamadas fallarían con un 400 genérico de Google difícil de interpretar.
API_KEY_PLACEHOLDER = "tu_google_drive_api_key_aqui"


def extraer_folder_id(valor: str) -> str:
    """Acepta un ID suelto o una URL de Drive y devuelve siempre el ID.

    Pegar la URL de la barra del navegador es lo natural; obligar a recortar
    el ID a mano solo invita a errores de copiado.
    """
    valor = (valor or "").strip()
    m = re.search(r"/folders/([A-Za-z0-9_\-]+)", valor)
    if m:
        return m.group(1)
    m = re.search(r"[?&]id=([A-Za-z0-9_\-]+)", valor)
    if m:
        return m.group(1)
    return valor


def verificar_api_key() -> None:
    """Corta temprano y con un mensaje claro si la API key no sirve."""
    if not API_KEY or API_KEY == API_KEY_PLACEHOLDER:
        raise SystemExit(
            "GOOGLE_DRIVE_API_KEY no está configurada en backend/.env "
            f"(valor actual: {'vacío' if not API_KEY else 'el placeholder de .env.example'}).\n"
            "Créala en https://console.cloud.google.com/apis/credentials "
            "con la 'Google Drive API' habilitada."
        )

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
            "fields": "nextPageToken, files(id,name,mimeType,createdTime,modifiedTime)",
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


# Profundidad por defecto del recorrido. El banco original es plano
# (curso/archivos), pero carpetas como la de FIM anidan por unidad, semana y
# profesor: con el tope anterior de 3 se perdía más de la mitad de los PDFs
# sin más aviso que un WARN en medio del log.
PROFUNDIDAD_POR_DEFECTO = 8


def collect_pdfs(folder_id: str, depth: int = 1, max_depth: int = PROFUNDIDAD_POR_DEFECTO,
                 omitidos: Optional[dict] = None, parent_path: str = "") -> list:
    """Recolecta PDFs de una carpeta, bajando hasta max_depth niveles.

    `omitidos` acumula, si se pasa, cuántos archivos que no son PDF quedaron
    fuera: son docx/pptx/videos que el banco todavía no sabe ingerir y que de
    otro modo desaparecen sin dejar rastro en el resumen.
    """
    items = drive_list(folder_id)
    pdfs = []
    for item in items:
        if item.get("mimeType") == MIME_PDF:
            pdf = item.copy()
            pdf["drive_path"] = parent_path
            pdfs.append(pdf)
    subfolders = [f for f in items if f.get("mimeType") == MIME_FOLDER]

    if omitidos is not None:
        for f in items:
            if f.get("mimeType") not in (MIME_PDF, MIME_FOLDER):
                omitidos["no_pdf"] = omitidos.get("no_pdf", 0) + 1

    if subfolders and depth + 1 > max_depth:
        print(f"  [WARN] Subcarpetas no exploradas por profundidad máxima ({max_depth}): "
              f"{[f['name'] for f in subfolders]}")
    else:
        for sf in subfolders:
            child_path = f"{parent_path}/{sf['name']}" if parent_path else sf["name"]
            pdfs.extend(collect_pdfs(
                sf["id"], depth + 1, max_depth, omitidos, child_path
            ))
    return pdfs


def inferir_tipo(filename: str, drive_path: str = "") -> tuple[str, str]:
    """Clasifica solo con señales inequívocas y devuelve tipo + motivo."""
    name = filename.lower()
    path = drive_path.lower()
    contexto = f"{path}/{name}"
    negativos = (
        "libro", "texto", "teoria", "teoría", "apunte", "clase",
        "silabo", "sílabo", "formulario", "laboratorio", "reporte",
    )

    # Una señal negativa en el título evita heredar una carpeta de evaluación.
    if any(k in name for k in negativos):
        contexto = name

    if any(k in contexto for k in ("examen", "parcial", "final", "sustitutorio")) \
            or re.search(r"\b(ep|ef|es)\b", contexto):
        return "examen", "señal inequívoca en ruta/título"
    if "practica" in contexto or "práctica" in contexto \
            or re.search(r"\bp[cd]\d*\b", contexto):
        return "practica", "señal inequívoca en ruta/título"
    if "silabo" in name or "sílabo" in name:
        return "silabo", "señal en título"
    if "compendio" in name:
        return "compendio", "señal en título"
    if "libro" in name or "texto" in name:
        return "libro", "señal en título"
    if any(k in name for k in ("apunte", "clase", "teoria", "teoría")):
        return "apunte", "señal en título"
    if "video" in name:
        return "video", "señal en título"
    return "pdf", "ambiguo: sin señal de alta confianza"


def parse_year(text: str):
    if not text:
        return None
    m = re.search(r"(19|20)\d{2}", text)
    return int(m.group(0)) if m else None


def obtener_tipos_existentes(sb, rows: list) -> dict:
    """Carga tipos actuales por lotes para auditar transiciones antes→después."""
    resultado = {}
    fids = sorted({row["drive_file_id"] for row in rows})
    for inicio in range(0, len(fids), 200):
        resp = (
            sb.table("recursos")
            .select("drive_file_id, curso_id, tipo")
            .in_("drive_file_id", fids[inicio:inicio + 200])
            .execute()
        )
        for existente in resp.data or []:
            resultado[(existente["drive_file_id"], existente["curso_id"])] = existente["tipo"]
    return resultado


def main():
    parser = argparse.ArgumentParser(description="Ingesta de recursos desde una carpeta de Drive.")
    parser.add_argument(
        "--carpeta",
        default=ROOT_FOLDER_ID,
        help="ID o URL de la carpeta raíz de Drive. Por defecto, el banco original.",
    )
    parser.add_argument(
        "--simular",
        action="store_true",
        help="Recorre Drive y reporta qué se ingeriría, sin escribir en la base.",
    )
    parser.add_argument(
        "--profundidad",
        type=int,
        default=PROFUNDIDAD_POR_DEFECTO,
        help=f"Niveles de subcarpetas a explorar (por defecto {PROFUNDIDAD_POR_DEFECTO}).",
    )
    args = parser.parse_args()

    verificar_api_key()
    root_folder_id = extraer_folder_id(args.carpeta)

    sb = get_admin_client()

    print(f"Carpeta raíz: {root_folder_id}")
    if args.simular:
        print("Modo simulación: no se escribirá nada en la base.\n")

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
    root_items = drive_list(root_folder_id)
    folders = [f for f in root_items if f.get("mimeType") == MIME_FOLDER]
    print(f"  {len(folders)} carpetas encontradas en la raíz.")

    rows = []
    stats = {"carpetas_ok": 0, "carpetas_sin_match": 0, "carpetas_omitidas": 0, "archivos": 0}
    clasificacion = defaultdict(int)
    ambiguos = []
    omitidos = {"no_pdf": 0}

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

        pdfs = collect_pdfs(
            folder["id"], max_depth=args.profundidad, omitidos=omitidos,
            parent_path=nombre_carpeta,
        )
        print(f"  {len(pdfs)} PDFs encontrados.")

        for pdf in pdfs:
            titulo = re.sub(r"\.pdf$", "", pdf["name"], flags=re.IGNORECASE)
            tipo_inferido, _motivo = inferir_tipo(pdf["name"], pdf.get("drive_path", ""))
            tipo = normalizar_tipo(tipo_inferido)
            clasificacion[tipo] += 1
            if tipo == normalizar_tipo("pdf") and len(ambiguos) < 50:
                ambiguos.append(f"{pdf.get('drive_path', '')}/{pdf['name']}")
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
                    "drive_path": pdf.get("drive_path"),
                    "drive_modified_time": pdf.get("modifiedTime"),
                    "nombre_curso": nombre_curso,
                    "codigo_curso": codigo_folder,
                    "has_solucionario": has_solucionario,
                })
                stats["archivos"] += 1

    rows_con_curso = [r for r in rows if r["curso_id"] is not None]
    rows_huerfanas = [r for r in rows if r["curso_id"] is None]
    tipos_existentes = obtener_tipos_existentes(sb, rows)
    transiciones = defaultdict(int)
    for row in rows:
        anterior = tipos_existentes.get((row["drive_file_id"], row["curso_id"]), "NUEVO")
        transiciones[f"{anterior} → {row['tipo']}"] += 1

    insertadas = 0
    actualizadas = 0

    if args.simular:
        print(f"\n\n[SIMULACIÓN] Se habrían procesado {len(rows)} filas: "
              f"{len(rows_con_curso)} con curso resuelto y {len(rows_huerfanas)} huérfanas.")
        print("\n=== Resumen (simulación) ===")
        print(f"Carpetas emparejadas: {stats['carpetas_ok']}")
        print(f"Carpetas sin emparejar (huérfanas): {stats['carpetas_sin_match']}")
        print(f"Carpetas omitidas: {stats['carpetas_omitidas']}")
        print(f"Archivos procesados: {stats['archivos']}")
        print(f"Archivos ignorados por no ser PDF: {omitidos['no_pdf']}")
        print(f"Clasificación resultante: {dict(sorted(clasificacion.items()))}")
        print(f"Transiciones de tipo: {dict(sorted(transiciones.items()))}")
        if ambiguos:
            print("Primeros PDF ambiguos para revisión:")
            for ruta in ambiguos:
                print(f"  - {ruta}")
        print("No se escribió nada en la base.")
        return

    print(f"\n\nUpsert de {len(rows)} filas...")

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
    print(f"Archivos ignorados por no ser PDF: {omitidos['no_pdf']}")
    print(f"Filas nuevas insertadas: {insertadas}")
    print(f"Filas existentes actualizadas: {actualizadas}")
    print(f"Clasificación resultante: {dict(sorted(clasificacion.items()))}")
    print(f"Transiciones de tipo: {dict(sorted(transiciones.items()))}")
    if ambiguos:
        print("Primeros PDF ambiguos para revisión:")
        for ruta in ambiguos:
            print(f"  - {ruta}")


if __name__ == "__main__":
    main()
