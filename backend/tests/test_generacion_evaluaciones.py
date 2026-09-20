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

class TestTelemetria:
    def test_gemini_free_tier_costo_cero(self):
        m = llm.registrar_uso("gemini", "gemini-2.0-flash", 5000, 2000)
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
# Punto 3/4: reparación única de JSON en el flujo batch
# --------------------------------------------------------------------------

class TestReparacionJson:
    def test_json_valido_sin_reparacion(self):
        with patch.object(ev, "generar", return_value='{"preguntas": []}') as g:
            data = ev._generar_json_con_reparacion("prompt", "system")
            assert data == {"preguntas": []}
            assert g.call_count == 1

    def test_json_invalido_repara_una_vez(self):
        llamadas = [
            "esto no es json",
            '{"preguntas": [{"id": 1, "pregunta": "p", "opciones": ["a","b","c","d"], "respuesta_correcta": 0}]}',
        ]
        def _gen(**kwargs):
            return llamadas.pop(0)

        with patch.object(ev, "generar", side_effect=_gen) as g:
            data = ev._generar_json_con_reparacion("prompt", "system")
            assert "preguntas" in data
            assert g.call_count == 2  # exactamente 1 reintento de reparación

    def test_json_invalido_dos_veces_propaga_error(self):
        with patch.object(ev, "generar", return_value="basura") as g:
            with pytest.raises(Exception):
                ev._generar_json_con_reparacion("prompt", "system")
            assert g.call_count == 2
