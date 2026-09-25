"""Pruebas del parser determinista de Boleta de Matrícula UNI y del flujo
híbrido de `POST /api/agenda/parse-matricula` (local primero, Gemini de
fallback silencioso) y del endpoint filtrado `GET /api/agenda/mis-cursos`.
"""

import io
import sys
import types
from unittest.mock import MagicMock

import pytest
from fastapi import UploadFile

from app.routers import agenda as agenda_router
from app.routers.agenda import parse_matricula, get_mis_cursos
from app.utils import matricula_uni_parser as uni_parser

from tests.test_agenda_parse_matricula import (
    FakeSupabase, BASIC_CONFIG, BASIC_LABELS, CREATED, GEMINI_JSON,
    _make_fake_genai, _fake_user, _ok,
)


# ── Fixtures de PDF UNI falso ────────────────────────────────────────────────

ESTRUCTURA_HORARIO = [
    ["CURSO", "SEC", "DÍA", "HORA", "TIPO", "DOCENTE", "AULA"],
    ["BEG01", "Z", "Martes", "10:00 - 12:00", "T",
     "MONDRAGÓN HERNÁNDEZ MARGARITA DELICIA", "S7-106"],
    ["FB501", "V", "Viernes", "08:00 - 10:00", "PRA",
     "SALAZAR FLORES ELIZABETH RUTH", "S1-129 (LAB A)"],
]

ESTRUCTURA_MATRICULADOS = [
    ["CICLO", "CURSO", "SEC", "NOMBRE DEL CURSO", "CONDICIÓN", "CRÉD.", "VECES REP."],
    ["2026-II", "BEG01", "Z", "ALGORITMOS AVANZADOS", "O", "4", "1"],
    ["2026-II", "FB501", "V", "FÍSICA EXPERIMENTAL", "O", "3", "1"],
]

TEXTO_UNI_CON_TABLAS = (
    "UNIVERSIDAD NACIONAL DE INGENIERÍA\n"
    "CURSOS MATRICULADOS\n"
    "CICLO CURSO SEC NOMBRE DEL CURSO CONDICIÓN CRÉD. VECES REP.\n"
    "HORARIO DE CLASES\n"
    "CURSO SEC DÍA HORA TIPO DOCENTE AULA\n"
)


class _FakeContext:
    def __init__(self, pages):
        self._pages = pages

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False

    @property
    def pages(self):
        return self._pages


def _fake_pdfplumber(monkeypatch, texto: str, tablas: list):
    class FakePage:
        def extract_text(self):
            return texto

        def extract_tables(self):
            return tablas

    fake_module = types.ModuleType("pdfplumber")
    fake_module.open = MagicMock(return_value=_FakeContext([FakePage()]))
    monkeypatch.setitem(sys.modules, "pdfplumber", fake_module)


# ── Tests del parser puro ────────────────────────────────────────────────────

def test_parser_extrae_bloques_desde_tablas(monkeypatch):
    _fake_pdfplumber(monkeypatch, TEXTO_UNI_CON_TABLAS,
                     [ESTRUCTURA_MATRICULADOS, ESTRUCTURA_HORARIO])

    res = uni_parser.parse_ficha_uni(b"%PDF fake")

    assert res is not None
    assert len(res["bloques"]) == 2

    b1 = res["bloques"][0]
    assert b1["codigo"] == "BEG01"
    assert b1["seccion"] == "Z"
    assert b1["dia"] == "MA"
    assert b1["hora_inicio"] == "10:00"
    assert b1["hora_fin"] == "12:00"
    assert b1["tipo"] == "T"
    assert b1["docente"] == "MONDRAGÓN HERNÁNDEZ MARGARITA DELICIA"
    assert b1["aula"] == "S7-106"

    b2 = res["bloques"][1]
    assert b2["tipo"] == "P"               # PRA → P
    assert b2["dia"] == "VI"
    assert b2["aula"] == "S1-129 (LAB A)"

    assert res["cursos"]["BEG01"]["nombre"] == "ALGORITMOS AVANZADOS"


def test_parser_fallback_texto_plano(monkeypatch):
    """Si extract_tables no encuentra filas, el regex de texto debe rescatar
    la fila del horario."""
    texto = (
        "UNIVERSIDAD NACIONAL DE INGENIERÍA\n"
        "HORARIO DE CLASES\n"
        "CURSO  SEC  DÍA  HORA  TIPO  DOCENTE  AULA\n"
        "BEG01 Z Martes 10:00 - 12:00 T MONDRAGÓN HERNÁNDEZ MARGARITA DELICIA  S7-106\n"
    )
    _fake_pdfplumber(monkeypatch, texto, [])

    res = uni_parser.parse_ficha_uni(b"%PDF fake")

    assert res is not None
    assert len(res["bloques"]) == 1
    assert res["bloques"][0]["codigo"] == "BEG01"
    assert res["bloques"][0]["aula"] == "S7-106"


def test_parser_devuelve_none_si_no_es_ficha_uni(monkeypatch):
    _fake_pdfplumber(monkeypatch, "DOCUMENTO ALEATORIO SIN FIRMA UNI", [])

    assert uni_parser.parse_ficha_uni(b"%PDF fake") is None


# ── Flujo híbrido del endpoint ───────────────────────────────────────────────

async def test_parse_matricula_via_local_no_llama_gemini(monkeypatch):
    """Con ficha UNI válida, el parser local basta y Gemini NO se importa."""
    # Carga horaria vacía: el parser local no la necesita.
    supabase = FakeSupabase(BASIC_CONFIG, BASIC_LABELS, [], CREATED[:2])
    _fake_pdfplumber(monkeypatch, TEXTO_UNI_CON_TABLAS,
                     [ESTRUCTURA_MATRICULADOS, ESTRUCTURA_HORARIO])
    monkeypatch.setattr(agenda_router, "get_supabase", lambda token=None: supabase)
    # Gemini visiblemente NO configurado: si el código lo tocara, lanzaría 500.
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)

    upload = UploadFile(filename="matricula.pdf", file=io.BytesIO(b"%PDF fake"))
    resultado = await parse_matricula(upload, auth=(_fake_user(), "token-fake"))

    assert resultado["metodo"] == "local"
    assert len(supabase.event_insert_calls) == 1          # insert en lote único
    payloads = supabase.event_insert_calls[0]
    assert len(payloads) == 2
    t = payloads[0]
    assert t["titulo"] == "BEG01 - Teoría"
    assert "MONDRAGÓN HERNÁNDEZ" in t["subtitulo"]
    assert "Sección Z" in t["subtitulo"]
    assert t["ubicacion"] == "S7-106"
    assert t["hora_inicio"] == 10.0 and t["duracion"] == 2.0
    assert t["recurrencia"] == "weekly"
    # Viernes a partir del lunes 2026-03-02 → primera fecha = 2026-03-06
    viernes = next(p for p in payloads if "FB501" in p["titulo"])
    assert viernes["titulo"] == "FB501 - Práctica"
    assert viernes["fecha_iso"] == "2026-03-06"
    assert "S1-129 (LAB A)" in viernes["subtitulo"]
    # No se consultó carga_horaria en el camino local
    assert "carga_horaria" not in supabase.execute_counts


async def test_parse_matricula_fallback_a_gemini_si_no_es_uni(monkeypatch):
    """PDF sin firma UNI → flujo original con Gemini + carga_horaria."""
    bloques = [{
        "codigo": "BMA02", "seccion": "U", "nombre_curso": "Cálculo Integral",
        "tipo_clase": "T", "dia": "LU", "hora_inicio": "08:00:00",
        "hora_fin": "10:00:00", "aula": "A1", "docente": "Juan Pérez",
    }]
    supabase = FakeSupabase(BASIC_CONFIG, BASIC_LABELS, bloques, CREATED[:1])
    _fake_pdfplumber(monkeypatch, "PDF GENÉRICO DE OTRA UNIVERSIDAD", [])
    _make_fake_genai(monkeypatch, '[{"course_code": "BMA02", "section": "U"}]')
    monkeypatch.setattr(agenda_router, "get_supabase", lambda token=None: supabase)

    upload = UploadFile(filename="matricula.pdf", file=io.BytesIO(b"%PDF fake"))
    resultado = await parse_matricula(upload, auth=(_fake_user(), "token-fake"))

    assert resultado["metodo"] == "gemini"
    assert len(resultado["eventos_creados"]) == 1
    assert resultado["eventos_creados"][0]["titulo"] == "BMA02 - Teoría"


async def test_parse_matricula_local_descarta_bloques_invalidos(monkeypatch):
    """Un bloque con hora_fin <= hora_inicio no debe insertarse."""
    tablas = [
        ["CURSO", "SEC", "DÍA", "HORA", "TIPO", "DOCENTE", "AULA"],
        ["BEG01", "Z", "Martes", "12:00 - 10:00", "T", "DOCENTE X", "S7-106"],
        ["BEG01", "Z", "Jueves", "10:00 - 12:00", "T", "DOCENTE X", "S7-107"],
    ]
    supabase = FakeSupabase(BASIC_CONFIG, BASIC_LABELS, [], CREATED[:1])
    _fake_pdfplumber(monkeypatch, TEXTO_UNI_CON_TABLAS, [tablas])
    monkeypatch.setattr(agenda_router, "get_supabase", lambda token=None: supabase)

    upload = UploadFile(filename="matricula.pdf", file=io.BytesIO(b"%PDF fake"))
    resultado = await parse_matricula(upload, auth=(_fake_user(), "token-fake"))

    assert resultado["metodo"] == "local"
    assert len(supabase.event_insert_calls[0]) == 1
    assert supabase.event_insert_calls[0][0]["ubicacion"] == "S7-107"


# ── Endpoint /mis-cursos ─────────────────────────────────────────────────────

class _FakeSupabaseMisCursos:
    """Simula progreso_cursos → cursos → carga_horaria con filtrado por .in_."""

    def __init__(self, progreso, cursos, carga):
        self.progreso = progreso
        self.cursos = cursos
        self.carga = carga

    def table(self, name):
        tbl = MagicMock()
        tbl.select.return_value = tbl
        tbl.eq.return_value = tbl
        tbl.limit.return_value = tbl

        def in_(campo, valores):
            tbl._filtros_in = (campo, valores)
            return tbl
        tbl.in_.side_effect = in_

        def execute():
            data = {
                "progreso_cursos": self.progreso,
                "cursos": self.cursos,
                "carga_horaria": self.carga,
            }[name]
            if getattr(tbl, "_filtros_in", None) and name in ("cursos", "carga_horaria"):
                campo, valores = tbl._filtros_in
                data = [r for r in data if r.get(campo) in valores]
            return _ok(data)
        tbl.execute.side_effect = execute
        return tbl


async def test_mis_cursos_filtra_por_onboarding(monkeypatch):
    progreso = [{"curso_id": 1, "status": "in_progress"}]
    cursos = [{"id": 1, "code": "BMA02", "name": "Cálculo Integral"}]
    carga = [
        {"codigo": "BMA02", "seccion": "U", "dia": "LU"},
        {"codigo": "BEG01", "seccion": "Z", "dia": "MA"},  # otro curso: filtrado
    ]
    sb = _FakeSupabaseMisCursos(progreso, cursos, carga)
    monkeypatch.setattr(agenda_router, "get_supabase", lambda token=None: sb)

    data = await get_mis_cursos(auth=(_fake_user(), "token-fake"))

    assert len(data) == 1
    assert data[0]["codigo"] == "BMA02"


async def test_mis_cursos_sin_onboarding_devuelve_vacio(monkeypatch):
    sb = _FakeSupabaseMisCursos([], [], [])
    monkeypatch.setattr(agenda_router, "get_supabase", lambda token=None: sb)

    data = await get_mis_cursos(auth=(_fake_user(), "token-fake"))
    assert data == []
