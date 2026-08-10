# RAG Pipeline — Capacidades y Decisiones de Diseño

- **Estado:** PRODUCCIÓN (Fases 1-3 completadas)
- **Fecha:** 2026-08-10
- **Suite de tests:** 55/55 verdes, 0 regresiones
- **Rama:** `feature/rag-pipeline-optimization-sdd-tdd`

---

## 1. Resumen Ejecutivo

El pipeline RAG de UniVia transforma documentos PDF académicos (sílabos, exámenes, compendios) en vectores semánticos almacenados en Supabase (`resource_chunks`), permitiendo búsqueda por similitud coseno vía `pgvector` + índice HNSW.

La optimización en 3 fases redujo el tiempo de procesamiento de ~5 min a ~45s para un PDF de 20 páginas, y habilitó extracción nativa sin costo ($0) para páginas con texto digital.

### Flujo completo

```
PDF → [Fase 2] Extractor Async + Híbrido → Markdown
    → [Fase 1] Chunker (langchain, 1200/200) → Chunks
    → [Fase 1] Embedder (Gemini, batch=20, sin sleep) → Vectores 1536d
    → [Fase 1] Ingestor (Supabase, batch=50) → resource_chunks
    → [Fase 3] AdaptiveSemaphore + --resume para reanudación
```

---

## 2. Matriz de Capacidades

### Fase 1 — Quick Wins

| Capacidad | Implementación | Impacto |
|---|---|---|
| **Lotes dinámicos** | `batch_size=20` configurable en `SyllabusEmbedder` | 4× menos llamadas API vs batch=5 |
| **Sin pausa estática** | Eliminado `time.sleep(2)` fijo. Backoff solo ante 429 | ~40s ahorrados por cada 100 chunks |
| **Caché SHA-256** | `EmbeddingCache` en tabla `embedding_cache` de Supabase. Hash del contenido normalizado | 0 llamadas API para contenido duplicado |
| **Optimización imágenes** | `image_optimizer.py`: JPEG calidad 85, WebP, reducción DPI 200→150 | ~44% menos tokens de imagen |
| **Gate de validación** | `comparar_extraccion()` con métricas de fidelidad. Criterio: chars_diff < 5% y ratio 0.90-1.10 | Previene degradación silenciosa de OCR |

**Archivos:** `embedder.py`, `embedding_cache.py`, `image_optimizer.py`

### Fase 2 — Extracción Async + Híbrida

| Capacidad | Implementación | Impacto |
|---|---|---|
| **Extracción asíncrona** | `extract_text_async()` con `asyncio.Semaphore(max_concurrency=8)` | 20 páginas en ~45s (≈ página más lenta) vs ~5 min secuencial |
| **Checkpoints por página** | `ExtractionCheckpoint`: `pagina_001.md`...`pagina_NNN.md` en directorio `{pdf}_checkpoints/` | Async-safe, reanudable, sin corrupción de orden |
| **Enrutador híbrido** | `HybridRouter` con heurística compuesta de 4 criterios: chars < 100, corrupción `(cid:)` > 3%, área imagen > 20% | Páginas con texto nativo: $0, <50ms |
| **Pypdf nativo** | `extract_native_text()` vía `pypdf.PdfReader` | Texto extraíble sin API calls |
| **Detección corrupción** | `corruption_ratio()`: patrones `(cid:\d+)`, Unicode escapes, caracteres control | Evita falsos positivos de "texto limpio" |

**Heurística compuesta (anti-falsos positivos):**
```
1. len(texto_nativo) < 100        → VISION
2. corruption_ratio > 3%          → VISION
3. image_area_ratio > 20%         → VISION
4. Pasa todo                      → NATIVE ($0, <50ms)
```

**Archivos:** `extractor.py` (métodos async), `extraction_checkpoint.py`, `hybrid_router.py`

### Fase 3 — Resiliencia & Reanudación

| Capacidad | Implementación | Impacto |
|---|---|---|
| **AdaptiveSemaphore** | Reduce concurrencia a la mitad tras N rate limits (429). Mínimo configurable | Auto-regulación sin intervención manual |
| **Reanudación (`--resume`)** | Escanea `pagina_NNN.md`, reutiliza `recurso_id`, solo procesa delta faltante | Recuperación tras corte de cuota sin re-procesar |
| **Salida limpia** | `[Cuota Agotada] Progreso salvado en N/Total páginas. Ejecuta con --resume.` Sin tracebacks | Experiencia de operador clara |
| **Checkpoints persistentes** | No se borran al finalizar. Sobreviven entre ejecuciones | Multi-día para documentos grandes |

**Archivos:** `adaptive_semaphore.py`, `extractor.py` (integración), `cargar_compendio.py` (`--resume`, `_buscar_recurso_existente`)

---

## 3. Métricas de Rendimiento

### Suite de tests

```
tests/rag/test_phase1_quick_wins.py ........ 21 passed
tests/rag/test_phase2_extraction.py ........ 19 passed
tests/rag/test_phase3_resilience.py ........ 12 passed
tests/test_onboarding_completion.py ......... 3 passed
Total: 55 passed, 0 failed
```

### Comparativa de rendimiento (PDF 20 páginas)

| Métrica | Pipeline original | Pipeline optimizado |
|---|---|---|
| Extracción | ~4 min (sync, secuencial) | ~35s (async, 8 concurrente) |
| Embedding | ~40s (sleep fijo) | ~5s (batch=20, sin sleep) |
| Páginas nativas | 0 (todo por Vision) | Variable (≤50ms c/u, $0) |
| Reanudación | Manual, re-procesa todo | `--resume`, solo delta |
| **Tiempo total** | **~5 min** | **~45s** |

### Smoke test real (PDF 209 páginas, parcial por cuota)

| Métrica | Valor |
|---|---|
| Páginas procesadas | 35 (cuota diaria Gemini) |
| Ruta NATIVE | 4 páginas ($0, <1s c/u) |
| Ruta VISION | 31 páginas (~10s c/u) |
| Chunks en Supabase | 69 |
| Tiempo total | ~25 min |

---

## 4. Guía de Extensión

### Uso del CLI

```bash
# Ingesta básica (sync, original)
python -m app.rag.cargar_compendio archivo.pdf \
  --titulo "Titulo" --curso-id 5 --modo silabo

# Fase 2+3: async + híbrido + resume
python -m app.rag.cargar_compendio archivo.pdf \
  --titulo "Titulo" --curso-id 5 --modo examenes \
  --async --hybrid --max-concurrency 6 --resume
```

### Flags disponibles

| Flag | Default | Descripción |
|---|---|---|
| `--async` | false | Activa extracción asíncrona paralela |
| `--hybrid` | false | Activa enrutador híbrido (requiere `--async`) |
| `--max-concurrency` | 8 | Máximo páginas simultáneas |
| `--resume` | false | Reanuda desde checkpoints existentes |
| `--rpm` | 8 | Requests por minuto a Gemini |
| `--dpi` | 200 | Resolución de imagen para Vision |

### Puntos de extensión configurables

| Parámetro | Ubicación | Default |
|---|---|---|
| `batch_size` (embedder) | `SyllabusEmbedder(batch_size=20)` | 20 |
| `min_chars` (híbrido) | `HybridRouter(min_chars=100)` | 100 |
| `max_corruption_ratio` | `HybridRouter(max_corruption_ratio=0.03)` | 0.03 |
| `max_image_area_ratio` | `HybridRouter(max_image_area_ratio=0.20)` | 0.20 |
| `min_concurrency` | `AdaptiveSemaphore(min_concurrency=1)` | 1 |
| `chunk_size` / `overlap` | `SyllabusChunker(chunk_size=1200, chunk_overlap=200)` | 1200/200 |

### Flujo de reanudación para documentos grandes (>30 páginas)

```bash
# Día 1: procesa hasta agotar cuota (~60 páginas)
python -m app.rag.cargar_compendio doc.pdf --titulo "..." --curso-id 5 \
  --async --hybrid --max-concurrency 6

# Output: [Cuota Agotada] Progreso salvado en 58/200 paginas.

# Día 2: reanuda desde página 59
python -m app.rag.cargar_compendio doc.pdf --titulo "..." --curso-id 5 \
  --async --hybrid --max-concurrency 6 --resume

# Output: [Checkpoint] 58 pagina(s) encontrada(s) en cache local...
```

---

## 5. Estructura del Módulo RAG

```
backend/app/rag/
├── extractor.py              # SyllabusExtractor (sync + async)
├── extraction_checkpoint.py  # Checkpoints por página (Fase 2)
├── hybrid_router.py          # Enrutador híbrido NATIVE vs VISION (Fase 2)
├── adaptive_semaphore.py     # Semáforo auto-regulable (Fase 3)
├── chunker.py                # SyllabusChunker (langchain)
├── embedder.py               # SyllabusEmbedder (Gemini + caché)
├── embedding_cache.py        # Caché SHA-256 en Supabase (Fase 1)
├── image_optimizer.py        # Compresión JPEG/WebP + DPI (Fase 1)
├── ingest.py                 # SyllabusIngestor (Supabase)
├── retriever.py              # SyllabusRetriever (búsqueda semántica)
└── cargar_compendio.py       # CLI orquestador (--async, --hybrid, --resume)
```

---

## 6. Dependencias

```txt
# requirements.txt (adicionales para Fases 1-3)
pytest>=8.0
pytest-asyncio>=0.24.0
httpx>=0.28.0
pypdf>=5.0.0
Pillow>=10.0.0
langchain-text-splitters
pdf2image
google-genai
supabase
```

## 7. Base de Datos

```sql
-- Tabla principal de chunks vectorizados
CREATE TABLE resource_chunks (
    id uuid PRIMARY KEY,
    recurso_id integer REFERENCES recursos(id) ON DELETE CASCADE,
    curso_id integer REFERENCES cursos(id) ON DELETE CASCADE,
    contenido text NOT NULL,
    embedding vector(1536) NOT NULL,
    metadata jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT now()
);
CREATE INDEX resource_chunks_embedding_idx ON resource_chunks
    USING hnsw (embedding vector_cosine_ops);

-- Caché de embeddings (Fase 1)
CREATE TABLE embedding_cache (
    chunk_hash text PRIMARY KEY,
    embedding vector(1536) NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- Funciones RPC de búsqueda
search_resource_chunks(query_embedding, match_threshold, match_count, filter_curso_id)
search_resource_chunks_by_nombre(query_embedding, match_threshold, match_count, filter_curso_nombre)
```
