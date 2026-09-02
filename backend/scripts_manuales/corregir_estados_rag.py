import argparse
import os
from datetime import datetime, timezone

from dotenv import load_dotenv
from supabase import create_client


load_dotenv()

PAGE_SIZE = 1000
UPDATE_BATCH_SIZE = 100


def obtener_cliente():
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

    if not supabase_url or not supabase_key:
        raise ValueError("Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.")

    return create_client(supabase_url, supabase_key)


def obtener_recursos_con_chunks_incompletos(sb):
    recursos = []
    inicio = 0

    while True:
        respuesta = (
            sb.table("recursos")
            .select("id, rag_status, resource_chunks!inner(recurso_id)")
            .neq("rag_status", "complete")
            .range(inicio, inicio + PAGE_SIZE - 1)
            .execute()
        )
        pagina = respuesta.data or []
        recursos.extend(pagina)

        if len(pagina) < PAGE_SIZE:
            return recursos

        inicio += PAGE_SIZE


def obtener_recursos_con_metadatos_incompletos(sb):
    recursos = []
    inicio = 0

    while True:
        respuesta = (
            sb.table("recursos")
            .select("id, preview_url, drive_path")
            .or_("preview_url.is.null,drive_path.is.null")
            .range(inicio, inicio + PAGE_SIZE - 1)
            .execute()
        )
        pagina = respuesta.data or []
        recursos.extend(pagina)

        if len(pagina) < PAGE_SIZE:
            return recursos

        inicio += PAGE_SIZE


def actualizar_estados(sb, recurso_ids):
    timestamp = datetime.now(timezone.utc).isoformat()

    for inicio in range(0, len(recurso_ids), UPDATE_BATCH_SIZE):
        lote_ids = recurso_ids[inicio : inicio + UPDATE_BATCH_SIZE]
        (
            sb.table("recursos")
            .update(
                {
                    "rag_status": "complete",
                    "rag_processed_at": timestamp,
                }
            )
            .in_("id", lote_ids)
            .execute()
        )


def main():
    parser = argparse.ArgumentParser(
        description="Corrige estados RAG y reporta recursos con metadatos incompletos."
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Muestra los cambios propuestos sin actualizar la base de datos.",
    )
    args = parser.parse_args()

    sb = obtener_cliente()
    recursos_incompletos = obtener_recursos_con_chunks_incompletos(sb)
    recursos_sin_metadatos = obtener_recursos_con_metadatos_incompletos(sb)

    ids_a_corregir = [recurso["id"] for recurso in recursos_incompletos]

    print("\n=== Estados RAG inconsistentes ===")
    if ids_a_corregir:
        for recurso in recursos_incompletos:
            print(f"ID {recurso['id']} | rag_status actual: {recurso['rag_status']}")
    else:
        print("No se encontraron recursos para corregir.")

    if args.dry_run:
        print(f"\n[DRY-RUN] Se actualizarían {len(ids_a_corregir)} recursos.")
    elif ids_a_corregir:
        actualizar_estados(sb, ids_a_corregir)
        print(f"\nActualizados {len(ids_a_corregir)} recursos a 'complete'.")

    print("\n=== Recursos con metadatos incompletos ===")
    if recursos_sin_metadatos:
        for recurso in recursos_sin_metadatos:
            faltantes = []
            if recurso["preview_url"] is None:
                faltantes.append("preview_url")
            if recurso["drive_path"] is None:
                faltantes.append("drive_path")
            print(f"ID {recurso['id']} | faltan: {', '.join(faltantes)}")
    else:
        print("No se encontraron recursos con metadatos incompletos.")


if __name__ == "__main__":
    main()
