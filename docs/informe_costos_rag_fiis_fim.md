# Informe de Costos RAG — FIIS & FIM

> **Tipo:** Informe técnico — auditoría real de datos y anatomía del pipeline
> **Fecha de corte de datos:** 2026-08-30
> **Fuente de datos:** Supabase `public` (proyecto `pggpscrbpcasbgjhjigw`) — consultas `SELECT` vía MCP de Supabase
> **Fuente de código:** `backend/app/rag/*` y `backend/app/core/llm.py`
> **Alcance:** Facultades FIIS (id=1) y FIM (id=3) + total general del corpus de `recursos`
> **Nota de integridad:** documento de análisis generado 100 % en modo lectura (0 escrituras en BD, 0 cambios de código).

---

## 1. Informe de Costos Real (FIIS & FIM)

### 1.1 Resumen ejecutivo

La auditoría en Supabase registra **6,744 recursos documentales** (6,710 con `drive_file_id` de Google Drive) distribuidos en **217 cursos FIIS**, **140 cursos FIM** y un total de **449 cursos** en el catálogo. Procesar el corpus completo con los umbrales actuales del `hybrid_router.py` costaría ≈ **USD $29.50** (ingesta OCR + embeddings); restringir la ruta de visión a Exámenes/Prácticas/Compendios reduce el costo a ≈ **USD $12.16**, un **ahorro del ~59 % sin pérdida de calidad**, porque el texto digital nativo se extrae gratis con `pypdf`.

| Métrica auditada | Valor |
|---|---|
| Total de filas en `public.recursos` | **6,744** |
| Con `drive_file_id` (descargables) | **6,710** |
| Páginas estimadas del corpus completo | **46,152** (rango 18,018 – 133,476) |
| Recursos ya vectorizados (`resource_chunks`) | **85** → 1,137 chunks (~$0.004 de embeddings consumidos) |
| Estado `pending` / `complete` / `skipped_permissions` | 6,698 / 38 / 8 |
| Costo ingesta AS-IS (escenario A) | ≈ **$29.50** |
| Costo ingesta optimizado (escenario B) | ≈ **$12.16** |
| Ahorro del router híbrido | **≈ 59 % (−$17.33)** |

### 1.2 Facultades y cursos — auditoría

| Facultad | id | Carreras en BD | Cursos (mallas + catálogo) | Compartidos con la otra facultad | Exclusivos |
|---|---|---|---|---|---|
| **FIIS** — Facultad de Ingeniería Industrial y de Sistemas | 1 | 4 (SW, IND, SI, IA) | **217** | 20 | 197 |
| **FIM** — Facultad de Ingeniería Mecánica | 3 | 4 (MEC, MECEL, NAV, MTR) | **140** | 20 | 120 |
| **Total catálogo** (`public.cursos`) | — | — | **449** | 20 (intersección) | 329 |

Detalle de la partición de cursos (consulta `SELECT` real):

- **FIIS** = cursos de mallas de carreras con `facultad_id=1` ∪ cursos de `curso_carrera` de esas carreras → **217**.
- **FIM** = cursos de mallas de carreras con `facultad_id=3` (mallas vigentes `M3`…`M6`, ids 18–21) → **140**.
- **Intersección** → **20 cursos básicos compartidos** (FB401 Física II, BMA03 Álgebra Lineal, BQU01 Química I, BFI01 Física I, BMA01/BMA02 Cálculo, FB403 Ecuaciones Diferenciales, FB305 Estadística, BIC01, TE401, BEG01, BRC01, BRN01, BEF01, SI302, etc.).

### 1.3 Recursos (PDFs) por facultad y tipo de documento

| Grupo | PDFs | Exámenes | Prácticas | Sílabos | Teoría (PDF/Apunte/Libro/Compendio) | Video |
|---|---|---|---|---|---|---|
| FIIS exclusivo | 2,639 | 539 | 653 | 20 | 1,422 (de ellos 1,251 PDF) | 5 |
| Compartidos (FIIS ∪ FIM) | 3,224 | 643 | 1,092 | 17 | 1,472 (de ellos 1,393 PDF) | 0 |
| FIM exclusivo | **0** ⚠️ | 0 | 0 | 0 | 0 | 0 |
| Sin curso (`curso_id IS NULL`) | 881 | 142 | 35 | 28 | 676 (de ellos 594 PDF) | 0 |
| **Total** | **6,744** | **1,324** | **1,780** | **65** | **3,570** | 5 |

Totales por tipo en todo el corpus: PDF = 3,238 · Práctica = 1,780 · Examen = 1,319 (+ 5 con el tipo `examen` en minúscula) · Apunte = 262 · Sílabo = 65 · Libro = 62 · Compendio = 8 · Video = 5.

**Estimación de páginas.** El esquema no almacena `num_paginas`; se estiman con promedios por tipo anclados en documentos reales ya procesados (compendios con marcador de página 201, materiales de curso de 16–29 páginas): Examen/Práctica = 2, Sílabo = 8, Apunte = 10, PDF genérico = 8, Libro = 150, Compendio = 200.

| Grupo | Páginas (est. media) | Rango bajo–alto |
|---|---|---|
| FIIS exclusivo | 17,962 | 6,898 – 51,908 |
| Compartidos | 18,910 | 7,147 – 55,954 |
| Sin curso | 9,280 | 3,973 – 25,614 |
| **Total** | **46,152** | **18,018 – 133,476** |

### 1.4 Desglose monetario por facultad — Visión vs. Nativo (USD)

**Metodología.** La tarifa oficial de OCR con visión `gpt-4.1-mini` es **$0.0015 por página** ($0.40/1M input + $1.60/1M output). Cada página se factura por la *imagen* enviada a visión; las páginas con texto digital nativo cuestan **$0.00**.

| Grupo | PDFs | Páginas | Visión A (págs) | Costo A | Visión B (págs) | Costo B |
|---|---|---|---|---|---|---|
| FIIS exclusivo | 2,639 | 17,962 | 7,769 | **$11.65** | 3,184 | **$4.78** |
| FIIS total (exclusivo + compartidos) | 5,863 | 36,872 | 16,364 | **$24.55** | 7,254 | **$10.88** |
| FIM (solo compartidos; 0 exclusivos) | 3,224 | 18,910 | 8,595 | **$12.89** ⚠️ | 4,070 | **$6.11** ⚠️ |
| Sin curso (huérfanos) | 881 | 9,280 | 2,997 | **$4.50** | 554 | **$0.83** |
| **Total corpus (sin doble conteo)** | **6,744** | **46,152** | **19,361** | **≈ $29.04** | **7,808** | **≈ $11.71** |

> ⚠️ **La fila FIM no es un costo adicional**: agrupa los mismos 3,224 PDFs de cursos básicos compartidos ya contados en FIIS total. El mismo documento no se factura dos veces.

### 1.5 Escenarios y matriz de optimización (ahorro ≈ 59 %)

**Escenario A (AS-IS)** — umbrales actuales del router (`min_chars=100`, `max_corruption_ratio=0.03`, `max_image_area_ratio=0.20`): pasan a visión ~90 % de Exámenes/Prácticas, 70 % de Compendios, 40 % de PDF genéricos, 50 % de Apuntes, 10 % de Sílabos/Libros.

**Escenario B (Texto Nativo $0 máximo)** — se fuerza la ruta `native` para Sílabos, PDF digitales, Apuntes y Libros; la visión queda reservada exclusivamente a **Exámenes, Prácticas y Compendios** (manuscritos, diagramas, fórmulas). Es el cambio de mayor impacto económico con riesgo controlado por el guardarraíl de corrupción.

| Componente de ingesta | A (AS-IS) | B (optimizado) |
|---|---|---|
| OCR Visión (`gpt-4.1-mini`, $0.0015/pág) | $29.04 | $11.71 |
| Texto Nativo (`pypdf`) | $0.00 | $0.00 |
| Embeddings (`text-embedding-3-small`, con caché SHA-256) | ~$0.30 – $0.60 | ~$0.30 – $0.60 |
| **TOTAL INGESTA** | **≈ $29.50** | **≈ $12.16** |

**Ahorro ≈ 59 % (−$17.33).** Ajustes sugeridos en `hybrid_router.py`:

- `min_chars`: 100 → **50–60** (más notas y diapositivas digitales a nativa).
- `max_image_area_ratio`: 0.20 → **0.32–0.35** (páginas con logos/marcas de agua dejan de ir a visión).
- `max_corruption_ratio`: se **mantiene en 0.03** como guardarraíl anti-falsos positivos (fórmulas LaTeX mal mapeadas `(cid:)` → visión obligada).
- **Gate por tipo de recurso:** forzar nativa en `Silabo` / `Libro` / `PDF` / `Apunte`, reservando visión a `Examen` / `Practica` / `Compendio` que fallen la heurística.

### 1.6 Rastreo de facturación — etapa × modelo × API Key × tarifa

| Etapa RAG | Modelo | API Key | Tarifa | Costo / unidad |
|---|---|---|---|---|
| OCR / Ingesta Visión | `gpt-4.1-mini` (`MODELO_INGESTA`) | `OPEN_AI_INGEST_API_KEY` | $0.40/1M in · $1.60/1M out | **~$0.0015 / página** |
| Texto Nativo | `pypdf` (local, sin API) | — | $0 | **$0.00 / página** |
| Vectorización | `text-embedding-3-small` (`OPENAI_EMBED_MODEL`) | `OPEN_AI_INGEST_API_KEY` | $0.02 / 1M tokens | ~$0.000008 / chunk |
| Generación Tutor / Evaluaciones | `gpt-4o-mini` (`OPENAI_GEN_MODEL`, `LLM_PROVIDER=openai`) | `OPENAI_API_KEY` | $0.15/1M in · $0.60/1M out | ~$0.0009 / interacción |
| Fallback respaldo | `gemini-2.0-flash` (`GEMINI_GEN_MODEL`) | `GEMINI_API_KEY` | ~$0.10/1M in · $0.40/1M out | free tier ~$0 |

*Verificado en `backend/app/core/llm.py` (modelos por defecto y separación de claves INGESTA vs. GENERACIÓN). Groq (`llama-3.3-70b-versatile`) queda disponible como fallback alternativo configurable.*

### 1.7 Hallazgo crítico de FIM

- La ingesta específica de FIM **aún no existe en la base**: los 120 cursos exclusivos FIM (códigos `MC*`, `MN*`, `NAV*`, `MTR*`) tienen **0 recursos** en `public.recursos`.
- Los 3,224 PDFs que aparecen vinculados a FIM son de **cursos básicos compartidos** con FIIS (física, cálculo, álgebra, etc.).
- **Acción requerida antes de presupuestar FIM:** escanear la carpeta de Drive de FIM para los 140 cursos de sus mallas vigentes (prerrequisito para dimensionar el costo real del material propio).

---

## 2. Anatomía del Pipeline RAG y Gastos de Tokens

Flujo completo: `PDF → Enrutamiento híbrido → Extracción → Markdown → Chunker (1,200/200) → Embeddings 1,536d → pgvector (HNSW) → Retriever (coseno) → Tutor RAG (gpt-4o-mini)`.

### 2.1 Etapa 1: Enrutamiento y OCR (Ingesta Visión vs. Nativo)

**Qué hace el código.** `hybrid_router.py` evalúa cada página del PDF con una heurística compuesta de 4 criterios: (1) `len(texto_nativo) >= 100` caracteres, (2) ratio de corrupción (`(cid:)`, glifos no mapeados, caracteres de control) ≤ 3 %, (3) área cubierta por imágenes XObject ≤ 20 %, y (4) si pasa todo → ruta **NATIVE** (`pypdf` extrae el texto directamente: **$0**, <50 ms). Si falla alguno → ruta **VISION**: `extractor.py` renderiza la página con `pdf2image`/Poppler (DPI 200→150, lado máximo 1,568 px, JPEG calidad 90) y la envía a `gpt-4.1-mini` con un prompt específico por modo (sílabos → Markdown fiel con LaTeX; exámenes → transcripción de enunciados sin resolver; modo *salvage* para páginas sospechosas de alucinación en la respuesta).

**Consumo de Tokens.** La visión **no factura por palabras: factura por imagen y resolución**. Una página escaneada de examen (A4, ~1,568 px de lado, JPEG q90) consume **~1,200 a 1,500 tokens de imagen** en `gpt-4.1-mini` por llamada. El pipeline reescala y comprime la página a propósito: a resolución nativa los tokens de imagen serían aún mayores. Cada recuperación con *salvage* duplica la llamada (la página sospechosa se reenvía con un segundo prompt).

> ⚠️ **Esta etapa es la fuente del ~90 % del gasto de ingesta.** Un compendio escaneado de 200 páginas cuesta ~$0.30 solo en visión ($0.0015 × 200) y domina el presupuesto; el resto del pipeline (embeddings + generación) es marginal. Por eso la optimización del router —enviar más páginas a la ruta `native` de $0— es la palanca de ahorro dominante en este proyecto.

### 2.2 Etapa 2: Fragmentación y Vectorización (Embeddings)

**Qué hace el código.** `chunker.py` corta el Markdown extraído en dos pasadas: primero `MarkdownHeaderTextSplitter` (jerarquía `# / ## / ###` para respetar temas y ejercicios) y luego `RecursiveCharacterTextSplitter` con **chunk_size = 1,200 caracteres y overlap = 200**. El prefijo de encabezado se incrusta en cada fragmento para conservar contexto (`[Tema: ...] | Subtema: ...`). Después, `embedder.py` envía los chunks a **`text-embedding-3-small`** en lotes de 20 (con `EmbeddingCache` SHA-256 para no repagar contenido duplicado y backoff exponencial ante HTTP 429) y recibe **vectores de 1,536 dimensiones** — exactamente el ancho de la columna `vector(1536)` de `resource_chunks` y del índice HNSW.

**Consumo de Tokens.** Cada chunk (1,200 caracteres) se tokeniza como **texto** (≈ 300–430 tokens de input en español académico según el ratio ~2.8–4 chars/token) y se convierte en un vector. A la tarifa de **$0.02 / 1M tokens**, cada chunk cuesta ~$0.000008. Proyección sobre el corpus real:

| Escenario | Caracteres extraídos | Tokens de embedding | Costo bruto | Con caché/dedupe |
|---|---|---|---|---|
| Solo lo vectorizado hoy (85 recursos) | ~825,289 | ~206 K | ~$0.004 | $0.004 |
| Corpus completo (46,152 págs × ~2,500 chars) | ~115 M | ~29 M | **~$0.77** | **~$0.30 – $0.60** |

El gasto de embeddings representa **< 3 % del presupuesto**: aunque se retokenice y re-vectorice todo el corpus, son céntimos frente a la etapa de visión. La caché SHA-256 es la protección práctica contra exámenes repetidos de años anteriores.

### 2.3 Etapa 3: Recuperación (Retriever)

**Qué hace el código.** Cuando un alumno hace una pregunta, `retriever.py` la convierte en un embedding con el mismo modelo `text-embedding-3-small` (misma dimensionalidad → vectores comparables) e invoca la RPC `search_resource_chunks` de Supabase, que ejecuta una **búsqueda por similitud cosenoidal** (`1 - embedding <=> query`) sobre el índice **HNSW (`vector_cosine_ops`)** de la tabla `resource_chunks`. El resultado son los 3–5 chunks más cercanos que superan el umbral (`match_threshold`; en `generator.py` se usa `limit=4` y `umbral_similitud=0.4`), que se entregan a la etapa de generación como contexto.

**Consumo de Tokens.** La pregunta del estudiante pesa **~20 a 50 tokens** de texto. A $0.02/1M de `text-embedding-3-small`, el embedding de la consulta cuesta **~$0.000001**: despreciable. La búsqueda vectorial en sí ocurre **dentro de Supabase** (cómputo local de pgvector, sin llamadas a LLM).

| Concepto | Tokens | Costo |
|---|---|---|
| Embedding de la pregunta | 20 – 50 | ~$0.000001 |
| Búsqueda coseno en Supabase (HNSW) | — (local) | **$0.00** |

### 2.4 Etapa 4: Generación y Respuesta (Tutor RAG)

**Qué hace el código.** `generator.py` arma un prompt compuesto: el `SYSTEM_TUTOR` (guía pedagógica de ~300 tokens) + los fragmentos recuperados formateados (`--- Fragmento N ---`, 3–5 chunks → **~3,000 tokens de Input**) + la pregunta del alumno, y llama a la generación con `max_tokens=8000`. `llm.py` enruta por `LLM_PROVIDER` (default `openai` → **`gpt-4o-mini`**, $0.15/1M in · $0.60/1M out); si el principal responde 429 (cuota/tasa) o falla por conexión (5xx), reintenta automáticamente con `LLM_FALLBACK` (default `gemini` → **`gemini-2.0-flash`**, free tier / costo mínimo).

**Consumo de Tokens por interacción** (`gpt-4o-mini`):

| Interacción | Tokens Input | Tokens Output | Costo |
|---|---|---|---|
| Baja (3 chunks, respuesta corta) | ~2,000 | ~500 | **$0.0006** |
| Media (4 chunks, respuesta estándar) | ~3,000 | ~750 | **$0.0009** |
| Alta (5 chunks, respuesta extendida) | ~4,000 | ~1,000 | **$0.0012** |

*Derivación: input = sistema (~300) + pregunta (~50) + chunks (~400 tokens por chunk) + etiquetas de formato; output según los tokens consumidos. Fórmula: `(input × $0.15 + output × $0.60) / 1,000,000`. En el caso de evaluaciones (router `evaluaciones.py`) el patrón es el mismo con `gpt-4o-mini`.*

### 2.5 Tabla Resumen de Fugas de Tokens

| Fase del pipeline | Qué consume tokens | Tipo de token | Volumen típico | Costo | Participación del gasto de ingesta |
|---|---|---|---|---|---|
| **1. Enrutamiento** (`hybrid_router`) | `pypdf` extrae texto nativo | — (sin API) | — | **$0.00** | 0 % |
| **1. OCR Visión** (`extractor`) | Imágenes de página en `gpt-4.1-mini` | **Imagen / Visión** | **1,200 – 1,500 tokens-imagen / página** | **$0.0015 / página** | **≈ 90 %** |
| **2. Fragmentación** (`chunker`) | Cálculo local | — (sin API) | — | $0.00 | 0 % |
| **2. Vectorización** (`embedder`) | Chunks de texto en `text-embedding-3-small` | **Input (texto)** | ~300–430 tokens / chunk | $0.02 / 1M tokens | < 3 % |
| **3. Recuperación** (`retriever`) | Pregunta vectorizada | **Input (texto)** | 20 – 50 tokens / consulta | $0.02 / 1M | ~0 % |
| **4. Generación** (`generator`) | Prompt sistema + chunks recuperados + respuesta | **Input + Output** | ~3,000 in · ~750 out | $0.15/1M · $0.60/1M | runtime (no es ingesta) |
| **5. Fallback** (`llm.py`) | Reintento con Gemini | Input + Output | mismos tokens | free tier | ~$0 |

**Lectura clave de la tabla:** el único consumidor relevante es la **visión** (tokens de imagen); la única fuente de tokens de **salida** es el Tutor RAG; el **input de texto** (embeddings y pregunta) es marginal (< 3 %). Optimizar el router (más páginas a `native`) ataca directamente el ~90 % del gasto de ingesta.

### 2.6 Conclusión y costos end-to-end

- **Ingesta (una sola vez por documento):** escenario B sobre el corpus actual ≈ **$12.16 USD** ($11.71 de visión + ~$0.45 de embeddings). Por documento promedio (~3 páginas) ≈ **$0.0045**; un compendio escaneado de 200 páginas ≈ **$0.30**.
- **Runtime (recurrente, por estudiante):** una sesión típica de tutoría (2 preguntas) ≈ 2 × $0.0009 ≈ **$0.0018**; 1,000 preguntas ≈ **$0.90**; 10,000 preguntas ≈ **$9**.
- **Regla de oro:** pagar caro **una vez** la ingesta (visión, solo para lo manuscrito/diagramas) y pagar **barato siempre** la generación. La optimización del router no sacrifica fidelidad porque el guardarraíl de corrupción `(cid:)` y el área de imagen siguen enviando a visión las páginas con fórmulas y diagramas reales.
- **Próximo paso operativo:** escanear Drive FIM (140 cursos) antes de encender la ingesta paga para recomponer el presupuesto real de la facultad.

---

### Anexo — Estado de seguridad detectado (RLS deshabilitado)

El advisor de Supabase reportó **9 tablas sin Row Level Security** (`facultades`, `recursos`, `resource_chunks`, `progreso_cursos`, `logros`, `logros_usuarios`, `curso_prerrequisitos`, `profesores`, `curso_profesores`), expuestas a cualquier poseedor de la anon key. **No se aplicó ningún cambio** (informe read-only). Recomendación: habilitar `ENABLE ROW LEVEL SECURITY` + políticas por tabla antes de exponer el tutor RAG a usuarios finales.