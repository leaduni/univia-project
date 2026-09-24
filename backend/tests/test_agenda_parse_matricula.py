"""Pruebas de `POST /api/agenda/parse-matricula`.

Protegen el contrato de rendimiento: una importación debe generar UNA sola
consulta a `carga_horaria` y UNA sola inserción en `agenda_eventos`, nunca
una petición por bloque. El PDF y Gemini se simulan con módulos falsos.
"""

import io
import sys
import types
from unittest.mock import MagicMock

import pytest
from fastapi import HTTPException, UploadFile

from app.routers import agenda as agenda_router
from app.routers.agenda import parse_matricula


def _ok(data):
    resp = MagicMock()
    resp.data = data
    return resp


class FakeSupabase:
    """Réplica mínima del cliente Supabase usado por `parse_matricula`."""

    def __init__(self, config, labels, blocks, created, insert_error=None):
        self.config = config
        self.labels = labels
        self.blocks = blocks
        self.created = created
        self.insert_error = insert_error
        self.event_insert_calls = []
        self.execute_counts = {}

    def table(self, name):
        tbl = MagicMock()
        tbl.__name__ = name

        # Toda la cadena de filtros devuelve el mismo builder.
        tbl.select.return_value = tbl
        tbl.eq.return_value = tbl
        tbl.in_.return_value = tbl
        tbl.limit.return_value = tbl
        tbl.order.return_value = tbl
        tbl.maybe_single.return_value = tbl

        if name == "agenda_eventos":
            def insert(payload):
                self.event_insert_calls.append(payload)
                return tbl

            tbl.insert.side_effect = insert
            if self.insert_error is not None:
                tbl.execute.side_effect = self.insert_error
            else:
                tbl.execute.side_effect = lambda: _ok(self.created)
            return tbl

        # Tablas de lectura: config, etiquetas y carga horaria.
        tbl.insert.return_value = tbl

        def execute():
            self.execute_counts[name] = self.execute_counts.get(name, 0) + 1
            data = {
                "agenda_configuracion": self.config,
                "agenda_etiquetas": self.labels,
                "carga_horaria": self.blocks,
            }[name]
            return _ok(data)

        tbl.execute.side_effect = execute
        return tbl


def _make_fake_pdf(monkeypatch):
    """Reemplaza `pdfplumber` por una versión que devuelve una página."""

    class FakePage:
        def extract_text(self):
            return "FICHA DE MATRICULA 2026-II"

    class FakeContext:
        def __enter__(self):
            return self

        def __exit__(self, *args):
            return False

        @property
        def pages(self):
            return [FakePage()]

    fake_module = types.ModuleType("pdfplumber")
    fake_module.open = MagicMock(return_value=FakeContext())
    monkeypatch.setitem(sys.modules, "pdfplumber", fake_module)


def _make_fake_genai(monkeypatch, gemini_json):
    """Reemplaza `google.generativeai` por un modelo con respuesta JSON fija."""
    fake_genai = MagicMock()
    modelo = MagicMock()
    modelo.generate_content.return_value.text = gemini_json
    fake_genai.GenerativeModel.return_value = modelo

    google_module = types.ModuleType("google")
    google_module.__path__ = []
    google_module.generativeai = fake_genai
    monkeypatch.setitem(sys.modules, "google", google_module)
    monkeypatch.setitem(sys.modules, "google.generativeai", fake_genai)
    monkeypatch.setenv("GEMINI_API_KEY", "clave-de-prueba")


def _upload_matricula(monkeypatch, supabase, gemini_json):
    pdf_bytes = b"%PDF-1.4 prueba"
    upload = UploadFile(filename="matricula.pdf", file=io.BytesIO(pdf_bytes))

    _make_fake_pdf(monkeypatch)
    _make_fake_genai(monkeypatch, gemini_json)
    monkeypatch.setattr(agenda_router, "get_supabase", lambda token=None: supabase)
    return upload


def _fake_user():
    user = MagicMock()
    user.id = "perfil-de-prueba"
    return user


BASIC_CONFIG = {"semester_start": "2026-03-02"}
BASIC_LABELS = [
    {"id": 101, "nombre": "Clases Univ."},
    {"id": 102, "nombre": "Evaluaciones"},
]
BASIC_BLOCKS = [
    {
        "codigo": "BMA02",
        "seccion": "U",
        "nombre_curso": "Cálculo Integral",
        "tipo_clase": "T",
        "dia": "LU",
        "hora_inicio": "08:00:00",
        "hora_fin": "10:00:00",
        "aula": "A1",
        "docente": "Juan Pérez",
    },
    {
        "codigo": "BMA02",
        "seccion": "U2",
        "nombre_curso": "Cálculo Integral",
        "tipo_clase": "P",
        "dia": "MI",
        "hora_inicio": "10:00:00",
        "hora_fin": "12:00:00",
        "aula": "L2",
        "docente": "Ana Torres",
    },
]
CREATED = [
    {
        "id": 1,
        "titulo": "BMA02 - Teoría",
        "hora_inicio": 8.0,
        "duracion": 2.0,
        "fecha_iso": "2026-03-02",
    },
    {
        "id": 2,
        "titulo": "BMA02 - Práctica",
        "hora_inicio": 10.0,
        "duracion": 2.0,
        "fecha_iso": "2026-03-04",
    },
]
GEMINI_JSON = (
    '[{"course_code": "BMA02", "section": "U"},'
    '{"course_code": "BMA02", "section": "U2"}]'
)


async def test_parse_matricula_inserta_todo_en_una_sola_llamada(monkeypatch):
    """Varios bloques deben viajar en un solo `.insert(lista)` a Supabase."""
    supabase = FakeSupabase(BASIC_CONFIG, BASIC_LABELS, BASIC_BLOCKS, CREATED)
    upload = _upload_matricula(monkeypatch, supabase, GEMINI_JSON)

    resultado = await parse_matricula(upload, auth=(_fake_user(), "token-fake"))

    # Contract de rendimiento: una sola escritura y una sola lectura.
    assert len(supabase.event_insert_calls) == 1
    assert supabase.execute_counts.get("carga_horaria") == 1

    payloads = supabase.event_insert_calls[0]
    assert len(payloads) == 2
    assert payloads[0]["titulo"] == "BMA02 - Teoría"
    assert payloads[1]["titulo"] == "BMA02 - Práctica"
    assert {p["perfil_id"] for p in payloads} == {"perfil-de-prueba"}
    assert {p["recurrencia"] for p in payloads} == {"weekly"}

    # La respuesta conserva los IDs reales y la normalización numérica/fecha.
    assert len(resultado["eventos_creados"]) == 2
    assert resultado["eventos_creados"][0]["id"] == 1
    assert isinstance(resultado["eventos_creados"][0]["hora_inicio"], float)
    assert isinstance(resultado["eventos_creados"][0]["duracion"], float)
    assert isinstance(resultado["eventos_creados"][0]["fecha_iso"], str)


async def test_parse_matricula_sin_bloques_no_llama_a_insert(monkeypatch):
    """Si `carga_horaria` no tiene bloques, no se envía una lista vacía."""
    supabase = FakeSupabase(BASIC_CONFIG, BASIC_LABELS, [], [])
    upload = _upload_matricula(monkeypatch, supabase, GEMINI_JSON)

    resultado = await parse_matricula(upload, auth=(_fake_user(), "token-fake"))

    assert supabase.event_insert_calls == []
    assert resultado["eventos_creados"] == []
    assert "0 bloques horarios" in resultado["message"]


async def test_parse_matricula_solo_filtra_pares_exactos(monkeypatch):
    """El doble `.in_` trae combinaciones; solo persisten los pares pedidos."""
    bloques = [
        {**BASIC_BLOCKS[0]},
        {
            "codigo": "BMA02",
            "seccion": "U9",  # sección distinta: no debe insertarse
            "nombre_curso": "Cálculo Integral",
            "tipo_clase": "LAB",
            "dia": "VI",
            "hora_inicio": "14:00:00",
            "hora_fin": "16:00:00",
            "aula": "L9",
            "docente": "Otro",
        },
    ]
    supabase = FakeSupabase(BASIC_CONFIG, BASIC_LABELS, bloques, CREATED)
    upload = _upload_matricula(monkeypatch, supabase, GEMINI_JSON)

    resultado = await parse_matricula(upload, auth=(_fake_user(), "token-fake"))

    assert len(supabase.event_insert_calls) == 1
    assert len(supabase.event_insert_calls[0]) == 1
    assert resultado["eventos_creados"][0]["titulo"] == "BMA02 - Teoría"


async def test_parse_matricula_convierte_error_de_insert_en_500(monkeypatch):
    """Un fallo de Supabase debe salir como HTTP 500 controlado."""
    supabase = FakeSupabase(
        BASIC_CONFIG,
        BASIC_LABELS,
        BASIC_BLOCKS,
        [],
        insert_error=RuntimeError("leo por debajo"),
    )
    upload = _upload_matricula(monkeypatch, supabase, GEMINI_JSON)

    with pytest.raises(HTTPException) as exc:
        await parse_matricula(upload, auth=(_fake_user(), "token-fake"))

    assert exc.value.status_code == 500
    assert "No se pudieron crear" in str(exc.value.detail)
    assert len(supabase.event_insert_calls) == 1

