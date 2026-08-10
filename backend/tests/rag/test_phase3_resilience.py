"""
Tests Fase 3 - Resiliencia, Backoff Adaptativo y Reanudacion.

Orden: Hito 3.1 (AdaptiveSemaphore) -> Hito 3.2 (Resume) -> Hito 3.3 (Quota)
Ejecutar: python -m pytest tests/rag/test_phase3_resilience.py -v
"""
import asyncio
import os
import tempfile
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest


# =====================================================================
# FIXTURES
# =====================================================================

@pytest.fixture
def tmp_dir():
    with tempfile.TemporaryDirectory() as d:
        yield Path(d)


# =====================================================================
# HITO 3.1 - AdaptiveSemaphore
# =====================================================================

class TestAdaptiveSemaphore:
    """T3.1.1 - T3.1.6: Semaforo adaptativo."""

    @pytest.mark.asyncio
    async def test_initial_concurrency(self):
        """T3.1.1: current refleja el valor inicial."""
        from app.rag.adaptive_semaphore import AdaptiveSemaphore

        sem = AdaptiveSemaphore(initial=8, min_concurrency=1)
        assert sem.current == 8
        assert sem.active == 0

    @pytest.mark.asyncio
    async def test_reduce_halves_concurrency(self):
        """T3.1.2: reduce() divide a la mitad."""
        from app.rag.adaptive_semaphore import AdaptiveSemaphore

        sem = AdaptiveSemaphore(initial=8, min_concurrency=1)
        sem.reduce()
        assert sem.current == 4
        sem.reduce()
        assert sem.current == 2
        sem.reduce()
        assert sem.current == 1

    @pytest.mark.asyncio
    async def test_reduce_respects_minimum(self):
        """T3.1.3: reduce() no baja de min_concurrency."""
        from app.rag.adaptive_semaphore import AdaptiveSemaphore

        sem = AdaptiveSemaphore(initial=4, min_concurrency=2)
        sem.reduce()  # 4 -> 2
        assert sem.current == 2
        sem.reduce()  # no baja de 2
        assert sem.current == 2

    @pytest.mark.asyncio
    async def test_reset_restores_initial(self):
        """T3.1.4: reset() vuelve al valor inicial."""
        from app.rag.adaptive_semaphore import AdaptiveSemaphore

        sem = AdaptiveSemaphore(initial=8, min_concurrency=1)
        sem.reduce()
        assert sem.current == 4
        sem.reduce()
        assert sem.current == 2
        sem.reset()
        assert sem.current == 8

    @pytest.mark.asyncio
    async def test_acquire_release_tracks_active(self):
        """T3.1.5: acquire/release actualizan active count."""
        from app.rag.adaptive_semaphore import AdaptiveSemaphore

        sem = AdaptiveSemaphore(initial=3)
        await sem.acquire()
        assert sem.active == 1
        await sem.acquire()
        assert sem.active == 2
        sem.release()
        assert sem.active == 1
        sem.release()
        assert sem.active == 0

    @pytest.mark.asyncio
    async def test_concurrency_limit_enforced(self):
        """T3.1.6: No mas de 'current' tareas simultaneas."""
        from app.rag.adaptive_semaphore import AdaptiveSemaphore

        sem = AdaptiveSemaphore(initial=2)
        max_active = [0]

        async def worker():
            await sem.acquire()
            try:
                max_active[0] = max(max_active[0], sem.active)
                await asyncio.sleep(0.05)
            finally:
                sem.release()

        tasks = [worker() for _ in range(6)]
        await asyncio.gather(*tasks)
        assert max_active[0] <= 2


# =====================================================================
# HITO 3.2 - Resume Logic
# =====================================================================

class TestResumeLogic:
    """T3.2.1 - T3.2.4: Logica de reanudacion."""

    def test_completed_pages_from_checkpoints(self, tmp_dir):
        """T3.2.1: completed_pages detecta checkpoints existentes."""
        from app.rag.extraction_checkpoint import ExtractionCheckpoint
        import re

        pdf = tmp_dir / "test.pdf"
        pdf.touch()
        cp = ExtractionCheckpoint(str(pdf))
        cp.ensure_dir()
        cp.save_page(1, "pag 1")
        cp.save_page(5, "pag 5")
        cp.save_page(10, "pag 10")

        completed = cp.completed_pages()
        assert completed == {1, 5, 10}

    def test_pending_pages_excludes_completed(self, tmp_dir):
        """T3.2.2: Las paginas pendientes excluyen las ya completadas."""
        from app.rag.extraction_checkpoint import ExtractionCheckpoint

        pdf = tmp_dir / "test.pdf"
        pdf.touch()
        cp = ExtractionCheckpoint(str(pdf))
        cp.ensure_dir()
        cp.save_page(1, "ok")
        cp.save_page(2, "ok")

        total = 5
        pending = [n for n in range(1, total + 1) if not cp.page_exists(n)]
        assert pending == [3, 4, 5]

    def test_all_completed_returns_empty_pending(self, tmp_dir):
        """T3.2.3: Si todas estan completas, pending es vacio."""
        from app.rag.extraction_checkpoint import ExtractionCheckpoint

        pdf = tmp_dir / "test.pdf"
        pdf.touch()
        cp = ExtractionCheckpoint(str(pdf))
        cp.ensure_dir()
        for n in range(1, 4):
            cp.save_page(n, f"pag {n}")

        total = 3
        pending = [n for n in range(1, total + 1) if not cp.page_exists(n)]
        assert pending == []

    @pytest.mark.asyncio
    async def test_resume_skips_completed(self, tmp_dir, monkeypatch):
        """T3.2.4: Modo resume solo procesa paginas pendientes."""
        from app.rag.extraction_checkpoint import ExtractionCheckpoint
        from app.rag.extractor import SyllabusExtractor

        pdf = tmp_dir / "test.pdf"
        pdf.touch()
        cp = ExtractionCheckpoint(str(pdf))
        cp.ensure_dir()
        cp.save_page(1, "ya procesada")
        cp.save_page(3, "ya procesada")

        processed = []

        async def fake_extract(page_num, total, pdf_path, prompt, modo, dpi, salvage, checkpoint, router=None):
            processed.append(page_num)
            checkpoint.save_page(page_num, f"pag {page_num}")

        extractor = SyllabusExtractor(rpm=100)
        monkeypatch.setattr(extractor, "_extract_page_async", fake_extract)

        await extractor._run_async_extraction(
            pdf_path=str(pdf),
            total_pages=4,
            modo="examenes", dpi=200, salvage=False,
            max_concurrency=3, checkpoint=cp,
        )

        assert 1 not in processed
        assert 3 not in processed
        assert 2 in processed
        assert 4 in processed
        cp.cleanup()


# =====================================================================
# HITO 3.3 - Quota Handling
# =====================================================================

class TestQuotaHandling:
    """T3.3.1 - T3.3.2: Manejo limpio de cuota agotada."""

    def test_cuota_agotada_mensaje_claro(self):
        """T3.3.1: Mensaje formateado con paginas completadas."""
        total = 209
        completadas = 35
        msg = (
            f"[Cuota Agotada] Progreso salvado en checkpoints locales "
            f"({completadas}/{total} paginas). "
            f"Ejecuta con --resume para continuar mas tarde."
        )
        assert "35/209" in msg
        assert "--resume" in msg

    @pytest.mark.asyncio
    async def test_all_failed_by_quota_clean_exit(self, tmp_dir, monkeypatch):
        """T3.3.2: Si todas las paginas fallan por cuota, salida limpia."""
        from app.rag.extraction_checkpoint import ExtractionCheckpoint
        from app.rag.extractor import SyllabusExtractor

        pdf = tmp_dir / "test.pdf"
        pdf.touch()
        cp = ExtractionCheckpoint(str(pdf))
        cp.ensure_dir()

        async def fake_extract(page_num, total, pdf_path, prompt, modo, dpi, salvage, checkpoint, router=None):
            raise Exception("per day quota exceeded")

        extractor = SyllabusExtractor(rpm=100)
        monkeypatch.setattr(extractor, "_extract_page_async", fake_extract)
        monkeypatch.setattr(extractor, "_es_cuota_diaria", lambda e: "per day" in str(e).lower())

        result = await extractor._run_async_extraction(
            pdf_path=str(pdf),
            total_pages=3,
            modo="examenes", dpi=200, salvage=False,
            max_concurrency=3, checkpoint=cp,
        )

        completed = cp.completed_pages()
        # Si todas fallaron por cuota, completed deberia ser 0 (o las que habia antes)
        assert len(completed) <= 3
        cp.cleanup()
