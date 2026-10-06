"""Sync local course-professor metadata using SELECT-only Supabase snapshots.

Defaults to dry-run. --apply reconciles only courses present in the local corpus.
No embeddings, LLM calls, or resource_chunks mutations are performed.
"""

import argparse
import asyncio
import hashlib
import json
import os
from pathlib import Path
from typing import Any, Mapping, Sequence
from urllib.parse import urlsplit

import asyncpg
from dotenv import load_dotenv

from app.core.database import get_admin_client


Association = tuple[int, int, str | None]
SCHEMA_PATH = Path(__file__).resolve().parents[3] / "base_de_datos/rag_local/004_course_professors.sql"


class SyncValidationError(ValueError):
    """Safe diagnostic text generated locally, without credentials or provider bodies."""


def validate_snapshot(
    rows: Sequence[Mapping[str, Any]], *, expected_count: int,
    course_ids: Sequence[int], allow_empty: bool = False,
) -> tuple[Association, ...]:
    if len(rows) != expected_count or (not rows and not allow_empty):
        raise SyncValidationError("Snapshot incompleto o vacío; no se reemplazan asociaciones.")
    scope = set(course_ids)
    result: list[Association] = []
    seen = set()
    for row in rows:
        course, professor = row.get("curso_id"), row.get("profesor_id")
        if (
            type(course) is not int or type(professor) is not int
            or course not in scope or professor <= 0
            or (course, professor) in seen
        ):
            raise SyncValidationError("Snapshot contiene asociaciones inválidas o duplicadas.")
        profile = row.get("profesores") or {}
        if not isinstance(profile, dict):
            raise SyncValidationError("El perfil docente del snapshot es inválido.")
        name = profile.get("nombre_completo")
        if name is not None and not isinstance(name, str):
            raise SyncValidationError("El nombre docente del snapshot es inválido.")
        seen.add((course, professor))
        result.append((course, professor, name.strip() or None if name else None))
    return tuple(sorted(result, key=lambda item: (item[0], item[1])))


def fetch_snapshot(client: Any, course_ids: Sequence[int], *, allow_empty: bool = False) -> tuple[Association, ...]:
    rows = []
    expected_count = None
    page_size = 500
    while True:
        response = (
            client.table("curso_profesores")
            .select("curso_id,profesor_id,profesores(nombre_completo)", count="exact")
            .in_("curso_id", list(course_ids))
            .order("curso_id").order("profesor_id")
            .range(len(rows), len(rows) + page_size - 1).execute()
        )
        if response.count is None or (
            expected_count is not None and response.count != expected_count
        ):
            raise SyncValidationError("El conteo remoto cambió durante la lectura del snapshot.")
        expected_count = int(response.count)
        page = response.data or []
        rows.extend(page)
        if len(page) < page_size:
            break
    return validate_snapshot(
        rows, expected_count=expected_count, course_ids=course_ids,
        allow_empty=allow_empty,
    )


async def apply_snapshot(
    connection: asyncpg.Connection, snapshot: Sequence[Association],
    course_ids: Sequence[int], *, apply_schema: bool = False,
) -> int:
    """Stage a validated complete snapshot, then reconcile atomically."""
    async with connection.transaction():
        await connection.execute("SELECT pg_advisory_xact_lock(60061006)")
        current_courses = await connection.fetch(
            "SELECT DISTINCT curso_id FROM resource_chunks ORDER BY curso_id"
        )
        if [row["curso_id"] for row in current_courses] != sorted(course_ids):
            raise SyncValidationError("El corpus cambió durante la lectura remota; repite la sincronización.")
        if apply_schema:
            await connection.execute(SCHEMA_PATH.read_text(encoding="utf-8"))
        await connection.execute(
            "CREATE TEMP TABLE rag_course_professors_snapshot "
            "(curso_id integer, profesor_id integer, profesor_nombre text, "
            "PRIMARY KEY(curso_id, profesor_id)) ON COMMIT DROP"
        )
        if snapshot:
            await connection.executemany(
                "INSERT INTO rag_course_professors_snapshot VALUES ($1, $2, $3)", snapshot
            )
        await connection.execute(
            """
            INSERT INTO rag_course_professors (curso_id, profesor_id, profesor_nombre)
            SELECT curso_id, profesor_id, profesor_nombre FROM rag_course_professors_snapshot
            ON CONFLICT (curso_id, profesor_id) DO UPDATE
            SET profesor_nombre=EXCLUDED.profesor_nombre, synced_at=now()
            WHERE rag_course_professors.profesor_nombre IS DISTINCT FROM EXCLUDED.profesor_nombre
            """
        )
        await connection.execute(
            """
            DELETE FROM rag_course_professors cp
            WHERE cp.curso_id=ANY($1::integer[]) AND NOT EXISTS (
                SELECT 1 FROM rag_course_professors_snapshot snapshot
                WHERE snapshot.curso_id=cp.curso_id AND snapshot.profesor_id=cp.profesor_id
            )
            """, list(course_ids),
        )
        count = await connection.fetchval(
            "SELECT count(*) FROM rag_course_professors WHERE curso_id=ANY($1::integer[])",
            list(course_ids),
        )
        if count != len(snapshot):
            raise RuntimeError("El conteo local no coincide con el snapshot; se revierte la transacción.")
        return int(count)


async def run(args: argparse.Namespace) -> dict[str, Any]:
    database_url = os.getenv("RAG_DATABASE_URL", "").strip()
    if not database_url:
        raise SyncValidationError("Falta RAG_DATABASE_URL.")
    host = urlsplit(database_url).hostname
    if host not in {"localhost", "127.0.0.1", "::1"} and not args.allow_remote_target:
        raise SyncValidationError("El target PostgreSQL no es local; requiere --allow-remote-target.")
    connection = await asyncpg.connect(database_url)
    try:
        database = await connection.fetchval("SELECT current_database()")
        if database != args.expected_database:
            raise SyncValidationError("El nombre de la base destino no coincide con --expected-database.")
        course_rows = await connection.fetch(
            "SELECT DISTINCT curso_id FROM resource_chunks ORDER BY curso_id"
        )
        courses = [row["curso_id"] for row in course_rows]
        if not courses:
            raise SyncValidationError("No hay cursos en el corpus local para sincronizar.")
        client = get_admin_client()
        snapshot = await asyncio.to_thread(fetch_snapshot, client, courses, allow_empty=args.allow_empty)
        confirmed = await asyncio.to_thread(fetch_snapshot, client, courses, allow_empty=args.allow_empty)
        if snapshot != confirmed:
            raise SyncValidationError("El snapshot remoto cambió entre lecturas; no se escribe nada.")
        report = {
            "mode": "apply" if args.apply else "dry_run",
            "database": database, "local_courses": len(courses),
            "associations": len(snapshot),
            "courses_with_professors": len({row[0] for row in snapshot}),
            "missing_professor_names": sum(row[2] is None for row in snapshot),
            "snapshot_sha256": hashlib.sha256(json.dumps(snapshot, ensure_ascii=False).encode()).hexdigest(),
        }
        if args.apply:
            report["local_associations"] = await apply_snapshot(
                connection, snapshot, courses, apply_schema=args.apply_schema,
            )
        return report
    finally:
        await connection.close()


def main() -> None:
    load_dotenv(Path(__file__).resolve().parents[2] / ".env")
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--apply-schema", action="store_true")
    parser.add_argument("--expected-database", default="univia_rag")
    parser.add_argument("--allow-remote-target", action="store_true")
    parser.add_argument("--allow-empty", action="store_true")
    args = parser.parse_args()
    try:
        print(json.dumps(asyncio.run(run(args)), ensure_ascii=False, indent=2))
    except Exception as error:
        # Avoid provider exception bodies and DSNs, which can contain credentials.
        print(json.dumps({"ok": False, "error_type": type(error).__name__,
                          "message": str(error) if isinstance(error, SyncValidationError)
                          else "Sincronización detenida; no se confirmó un snapshot completo o el target."}))
        raise SystemExit(1)


if __name__ == "__main__":
    main()
