"""
Procesa todas las planchas de Cálculo Diferencial (PDFs e imágenes) e ingesta los
chunks en Supabase bajo curso_id=12. El RAG filtra por NOMBRE de curso, así que el
contenido queda disponible para todas las instancias de "Cálculo Diferencial".

- PDFs  → usa el pipeline existente (procesar_compendio).
- JPG/JPEG/PNG → OCR con Gemini página única, luego chunk → embed → ingest.

Cada archivo genera un checkpoint _extraido.md; si ya existe, se omite (reanudable).

Uso:
    python ingesta_silabos/procesar_planchas_calculo.py
    python ingesta_silabos/procesar_planchas_calculo.py --rpm 5 --dpi 200
"""
import argparse
import os
import sys
import time
import traceback
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT / "backend"))
sys.path.insert(0, str(REPO_ROOT / "backend" / "rag"))

from dotenv import load_dotenv
load_dotenv(REPO_ROOT / "backend" / ".env")

from PIL import Image
from supabase import create_client

from rag.cargar_compendio import procesar_compendio
from extractor import SyllabusExtractor, PROMPT_EXAMENES, PROMPT_SALVAGE, es_sospechosa
from chunker import SyllabusChunker
from embedder import SyllabusEmbedder
from ingest import SyllabusIngestor

CURSO_ID = 12  # Cálculo Diferencial (Sistemas) — compartido por nombre con 32 y 50
TIPO = "examen"
MODO = "examenes"

PLANCHAS_DIR = REPO_ROOT / "ingesta_silabos" / "planchas" / "calculo diferencial"

IMG_EXT = {".jpg", ".jpeg", ".png"}


def procesar_imagen(img_path: Path, extractor: SyllabusExtractor, rpm: int) -> bool:
    """OCR de una sola imagen y visualización en el RAG (curso 12)."""
    titulo = img_path.stem
    checkpoint = img_path.with_suffix("").as_posix() + "_extraido.md"

    if os.path.exists(checkpoint):
        print(f"[SKIP] '{titulo}' — checkpoint existente.")
        return True

    print(f"\n>>> Imagen: {titulo}")
    supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_ANON_KEY"))

    recurso_id = None
    try:
        image = Image.open(img_path).convert("RGB")

        # OCR con reintentos (reutiliza la lógica del extractor)
        response = extractor._llamar_gemini(PROMPT_EXAMENES, image, 1)
        texto, motivo = extractor._get_text(response)

        if not texto or es_sospechosa(texto):
            print(f"   Vacío/sospechoso ({motivo}). Intentando rescate...")
            response2 = extractor._llamar_gemini(PROMPT_SALVAGE, image, 1)
            texto, motivo = extractor._get_text(response2)

        if not texto or es_sospechosa(texto):
            print(f"   [FALLO] No legible: {motivo}")
            return False

        bloque = extractor._bloque_ok(1, texto)
        Path(checkpoint).write_text(bloque, encoding="utf-8")
        print(f"   OCR OK ({len(texto)} chars). Checkpoint guardado.")

        # Registrar recurso + chunk + embed + ingest
        resp = supabase.table("recursos").insert(
            {"curso_id": CURSO_ID, "titulo": titulo, "tipo": TIPO}
        ).execute()
        recurso_id = resp.data[0]["id"]

        chunks = SyllabusChunker().chunk_text(bloque)
        if not chunks:
            raise RuntimeError("Chunker no generó fragmentos.")
        embeddings = SyllabusEmbedder().embedding_generator(chunks)
        if not embeddings:
            raise RuntimeError("Embedder no generó vectores.")
        if not SyllabusIngestor().ingest(embeddings, recurso_id=recurso_id, curso_id=CURSO_ID):
            raise RuntimeError("Ingestor reportó fallo.")

        print(f"   [OK] '{titulo}' ingestado.")
        return True

    except Exception as e:
        print(f"   [ERROR] {e}")
        traceback.print_exc()
        if recurso_id is not None:
            try:
                supabase.table("recursos").delete().eq("id", recurso_id).execute()
            except Exception:
                pass
        # Borra el checkpoint para poder reintentar limpio
        if os.path.exists(checkpoint):
            os.remove(checkpoint)
        return False


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--rpm", type=int, default=5)
    parser.add_argument("--dpi", type=int, default=200)
    parser.add_argument("--skip-failed", action="store_true", default=False)
    args = parser.parse_args()

    if not PLANCHAS_DIR.exists():
        print(f"No existe el directorio: {PLANCHAS_DIR}")
        sys.exit(1)

    pdfs = sorted(PLANCHAS_DIR.glob("*.pdf")) + sorted(PLANCHAS_DIR.glob("*.Pdf"))
    imagenes = sorted(p for p in PLANCHAS_DIR.iterdir() if p.suffix.lower() in IMG_EXT)

    print(f"\nEncontrados {len(pdfs)} PDFs y {len(imagenes)} imágenes en '{PLANCHAS_DIR}'")
    print(f"curso_id={CURSO_ID} | tipo={TIPO} | modo={MODO} | rpm={args.rpm}\n")
    print("=" * 60)

    resultados = []

    # 1. PDFs (pipeline existente)
    for pdf in pdfs:
        nombre = pdf.stem
        output_path = str(pdf.with_suffix("")) + "_extraido.md"
        if os.path.exists(output_path):
            print(f"\n[SKIP] '{nombre}' — checkpoint existente.")
            resultados.append((nombre, "omitido"))
            continue
        print(f"\n>>> PDF: {nombre}")
        ok = procesar_compendio(
            pdf_path=str(pdf), titulo=nombre, curso_id=CURSO_ID,
            tipo=TIPO, modo=MODO, output_path=output_path,
            rpm=args.rpm, dpi=args.dpi, salvage=True, skip_failed=args.skip_failed,
        )
        resultados.append((nombre, "OK" if ok else "FALLO"))
        print("=" * 60)

    # 2. Imágenes (OCR de página única)
    extractor = SyllabusExtractor(rpm=args.rpm)
    for img in imagenes:
        ok = procesar_imagen(img, extractor, args.rpm)
        resultados.append((img.stem, "OK" if ok else "FALLO"))
        print("=" * 60)

    print("\n\nRESUMEN FINAL")
    print("=" * 60)
    for nombre, estado in resultados:
        icono = "[OK]" if estado == "OK" else ("[SKIP]" if estado == "omitido" else "[FALLO]")
        print(f"  {icono}  {nombre}: {estado}")
    print("=" * 60)

    fallos = [n for n, e in resultados if e == "FALLO"]
    if fallos:
        print(f"\n{len(fallos)} archivo(s) fallaron. Reintenta el mismo comando (los OK se omiten).")
        sys.exit(1)


if __name__ == "__main__":
    main()
