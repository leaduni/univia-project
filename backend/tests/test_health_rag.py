"""El healthcheck de producción debe verificar el RAG cuando es primario."""

import asyncio
from unittest.mock import MagicMock

from fastapi.responses import JSONResponse

from app import main
from app.core import database, rag_database


def _supabase_ok() -> MagicMock:
    client = MagicMock()
    query = client.table.return_value
    query.select.return_value = query
    query.limit.return_value = query
    query.execute.return_value.data = [{"id": 1}]
    return client


def test_health_requiere_postgres_si_es_almacen_primario(monkeypatch):
    monkeypatch.setattr(database, "get_supabase", _supabase_ok)
    monkeypatch.setattr(rag_database, "rag_store_name", lambda: "postgres")

    async def unavailable() -> bool:
        return False

    monkeypatch.setattr(rag_database, "rag_database_healthcheck", unavailable)
    response = asyncio.run(main.health())
    assert isinstance(response, JSONResponse)
    assert response.status_code == 503


def test_health_reporta_postgres_sano(monkeypatch):
    monkeypatch.setattr(database, "get_supabase", _supabase_ok)
    monkeypatch.setattr(rag_database, "rag_store_name", lambda: "postgres")

    async def available() -> bool:
        return True

    monkeypatch.setattr(rag_database, "rag_database_healthcheck", available)
    assert asyncio.run(main.health()) == {"status": "ok", "supabase": "ok", "rag": "ok"}


def test_health_solo_exige_supabase_si_rag_es_shadow(monkeypatch):
    monkeypatch.setattr(database, "get_supabase", _supabase_ok)
    monkeypatch.setattr(rag_database, "rag_store_name", lambda: "supabase")

    async def should_not_run() -> bool:
        raise AssertionError("El almacén shadow no debe bloquear el tráfico principal")

    monkeypatch.setattr(rag_database, "rag_database_healthcheck", should_not_run)
    assert asyncio.run(main.health()) == {"status": "ok", "supabase": "ok"}
