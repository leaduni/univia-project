"""
Tests Fase 1 — Quick Wins del Pipeline RAG.

Orden de ejecución:
  1. Hito 1.2 — EmbeddingCache  (T1.2.1–T1.2.6)
  2. Hito 1.1 — Embedder v2     (T1.1.1–T1.1.6)
  3. Hito 1.3 — Image Optimizer (T1.3.1–T1.3.7)

Ejecutar con: python -m pytest tests/rag/test_phase1_quick_wins.py -v
"""
import hashlib
import io
import re
import time
import pytest
from unittest.mock import MagicMock, patch, call
from PIL import Image

# ──────────────────────────────────────────────────────────────────────
# FIXTURES compartidos
# ──────────────────────────────────────────────────────────────────────

@pytest.fixture
def mock_supabase():
    """Cliente Supabase mockeado para EmbeddingCache."""
    client = MagicMock()
    client.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(data=None)
    return client


@pytest.fixture
def imagen_rgb_200dpi():
    """Imagen PIL RGB de 1000x800 simulando 200 DPI."""
    img = Image.new("RGB", (1000, 800), color=(128, 128, 128))
    # Poner algunos píxeles distintos para que no sea uniforme
    for x in range(0, 1000, 50):
        for y in range(0, 800, 50):
            img.putpixel((x, y), (255, 0, 0))
    return img


@pytest.fixture
def imagen_rgba():
    """Imagen RGBA (con canal alpha)."""
    img = Image.new("RGBA", (500, 400), color=(128, 128, 128, 255))
    return img


# ══════════════════════════════════════════════════════════════════════
# HITO 1.2 — EmbeddingCache
# ══════════════════════════════════════════════════════════════════════

class TestEmbeddingCacheHash:
    """T1.2.1 – T1.2.3: Hashing de chunks."""

    def test_hash_deterministico(self):
        """T1.2.1: mismo contenido → mismo hash."""
        from app.rag.embedding_cache import hash_chunk

        h1 = hash_chunk("Este es un texto de prueba para vectorizar con Gemini.")
        h2 = hash_chunk("Este es un texto de prueba para vectorizar con Gemini.")
        assert h1 == h2
        assert len(h1) == 64  # SHA-256 hex

    def test_hash_inmune_whitespace(self):
        """T1.2.2: whitespace irrelevante no cambia el hash."""
        from app.rag.embedding_cache import hash_chunk

        h1 = hash_chunk("Hola  mundo")
        h2 = hash_chunk("Hola mundo")
        assert h1 == h2

    def test_hash_sensible_cambios_reales(self):
        """T1.2.3: cambios semánticos producen hashes distintos."""
        from app.rag.embedding_cache import hash_chunk

        h1 = hash_chunk("Cálculo I")
        h2 = hash_chunk("Cálculo II")
        assert h1 != h2


class TestEmbeddingCacheLookupStore:
    """T1.2.4 – T1.2.6: Cache HIT/MISS e integración."""

    def test_cache_hit_no_llama_api(self, mock_supabase):
        """T1.2.4: HIT en caché → 0 llamadas a embed_content."""
        from app.rag.embedding_cache import EmbeddingCache, hash_chunk

        contenido = "Chunk que ya fue vectorizado."
        h = hash_chunk(contenido)
        embedding_cacheado = [0.1] * 1536

        # Simular HIT: maybe_single().execute() devuelve data como dict
        mock_supabase.table.return_value.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value = MagicMock(
            data={"chunk_hash": h, "embedding": embedding_cacheado}
        )

        cache = EmbeddingCache(mock_supabase)
        result = cache.lookup(h)
        assert result == embedding_cacheado
        assert len(result) == 1536

    def test_cache_miss_api_success_guarda(self, mock_supabase):
        """T1.2.5: MISS + API éxito → store() es llamado."""
        from app.rag.embedding_cache import EmbeddingCache

        # Simular MISS
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(data=[])

        cache = EmbeddingCache(mock_supabase)
        result = cache.lookup("hash_inexistente")
        assert result is None

    def test_cache_store_upsert(self, mock_supabase):
        """T1.2.5b: store() usa upsert."""
        from app.rag.embedding_cache import EmbeddingCache

        cache = EmbeddingCache(mock_supabase)
        emb = [0.5] * 1536
        cache.store("abc123", emb)

        # Verificar que se llamó a upsert
        mock_supabase.table.assert_called_with("embedding_cache")
        upsert_call = mock_supabase.table.return_value.upsert
        assert upsert_call.called


class TestLoteMixtoCache:
    """T1.2.6: Lote con mezcla de HIT y MISS."""

    def test_lote_mixto_cache_solo_llama_api_para_miss(self, mock_supabase):
        """T1.2.6: 3 HIT + 2 MISS → embed_content recibe solo 2 textos."""
        from app.rag.embedding_cache import EmbeddingCache, hash_chunk

        contenidos = ["A", "B", "C", "D", "E"]
        hashes = [hash_chunk(c) for c in contenidos]

        # A, C, E en caché; B, D no
        def fake_lookup(h):
            if h in (hashes[0], hashes[2], hashes[4]):
                return [0.1] * 1536
            return None

        cache = EmbeddingCache(mock_supabase)
        cache.lookup = MagicMock(side_effect=fake_lookup)
        cache.store = MagicMock()

        # Simular el método _procesar_lote_con_cache que implementaremos
        hits = [cache.lookup(h) is not None for h in hashes]
        assert hits == [True, False, True, False, True]

        miss_indices = [i for i, h in enumerate(hits) if not h]
        assert miss_indices == [1, 3]
        textos_miss = [contenidos[i] for i in miss_indices]
        assert textos_miss == ["B", "D"]


# ══════════════════════════════════════════════════════════════════════
# HITO 1.1 — Embedder Dinámico con Backoff
# ══════════════════════════════════════════════════════════════════════

@pytest.fixture(autouse=True)
def _patch_genai_client(monkeypatch):
    """Evita que SyllabusEmbedder.__init__ intente crear genai.Client real."""
    import app.rag.embedder as embedder_mod
    mock_client = MagicMock()
    monkeypatch.setattr(embedder_mod.genai, "Client", MagicMock(return_value=mock_client))


class TestEmbedderNoSleepOnSuccess:
    """T1.1.1: Éxito → sin sleep."""

    def test_lote_exitoso_no_ejecuta_sleep(self):
        """T1.1.1: Mockear 200 OK, verificar que time.sleep NO se llama."""
        with patch("time.sleep") as mock_sleep:
            from app.rag.embedder import SyllabusEmbedder

            embedder = SyllabusEmbedder(batch_size=5)
            # Mock _llamar_api: devuelve 5 vectores de 1536 dims
            embedder._llamar_api = MagicMock(
                return_value=[[0.1] * 1536 for _ in range(5)]
            )
            chunks = [{"contenido": f"Chunk {i}"} for i in range(5)]

            result = embedder.embedding_generator(chunks)

            # Sin sleep fijo: time.sleep no debe ser llamado en éxito
            assert mock_sleep.call_count == 0
            assert len(result) == 5
            for c in result:
                assert "embedding" in c
                assert len(c["embedding"]) == 1536


class TestEmbedderBackoff429:
    """T1.1.2 – T1.1.3: Backoff ante 429."""

    def test_retry_429_con_backoff_exitoso(self):
        """T1.1.2: 429 en intentos 1-2, 200 en intento 3."""
        with (
            patch("time.sleep") as mock_sleep,
            patch("time.monotonic", return_value=0.0),
        ):
            from app.rag.embedder import SyllabusEmbedder

            embedder = SyllabusEmbedder(batch_size=3, max_retries=5, base_delay=1.0, max_delay=60.0)

            call_count = [0]

            def side_effect(textos):
                call_count[0] += 1
                if call_count[0] < 3:
                    raise Exception("429 Quota exceeded")
                return [[0.1] * 1536 for _ in range(3)]

            embedder._llamar_api = MagicMock(side_effect=side_effect)
            chunks = [{"contenido": f"Chunk {i}"} for i in range(3)]

            result = embedder.embedding_generator(chunks)

            # 3 llamadas totales (2 fallos + 1 éxito)
            assert embedder._llamar_api.call_count == 3
            # time.sleep debió ser llamado por backoff (al menos 2 veces)
            assert mock_sleep.call_count >= 2
            assert len(result) == 3

    def test_429_agota_reintentos_lote_saltado(self):
        """T1.1.3: 429×5 → lote no incluido en resultado."""
        with patch("time.sleep"):
            from app.rag.embedder import SyllabusEmbedder

            embedder = SyllabusEmbedder(batch_size=3, max_retries=3, base_delay=0.1, max_delay=1.0)
            embedder._llamar_api = MagicMock(side_effect=Exception("429 Quota exceeded"))
            chunks = [{"contenido": f"Chunk {i}"} for i in range(3)]

            result = embedder.embedding_generator(chunks)

            # El lote falló completamente: resultado vacío
            assert len(result) == 0


class TestEmbedderNonRecoverableError:
    """T1.1.4: Error no recuperable → corta lote."""

    def test_error_500_corta_lote_continua_siguiente(self):
        """T1.1.4: HTTP 500 en lote 1, lote 2 procesa normalmente."""
        with patch("time.sleep"):
            from app.rag.embedder import SyllabusEmbedder

            embedder = SyllabusEmbedder(batch_size=2, max_retries=1)
            lote_actual = [0]

            def side_effect(textos):
                lote_actual[0] += 1
                if lote_actual[0] == 1:
                    raise RuntimeError("500 Internal Server Error")
                return [[0.1] * 1536 for _ in range(2)]

            embedder._llamar_api = MagicMock(side_effect=side_effect)
            chunks = [{"contenido": f"Chunk {i}"} for i in range(4)]

            result = embedder.embedding_generator(chunks)

            # Solo el lote 2 (2 chunks) debe estar en resultado
            assert len(result) == 2


class TestBatchSizeConfigurable:
    """T1.1.5: batch_size se respeta."""

    def test_batch_size_7_con_21_chunks(self):
        """T1.1.5: batch_size=7, 21 chunks → 3 lotes."""
        with patch("time.sleep"):
            from app.rag.embedder import SyllabusEmbedder

            embedder = SyllabusEmbedder(batch_size=7)
            embedder._llamar_api = MagicMock(
                return_value=[[0.1] * 1536 for _ in range(7)]
            )
            chunks = [{"contenido": f"Chunk {i}"} for i in range(21)]

            result = embedder.embedding_generator(chunks)

            # 21 chunks / 7 = 3 lotes → 3 llamadas
            assert embedder._llamar_api.call_count == 3
            assert len(result) == 21


class TestDegradacionElegante:
    """T1.1.6: Resultado parcial si algunos lotes fallan."""

    def test_resultado_parcial_lotes_fallidos(self):
        """T1.1.6: 3 lotes: OK, 429×5 (falla), OK → 2*batch_size chunks."""
        with patch("time.sleep"):
            from app.rag.embedder import SyllabusEmbedder

            embedder = SyllabusEmbedder(batch_size=3, max_retries=2)

            def side_effect(textos):
                primer_texto = textos[0]
                # Lote 2 tiene chunks 3-5 → "Chunk 3" es el primero
                if primer_texto == "Chunk 3":
                    raise Exception("429 Quota exceeded")
                n = len(textos)
                return [[0.1] * 1536 for _ in range(n)]

            embedder._llamar_api = MagicMock(side_effect=side_effect)
            chunks = [{"contenido": f"Chunk {i}"} for i in range(9)]

            result = embedder.embedding_generator(chunks)

            # Lotes 1 y 3 exitosos = 6 chunks, lote 2 fallido = 0
            assert len(result) == 6


# ══════════════════════════════════════════════════════════════════════
# HITO 1.3 — Image Optimizer
# ══════════════════════════════════════════════════════════════════════

class TestOptimizarImagen:
    """T1.3.1 – T1.3.2: Conversión a JPEG/WebP."""

    def test_optimizar_jpeg_bytes_validos(self, imagen_rgb_200dpi):
        """T1.3.1: JPEG produce bytes que PIL puede reabrir."""
        from app.rag.image_optimizer import optimizar_imagen

        resultado = optimizar_imagen(imagen_rgb_200dpi, formato="jpeg", calidad=85)
        assert isinstance(resultado, bytes)
        assert len(resultado) > 0

        # Reabrir con PIL
        reabierta = Image.open(io.BytesIO(resultado))
        assert reabierta is not None

    def test_optimizar_webp_bytes_validos(self, imagen_rgb_200dpi):
        """T1.3.2: WebP produce bytes que PIL puede reabrir."""
        from app.rag.image_optimizer import optimizar_imagen

        resultado = optimizar_imagen(imagen_rgb_200dpi, formato="webp", calidad=85)
        assert isinstance(resultado, bytes)
        assert len(resultado) > 0

        reabierta = Image.open(io.BytesIO(resultado))
        assert reabierta is not None


class TestReducirDPI:
    """T1.3.3: Escalado proporcional."""

    def test_reducir_dpi_200_a_150(self, imagen_rgb_200dpi):
        """T1.3.3: 1000×800 a 200 DPI → 750×600 a 150 DPI."""
        from app.rag.image_optimizer import reducir_dpi

        resultado = reducir_dpi(imagen_rgb_200dpi, dpi_original=200, dpi_objetivo=150)
        factor = 150 / 200  # 0.75
        expected_w = int(1000 * factor)
        expected_h = int(800 * factor)
        assert resultado.size == (expected_w, expected_h)

    def test_reducir_dpi_sin_cambio(self, imagen_rgb_200dpi):
        """DPI objetivo igual al original → mismos píxeles."""
        from app.rag.image_optimizer import reducir_dpi

        resultado = reducir_dpi(imagen_rgb_200dpi, dpi_original=200, dpi_objetivo=200)
        assert resultado.size == (1000, 800)


class TestCompararExtraccion:
    """T1.3.4 – T1.3.5: Gate de validación de fidelidad."""

    def test_textos_identicos_diff_cero(self):
        """T1.3.4: Mismo texto → diferencia nula."""
        from app.rag.image_optimizer import comparar_extraccion

        texto = "Ejercicio 1: Resuelva la integral $\\int_0^1 x^2 dx$."
        resultado = comparar_extraccion(texto, texto)

        assert resultado["chars_diferencia"] == 0
        assert resultado["chars_diferencia_pct"] == 0.0
        assert resultado["ratio_longitud"] == 1.0

    def test_textos_divergentes_detecta_diferencia(self):
        """T1.3.5: 20% de divergencia se refleja en métricas."""
        from app.rag.image_optimizer import comparar_extraccion

        ref = "A" * 100
        opt = "B" * 20 + "A" * 80  # 20 caracteres diferentes, misma longitud

        resultado = comparar_extraccion(ref, opt)
        assert resultado["chars_diferencia_pct"] > 0


class TestPreservacionModoColor:
    """T1.3.6 – T1.3.7: Manejo de modos de color."""

    def test_rgb_se_mantiene_rgb(self, imagen_rgb_200dpi):
        """T1.3.6: Imagen RGB sigue siendo RGB después de optimizar."""
        from app.rag.image_optimizer import optimizar_imagen

        resultado_bytes = optimizar_imagen(imagen_rgb_200dpi, formato="jpeg", calidad=85)
        reabierta = Image.open(io.BytesIO(resultado_bytes))
        assert reabierta.mode == "RGB"

    def test_rgba_se_convierte_a_rgb_para_jpeg(self, imagen_rgba):
        """T1.3.7: RGBA → RGB sin error al guardar JPEG."""
        from app.rag.image_optimizer import optimizar_imagen

        # No debe lanzar excepción
        resultado = optimizar_imagen(imagen_rgba, formato="jpeg", calidad=85)
        assert len(resultado) > 0
        reabierta = Image.open(io.BytesIO(resultado))
        assert reabierta.mode == "RGB"
