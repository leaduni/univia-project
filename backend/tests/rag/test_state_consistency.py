from types import SimpleNamespace
from unittest.mock import Mock, call

import pytest

from app.rag.ingest import SyllabusIngestor


def _chunks():
    return [
        {"contenido": "Primer chunk", "embedding": [0.1]},
        {"contenido": "Segundo chunk", "embedding": [0.2]},
    ]


def test_ingest_replace_calls_mark_rag_complete_only_on_success():
    client = Mock()

    replace_rpc = Mock()
    replace_rpc.execute.return_value = SimpleNamespace(data=1)

    mark_complete_rpc = Mock()
    mark_complete_rpc.execute.return_value = SimpleNamespace(data=None)

    client.rpc.side_effect = [replace_rpc, mark_complete_rpc]
    client.table.return_value.insert.return_value.execute.return_value = SimpleNamespace(
        data=[{"id": 1}]
    )

    inserted = SyllabusIngestor(client=client).replace(
        _chunks(),
        recurso_id=10,
        curso_id=20,
        drive_modified_time="2026-09-01T00:00:00+00:00",
        batch_size=1,
    )

    assert inserted == 2
    assert client.rpc.call_args_list == [
        call(
            "replace_resource_chunks",
            {
                "p_recurso_id": 10,
                "p_curso_id": 20,
                "p_chunks": [
                    {
                        "chunk_index": 0,
                        "contenido": "Primer chunk",
                        "embedding": [0.1],
                    }
                ],
                "p_drive_modified_time": "2026-09-01T00:00:00+00:00",
            },
        ),
        call(
            "mark_rag_complete",
            {
                "p_recurso_id": 10,
                "p_drive_modified_time": "2026-09-01T00:00:00+00:00",
            },
        ),
    ]


def test_ingest_replace_aborts_on_partial_failure():
    client = Mock()

    replace_rpc = Mock()
    replace_rpc.execute.return_value = SimpleNamespace(data=1)
    client.rpc.return_value = replace_rpc
    client.table.return_value.insert.return_value.execute.side_effect = RuntimeError(
        "Error insertando el segundo lote"
    )

    with pytest.raises(RuntimeError, match="Error insertando el segundo lote"):
        SyllabusIngestor(client=client).replace(
            _chunks(),
            recurso_id=10,
            curso_id=20,
            drive_modified_time="2026-09-01T00:00:00+00:00",
            batch_size=1,
        )

    assert client.rpc.call_args_list == [
        call(
            "replace_resource_chunks",
            {
                "p_recurso_id": 10,
                "p_curso_id": 20,
                "p_chunks": [
                    {
                        "chunk_index": 0,
                        "contenido": "Primer chunk",
                        "embedding": [0.1],
                    }
                ],
                "p_drive_modified_time": "2026-09-01T00:00:00+00:00",
            },
        )
    ]
