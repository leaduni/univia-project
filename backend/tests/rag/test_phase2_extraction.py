"""
Tests Fase 2 - Extraccion Asincrona + Hibrida del Pipeline RAG.

Orden: Hito 2.1 (checkpoints) -> Hito 2.3 (hybrid) -> Hito 2.2 (async)
Ejecutar: python -m pytest tests/rag/test_phase2_extraction.py -v
"""
import asyncio
import io
import os
import tempfile
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest


# =====================================================================
# FIXTURES
# =====================================================================

@pytest.fixture
def tmp_pdf_dir():
    """Directorio temporal que simula la ubicacion de un PDF."""
    with tempfile.TemporaryDirectory() as d:
        yield Path(d)


@pytest.fixture
def sample_pdf_path(tmp_pdf_dir):
    """Ruta simulada a un PDF."""
    return tmp_pdf_dir / "test_doc.pdf"


# =====================================================================
# HITO 2.1 - ExtractionCheckpoint
# =====================================================================

class TestExtractionCheckpoint:
    """T2.1.1 - T2.1.6: Checkpoints por pagina."""

    def test_ensure_dir_creates_directory(self, sample_pdf_path):
        """T2.1.1: ensure_dir crea el directorio de checkpoints."""
        from app.rag.extraction_checkpoint import ExtractionCheckpoint

        cp = ExtractionCheckpoint(str(sample_pdf_path))
        cp.ensure_dir()
        assert cp.checkpoint_dir.exists()

    def test_page_path_format(self, sample_pdf_path):
        """T2.1.2: page_path(3) devuelve ruta con pagina_003.md."""
        from app.rag.extraction_checkpoint import ExtractionCheckpoint

        cp = ExtractionCheckpoint(str(sample_pdf_path))
        path = cp.page_path(3)
        assert path.name == "pagina_003.md"
        assert cp.checkpoint_dir in path.parents

    def test_save_and_page_exists(self, sample_pdf_path):
        """T2.1.3: save_page + page_exists."""
        from app.rag.extraction_checkpoint import ExtractionCheckpoint

        cp = ExtractionCheckpoint(str(sample_pdf_path))
        cp.ensure_dir()
        cp.save_page(5, "Contenido de pagina 5")
        assert cp.page_exists(5)
        assert not cp.page_exists(1)

    def test_completed_pages_detects_saved(self, sample_pdf_path):
        """T2.1.4: completed_pages detecta paginas guardadas."""
        from app.rag.extraction_checkpoint import ExtractionCheckpoint

        cp = ExtractionCheckpoint(str(sample_pdf_path))
        cp.ensure_dir()
        cp.save_page(1, "Pag 1")
        cp.save_page(3, "Pag 3")
        cp.save_page(5, "Pag 5")

        completed = cp.completed_pages()
        assert completed == {1, 3, 5}

    def test_read_all_reassembles_in_order(self, sample_pdf_path):
        """T2.1.5: read_all reensambla en orden numerico."""
        from app.rag.extraction_checkpoint import ExtractionCheckpoint

        cp = ExtractionCheckpoint(str(sample_pdf_path))
        cp.ensure_dir()
        cp.save_page(3, "Tercera pagina")
        cp.save_page(1, "Primera pagina")
        cp.save_page(2, "Segunda pagina")

        result = cp.read_all()
        assert "Primera pagina" in result
        assert "Segunda pagina" in result
        assert "Tercera pagina" in result
        # Verificar orden
        pos1 = result.index("Primera")
        pos2 = result.index("Segunda")
        pos3 = result.index("Tercera")
        assert pos1 < pos2 < pos3

    def test_cleanup_removes_directory(self, sample_pdf_path):
        """T2.1.6: cleanup elimina el directorio."""
        from app.rag.extraction_checkpoint import ExtractionCheckpoint

        cp = ExtractionCheckpoint(str(sample_pdf_path))
        cp.ensure_dir()
        cp.save_page(1, "test")
        assert cp.checkpoint_dir.exists()

        cp.cleanup()
        assert not cp.checkpoint_dir.exists()


# =====================================================================
# HITO 2.3 - HybridRouter
# =====================================================================

class TestHybridRouterRouting:
    """T2.3.1 - T2.3.4: Decisiones de enrutamiento."""

    def test_native_text_clean_routes_native(self):
        """T2.3.1: Texto nativo > 100 chars y limpio -> NATIVE."""
        from app.rag.hybrid_router import HybridRouter

        router = HybridRouter(min_chars=100, max_corruption_ratio=0.03, max_image_area_ratio=0.20)
        decision = router._decide(
            native_text="A" * 150,
            corruption=0.0,
            image_area=0.05,
        )
        assert decision.route == "native"
        assert decision.native_text == "A" * 150

    def test_short_text_routes_vision(self):
        """T2.3.2: Texto nativo < 100 chars -> VISION."""
        from app.rag.hybrid_router import HybridRouter

        router = HybridRouter(min_chars=100)
        decision = router._decide(
            native_text="Corto",
            corruption=0.0,
            image_area=0.0,
        )
        assert decision.route == "vision"

    def test_corrupted_text_routes_vision(self):
        """T2.3.3: Texto con >3% glifos corruptos -> VISION."""
        from app.rag.hybrid_router import HybridRouter

        router = HybridRouter(max_corruption_ratio=0.03)
        decision = router._decide(
            native_text="A" * 200,
            corruption=0.05,  # 5% corruption
            image_area=0.0,
        )
        assert decision.route == "vision"
        assert "corrupcion" in decision.reason.lower()

    def test_high_image_area_routes_vision(self):
        """T2.3.4: Pagina con >20% area imagen -> VISION."""
        from app.rag.hybrid_router import HybridRouter

        router = HybridRouter(max_image_area_ratio=0.20)
        decision = router._decide(
            native_text="A" * 200,
            corruption=0.0,
            image_area=0.35,  # 35% image area
        )
        assert decision.route == "vision"
        assert "image" in decision.reason.lower()


class TestCorruptionDetection:
    """T2.3.5 - T2.3.6: Deteccion de corrupcion."""

    def test_corruption_detects_cid_sequences(self):
        """T2.3.5: corruption_ratio detecta (cid:123)."""
        from app.rag.hybrid_router import HybridRouter

        text = "Normal text (cid:123) more text"
        ratio = HybridRouter.corruption_ratio(text)
        assert ratio > 0

    def test_clean_text_zero_corruption(self):
        """T2.3.6: corruption_ratio es 0 para texto limpio."""
        from app.rag.hybrid_router import HybridRouter

        text = "Este es un texto completamente normal sin glifos corruptos."
        ratio = HybridRouter.corruption_ratio(text)
        assert ratio == 0.0


class TestRoutingDecisionMetrics:
    """T2.3.7: Metricas en RoutingDecision."""

    def test_decision_includes_metrics(self):
        """T2.3.7: RoutingDecision tiene chars, corruption, image_area."""
        from app.rag.hybrid_router import HybridRouter

        router = HybridRouter()
        decision = router._decide(
            native_text="X" * 200,
            corruption=0.01,
            image_area=0.10,
        )
        assert "chars" in decision.metrics
        assert "corruption" in decision.metrics
        assert "image_area" in decision.metrics
        assert decision.metrics["chars"] == 200
        assert decision.metrics["corruption"] == 0.01
        assert decision.metrics["image_area"] == 0.10


# =====================================================================
# HITO 2.2 - Extraccion Asincrona
# =====================================================================

class TestAsyncExtraction:
    """T2.2.1 - T2.2.6: Extraccion asincrona."""

    @pytest.mark.asyncio
    async def test_async_extraction_completes_all_pages(self, sample_pdf_path, monkeypatch):
        """T2.2.1: Extraccion async de 3 paginas completa todas."""
        from app.rag.extraction_checkpoint import ExtractionCheckpoint
        from app.rag.extractor import SyllabusExtractor

        extractor = SyllabusExtractor(rpm=100)  # RPM alto para test rapido
        cp = ExtractionCheckpoint(str(sample_pdf_path))
        cp.ensure_dir()

        # Mock _extract_page_async para que "procese" instantaneamente
        async def fake_extract_page(page_num, total, pdf_path, prompt, modo, dpi, salvage, checkpoint, router=None):
            checkpoint.save_page(page_num, f"<!-- === INICIO PAGINA {page_num} === -->\n\nContenido pagina {page_num}\n\n<!-- === FIN PAGINA {page_num} === -->\n\n")

        monkeypatch.setattr(extractor, "_extract_page_async", fake_extract_page)

        # Simular PDF de 3 paginas
        result = await extractor._run_async_extraction(
            pdf_path=str(sample_pdf_path),
            total_pages=3,
            modo="examenes",
            dpi=200,
            salvage=False,
            max_concurrency=3,
            checkpoint=cp,
        )

        assert "INICIO PAGINA 1" in result
        assert "INICIO PAGINA 2" in result
        assert "INICIO PAGINA 3" in result
        cp.cleanup()

    @pytest.mark.asyncio
    async def test_semaphore_limits_concurrency(self, sample_pdf_path, monkeypatch):
        """T2.2.2: Semaphore limita concurrencia a max_concurrency."""
        from app.rag.extraction_checkpoint import ExtractionCheckpoint
        from app.rag.extractor import SyllabusExtractor

        concurrent = [0]
        max_seen = [0]
        max_allowed = 3

        async def fake_extract_page(page_num, total, pdf_path, prompt, modo, dpi, salvage, checkpoint, router=None):
            concurrent[0] += 1
            max_seen[0] = max(max_seen[0], concurrent[0])
            await asyncio.sleep(0.01)
            concurrent[0] -= 1
            checkpoint.save_page(page_num, f"Pagina {page_num}")

        extractor = SyllabusExtractor(rpm=100)
        monkeypatch.setattr(extractor, "_extract_page_async", fake_extract_page)

        cp = ExtractionCheckpoint(str(sample_pdf_path))
        cp.ensure_dir()

        await extractor._run_async_extraction(
            pdf_path=str(sample_pdf_path),
            total_pages=6,
            modo="examenes",
            dpi=200,
            salvage=False,
            max_concurrency=max_allowed,
            checkpoint=cp,
        )

        assert max_seen[0] <= max_allowed
        cp.cleanup()

    @pytest.mark.asyncio
    async def test_checkpoint_pages_skipped(self, sample_pdf_path, monkeypatch):
        """T2.2.3: Paginas ya en checkpoint se saltan."""
        from app.rag.extraction_checkpoint import ExtractionCheckpoint
        from app.rag.extractor import SyllabusExtractor

        cp = ExtractionCheckpoint(str(sample_pdf_path))
        cp.ensure_dir()
        cp.save_page(1, "Ya procesada")
        cp.save_page(2, "Ya procesada")

        processed = []

        async def fake_extract_page(page_num, total, pdf_path, prompt, modo, dpi, salvage, checkpoint, router=None):
            processed.append(page_num)
            checkpoint.save_page(page_num, f"Pagina {page_num}")

        extractor = SyllabusExtractor(rpm=100)
        monkeypatch.setattr(extractor, "_extract_page_async", fake_extract_page)

        await extractor._run_async_extraction(
            pdf_path=str(sample_pdf_path),
            total_pages=3,
            modo="examenes",
            dpi=200,
            salvage=False,
            max_concurrency=3,
            checkpoint=cp,
        )

        assert 1 not in processed
        assert 2 not in processed
        assert 3 in processed
        cp.cleanup()

    @pytest.mark.asyncio
    async def test_error_on_one_page_does_not_stop_others(self, sample_pdf_path, monkeypatch):
        """T2.2.4: Error en pagina 2 no detiene paginas 1 y 3."""
        from app.rag.extraction_checkpoint import ExtractionCheckpoint
        from app.rag.extractor import SyllabusExtractor

        cp = ExtractionCheckpoint(str(sample_pdf_path))
        cp.ensure_dir()

        async def fake_extract_page(page_num, total, pdf_path, prompt, modo, dpi, salvage, checkpoint, router=None):
            if page_num == 2:
                raise RuntimeError("Fallo simulado")
            checkpoint.save_page(page_num, f"Pagina {page_num}")

        extractor = SyllabusExtractor(rpm=100)
        monkeypatch.setattr(extractor, "_extract_page_async", fake_extract_page)

        result = await extractor._run_async_extraction(
            pdf_path=str(sample_pdf_path),
            total_pages=3,
            modo="examenes",
            dpi=200,
            salvage=False,
            max_concurrency=3,
            checkpoint=cp,
        )

        assert "Pagina 1" in result
        assert "Pagina 2" not in result  # fallo
        assert "Pagina 3" in result
        cp.cleanup()

    @pytest.mark.asyncio
    async def test_quota_exhausted_stops_remaining(self, sample_pdf_path, monkeypatch):
        """T2.2.5: Cuota diaria agotada detiene el resto."""
        from app.rag.extraction_checkpoint import ExtractionCheckpoint
        from app.rag.extractor import SyllabusExtractor

        cp = ExtractionCheckpoint(str(sample_pdf_path))
        cp.ensure_dir()

        quota_exhausted = [False]

        async def fake_extract_page(page_num, total, pdf_path, prompt, modo, dpi, salvage, checkpoint, router=None):
            if page_num == 2:
                quota_exhausted[0] = True
                raise Exception("per day quota exceeded")
            if quota_exhausted[0] and page_num > 2:
                raise AssertionError("No deberia procesarse tras cuota agotada")
            checkpoint.save_page(page_num, f"Pagina {page_num}")

        extractor = SyllabusExtractor(rpm=100)
        monkeypatch.setattr(extractor, "_extract_page_async", fake_extract_page)
        # Override _es_cuota_diaria to detect our simulated error
        monkeypatch.setattr(extractor, "_es_cuota_diaria", lambda e: "per day" in str(e).lower())

        result = await extractor._run_async_extraction(
            pdf_path=str(sample_pdf_path),
            total_pages=4,
            modo="examenes",
            dpi=200,
            salvage=False,
            max_concurrency=3,
            checkpoint=cp,
        )

        assert "Pagina 1" in result
        cp.cleanup()

    @pytest.mark.asyncio
    async def test_result_reassembled_in_order(self, sample_pdf_path, monkeypatch):
        """T2.2.6: Resultado reensamblado en orden numerico."""
        from app.rag.extraction_checkpoint import ExtractionCheckpoint
        from app.rag.extractor import SyllabusExtractor

        cp = ExtractionCheckpoint(str(sample_pdf_path))
        cp.ensure_dir()

        async def fake_extract_page(page_num, total, pdf_path, prompt, modo, dpi, salvage, checkpoint, router=None):
            # Simular orden de finalizacion no deterministico
            await asyncio.sleep(0.02 * (4 - page_num))  # pagina 3 primero, 1 ultimo
            checkpoint.save_page(page_num, f"Pagina {page_num}")

        extractor = SyllabusExtractor(rpm=100)
        monkeypatch.setattr(extractor, "_extract_page_async", fake_extract_page)

        result = await extractor._run_async_extraction(
            pdf_path=str(sample_pdf_path),
            total_pages=3,
            modo="examenes",
            dpi=200,
            salvage=False,
            max_concurrency=3,
            checkpoint=cp,
        )

        pos1 = result.index("Pagina 1")
        pos2 = result.index("Pagina 2")
        pos3 = result.index("Pagina 3")
        assert pos1 < pos2 < pos3
        cp.cleanup()
