"""
Procesa todos los PDFs de planchas de Geometría Analítica e ingesta los chunks en Supabase.
Usa el checkpoint _extraido.md de cada PDF para reanudar si se interrumpe.

Uso:
    python ingesta_silabos/procesar_planchas_analitica.py

Flags opcionales:
    --rpm  N        Requests/minuto a Gemini (default: 5)
    --dpi  N        Resolución imagen (default: 200)
    --skip-failed   Omite páginas que fallaron en runs anteriores
"""
import argparse
import os
import sys
from pathlib import Path

# Añadir el backend al path para importar procesar_compendio
REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT / "backend"))
sys.path.insert(0, str(REPO_ROOT / "backend" / "rag"))

from rag.cargar_compendio import procesar_compendio

CURSO_ID = 11  # FB101_SIS - Geometría Analítica (instancia con chunks existentes)
TIPO = "examen"
MODO = "examenes"

PLANCHAS_DIR = REPO_ROOT / "ingesta_silabos" / "planchas" / "geometria analitica"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--rpm", type=int, default=5)
    parser.add_argument("--dpi", type=int, default=200)
    parser.add_argument("--skip-failed", action="store_true", default=False)
    args = parser.parse_args()

    pdfs = sorted(PLANCHAS_DIR.glob("*.pdf"))
    if not pdfs:
        print(f"No se encontraron PDFs en: {PLANCHAS_DIR}")
        sys.exit(1)

    print(f"\nEncontrados {len(pdfs)} PDFs en '{PLANCHAS_DIR}'")
    print(f"curso_id={CURSO_ID} | tipo={TIPO} | modo={MODO} | rpm={args.rpm}\n")
    print("=" * 60)

    resultados = []
    for pdf in pdfs:
        nombre = pdf.stem
        output_path = str(pdf.with_suffix("")) + "_extraido.md"

        # Si ya existe el checkpoint completo, informar y saltar
        if os.path.exists(output_path):
            print(f"\n[SKIP] '{nombre}' — checkpoint existente encontrado: {output_path}")
            resultados.append((nombre, "omitido"))
            continue

        print(f"\n>>> Procesando: {nombre}")
        ok = procesar_compendio(
            pdf_path=str(pdf),
            titulo=nombre,
            curso_id=CURSO_ID,
            tipo=TIPO,
            modo=MODO,
            output_path=output_path,
            rpm=args.rpm,
            dpi=args.dpi,
            salvage=True,
            skip_failed=args.skip_failed,
        )
        resultados.append((nombre, "OK" if ok else "FALLO"))
        print("=" * 60)

    print("\n\nRESUMEN FINAL")
    print("=" * 60)
    for nombre, estado in resultados:
        icono = "[OK]" if estado == "OK" else ("[SKIP]" if estado == "omitido" else "[FALLO]")
        print(f"  {icono}  {nombre}: {estado}")
    print("=" * 60)

    fallos = [n for n, e in resultados if e == "FALLO"]
    if fallos:
        print(f"\n{len(fallos)} PDF(s) fallaron. Reintenta con --skip-failed para saltar páginas problemáticas.")
        sys.exit(1)


if __name__ == "__main__":
    main()
