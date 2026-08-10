# Diagnóstico: Pipeline de Chunking y Vectorización (RAG)

- **Estado:** DIAGNÓSTICO EXPLORATORIO
- **Fecha:** 2026-08-10
- **Autor:** Equipo Lead UNI
- **Alcance:** `backend/app/rag/` + `backend/scripts_manuales/generar_chunks_desde_drive.py` + `base_de_datos/rag/`

---

## 1. Diagrama de Flujo Actual

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        PIPELINE RAG — VISIÓN GLOBAL                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────┐    ┌──────────────────┐    ┌─────────────────┐            │
│  │ PDF      │───▶│ SyllabusExtractor│───▶│ Markdown crudo  │            │
│  │ (Drive)  │    │ (pág. × pág.)    │    │ (_extraido.md)  │            │
│  └──────────┘    └────────┬─────────┘    └────────┬────────┘            │
│                           │                       │                     │
│                   pdf2image → PNG                checkpoint             │
│                   Gemini 2.5 Flash               reanudable              │
│                   throttling 8 RPM                                       │
│                           │                       │                     │
│                           ▼                       ▼                     │
│                   ┌──────────────┐    ┌─────────────────┐              │
│                   │SyllabusChunker│◀──│ Markdown crudo  │              │
│                   │(langchain)   │    │                 │              │
│                   └──────┬───────┘    └─────────────────┘              │
│                          │                                              │
│                   chunk_size=1200                                       │
│                   chunk_overlap=200                                     │
│                   MarkdownHeader + RecursiveChar                        │
│                          │                                              │
│                          ▼                                              │
│                   ┌─────────────────┐                                   │
│                   │ Lista de chunks │  [{contenido, metadatos}]         │
│                   │ (~50-200 por    │                                   │
│                   │  PDF de 30 pág) │                                   │
│                   └────────┬────────┘                                   │
│                            │                                            │
│                            ▼                                            │
│                   ┌──────────────────┐                                  │
│                   │SyllabusEmbedder  │                                  │
│                   │(Gemini Embedding)│                                  │
│                   └────────┬─────────┘                                  │
│                            │                                            │
│                     batch_size=5                                        │
│                     model: gemini-embedding-2                           │
│                     dims: 1536                                          │
│                     sleep(2) entre lotes                                │
│                            │                                            │
│                            ▼                                            │
│                   ┌──────────────────┐                                  │
│                   │SyllabusIngestor  │                                  │
│                   │(Supabase)        │                                  │
│                   └────────┬─────────┘                                  │
│                            │                                            │
│                     batch_size=50                                       │
│                     insert secuencial                                   │
│                            │                                            │
│                            ▼                                            │
│                   ┌──────────────────────────┐                          │
│                   │  resource_chunks         │                          │
│                   │  ┌─────────────────────┐ │                          │
│                   │  │ id (uuid)           │ │                          │
│                   │  │ recurso_id (int)    │ │                          │
│                   │  │ curso_id (int)      │ │                          │
│                   │  │ contenido (text)    │ │                          │
│                   │  │ embedding (1536)    │ │                          │
│                   │  │ metadata (jsonb)    │ │                          │
│                   │  │ created_at (tstz)   │ │                          │
│                   │  └─────────────────────┘ │                          │
│                   │  índice HNSW (coseno)    │                          │
│                   │  RLS: SELECT auth        │                          │
│                   └──────────────────────────┘                          │
│                            │                                            │
│                            ▼                                            │
│                   ┌──────────────────┐                                  │
│                   │SyllabusRetriever │ ←─ search_resource_chunks()     │
│                   │(RPC Supabase)    │     (cosine similarity)          │
│                   └──────────────────┘                                  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Componentes del Pipeline

### 2.1 SyllabusExtractor — Extracción de texto (PDF → Markdown)

| Atributo | Valor |
|---|---|
| **Archivo** | `backend/app/rag/extractor.py` |
| **Librería** | `pdf2image` (convierte PDF a PNG página por página) |
| **Modelo** | `gemini-2.5-flash` (visión multimodal) |
| **Mecanismo** | Cada página → imagen PNG → prompt Gemini → respuesta Markdown |
| **Throttling** | 8 RPM (`self.min_interval = 7.5s` entre llamadas) |
| **Reintentos** | Hasta 6 con backoff exponencial (2^n segundos) |
| **Salvage** | Si el primer intento falla o es sospechoso, segundo intento con prompt simplificado |
| **DPI** | 200 (configurable, default) |
| **Checkpoint** | Escribe `_extraido.md` incremental — reanudable si se interrumpe |
| **Límite** | Advierte si el PDF tiene más de 30 páginas |

**Modos de prompt:**
- `silabo`: Extrae jerarquía, fórmulas LaTeX, tablas — estructura académica completa
- `examenes`: Transcribe enunciados de ejercicios, sin resolverlos — estructura `### Ejercicio N`
- `salvage`: Fallback para páginas no legibles en modo examen

### 2.2 SyllabusChunker — Fragmentación (Markdown → Chunks)

| Atributo | Valor |
|---|---|
| **Archivo** | `backend/app/rag/chunker.py` |
| **Librería** | `langchain_text_splitters` |
| **Estrategia** | Dos pasos encadenados |
| **Paso 1** | `MarkdownHeaderTextSplitter` — divide por headers (`#`, `##`, `###`) preservando jerarquía |
| **Paso 2** | `RecursiveCharacterTextSplitter` — subdivide fragmentos largos |
| **chunk_size** | 1200 caracteres |
| **chunk_overlap** | 200 caracteres (16.6% de solapamiento) |
| **Separadores** | `\n\n` → `\n` → ` ` → carácter |
| **Metadata** | Cada chunk incluye headers como prefijo: `[Tema Principal: Cálculo \| Subtema: Límites]\n...` |
| **Salida** | `[{contenido: "..."}]` — lista de dicts sin embeddings |

### 2.3 SyllabusEmbedder — Vectorización (Chunks → Vectores)

| Atributo | Valor |
|---|---|
| **Archivo** | `backend/app/rag/embedder.py` |
| **SDK** | `google-genai` (nuevo, v1+) |
| **Modelo** | `models/gemini-embedding-2` |
| **Dimensiones** | 1536 (truncadas del output real del modelo) |
| **Task type** | `RETRIEVAL_DOCUMENT` |
| **batch_size** | 5 chunks por llamada |
| **Reintentos** | Hasta 3 con espera de `5 * intento` segundos en 429 |
| **Sleep fijo** | `time.sleep(2)` después de CADA lote (exitoso o no) |
| **Salida** | `[{contenido, embedding: [1536 floats]}]` |

### 2.4 SyllabusIngestor — Persistencia (Vectores → Supabase)

| Atributo | Valor |
|---|---|
| **Archivo** | `backend/app/rag/ingest.py` |
| **Cliente** | `supabase-py` (anon key) |
| **Tabla** | `resource_chunks` |
| **batch_size** | 50 chunks por INSERT |
| **Campos** | `recurso_id`, `curso_id`, `contenido`, `embedding` |
| **metadata** | No se persiste — el campo `metadata` existe en la tabla pero el ingestor no lo envía |
| **Transaccionalidad** | ❌ Sin transacciones — si un lote falla a mitad de camino, los lotes anteriores ya están insertados |

### 2.5 Orquestadores

| Archivo | Rol |
|---|---|
| `cargar_compendio.py` | **Orquestador unitario.** Procesa UN PDF a la vez vía CLI: `python -m app.rag.cargar_compendio silabo.pdf --titulo "Mate I" --curso-id 5`. Crea fila en `recursos`, extrae, chunkea, embebe, ingesta. Limpia el recurso huérfano si algo falla. |
| `generar_chunks_desde_drive.py` | **Orquestador batch.** Procesa TODOS los recursos tipo Examen/Practica desde Drive. Reutiliza `recurso_id` existente. Deduplica por `drive_file_id`. Reanudable. Se detiene tras 3 fallos seguidos (señal de cuota agotada). |

---

## 3. Contrato de Base de Datos: `resource_chunks`

```sql
CREATE TABLE public.resource_chunks (
    id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    recurso_id integer NOT NULL  REFERENCES public.recursos(id)  ON DELETE CASCADE,
    curso_id   integer NOT NULL  REFERENCES public.cursos(id)    ON DELETE CASCADE,
    contenido  text    NOT NULL,
    embedding  vector(1536) NOT NULL,
    metadata   jsonb   DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now() NOT NULL
);

-- Índice HNSW para búsqueda por similitud coseno
CREATE INDEX resource_chunks_embedding_idx
ON public.resource_chunks
USING hnsw (embedding vector_cosine_ops);

-- RLS: solo lectura para usuarios autenticados
ALTER TABLE public.resource_chunks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir lectura autenticada" FOR SELECT TO authenticated USING (true);
```

**Funciones RPC para búsqueda semántica:**
- `search_resource_chunks(query_embedding, match_threshold, match_count, filter_curso_id)` → búsqueda por `curso_id`
- `search_resource_chunks_by_nombre(query_embedding, match_threshold, match_count, filter_curso_nombre)` → búsqueda por nombre de curso (útil cuando un mismo compendio aplica a múltiples carreras)

**⚠️ Campo `metadata` fantasma:** La tabla tiene el campo `metadata jsonb`, pero el `SyllabusIngestor` no lo envía. Los metadatos generados por el chunker (headers markdown) se concatenan al `contenido` como string en lugar de guardarse en el campo jsonb. Esto es un desperdicio del índice GIN que jsonb podría ofrecer para filtrado.

---

## 4. Análisis de Cuellos de Botella

### 🔴 CRÍTICO — Extracción página por página (Gemini Vision)

| Métrica | Estimación |
|---|---|
| Tiempo por página (éxito) | ~7.5s (throttle) + ~3s (API) = ~10.5s |
| Tiempo por página (salvage) | ~21s (dos llamadas) |
| PDF de 15 páginas | ~2.6 minutos (mejor caso) |
| PDF de 30 páginas | ~5.2 minutos (mejor caso) |
| PDF de 30 páginas con 30% salvage | ~8.4 minutos |

**Problema:** La extracción es **secuencial por página** (bucle `for n in range(1, total+1)` en `extract_text`, L205). No hay paralelismo posible porque el throttling de 8 RPM fuerza un intervalo mínimo de 7.5s entre llamadas.

**Costo en tokens:** Gemini 2.5 Flash cobra por imagen + tokens de salida. Una página a 200 DPI es una imagen de ~1650×2340 píxeles. Cada página consume ~250-500 tokens de imagen. Un PDF de 30 páginas = 7,500-15,000 tokens de entrada solo en imágenes, más los tokens de salida del Markdown generado (~500-2000 por página).

**📊 Estimación por PDF de 20 páginas:**
- Tokens entrada (imágenes): ~10,000
- Tokens salida (Markdown): ~20,000
- Llamadas API: 20 (más ~6 salvage = 26 en peor caso)
- **Tiempo total: ~3.5-5.5 minutos**

### 🟠 ALTO — Sleep fijo en embedding

```python
# embedder.py L67
time.sleep(2)  # después de CADA lote, exitoso o no
```

Para 100 chunks con `batch_size=5` = 20 lotes = **40 segundos de sleep innecesario**. El sleep es comprensible como cortesía de rate-limit, pero no es adaptativo: si la API responde en 200ms, igual espera 2s. Un backoff condicional (solo en 429) o un token bucket eliminaría este overhead.

### 🟡 MEDIO — Ingestión secuencial sin transacciones

Cada lote de 50 chunks se inserta con `.execute()` síncrono. Si el lote 3 de 10 falla, los lotes 1 y 2 ya están en Supabase y no hay rollback. Esto deja la tabla en estado parcial, y el usuario debe limpiar manualmente o confiar en que el `ON DELETE CASCADE` desde `recursos` lo resuelva (solo aplica si se elimina el recurso padre).

### 🟡 MEDIO — Pipeline lineal sin streaming

```
Extraer TODO el PDF → Chunkear TODO → Embedder TODO → Ingestar TODO
```

Las 4 etapas son secuenciales. La etapa 2 no empieza hasta que la etapa 1 termina al 100%. Esto es aceptable para un solo PDF, pero en el script batch (`generar_chunks_desde_drive.py`) procesa N PDFs uno tras otro con las 4 etapas por cada uno. Si hay 50 exámenes pendientes, el pipeline no avanza al segundo PDF hasta que el primero completa las 4 fases.

### 🟢 BAJO — Chunking (no es el bottleneck)

El chunking con langchain es CPU-bound pero rápido: ~50-200ms para un PDF completo. No justifica optimización en este momento.

### 🟢 BAJO — metadata fantasma en jsonb

El campo `metadata` existe pero no se usa. Los metadatos (headers markdown) van concatenados como string en `contenido`. Esto impide filtrar por tipo de contenido (ej. "solo ejercicios" vs "solo teoría") sin hacer string matching.

---

## 5. Resumen de Costos por Documento

Para un **PDF típico de 20 páginas (examen/silabo):**

| Etapa | Llamadas API | Tiempo estimado | % del total |
|---|---|---|---|
| Extracción (Gemini Vision) | 20-26 llamadas | 3.5-5.5 min | **82%** |
| Chunking (langchain CPU) | 0 API | <1s | <1% |
| Embedding (Gemini Embed) | 8-12 lotes de 5 | 20-35s | **14%** |
| Ingestión (Supabase) | 2-3 lotes de 50 | 5-10s | **4%** |
| **Total** | **~30-38 API calls** | **4-6 min** | **100%** |

> **La extracción consume el 82% del tiempo total.** Cualquier optimización debe empezar aquí.

---

## 6. Hallazgos Clave

### 6.1 Lo que funciona bien

| Componente | Fortaleza |
|---|---|
| **Checkpointing** | La extracción escribe incrementalmente a `_extraido.md`. Si Gemini falla por cuota en la página 15 de 30, se reanuda desde la 16 al día siguiente. Esto es robusto y bien implementado. |
| **Deduplicación** | El script batch salta recursos que ya tienen chunks en `resource_chunks` (L82-84). No se re-procesa innecesariamente. |
| **Recursive prerequisite chain** | El backend ya tiene `resolve_prereq_chain()` con BFS para prerrequisitos transitivos. Es el mismo patrón que se necesitaría para construir grafos de dependencia entre cursos en la malla. |
| **Search by nombre** | `search_resource_chunks_by_nombre` resuelve el problema de cursos con mismo nombre en distintas carreras sin duplicar embeddings. |
| **Índice HNSW** | La búsqueda por similitud coseno usa HNSW, que es el estado del arte para vectores de 1536 dimensiones. |

### 6.2 Lo que necesita atención

| # | Hallazgo | Severidad | Recomendación |
|---|---|---|---|
| 1 | Extracción secuencial página por página sin paralelismo | 🔴 Crítico | Evaluar `asyncio` + `Semaphore(8)` para enviar páginas en paralelo respetando el RPM. Reduciría tiempo de 5 min a ~45s para 30 páginas. |
| 2 | Sleep fijo de 2s en embedder entre lotes | 🟠 Alto | Reemplazar con backoff condicional: solo esperar en 429, usar `time.monotonic()` para respetar rate limit real. |
| 3 | Pipeline sin streaming: las 4 etapas son bloqueantes | 🟡 Medio | Para el batch de Drive, implementar pipeline por documento con cola. Mientras el embedder procesa el doc N, el extractor puede empezar el doc N+1. |
| 4 | Campo `metadata` jsonb sin uso | 🟡 Medio | Poblar `metadata` con los headers del chunker (`{"tema": "Cálculo", "subtema": "Límites"}`) en vez de concatenarlos a `contenido`. Habilita filtrado semántico + por metadato. |
| 5 | Ingestión sin transacciones ni upsert | 🟡 Medio | Usar `upsert` con `ON CONFLICT (id)` o transacciones para lotes atómicos. Actualmente un fallo a mitad de la ingesta deja datos parciales. |
| 6 | DPI fijo en 200 sin evaluación de tradeoff | 🟢 Bajo | Un DPI menor (150) reduciría tokens de imagen ~44% con pérdida mínima de calidad para texto impreso. |
| 7 | Salvage mode duplica llamadas en exámenes problemáticos | 🟢 Bajo | El salvage es buena defensa, pero no hay métricas de cuántas páginas lo necesitan. Agregar contador para decidir si vale la pena. |
| 8 | Sin caché de embeddings | 🟢 Bajo | Si el mismo contenido se re-procesa (ej. mismo PDF para dos carreras), se re-generan embeddings idénticos. Un hash del contenido evitaría llamadas repetidas a Gemini Embedding. |

---

## 7. Archivos del Pipeline

| Archivo | Rol | Líneas |
|---|---|---|
| `backend/app/rag/extractor.py` | Extracción PDF → Markdown vía Gemini Vision | 264 |
| `backend/app/rag/chunker.py` | Fragmentación Markdown → chunks | 64 |
| `backend/app/rag/embedder.py` | Vectorización chunks → embeddings 1536d | 91 |
| `backend/app/rag/ingest.py` | Inserción embeddings → Supabase | 50 |
| `backend/app/rag/retriever.py` | Búsqueda semántica (consulta) | 116 |
| `backend/app/rag/cargar_compendio.py` | Orquestador unitario (CLI) | 147 |
| `backend/scripts_manuales/generar_chunks_desde_drive.py` | Orquestador batch (Drive) | 175 |
| `base_de_datos/rag/rag_setup.sql` | Esquema + índices + RPC `search_resource_chunks` | 140 |
| `base_de_datos/rag/rag_search_by_nombre.sql` | RPC búsqueda por nombre de curso | 50 |

---

## 8. Conclusión

El pipeline está **funcional y bien diseñado en términos de resiliencia** (checkpointing, deduplicación, retry con backoff), pero **paga un costo alto en latencia por ser completamente síncrono y secuencial**. La extracción con Gemini Vision es el cuello de botella absoluto (82% del tiempo), y cualquier optimización debe priorizar esa etapa.

**Orden de prioridad para optimización futura:**
1. Paralelizar extracción con `asyncio` + semáforo de RPM
2. Eliminar `sleep(2)` fijo en embedder
3. Pipeline por documento para el batch de Drive
4. Poblar `metadata` jsonb
5. Upsert en ingesta en lugar de insert puro
