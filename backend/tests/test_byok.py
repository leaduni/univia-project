"""Pruebas del flujo BYOK tras la auditoría de la API key de Gemini.

Cobertura:
- `/chatbot/validate-key` clasifica los códigos HTTP de Google (400/403/404/429)
  con mensajes accionables y sin exponer la clave en la respuesta.
- `POST /agenda/parse-matricula` da prioridad a `X-User-LLM-Key` sobre
  `GEMINI_API_KEY` en el fallback IA.
"""

import io
import sys
import types

import pytest
from google.genai.errors import ClientError, ServerError
from unittest.mock import MagicMock
from fastapi import HTTPException, UploadFile

from app.core import llm
from app.routers import chatbot as chatbot_router
from app.routers import agenda as agenda_router
from app.routers.agenda import parse_matricula

from tests.test_agenda_parse_matricula import (
    FakeSupabase,
    BASIC_CONFIG,
    BASIC_LABELS,
    CREATED,
    _fake_user,
    _make_fake_genai,
)
from tests.test_matricula_uni_parser import _fake_pdfplumber


# ── _status_http / auxiliares del backend ─────────────────────────────────────

def test_status_http_extrae_codigo_de_client_error():
    err = ClientError(403, {"error": {"message": "API key not valid."}})
    assert llm._status_http(err) == 403


def test_status_http_extrae_codigo_de_server_error():
    err = ServerError(503, {"error": {"message": "OVERLOADED"}})
    assert llm._status_http(err) == 503


# ── Traducción de errores de la prueba de clave ───────────────────────────────

class TestTraducirErrorValidacion:
    def test_403_clave_invalida(self):
        err = ClientError(403, {"error": {"message": "API key not valid"}})
        mensaje = chatbot_router._traducir_error_validacion(llm._status_http(err), err)
        assert "403" in mensaje
        assert "clave" in mensaje.lower()

    def test_429_cuota_agotada(self):
        err = ClientError(429, {"error": {"message": "RESOURCE_EXHAUSTED"}})
        mensaje = chatbot_router._traducir_error_validacion(llm._status_http(err), err)
        assert "429" in mensaje
        assert "cuota" in mensaje.lower()

    def test_404_modelo_no_disponible(self):
        err = ClientError(404, {"error": {"message": "models/gemini-x not found"}})
        mensaje = chatbot_router._traducir_error_validacion(llm._status_http(err), err)
        assert "404" in mensaje

    def test_400_solicitud_rechazada(self):
        err = ClientError(400, {"error": {"message": "Invalid argument"}})
        mensaje = chatbot_router._traducir_error_validacion(llm._status_http(err), err)
        assert "400" in mensaje

    def test_5xx_proveedor_saturado(self):
        err = ServerError(503, {"error": {"message": "OVERLOADED"}})
        mensaje = chatbot_router._traducir_error_validacion(llm._status_http(err), err)
        assert "5xx" in mensaje

    def test_generico_sin_codigo_reconocido(self):
        mensaje = chatbot_router._traducir_error_validacion(None, RuntimeError("boom"))
        assert mensaje

    def test_fallback_por_texto_sin_atributo_de_codigo(self):
        err = RuntimeError("quota exceeded: 429 RESOURCE_EXHAUSTED")
        mensaje = chatbot_router._traducir_error_validacion(None, err)
        assert "cuota" in mensaje.lower()

    async def test_la_respuesta_nunca_contiene_el_texto_de_la_excepcion(self, monkeypatch):
        """La excepción del SDK puede arrastrar la clave en la URL; nunca debe
        filtrarse al usuario."""
        def _falla(*args, **kwargs):
            raise ClientError(
                403,
                {"error": {"message": "API key not valid. key=AIzaSyCLAVESECRETA123"}},
            )
        monkeypatch.setattr(chatbot_router, "chatear_gemini_con_clave", _falla)

        resultado = await chatbot_router.validar_clave(
            user_data=(_fake_user(), "token-fake"),
            x_user_llm_key="AIzaSyCLAVESECRETA123",
        )
        assert "AIzaSyCLAVESECRETA123" not in resultado["error"]
# ── Endpoint /chatbot/validate-key ────────────────────────────────────────────

class TestValidarClave:
    async def test_clave_valida(self, monkeypatch):
        monkeypatch.setattr(
            chatbot_router, "chatear_gemini_con_clave",
            lambda *a, **k: "ping",
        )
        resultado = await chatbot_router.validar_clave(
            user_data=(_fake_user(), "token-fake"),
            x_user_llm_key="AIzaSyClaveValida123",
        )
        assert resultado == {"valid": True}

    async def test_clave_vacia(self, monkeypatch):
        resultado = await chatbot_router.validar_clave(
            user_data=(_fake_user(), "token-fake"),
            x_user_llm_key="   \n\t ",
        )
        assert resultado["valid"] is False
        assert "vacía" in resultado["error"]

    async def test_403_devuelve_error_especifico(self, monkeypatch):
        def _falla(*args, **kwargs):
            raise ClientError(403, {"error": {"message": "API key not valid"}})
        monkeypatch.setattr(chatbot_router, "chatear_gemini_con_clave", _falla)

        resultado = await chatbot_router.validar_clave(
            user_data=(_fake_user(), "token-fake"),
            x_user_llm_key="AIzaSyClaveMala",
        )
        assert resultado["valid"] is False
        assert "403" in resultado["error"]

    async def test_429_devuelve_error_especifico(self, monkeypatch):
        def _falla(*args, **kwargs):
            raise ClientError(429, {"error": {"message": "RESOURCE_EXHAUSTED"}})
        monkeypatch.setattr(chatbot_router, "chatear_gemini_con_clave", _falla)

        resultado = await chatbot_router.validar_clave(
            user_data=(_fake_user(), "token-fake"),
            x_user_llm_key="AIzaSyClaveCuota",
        )
        assert resultado["valid"] is False
        assert "429" in resultado["error"]
        assert "cuota" in resultado["error"].lower()

    async def test_404_devuelve_error_especifico(self, monkeypatch):
        def _falla(*args, **kwargs):
            raise ClientError(404, {"error": {"message": "models/gemini-x not found"}})
        monkeypatch.setattr(chatbot_router, "chatear_gemini_con_clave", _falla)

        resultado = await chatbot_router.validar_clave(
            user_data=(_fake_user(), "token-fake"),
            x_user_llm_key="AIzaSyClaveModelo",
        )
        assert resultado["valid"] is False
        assert "404" in resultado["error"]
# ── Prioridad del header en /agenda/parse-matricula ───────────────────────────

BLOQUE_UNI = [{
    "codigo": "BMA02", "seccion": "U", "nombre_curso": "Cálculo Integral",
    "tipo_clase": "T", "dia": "LU", "hora_inicio": "08:00:00",
    "hora_fin": "10:00:00", "aula": "A1", "docente": "Juan Pérez",
}]


def _upload_sin_firma_uni(monkeypatch, supabase, gemini_json):
    monkeypatch.setattr(agenda_router, "get_supabase", lambda token=None: supabase)
    _fake_pdfplumber(monkeypatch, "PDF GENÉRICO DE OTRA UNIVERSIDAD", [])
    _make_fake_genai(monkeypatch, gemini_json)
    return UploadFile(filename="matricula.pdf", file=io.BytesIO(b"%PDF fake"))


async def test_parse_matricula_usa_la_clave_del_usuario_cuando_llega_el_header(monkeypatch):
    supabase = FakeSupabase(BASIC_CONFIG, BASIC_LABELS, BLOQUE_UNI, CREATED[:1])
    upload = _upload_sin_firma_uni(
        monkeypatch, supabase, '[{"course_code": "BMA02", "section": "U"}]'
    )

    resultado = await parse_matricula(
        upload,
        auth=(_fake_user(), "token-fake"),
        x_user_llm_key="AIzaMiClaveBYOK123",
    )

    assert resultado["metodo"] == "gemini"
    fake_genai = sys.modules["google.generativeai"]
    # La clave del estudiante gana sobre GEMINI_API_KEY del entorno.
    assert fake_genai.configure.call_args.kwargs["api_key"] == "AIzaMiClaveBYOK123"
    assert resultado["eventos_creados"][0]["titulo"] == "BMA02 - Teoría"


async def test_parse_matricula_cae_a_env_sin_header(monkeypatch):
    supabase = FakeSupabase(BASIC_CONFIG, BASIC_LABELS, BLOQUE_UNI, CREATED[:1])
    upload = _upload_sin_firma_uni(
        monkeypatch, supabase, '[{"course_code": "BMA02", "section": "U"}]'
    )

    resultado = await parse_matricula(upload, auth=(_fake_user(), "token-fake"))

    assert resultado["metodo"] == "gemini"
    fake_genai = sys.modules["google.generativeai"]
    assert fake_genai.configure.call_args.kwargs["api_key"] == "clave-de-prueba"


async def test_parse_matricula_header_con_espacios_se_limpia(monkeypatch):
    supabase = FakeSupabase(BASIC_CONFIG, BASIC_LABELS, BLOQUE_UNI, CREATED[:1])
    upload = _upload_sin_firma_uni(
        monkeypatch, supabase, '[{"course_code": "BMA02", "section": "U"}]'
    )

    await parse_matricula(
        upload,
        auth=(_fake_user(), "token-fake"),
        x_user_llm_key="  AIzaMiClaveConEspacios  ",
    )

    fake_genai = sys.modules["google.generativeai"]
    assert fake_genai.configure.call_args.kwargs["api_key"] == "AIzaMiClaveConEspacios"


async def test_parse_matricula_clave_invalida_del_usuario_400(monkeypatch):
    supabase = FakeSupabase(BASIC_CONFIG, BASIC_LABELS, [], [])
    monkeypatch.setattr(agenda_router, "get_supabase", lambda token=None: supabase)
    _fake_pdfplumber(monkeypatch, "PDF GENÉRICO DE OTRA UNIVERSIDAD", [])

    fake_genai = MagicMock()
    modelo = MagicMock()
    modelo.generate_content.side_effect = ClientError(
        403, {"error": {"message": "API key not valid"}}
    )
    fake_genai.GenerativeModel.return_value = modelo
    google_module = types.ModuleType("google")
    google_module.__path__ = []
    google_module.generativeai = fake_genai
    monkeypatch.setitem(sys.modules, "google", google_module)
    monkeypatch.setitem(sys.modules, "google.generativeai", fake_genai)
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)

    upload = UploadFile(filename="matricula.pdf", file=io.BytesIO(b"%PDF fake"))
    with pytest.raises(HTTPException) as exc:
        await parse_matricula(
            upload,
            auth=(_fake_user(), "token-fake"),
            x_user_llm_key="AIzaClaveMala",
        )

    assert exc.value.status_code == 400
    assert "no es válida" in str(exc.value.detail)