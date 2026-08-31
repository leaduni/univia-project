"""Re-vectoriza `resource_chunks` con el modelo de embeddings actual.

Los vectores de dos modelos distintos no son comparables: si se cambia el
modelo de embeddings y solo se vectoriza lo nuevo, la búsqueda semántica
devuelve resultados sin sentido porque compara vectores de espacios distintos.
Este script recorre TODOS los chunks y los vuelve a vectorizar.

Uso:
    python -m scripts_manuales.revectorizar_chunks            # dry-run
    python -m scripts_manuales.revectorizar_chunks --ejecutar # escribe

Se puede relanzar sin miedo: re-vectorizar un chunk que ya estaba al día da el
mismo vector, así que volver a correrlo completo no rompe nada (y con 811
chunks cuesta un par de centavos). Procesa por lotes y solo escribe el lote que
ya obtuvo su vector, así que un corte a mitad deja la base consistente.
"""

import argparse
import re
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.database import get_admin_client  # noqa: E402
from app.rag.embedder import SyllabusEmbedder  # noqa: E402

TAMANO_LOTE = 100
MAX_REINTENTOS = 6


def _es_rate_limit(e: Exception) -> bool:
    s = str(e).lower()
    return "429" in s or "resource_exhausted" in s or "quota" in s


def _retry_delay_sugerido(e: Exception, intento: int) -> float:
    """Usa el retryDelay que la API sugiere (Gemini lo trae en el error);
    si no viene, backoff exponencial simple."""
    m = re.search(r"retryDelay['\"]?:\s*['\"]?(\d+(?:\.\d+)?)s", str(e))
    if m:
        return float(m.group(1)) + 1.0
    return min(60.0, 5.0 * intento)


def traer_chunks(sb) -> list:
    filas, off = [], 0
    while True:
        lote = (
            sb.table("resource_chunks")
            .select("id,contenido")
            .order("id")
            .range(off, off + 999)
            .execute()
            .data
        )
        filas.extend(lote)
        if len(lote) < 1000:
            return filas
        off += 1000


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--ejecutar", action="store_true", help="escribe en la base")
    args = parser.parse_args()

    sb = get_admin_client()
    embedder = SyllabusEmbedder()

    chunks = [c for c in traer_chunks(sb) if c.get("contenido")]
    caracteres = sum(len(c["contenido"]) for c in chunks)
    # ~4 caracteres por token en prosa académica; sirve para estimar el costo.
    tokens_aprox = caracteres // 4
    print(f"chunks a re-vectorizar: {len(chunks)}")
    print(f"caracteres: {caracteres:,} (~{tokens_aprox:,} tokens)")
    print(f"modelo: {embedder.model_name}")
    print(f"costo estimado: ${tokens_aprox / 1_000_000 * 0.02:.4f} USD")

    if not args.ejecutar:
        print("\nDry-run. Repite con --ejecutar para escribir.")
        return

    hechos, fallidos = 0, []
    for i in range(0, len(chunks), TAMANO_LOTE):
        lote = chunks[i : i + TAMANO_LOTE]
        lote_num = i // TAMANO_LOTE + 1

        vectores = None
        for intento in range(1, MAX_REINTENTOS + 1):
            try:
                vectores = embedder._llamar_api([c["contenido"] for c in lote])
                break
            except Exception as e:
                if _es_rate_limit(e) and intento < MAX_REINTENTOS:
                    espera = _retry_delay_sugerido(e, intento)
                    print(f"  lote {lote_num}: rate limit, reintento {intento}/{MAX_REINTENTOS} en {espera:.1f}s")
                    time.sleep(espera)
                    continue
                fallidos.extend(c["id"] for c in lote)
                print(f"  lote {lote_num}: FALLÓ ({type(e).__name__}: {e})")
                break

        if vectores is None:
            continue

        for chunk, vector in zip(lote, vectores):
            sb.table("resource_chunks").update({"embedding": vector}).eq(
                "id", chunk["id"]
            ).execute()
        hechos += len(lote)
        print(f"  {hechos}/{len(chunks)} chunks (último id {lote[-1]['id']})")

    print(f"\nlisto: {hechos} re-vectorizados, {len(fallidos)} fallidos")
    if fallidos:
        print(f"ids fallidos: {fallidos[:20]}{' ...' if len(fallidos) > 20 else ''}")
        sys.exit(1)


if __name__ == "__main__":
    main()
