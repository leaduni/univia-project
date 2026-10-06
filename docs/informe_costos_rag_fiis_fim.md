# Informe de Costos RAG — FIIS & FIM

> **Tipo:** Informe técnico — auditoría de datos y estimaciones de costos del pipeline
> **Fecha de corte de datos:** 2026-08-30
> **Fuente de datos:** Supabase `public` (proyecto `pggpscrbpcasbgjhjigw`) — consultas `SELECT` vía MCP de Supabase
> **Fuente de código:** `backend/app/rag/*` y `backend/app/core/llm.py`
> **Alcance:** Facultades FIIS (id=1) y FIM (id=3) + total general del corpus de `recursos`
> **Nota de integridad:** documento de análisis generado 100 % en modo lectura (0 escrituras en BD, 0 cambios de código).

> **Nota metodológica — actualización 2026-09-27:** los importes A/B de este
> informe son **estimaciones históricas**, no facturación medida ni una
> proyección de la configuración actual. Se calcularon suponiendo OCR Vision
> con `gpt-4.1-mini`; el código actual usa Gemini Vision por defecto y conserva
> OpenAI Vision como fallback. El router ya extrae localmente texto digital con
> `pypdf`, pero todavía no implementa OCR local para páginas escaneadas. El
> procesamiento local híbrido de OCR es un escenario objetivo pendiente de
> benchmark de calidad, rendimiento e infraestructura, por lo que no se le
> asigna aquí un costo ficticio de USD 0.
>
> Las proyecciones originales de embeddings también asumían deduplicación/caché.
> La auditoría Supabase no encontró la tabla `embedding_cache` que intenta usar
> el backend, así que no se considera demostrado ese ahorro. Los costos que
> mencionan caché deben recalcularse sin ese supuesto antes de usarse como
> presupuesto operativo.

---

## 1. Estimaciones históricas de costos (FIIS & FIM)

### 1.1 Resumen ejecutivo

La auditoría de datos de 2026-08-30 registra **6,744 recursos documentales**
(6,710 con `drive_file_id` de Google Drive), distribuidos en **217 cursos FIIS**,
**140 cursos FIM** y un total de **449 cursos** en el catálogo. Bajo los precios
y supuestos históricos de OCR OpenAI, procesar el corpus completo se estimó en
≈ **USD $29.50** y restringir visión a Exámenes/Prácticas/Compendios en
≈ **USD $12.16**. El ahorro ≈59 % era una proyección del escenario B, no una
medición posterior ni una afirmación de calidad validada; además, el cálculo de
embeddings asumía deduplicación/caché no confirmada en la base actual.

| Métrica auditada | Valor |
|---|---|
| Total de filas en `public.recursos` | **6,744** |
| Con `drive_file_id` (descargables) | **6,710** |
| Páginas estimadas del corpus completo | **46,152** (rango 18,018 – 133,476) |
| Recursos ya vectorizados (`resource_chunks`) | **85** → 1,137 chunks (~$0.004 de embeddings consumidos) |
| Estado `pending` / `complete` / `skipped_permissions` | 6,698 / 38 / 8 |
| Costo estimado histórico (escenario A, supuestos originales) | ≈ **$29.50** |
| Costo estimado histórico (escenario B, supuestos originales) | ≈ **$12.16** |
| Ahorro proyectado del escenario B, no medido | **≈ 59 % (−$17.33)** |

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

**Metodología histórica del cálculo.** El cálculo asumió OCR Vision con
`gpt-4.1-mini` a **$0.0015 por página** ($0.40/1M input + $1.60/1M output).
Esta no es una tarifa de facturación actual confirmada: cada página se modeló
como imagen enviada a visión, mientras que el texto digital nativo se estimó a
**$0.00** por extracción local con `pypdf`.

| Grupo | PDFs | Páginas | Visión A (págs) | Costo A | Visión B (págs) | Costo B |
|---|---|---|---|---|---|---|
| FIIS exclusivo | 2,639 | 17,962 | 7,769 | **$11.65** | 3,184 | **$4.78** |
| FIIS total (exclusivo + compartidos) | 5,863 | 36,872 | 16,364 | **$24.55** | 7,254 | **$10.88** |
| FIM (solo compartidos; 0 exclusivos) | 3,224 | 18,910 | 8,595 | **$12.89** ⚠️ | 4,070 | **$6.11** ⚠️ |
| Sin curso (huérfanos) | 881 | 9,280 | 2,997 | **$4.50** | 554 | **$0.83** |
| **Total corpus (sin doble conteo)** | **6,744** | **46,152** | **19,361** | **≈ $29.04** | **7,808** | **≈ $11.71** |

> ⚠️ **La fila FIM no es un costo adicional**: agrupa los mismos 3,224 PDFs de cursos básicos compartidos ya contados en FIIS total. El mismo documento no se factura dos veces.

### 1.5 Escenarios históricos y matriz de optimización (ahorro proyectado ≈ 59 %)

**Escenario A (base histórica)** — umbrales analizados del router
(`min_chars=100`, `max_corruption_ratio=0.03`,
`max_image_area_ratio=0.20`): pasan a visión ~90 % de Exámenes/Prácticas, 70 %
de Compendios, 40 % de PDF genéricos, 50 % de Apuntes, 10 % de Sílabos/Libros.

**Escenario B (más texto nativo)** — se fuerza la ruta `native` para Sílabos,
PDF digitales, Apuntes y Libros; la visión queda reservada a Exámenes,
Prácticas y Compendios. **B aún conserva OCR Vision de pago** para las páginas
que requieren reconocimiento; no representa el objetivo futuro de OCR local.

| Componente de ingesta | A (AS-IS) | B (optimizado) |
|---|---|---|
| OCR Visión (`gpt-4.1-mini`, $0.0015/pág) | $29.04 | $11.71 |
| Texto Nativo (`pypdf`) | $0.00 | $0.00 |
| Embeddings (`text-embedding-3-small`; cálculo original con dedupe asumida, no verificada) | ~$0.30 – $0.60 | ~$0.30 – $0.60 |
| **TOTAL INGESTA** | **≈ $29.50** | **≈ $12.16** |

**Ahorro proyectado ≈ 59 % (−$17.33), sujeto a validación y recálculo.**
Ajustes sugeridos en `hybrid_router.py`:

El escenario de OCR local debe estimarse aparte, una vez fijados motor/modelo,
hardware, concurrencia, páginas por tipo, tasa de corrección manual y calidad
mínima aceptable. Su costo total debe incluir cómputo/operación local, además de
embeddings y cualquier fallback Vision que permanezca; no basta con asignar
costo cero al OCR.

- `min_chars`: 100 → **50–60** (más notas y diapositivas digitales a nativa).
- `max_image_area_ratio`: 0.20 → **0.32–0.35** (páginas con logos/marcas de agua dejan de ir a visión).
- `max_corruption_ratio`: se **mantiene en 0.03** como guardarraíl anti-falsos positivos (fórmulas LaTeX mal mapeadas `(cid:)` → visión obligada).
- **Gate por tipo de recurso:** forzar nativa en `Silabo` / `Libro` / `PDF` / `Apunte`, reservando visión a `Examen` / `Practica` / `Compendio` que fallen la heurística.

### 1.6 Supuestos de tarifa históricos — etapa × modelo × proveedor

| Etapa RAG | Supuesto de modelo usado en el cálculo | Tarifa usada en el cálculo | Costo / unidad estimado |
|---|---|---|---|
| OCR / Ingesta Vision | `gpt-4.1-mini` (supuesto histórico) | $0.40/1M input · $1.60/1M output | **~$0.0015 / página** |
| Texto nativo | `pypdf` (local, sin API) | Sin tarifa API | **$0.00 / página de texto digital** |
| Vectorización | `text-embedding-3-small` (supuesto histórico) | $0.02 / 1M tokens | ~$0.000008 / chunk |
| Generación Tutor / Evaluaciones | `gpt-4o-mini` (supuesto histórico) | $0.15/1M input · $0.60/1M output | ~$0.0009 / interacción |
| Generación alternativa | Gemini (modelo/precio del cálculo histórico) | No usar sin verificar plan y tarifa vigentes | No consolidado |

Estos renglones explican los importes históricos de este informe; no son un
registro de facturación ni una lista de defaults actuales. El código usa
Gemini Vision por defecto para OCR con OpenAI Vision como fallback; los
embeddings usan OpenAI por defecto con Gemini seleccionable. La generación
general usa Gemini (`gemini-2.5-flash` por defecto) y fallbacks configurados;
el chatbot usa Groq (`llama-3.3-70b-versatile` por defecto). Verificar
configuración y tarifas del período antes de proyectar gasto.

### 1.7 Hallazgo crítico de FIM

- La ingesta específica de FIM **aún no existe en la base**: los 120 cursos exclusivos FIM (códigos `MC*`, `MN*`, `NAV*`, `MTR*`) tienen **0 recursos** en `public.recursos`.
- Los 3,224 PDFs que aparecen vinculados a FIM son de **cursos básicos compartidos** con FIIS (física, cálculo, álgebra, etc.).
- **Acción requerida antes de presupuestar FIM:** escanear la carpeta de Drive de FIM para los 140 cursos de sus mallas vigentes (prerrequisito para dimensionar el costo real del material propio).

---

## 2. Anatomía del Pipeline RAG y Gastos de Tokens

Flujo completo: `PDF → Enrutamiento híbrido → Extracción → Markdown → Chunker (1,200/200) → Embeddings 1,536d → pgvector → Retriever → generación configurada`.

### 2.1 Etapa 1: Enrutamiento y OCR (Ingesta Visión vs. Nativo)

**Qué hace el código.** `hybrid_router.py` evalúa cada página del PDF con
heurísticas de texto nativo/corrupción/imágenes. Si pasa, usa ruta **NATIVE**
(`pypdf`); si no, usa **VISION** mediante `extractor.py`, que renderiza la
página con `pdf2image`/Poppler. El código actual usa Gemini Vision por defecto
y OpenAI Vision (`gpt-4.1-mini`) como fallback. Los umbrales numéricos y
precios utilizados en las proyecciones A/B son supuestos históricos, no una
garantía de configuración actual.

**Consumo de Tokens.** En el escenario histórico, la visión se modeló como facturación por imagen y
resolución: una página escaneada con las características asumidas consumía
**~1,200 a 1,500 tokens-imagen** y el cálculo le asignó ~$0.0015. El costo real
depende del proveedor, modelo, resolución y tarifas vigentes. Cada recuperación
con *salvage* puede duplicar la llamada.

> ⚠️ **En el escenario histórico**, la visión representaba ~90 % del gasto de
> ingesta y un compendio escaneado de 200 páginas se estimaba en ~$0.30 bajo la
> tarifa supuesta. No extrapolar este costo a Gemini ni al futuro OCR local sin
> medir uso y tarifas.

### 2.2 Etapa 2: Fragmentación y Vectorización (Embeddings)

**Qué hace el código.** `chunker.py` corta el Markdown extraído en dos pasadas: primero `MarkdownHeaderTextSplitter` (jerarquía `# / ## / ###` para respetar temas y ejercicios) y luego `RecursiveCharacterTextSplitter` con **chunk_size = 1,200 caracteres y overlap = 200**. El prefijo de encabezado se incrusta en cada fragmento para conservar contexto (`[Tema: ...] | Subtema: ...`). Después, `embedder.py` envía los chunks en lotes de 20 al proveedor configurado (OpenAI `text-embedding-3-small` por defecto; Gemini `gemini-embedding-001` seleccionable) y recibe vectores de **1,536 dimensiones**, compatibles con `resource_chunks.embedding vector(1536)`. El código intenta una caché SHA-256 en Supabase, pero la tabla `embedding_cache` no existe en el snapshot auditado; por ello no se asume que evite llamadas duplicadas.

**Consumo de Tokens.** Cada chunk (1,200 caracteres) se tokeniza como **texto** (≈ 300–430 tokens de input en español académico según el ratio ~2.8–4 chars/token) y se convierte en un vector. A la tarifa de **$0.02 / 1M tokens**, cada chunk cuesta ~$0.000008. Proyección sobre el corpus real:

| Escenario | Caracteres extraídos | Tokens de embedding | Costo bruto | Ahorro por caché/dedupe verificado |
|---|---|---|---|---|
| Solo lo vectorizado al corte (85 recursos) | ~825,289 | ~206 K | ~$0.004 | No verificado |
| Corpus completo (46,152 págs × ~2,500 chars) | ~115 M | ~29 M | **~$0.77** | No aplicable: caché persistida no confirmada |

El gasto estimado de embeddings representa **< 3 % del presupuesto original**:
aunque se retokenice y re-vectorice todo el corpus, es marginal frente a la
visión bajo esos supuestos. El ahorro por caché/dedupe no se ha confirmado en la
base auditada.

### 2.3 Etapa 3: Recuperación (Retriever)

**Qué hace el código.** Cuando un alumno hace una pregunta, `retriever.py` la
convierte en un embedding con el proveedor y modelo compatibles con los usados
para el corpus (OpenAI `text-embedding-3-small` por defecto; Gemini es
configurable) e invoca la RPC de búsqueda correspondiente sobre
`resource_chunks`. La consulta recupera chunks ya ingeridos; no ejecuta descarga
ni OCR. El resultado se entrega a la etapa de generación como contexto.

**Consumo de Tokens.** La pregunta del estudiante pesa **~20 a 50 tokens** de texto. A $0.02/1M de `text-embedding-3-small`, el embedding de la consulta cuesta **~$0.000001**: despreciable. La búsqueda vectorial en sí ocurre **dentro de Supabase** (cómputo local de pgvector, sin llamadas a LLM).

| Concepto | Tokens | Costo |
|---|---|---|
| Embedding de la pregunta | 20 – 50 | ~$0.000001 |
| Búsqueda coseno en Supabase (HNSW) | — (local) | **$0.00** |

### 2.4 Etapa 4: Generación y Respuesta (Tutor RAG)

**Base de cálculo histórica, no default actual.** Los importes de esta sección
usan el supuesto de precios indicado en la tabla de tarifas. En la configuración
actual, `LLM_PROVIDER` usa Gemini (`gemini-2.5-flash` por defecto) y los
fallbacks dependen de `LLM_FALLBACKS`; el chatbot usa Groq
(`llama-3.3-70b-versatile` por defecto). No atribuir a esas llamadas el costo
unitario calculado para `gpt-4o-mini` sin confirmar proveedor, modelo, tarifas y
uso efectivo.

**Consumo de Tokens por interacción** (`gpt-4o-mini`):

| Interacción | Tokens Input | Tokens Output | Costo |
|---|---|---|---|
| Baja (3 chunks, respuesta corta) | ~2,000 | ~500 | **$0.0006** |
| Media (4 chunks, respuesta estándar) | ~3,000 | ~750 | **$0.0009** |
| Alta (5 chunks, respuesta extendida) | ~4,000 | ~1,000 | **$0.0012** |

*Derivación: input = sistema (~300) + pregunta (~50) + chunks (~400 tokens por chunk) + etiquetas de formato; output según los tokens consumidos. Fórmula: `(input × $0.15 + output × $0.60) / 1,000,000`. En el caso de evaluaciones (router `evaluaciones.py`) el patrón es el mismo con `gpt-4o-mini`.*

### 2.5 Tabla de costos unitarios asumidos (escenario histórico)

Las tarifas de las fases Vision, embeddings y generación siguientes son las
utilizadas en el cálculo histórico. No equivalen a la configuración ni al gasto
observado en producción.

| Fase del pipeline | Qué consume tokens | Tipo de token | Volumen típico | Costo | Participación del gasto de ingesta |
|---|---|---|---|---|---|
| **1. Enrutamiento** (`hybrid_router`) | `pypdf` extrae texto nativo | — (sin API) | — | **$0.00** | 0 % |
| **1. OCR Visión** (`extractor`) | Imágenes de página; `gpt-4.1-mini` (supuesto histórico) | **Imagen / Visión** | **1,200 – 1,500 tokens-imagen / página** | **$0.0015 / página estimada** | **≈ 90 % del escenario** |
| **2. Fragmentación** (`chunker`) | Cálculo local | — (sin API) | — | $0.00 | 0 % |
| **2. Vectorización** (`embedder`) | Chunks de texto en `text-embedding-3-small` | **Input (texto)** | ~300–430 tokens / chunk | $0.02 / 1M tokens | < 3 % |
| **3. Recuperación** (`retriever`) | Pregunta vectorizada | **Input (texto)** | 20 – 50 tokens / consulta | $0.02 / 1M | ~0 % |
| **4. Generación** (`generator`) | Prompt sistema + chunks recuperados + respuesta | **Input + Output** | ~3,000 in · ~750 out | tarifa de `gpt-4o-mini` asumida | runtime (no es ingesta) |
| **5. Fallback** (`llm.py`) | Fallback del escenario histórico | Input + Output | mismos tokens | depende del proveedor/configuración | runtime |

**Lectura del escenario:** la visión concentraba el costo modelado; el cálculo
no incluye costos de operación de OCR local. Aumentar páginas `native` reduce
el uso de visión bajo esos supuestos, pero el porcentaje y la calidad deben
validarse con una corrida representativa.

### 2.6 Conclusión y escenarios para presupuestar

- **Escenario anterior (Vision de pago):** los **$29.50** del A y **$12.16**
  del B son estimaciones históricas basadas en `gpt-4.1-mini`, los volúmenes
  estimados y un supuesto de deduplicación en embeddings. B optimiza qué páginas
  van a Vision, pero conserva Vision paga para parte del corpus. No son
  facturas ni cotizaciones vigentes.
- **Implementación actual:** usa `pypdf` local para texto digital y Gemini
  Vision por defecto para páginas que requieren OCR, con OpenAI Vision como
  fallback. Los costos efectivos requieren consultar proveedor, claves,
  tarifas, cuota y consumo reales.
- **Objetivo de OCR local híbrido:** no hay costo calculado todavía. Para
  comparar correctamente, medir por separado OCR local, revisión/corrección,
  cómputo y fallback Vision, y comparar exactitud de extracción, latencia y
  volumen de reprocesamiento con una muestra representativa FIIS/FIM.
- **Runtime:** los costos unitarios por interacción en las secciones anteriores
  corresponden al supuesto histórico `gpt-4o-mini`; no extrapolarlos al chatbot
  actual (Groq `llama-3.3-70b-versatile` por defecto) ni a generación general
  (Gemini `gemini-2.5-flash` por defecto).
- **Siguiente dato para el presupuesto:** escanear Drive FIM (140 cursos) y
  volver a calcular con cantidades descargables, conteo real de páginas,
  proveedor/modelo escogido y costo bruto de embeddings sin asumir la caché
  ausente.

---

### Anexo — Hallazgo histórico de seguridad (RLS)

El advisor consultado en el corte de este informe (**2026-08-30**) reportó
**9 tablas sin Row Level Security** (`facultades`, `recursos`,
`resource_chunks`, `progreso_cursos`, `logros`, `logros_usuarios`,
`curso_prerrequisitos`, `profesores`, `curso_profesores`). Ese dato es
histórico y no confirma el estado actual: la auditoría de esquema del
2026-09-27 no volvió a validar políticas ni advisors. **No se aplicó ningún
cambio** (informe read-only); volver a consultar los advisors antes de tratar
este hallazgo como vigente.