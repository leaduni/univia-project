"""
Genera la ruta de aprendizaje de un curso a partir de su sílabo en PDF.

Reemplaza el trabajo manual: hasta ahora las rutas se escribían a mano en un
diccionario de Python (ver ingesta_silabos/create_csvs.py), unidad por unidad.
Aquí el sílabo se lee con OCR, un LLM lo convierte en unidades estructuradas y
el resultado se inserta en `learning_path_steps`.

Uso:
    # Ver la ruta que saldría, sin escribir nada:
    python generar_ruta_desde_silabo.py --pdf ruta/al/silabo.pdf --codigo BQU01 --simular

    # Generar y guardar:
    python generar_ruta_desde_silabo.py --pdf ruta/al/silabo.pdf --codigo BQU01

    # Reusar un markdown ya extraído (evita repetir el OCR, que cuesta):
    python generar_ruta_desde_silabo.py --markdown silabo.md --codigo BQU01

Requiere en backend/.env:
  - OPEN_AI_INGEST_API_KEY  (OCR del PDF; no hace falta si usas --markdown)
  - CLAUDE_GEN_API_KEY      (estructuración de las unidades)
  - Credenciales de Supabase (las mismas que usa el resto de scripts_manuales)

Reentrante: por defecto se niega a pisar una ruta que ya existe. Con --reemplazar
borra los pasos previos del curso y escribe los nuevos, dentro de la misma corrida.
"""
import argparse
import json
import os
import re
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

from app.core.database import get_admin_client
from app.core.llm import generar, generar_ingesta, texto_ingesta

ROOT_DRIVE = "1EY6Bm0NXTm85VkVLIC7T4-lilubKDQDV"

# Iconos de lucide-react que el frontend ya sabe renderizar. Se acota la lista a
# propósito: si el modelo inventa un nombre de icono, la tarjeta del curso queda
# con un hueco y nadie se entera hasta que un estudiante lo ve.
ICONOS = [
    # Generales
    "book", "book-open", "file-text", "edit-3", "clipboard-list", "star", "flag",
    "lightbulb", "target", "users", "settings", "map", "layers", "git-branch",
    "clock", "calendar", "message-circle", "heart", "shield", "award", "search",
    "globe", "landmark", "scroll-text", "pen-tool", "mic", "eye", "handshake",
    # Matemática
    "calculator", "sigma", "infinity", "function-square", "percent", "divide",
    "ruler", "compass", "triangle", "box", "grid", "binary",
    # Física y química
    "atom", "flask-conical", "beaker", "microscope", "magnet", "zap", "battery",
    "thermometer", "droplet", "wind", "waves", "activity", "orbit", "scale",
    "anchor", "gauge", "radio",
    # Computación e ingeniería
    "code", "terminal", "database", "network", "cpu", "server", "workflow",
    "git-merge", "brain",
    # Datos y gestión
    "bar-chart", "trending-up", "pie-chart", "line-chart", "briefcase",
]

SYSTEM = f"""Eres un diseñador instruccional que convierte sílabos universitarios
en rutas de aprendizaje estructuradas para estudiantes de ingeniería de la UNI.

Recibes el material de un curso y devuelves sus unidades de aprendizaje. La
entrada puede ser el TEXTO DE UN SÍLABO o, cuando no existe sílabo, el LISTADO
DE CARPETAS Y ARCHIVOS del curso. En la UNI cada profesor arma su propio curso,
así que ese listado suele venir dividido por profesor y ordenado por semana:
los nombres de carpeta y archivo ("SEMANA 4 INTELIGENCIA EMOCIONAL") son el
temario real aunque nadie lo haya llamado sílabo.

Si la entrada es un listado de material:
- Reconstruye el temario a partir de la numeración y los títulos.
- Si varios profesores cubren el mismo curso, usa el que tenga el temario más
  completo y descriptivo; no mezcles numeraciones distintas.
- Ignora carpetas que son evaluaciones o entregables sin tema (PC1, EP, EF,
  Planchas, Trabajos, Libros, Anexos) salvo que marquen una semana concreta.
- Si los nombres solo dicen "Semana 1", "Semana 2" sin ningún tema, NO inventes
  los temas: devuelve una lista vacía.

REGLAS:
1. Respeta la estructura del sílabo. Si organiza por unidades, usa unidades; si
   organiza por semanas, usa semanas. No inventes una división propia.
2. `title` debe conservar la numeración del sílabo. Ej: "Unidad 1: Cinemática"
   o "Semana 3: La Integral Definida".
3. `description` es una frase corta (máx. 120 caracteres) que resume qué se
   aprende. Sin punto final.
4. `topics` son entre 2 y 6 temas concretos tomados del sílabo, no genéricos.
   Nada de "Introducción" o "Conceptos básicos" a secas.
5. `duration` en horas, formato "4h". Si el sílabo da horas, úsalas. Si no,
   estima según el peso del tema (entre 2h y 10h).
6. `icon` debe salir EXACTAMENTE de esta lista: {", ".join(ICONOS)}
   Elige el más afín al contenido de la unidad.
7. Incluye exámenes (parcial/final) como pasos propios si el sílabo los ubica
   en una semana concreta.
8. Si el texto está incompleto o ilegible y no puedes determinar las unidades,
   devuelve una lista vacía en vez de inventarlas.

Devuelve ÚNICAMENTE un objeto JSON válido, sin markdown ni explicaciones:
{{"unidades": [{{"title": "...", "description": "...", "duration": "4h",
 "topics": ["...", "..."], "icon": "..."}}]}}"""


def extraer_json(texto: str) -> dict:
    """Saca el objeto JSON de la respuesta del modelo.

    A veces envuelve el JSON en ```json aunque se le pida que no, así que se
    limpia la valla antes de parsear en vez de fallar por un detalle de formato.
    """
    limpio = texto.strip()
    limpio = re.sub(r"^```(?:json)?\s*", "", limpio)
    limpio = re.sub(r"\s*```$", "", limpio)
    try:
        return json.loads(limpio)
    except json.JSONDecodeError:
        # Último intento: quedarse con el bloque entre la primera { y la última }
        inicio, fin = limpio.find("{"), limpio.rfind("}")
        if inicio == -1 or fin == -1:
            raise
        return json.loads(limpio[inicio:fin + 1])


def _palabras(texto: str) -> set:
    """Palabras significativas de un texto, para comparar contenidos."""
    vacias = {
        "de", "la", "el", "los", "las", "y", "en", "a", "del", "al", "un", "una",
        "para", "con", "por", "su", "sus", "se", "que", "es", "sobre", "como",
        "semana", "unidad", "clase", "sesion", "sesión", "capitulo", "capítulo",
        "tema", "introduccion", "introducción", "pdf", "docx", "ppt", "pptx",
    }
    limpio = re.sub(r"[^\wáéíóúüñ\s]", " ", texto.lower())
    return {p for p in limpio.split() if len(p) > 3 and p not in vacias}


def verificar_anclaje(unidades: list, fuente: str, umbral: float = 0.34) -> list:
    """Descarta unidades cuyo contenido no aparece en la fuente.

    Solo se aplica cuando el temario se dedujo del listado de archivos: ahí el
    modelo tiende a rellenar las semanas que no traen tema en el nombre. Se
    comprobó con BEF01, donde las semanas sin título recibieron temas inventados
    de aspecto plausible mientras las que sí lo traían salieron exactas.

    No se aplica a sílabos: un sílabo real puede describir un tema con palabras
    distintas a las del temario y el filtro lo borraría por error.
    """
    vocabulario = _palabras(fuente)
    conservadas, descartadas = [], []

    for u in unidades:
        propias = _palabras(u["title"]) | _palabras(" ".join(u.get("topics") or []))
        if not propias:
            descartadas.append((u, 0.0))
            continue
        cobertura = len(propias & vocabulario) / len(propias)
        if cobertura >= umbral:
            conservadas.append(u)
        else:
            descartadas.append((u, cobertura))

    if descartadas:
        print(f"\n  [ANCLAJE] {len(descartadas)} unidad(es) descartada(s) por no "
              f"estar respaldadas en el material:")
        for u, c in descartadas:
            print(f"    - {u['title']}  (solo {c:.0%} de sus términos aparecen)")

    # Se renumera: los huecos dejarían order_index salteado y la ruta se
    # mostraría con pasos "faltantes" que en realidad nunca existieron.
    for i, u in enumerate(conservadas, start=1):
        u["order_index"] = i
    return conservadas


def validar(unidades: list) -> list:
    """Descarta unidades mal formadas y normaliza lo salvable.

    El modelo puede devolver un icono inventado o saltarse un campo. Se corrige
    lo que tiene arreglo obvio y se descarta lo que no, para no escribir basura
    en la base.
    """
    validas = []
    for i, u in enumerate(unidades, start=1):
        titulo = (u.get("title") or "").strip()
        if not titulo:
            print(f"  [WARN] Unidad {i} sin título, se descarta.")
            continue

        icono = (u.get("icon") or "").strip()
        if icono not in ICONOS:
            print(f"  [WARN] Unidad {i} '{titulo}': icono '{icono}' no válido -> 'book'.")
            icono = "book"

        duracion = (u.get("duration") or "").strip()
        if not re.match(r"^\d+h$", duracion):
            duracion = "4h"

        temas = [t.strip() for t in (u.get("topics") or []) if t and t.strip()]

        validas.append({
            "title": titulo,
            "description": (u.get("description") or "").strip(),
            "duration": duracion,
            "order_index": len(validas) + 1,
            "topics": temas,
            "icon": icono,
        })
    return validas


def listado_del_drive(codigo: str) -> str:
    """Árbol de la carpeta del curso en Drive, como texto para el modelo.

    Alternativa al sílabo para los cursos que no lo tienen: en la UNI el
    material suele venir ordenado por semana dentro de la carpeta de cada
    profesor, y esos nombres son el temario real.
    """
    from buscar_silabos_drive import listar, FOLDER, PATRON_CODIGO

    carpetas = [f for f in listar(ROOT_DRIVE) if f["mimeType"] == FOLDER]
    objetivo = None
    for c in carpetas:
        m = PATRON_CODIGO.search(c["name"].strip())
        if m and m.group(1).upper() == codigo.upper():
            objetivo = c
            break
    if not objetivo:
        raise SystemExit(f"No hay carpeta en Drive para el código '{codigo}'.")

    print(f"Leyendo estructura de Drive: {objetivo['name']}")

    lineas = []

    def bajar(fid: str, sangria: int = 0, nivel: int = 0):
        # 4 niveles alcanzan para curso > profesor > tema > semana. Más abajo
        # solo hay archivos sueltos que no aportan al temario.
        if nivel > 4:
            return
        for item in sorted(listar(fid), key=lambda x: x["name"]):
            marca = "[DIR]" if item["mimeType"] == FOLDER else "     "
            lineas.append(f"{'  ' * sangria}{marca} {item['name']}")
            if item["mimeType"] == FOLDER:
                bajar(item["id"], sangria + 1, nivel + 1)

    bajar(objetivo["id"])
    return "LISTADO DE MATERIAL DEL CURSO:\n\n" + "\n".join(lineas)


def texto_del_silabo(args) -> str:
    """Fuente del temario: markdown, PDF con OCR, o la estructura del Drive."""
    if args.drive:
        return listado_del_drive(args.codigo)

    if args.markdown:
        return Path(args.markdown).read_text(encoding="utf-8")

    # El OCR se importa aquí y no arriba porque arrastra pdf2image/poppler, que
    # no hacen falta cuando se reusa un markdown ya extraído.
    from app.rag.extractor import SyllabusExtractor

    pdf = Path(args.pdf)
    salida = pdf.with_suffix(".md")
    print(f"Extrayendo texto de {pdf.name} (OCR, puede tardar)...")
    extractor = SyllabusExtractor()
    extractor.extract_text(str(pdf), modo="silabo", output_path=str(salida))
    print(f"  Markdown guardado en {salida} (reusable con --markdown).")
    return salida.read_text(encoding="utf-8")


def main():
    p = argparse.ArgumentParser(description="Genera una ruta de aprendizaje desde un sílabo.")
    fuente = p.add_mutually_exclusive_group(required=True)
    fuente.add_argument("--pdf", help="Sílabo en PDF (se le hace OCR).")
    fuente.add_argument("--markdown", help="Sílabo ya extraído a markdown.")
    fuente.add_argument("--drive", action="store_true",
                        help="Deriva el temario de la estructura de carpetas del "
                             "curso en Drive. Para cursos sin sílabo.")
    p.add_argument("--codigo", required=True,
                   help="Código del curso en la base, ej. BQU01. Aplica a todas "
                        "sus variantes por carrera (BQU01_SIS, BQU01_IND, ...).")
    p.add_argument("--simular", action="store_true",
                   help="Muestra la ruta generada sin escribir en la base.")
    p.add_argument("--reemplazar", action="store_true",
                   help="Si el curso ya tiene ruta, la borra y la regenera.")
    # La ruta la ve el estudiante, así que por convención del proyecto la genera
    # Claude. `openai` queda como salida de emergencia cuando esa cuenta no
    # tiene saldo: es preferible una ruta generada con el modelo de ingesta que
    # ninguna ruta.
    p.add_argument("--proveedor", choices=["claude", "openai"], default="claude",
                   help="Modelo que estructura las unidades (por defecto claude).")
    args = p.parse_args()

    sb = get_admin_client()

    # Un código base puede existir varias veces, una por carrera (BQU01_SIS,
    # BQU01_IND...). La ruta es la misma para todas: el sílabo es común.
    prefijo = args.codigo.upper()
    cursos_resp = sb.table("cursos").select("id, code, name").execute()
    cursos = [c for c in (cursos_resp.data or [])
              if (c.get("code") or "").split("_")[0].upper() == prefijo]

    if not cursos:
        raise SystemExit(f"No hay ningún curso con código base '{prefijo}' en la base.")

    print(f"Curso: {cursos[0]['name']}")
    print(f"  {len(cursos)} variante(s): {[c['code'] for c in cursos]}")

    ids = [c["id"] for c in cursos]
    existentes = sb.table("learning_path_steps").select("id, curso_id").in_("curso_id", ids).execute()
    if existentes.data and not args.reemplazar and not args.simular:
        raise SystemExit(
            f"Este curso ya tiene {len(existentes.data)} pasos de ruta. "
            "Usa --reemplazar para regenerarla, o --simular para solo verla."
        )

    texto = texto_del_silabo(args)
    print(f"\nSílabo: {len(texto)} caracteres. Generando unidades...")

    prompt = f"Sílabo del curso {cursos[0]['name']} ({prefijo}):\n\n{texto}"
    if args.proveedor == "openai":
        respuesta = texto_ingesta(
            generar_ingesta(prompt=prompt, system=SYSTEM, max_tokens=8000)
        )
    else:
        respuesta = generar(prompt=prompt, system=SYSTEM, max_tokens=8000)

    datos = extraer_json(respuesta)
    unidades = validar(datos.get("unidades") or [])

    if args.drive:
        unidades = verificar_anclaje(unidades, texto)

    if not unidades:
        raise SystemExit(
            "El modelo no pudo determinar unidades en este sílabo. "
            "Revisa que el PDF sea legible y que realmente sea un sílabo."
        )

    print(f"\n{len(unidades)} unidades generadas:\n")
    for u in unidades:
        print(f"  {u['order_index']:2}. [{u['icon']}] {u['title']}  ({u['duration']})")
        print(f"      {u['description']}")
        print(f"      temas: {', '.join(u['topics'])}")

    if args.simular:
        print("\n[SIMULACIÓN] No se escribió nada en la base.")
        return

    if existentes.data and args.reemplazar:
        sb.table("learning_path_steps").delete().in_("curso_id", ids).execute()
        print(f"\nBorrados {len(existentes.data)} pasos anteriores.")

    filas = [
        {**u, "curso_id": cid}
        for cid in ids
        for u in unidades
    ]
    sb.table("learning_path_steps").insert(filas).execute()

    print(f"\nListo: {len(filas)} filas insertadas "
          f"({len(unidades)} unidades × {len(ids)} variante(s) del curso).")


if __name__ == "__main__":
    main()
