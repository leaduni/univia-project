"""Tests de la optimización de generación de evaluaciones (Puntos 1-6).

Cobertura:
- Aislamiento de OpenAI en generación (ALLOW_OPENAI_GENERATION).
- Recorte del contexto RAG al presupuesto de caracteres (token trimming).
- Telemetría: registro de tokens y costo $0 en proveedores gratuitos.
- Reparación única de JSON en _generar_json_con_reparacion.
"""
import os
from unittest.mock import MagicMock, patch

import pytest

from app.core import llm
from app.routers import evaluaciones as ev


# --------------------------------------------------------------------------
# Punto 1: aislamiento de OpenAI en la cascada de generación
# --------------------------------------------------------------------------

class TestAislamientoOpenAI:
    def test_openai_excluido_sin_bandera(self, monkeypatch):
        monkeypatch.delenv("ALLOW_OPENAI_GENERATION", raising=False)
        assert llm._permitido_en_generacion("openai") is False

    def test_openai_permitido_con_bandera(self, monkeypatch):
        monkeypatch.setenv("ALLOW_OPENAI_GENERATION", "true")
        assert llm._permitido_en_generacion("openai") is True

    def test_gemini_y_groq_siempre_permitidos(self, monkeypatch):
        monkeypatch.delenv("ALLOW_OPENAI_GENERATION", raising=False)
        assert llm._permitido_en_generacion("gemini") is True
        assert llm._permitido_en_generacion("groq") is True

    def test_generar_sin_proveedores_lanza(self, monkeypatch):
        """Sin bandera y con LLM_PROVIDER=openai sin fallbacks -> error claro."""
        monkeypatch.delenv("ALLOW_OPENAI_GENERATION", raising=False)
        monkeypatch.setattr(llm, "LLM_PROVIDER", "openai")
        monkeypatch.setattr(llm, "LLM_FALLBACKS", [])
        with pytest.raises(RuntimeError, match="ALLOW_OPENAI_GENERATION"):
            llm.generar(prompt="hola")


# --------------------------------------------------------------------------
# Punto 2: recorte del contexto RAG
# --------------------------------------------------------------------------

class TestRecorteContextoRAG:
    def test_chunks_que_caben_no_se_tocan(self):
        items = [{"contenido": "abc"}, {"contenido": "def"}]
        assert ev._recortar_items_contexto(items, 9000) == items

    def test_total_no_supera_presupuesto(self):
        items = [{"contenido": "x" * 5000} for _ in range(4)]
        resultado = ev._recortar_items_contexto(items, max_chars=9000)
        total = sum(len(i["contenido"]) for i in resultado)
        assert total <= 9000 + 3  # +3 por el marcador " …"

    def test_corte_en_final_de_frase(self):
        largo = ("Primera oración completa. Segunda oración muy larga " * 400)
        items = [{"contenido": largo}]
        resultado = ev._recortar_items_contexto(items, max_chars=3000)
        assert len(resultado) == 1
        assert resultado[0]["contenido"].endswith("…")
        assert len(resultado[0]["contenido"]) <= 3000

    def test_presupuesto_deshabilitado_devuelve_todo(self):
        items = [{"contenido": "x" * 20000}]
        assert ev._recortar_items_contexto(items, max_chars=0) == items


# --------------------------------------------------------------------------
# Punto 6: telemetría de tokens y costo
# --------------------------------------------------------------------------

class TestFallback429:
    """Integración: un 429/503 de Gemini debe saltar a Groq sin romper la app."""

    def _cascada_simulada(self, monkeypatch, error_gemini):
        def llamar_gemini_falla(cliente, **kwargs):
            raise error_gemini

        def llamar_groq_ok(cliente, **kwargs):
            return "respuesta de groq"

        proveedores = {
            "gemini": llm.ProveedorLLM("gemini", "gemini-x", cliente=object(), llamar=llamar_gemini_falla),
            "groq": llm.ProveedorLLM("groq", "gpt-oss", cliente=object(), llamar=llamar_groq_ok),
        }
        monkeypatch.setattr(llm, "_proveedor", lambda nombre: proveedores.get(nombre))
        monkeypatch.setattr(llm, "LLM_PROVIDER", "gemini")
        monkeypatch.setattr(llm, "LLM_FALLBACKS", ["groq"])

    def test_429_clienterror_salta_a_groq(self, monkeypatch):
        from google.genai.errors import ClientError
        self._cascada_simulada(monkeypatch, ClientError(429, {"error": {"message": "RESOURCE_EXHAUSTED"}}))
        assert llm.generar(prompt="hola") == "respuesta de groq"

    def test_503_servererror_salta_a_groq(self, monkeypatch):
        from google.genai.errors import ServerError
        self._cascada_simulada(monkeypatch, ServerError(503, {"error": {"message": "OVERLOADED"}}))
        assert llm.generar(prompt="hola") == "respuesta de groq"

    def test_400_no_reintentable_no_salta(self, monkeypatch):
        from google.genai.errors import ClientError
        self._cascada_simulada(monkeypatch, ClientError(400, {"error": {"message": "bad request"}}))
        with pytest.raises(ClientError):
            llm.generar(prompt="hola")

    def test_clasificador_reconoce_code_google_genai(self):
        from google.genai.errors import ClientError, ServerError
        assert llm._es_error_reintentable(ClientError(429, {"error": {}})) is True
        assert llm._es_error_reintentable(ServerError(503, {"error": {}})) is True
        assert llm._es_error_reintentable(ClientError(400, {"error": {}})) is False


class TestTelemetria:
    def test_gemini_free_tier_costo_cero(self):
        m = llm.registrar_uso("gemini", "gemini-2.5-flash", 5000, 2000)
        assert m["costo_usd"] == 0.0
        assert m["tokens"] == {"prompt": 5000, "completion": 2000, "total": 7000}

    def test_groq_free_tier_costo_cero(self):
        m = llm.registrar_uso("groq", "llama-3.3-70b-versatile", 1000, 500)
        assert m["costo_usd"] == 0.0

    def test_gpt_4o_mini_calcula_tarifa(self):
        # 1M in * 0.15 + 1M out * 0.60 = 0.75 USD
        m = llm.registrar_uso("openai", "gpt-4o-mini", 1_000_000, 1_000_000)
        assert m["costo_usd"] == pytest.approx(0.75, abs=1e-4)

    def test_obtener_ultima_telemetria_thread_local(self):
        llm.registrar_uso("groq", "llama-3.3-70b-versatile", 10, 20)
        ultima = llm.obtener_ultima_telemetria()
        assert ultima["proveedor"] == "groq"


# --------------------------------------------------------------------------
# Anti-truncado de JSON por explicaciones extensas
# --------------------------------------------------------------------------

class TestReglaConcision:
    def test_system_msg_evaluacion_tiene_regla(self):
        assert "150 palabras" in ev.SYSTEM_MSG_EVALUACION
        assert "debates internos" in ev.SYSTEM_MSG_EVALUACION

    def test_prompt_teorico_tiene_regla(self):
        cfg = ev.ConfiguracionEvaluacion(
            curso_id=1, modulo="M", temas=["límites"], num_preguntas=3,
            observaciones="", tipo_evaluacion="unica",
        )
        prompt = ev.generar_prompt_teorico(cfg, [])
        assert "150 palabras" in prompt

    def test_prompt_programacion_tiene_regla(self):
        cfg = ev.ConfiguracionEvaluacion(
            curso_id=1, modulo="M", temas=["arrays"], num_preguntas=3,
            observaciones="", tipo_evaluacion="unica",
        )
        prompt = ev.generar_prompt_programacion(cfg, [])
        assert "150 palabras" in prompt

    def test_reparacion_pide_reducir_explicaciones(self):
        capturas = []
        def _gen(**kwargs):
            capturas.append(kwargs["prompt"])
            if len(capturas) == 1:
                return "json truncado sin cerrar", None
            return '{"preguntas": []}', None

        with patch.object(ev, "generar_con_meta", side_effect=_gen):
            data, _ = ev._generar_json_con_reparacion_meta("p", "s")
        assert "TRUNCADO" in capturas[1].upper() or "truncado" in capturas[1].lower()
        assert "150 palabras" in capturas[1]


# --------------------------------------------------------------------------
# Punto 3/4: reparación única de JSON en el flujo batch
# --------------------------------------------------------------------------

class TestReparacionJson:
    def test_json_valido_sin_reparacion(self):
        with patch.object(ev, "generar_con_meta", return_value=('{"preguntas": []}', None)) as g:
            data = ev._generar_json_con_reparacion("prompt", "system")
            assert data == {"preguntas": []}
            assert g.call_count == 1

    def test_json_invalido_repara_una_vez(self):
        llamadas = [
            ("esto no es json", None),
            ('{"preguntas": [{"id": 1, "pregunta": "p", "opciones": ["a","b","c","d"], "respuesta_correcta": 0}]}', None),
        ]
        def _gen(**kwargs):
            return llamadas.pop(0)

        with patch.object(ev, "generar_con_meta", side_effect=_gen) as g:
            data = ev._generar_json_con_reparacion("prompt", "system")
            assert "preguntas" in data
            assert g.call_count == 2  # exactamente 1 reintento de reparación

    def test_json_invalido_dos_veces_propaga_error(self):
        with patch.object(ev, "generar_con_meta", return_value=("basura", None)) as g:
            with pytest.raises(Exception):
                ev._generar_json_con_reparacion("prompt", "system")
            assert g.call_count == 2

    def test_telemetria_se_captura_en_meta(self):
        tel = {"proveedor": "gemini", "modelo": "gemini-3.6-flash",
               "tokens": {"prompt": 10, "completion": 5, "total": 15}, "costo_usd": 0.0}
        with patch.object(ev, "generar_con_meta", return_value=('{"preguntas": []}', tel)):
            data, meta = ev._generar_json_con_reparacion_meta("prompt", "system")
            assert meta == tel

    def test_telemetria_suma_reparacion(self):
        t1 = {"proveedor": "gemini", "modelo": "gemini-3.6-flash",
              "tokens": {"prompt": 100, "completion": 50, "total": 150}, "costo_usd": 0.0}
        t2 = {"proveedor": "gemini", "modelo": "gemini-3.6-flash",
              "tokens": {"prompt": 80, "completion": 40, "total": 120}, "costo_usd": 0.0}
        combinada = ev._combinar_telemetria(t1, t2)
        assert combinada["tokens"]["total"] == 270
        assert combinada["proveedor"] == "gemini"
