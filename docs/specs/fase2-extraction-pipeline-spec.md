# Spec: Fase 2 - Extraccion Asincrona + Hibrida del Pipeline RAG

- **Estado:** ESPECIFICACION
- **Fecha:** 2026-08-10
- **Referencias:** docs/diagnostics/chunking-pipeline-analysis.md, docs/diagnostics/ARQUITECTURA_RAG_OPTIMIZACION.md (A.1, A.3)
- **Archivos afectados:** extractor.py (refactor), extraction_checkpoint.py (NUEVO), hybrid_router.py (NUEVO)

---

## Hito 2.1 - Checkpoints por Pagina

Escribir un archivo por pagina (pagina_001.md, pagina_002.md) en directorio {pdf}_checkpoints/.

Clase ExtractionCheckpoint:
- __init__(pdf_path) → crea ruta de checkpoint_dir
- ensure_dir() → crea directorio
- page_path(n) → ruta pagina_NNN.md
- completed_pages() → Set[int] de paginas ya guardadas
- save_page(n, content) → guarda pagina
- read_all() → reensambla en orden 1,2,3...
- cleanup() → elimina directorio

Tests: T2.1.1-T2.1.6

---

## Hito 2.2 - Extraccion Asincrona

Nuevo metodo async extract_text_async() usando asyncio.Semaphore(max_concurrency).
Cada pagina es una tarea independiente limitada por el semaforo.
Rate limiting: el semaforo controla concurrencia, _throttle() controla RPM.

Metodo: async _extract_page_async(page_num, total, pdf_path, prompt, modo, dpi, salvage, checkpoint)
- pdf2image via run_in_executor (no bloquea event loop)
- Gemini Vision (genai.Client)
- Salvage mode si falla
- Guarda via checkpoint.save_page()

Tests: T2.2.1-T2.2.6

---

## Hito 2.3 - Extraccion Hibrida

Clase HybridRouter con heuristica compuesta (4 criterios):
1. Extraer texto nativo con pypdf
2. Si len < 100 chars → VISION
3. corruption_ratio > 3% (cid:, glifos) → VISION
4. image_area_ratio > 20% (XObjects) → VISION
5. Si pasa todo → NATIVE (costo $0, <50ms)

RoutingDecision dataclass: route, native_text, reason, metrics

Tests: T2.3.1-T2.3.8

---

## Orden TDD

Hito 2.1 (T2.1.1-6) → Hito 2.3 (T2.3.1-8) → Hito 2.2 (T2.2.1-6)

## Dependencias

pypdf>=5.0.0, pdfplumber>=0.11.0
