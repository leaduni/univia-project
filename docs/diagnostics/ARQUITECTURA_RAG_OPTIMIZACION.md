# Análisis de Trade-Offs y Riesgos — Optimización de Pipeline RAG

**Rol:** Senior RAG & AI Systems Architect
**Alcance:** Pipeline de ingesta, chunking y vectorización de documentos académicos (sílabos, exámenes, compendios PDF)
**Nota de alcance:** El brief menciona "8 alternativas" pero enumera 7 (1.1, 1.2, 1.3, 2.1, 2.2, 3.1, 3.2). Este análisis cubre las 7 propuestas listadas explícitamente; si existe una octava propuesta no incluida en el documento, indícamela y la incorporo.

---

## A. Evaluación de Riesgos Latentes y Degradación de Capacidades

### A.1 — Extracción Híbrida (1.1): riesgo de pérdida de fidelidad en fórmulas y tablas

**El riesgo es real y no trivial, específicamente por tres motivos técnicos:**

1. **Fuentes embebidas en PDFs generados por LaTeX.** Los exámenes y compendios universitarios en Perú suelen originarse en LaTeX o Word con editor de ecuaciones. Estos PDFs frecuentemente embeben fuentes Type 3 o mapeos de glifos no estándar para símbolos matemáticos (∫, ∑, √, subíndices, griegas). `pypdf`/`pdfplumber` extraen el *stream* de caracteres según el CMap del PDF — si el mapeo es defectuoso (común en documentos exportados desde ciertas versiones de Word o escaneados con OCR previo de baja calidad), el resultado es texto "legible" en cantidad (pasa el umbral de 100 caracteres) pero semánticamente corrupto en el contenido matemático específico (glifos `cid:xx` no resueltos, símbolos sustituidos por caracteres Unicode incorrectos). **Esto es el escenario más peligroso**: la heurística de conteo de caracteres da un falso positivo de "texto extraíble limpio" en una página que en realidad tiene fórmulas ilegibles.

2. **Tablas pierden estructura espacial en extracción nativa.** `pypdf` devuelve un flujo lineal de texto sin preservar la grilla fila/columna. `pdfplumber` tiene detección de tablas pero su tasa de acierto cae notablemente en tablas con celdas combinadas, bordes ausentes o alineación irregular — patrones comunes en rúbricas de evaluación y cronogramas de sílabos. Gemini Vision, al procesar la imagen, infiere la estructura tabular visualmente y la puede serializar razonablemente bien en Markdown; la extracción nativa no tiene ese mecanismo de inferencia.

3. **Páginas mixtas.** Una página puede tener un párrafo introductorio nativo (que satisface el umbral de 100 caracteres) y, en la misma página, un diagrama, gráfico o fórmula compleja renderizada como imagen rasterizada (XObject). Un umbral binario por conteo de caracteres del *texto de la página completa* ignora esto: la página "pasa" el filtro y se pierde el contenido visual que solo Vision puede capturar.

**Recomendación de diseño de umbral — no uses un umbral binario de un solo criterio:**

Usa una función de *scoring* compuesta antes de decidir la ruta:

- **Criterio 1 (necesario, no suficiente):** `len(texto_extraído) > 100` caracteres.
- **Criterio 2 (detección de corrupción):** calcula la proporción de caracteres "sospechosos" (glifos no mapeados, secuencias `(cid:` sin resolver, alta densidad de caracteres de control). Si supera un umbral (p. ej. 2-3%), fuerza Vision independientemente del criterio 1.
- **Criterio 3 (detección de contenido visual):** inspecciona los `XObject` de tipo imagen en la página vía `pypdf`/`pikepdf`. Si el área cubierta por imágenes supera un umbral (p. ej. 15-20% del área de página), fuerza Vision — hay alta probabilidad de diagrama/fórmula compleja renderizada como imagen.
- **Criterio 4 (heurística de densidad matemática):** un *regex* simple que cuente símbolos matemáticos Unicode aislados o patrones de subíndice/superíndice puede elevar la sospecha de contenido LaTeX mal mapeado, incluso con alto conteo de caracteres.

**Antes de producción:** valida esta heurística contra una muestra etiquetada manualmente de 30-50 páginas representativas (mezcla de sílabos, exámenes con fórmulas, tablas de cronograma), usando la salida de Gemini Vision como *ground truth* de referencia en esa muestra. Mide tasa de falsos positivos (páginas enrutadas a texto nativo que deberían haber ido a Vision) antes de habilitar la ruta híbrida en el flujo real. Esto convierte una heurística de intuición en una decisión medida.

**Mitigación adicional de bajo costo:** en el modo híbrido, aun para páginas que pasan a extracción nativa, sigue generando el PNG/JPEG de la página (ya es parte del flujo) y guárdalo como respaldo referenciado en `metadata`. Si en producción detectas quejas de calidad en un documento específico, puedes reprocesar solo esas páginas por Vision sin re-extraer el PDF completo.

---

### A.2 — Riesgo semántico al mover metadatos a JSONB (3.1)

**Sí, existe un riesgo concreto y bien documentado en la literatura de RAG: esto es exactamente el problema que aborda la técnica de "contextual retrieval".**

El embedding denso (`gemini-embedding-2`) solo "ve" los tokens que efectivamente le envías a `embed_content`. No tiene acceso implícito a columnas relacionales de la fila en la que ese vector terminará almacenado. Si retiras por completo el header (`[Tema: Cálculo | Subtema: Límites]`) del texto que se vectoriza y lo mandas *solo* a `metadata` (JSONB), estás eliminando una señal semántica que hoy contribuye directamente a la similitud coseno — especialmente crítico en chunks cortos o ambiguos por sí mismos:

> Ejemplo de chunk ambiguo sin contexto: *"3. Resuelva la integral aplicando el teorema fundamental..."*
> Sin saber si esto pertenece a "Cálculo III" o "Métodos Numéricos", una consulta semántica sobre un tema específico puede no distinguir correctamente entre chunks de distintos cursos con lenguaje matemático genérico similar.

**Esto no significa que la Propuesta 3.1 esté mal planteada — significa que "todo o nada" (headers fuera del body, 100% a JSONB) es la versión de mayor riesgo de la idea.** La versión correcta, y el patrón estándar en arquitecturas RAG maduras, es **doble pista, no sustitución**:

1. **Mantén metadatos estructurados completos en `metadata` (JSONB)** — tema, subtema, tipo de recurso, número de página, documento origen. Esto habilita filtrado exacto (GIN + `WHERE metadata->>'tema' = 'Cálculo'`) y búsqueda híbrida, tal como propone 3.1. Esto es una mejora neta sin contrapartida negativa.
2. **Separa la columna `contenido` (texto limpio para mostrar al usuario) de un texto "enriquecido" usado solo para generar el embedding** (puede llamarse `texto_embebido`, no persistido necesariamente, generado en tiempo de indexación combinando una versión compacta del contexto + el cuerpo). No necesitas el header verboso completo — una línea de contexto corta (`"Curso: Cálculo III — Tema: Límites."`) antes del cuerpo suele ser suficiente para anclar semánticamente el chunk sin inflar el vector con ruido estructural repetitivo.

Con este diseño, **el filtrado híbrido (JSONB + pgvector) reduce pero no elimina la necesidad del contexto embebido**: el filtrado ayuda cuando el usuario o el sistema define explícitamente un filtro por curso/tema antes de la búsqueda vectorial; pero para consultas en lenguaje natural sin filtro explícito ("¿cómo se resuelve un límite indeterminado?"), el sistema depende enteramente de la calidad semántica del embedding — ahí es donde perder el contexto en el body sí duele.

**Antes de hacer el corte total de headers, corre una evaluación A/B**: fija un set de 15-20 consultas de prueba con chunks relevantes conocidos, mide Recall@5 y MRR con la versión actual (headers en body) vs. la versión propuesta (headers solo en JSONB) vs. la versión híbrida (contexto corto en body + JSONB completo). No es una decisión que debas tomar por intuición arquitectónica — es medible con bajo esfuerzo antes de migrar datos existentes.

---

### A.3 — Pérdida de checkpoints y tolerancia a fallos con paralelismo y streaming

**El riesgo es real y se manifiesta distinto en cada propuesta:**

**Con 1.2 (extracción asíncrona paralela):**
El diseño actual funciona porque es *inherentemente ordenado*: procesa página 1, 2, 3... y escribe incrementalmente a `_extraido.md` en ese mismo orden. Al paralelizar con `asyncio.Semaphore(8)`, **el orden de finalización deja de ser determinista** — la página 20 puede completarse antes que la página 15 (por reintentos de *salvage*, imágenes más pesadas, variabilidad de latencia de la API). Si mantienes el patrón de "append incremental a un único archivo Markdown", vas a corromper el orden del documento o vas a necesitar lógica de reordenamiento antes de cada escritura, lo cual anula buena parte de la ganancia de simplicidad del enfoque actual.

*Rediseño recomendado:* en vez de un único archivo incremental, escribe **un archivo por página** (`pagina_003.md`, `pagina_015.md`, etc.) a medida que cada tarea async completa, independientemente del orden. Al reanudar tras una interrupción (p. ej. cuota agotada a media ejecución), el script escanea el directorio, identifica qué páginas ya tienen archivo y solo re-encola las faltantes. Este patrón es **estrictamente más resiliente** que el actual bajo concurrencia, no solo "igual de bueno" — es una mejora de tolerancia a fallos, no una concesión.

**Con 3.2 (pipeline en streaming/generador):**
Aquí el riesgo es más serio porque acopla etapas que hoy son independientes. Si extracción, chunking, embedding e ingesta corren como un flujo continuo por página, perder la cuota de la API (o que el proceso muera) a media ejecución puede dejar el documento en un **estado parcialmente ingresado**: algunos chunks de las primeras páginas ya están en `resource_chunks`, las páginas posteriores no. Sin un mecanismo de control, esto es peligroso de una forma específica y silenciosa: **el sistema de búsqueda puede devolver resultados de un documento incompleto sin que nadie lo note**, porque no hay error visible — el RPC de búsqueda simplemente encuentra menos chunks de los que debería haber, y el usuario recibe una respuesta parcial sin saber que falta contexto.

*Mitigación necesaria, no opcional:*
- Persiste un estado por página (`pendiente` / `extraída` / `chunkeada` / `embebida` / `ingresada`) en una tabla de progreso (SQLite local o una tabla en el propio Supabase), no solo en archivos sueltos.
- Agrega un flag `documento_completo: boolean` a nivel de documento en la tabla de recursos. La función RPC `search_resource_chunks` debería, como mínimo opcionalmente, poder excluir chunks de documentos marcados como incompletos — o al menos el pipeline debe loggear/alertar cuando un documento queda en estado incompleto por más de X tiempo, para intervención manual.
- Diseña cada etapa para ser **idempotente**: reintentar chunking/embedding sobre una página ya procesada no debe duplicar filas en `resource_chunks` (usa upsert por hash de página+chunk, aprovechando el mismo hash SHA-256 que ya propones en 2.2 para deduplicación de embeddings — es la misma pieza de infraestructura sirviendo dos propósitos).

**Conclusión de esta sección:** ninguno de los dos rediseños (1.2, 3.2) es incompatible con tolerancia a fallos robusta, pero **ambos requieren reemplazar el mecanismo de checkpoint actual (archivo incremental secuencial) por un modelo de estado explícito por unidad de trabajo (página/chunk)**. Subestimar este rediseño es la forma más probable de que la paralelización introduzca regresiones silenciosas en producción.

---

## B. Matriz de Trade-Offs

Estimaciones basadas en la distribución de tiempo actual (Extracción 82% / Vectorización 14% / Ingesta 4%) y en el análisis de riesgo de la sección A. Los porcentajes de reducción de latencia son estimaciones de rango razonable, no cifras medidas — deben validarse con *profiling* real antes y después de cada cambio.

| # | Propuesta | Reducción Latencia | Ahorro Tokens/Costo | Riesgo de Regresión (Precision/Recall RAG) | Esfuerzo Implementación |
|---|---|---|---|---|---|
| 1.1 | Extracción híbrida (texto nativo vs. Vision) | **Alto** (30-70% del tiempo de extracción, según % de páginas nativas vs. escaneadas en el corpus real) | **Alto** (páginas nativas cuestan $0 en vez de una llamada a Vision) | **Medio-Alto** — riesgo de fórmulas/tablas corruptas si el umbral es solo conteo de caracteres (ver A.1) | **Medio** — requiere heurística compuesta + validación con muestra etiquetada antes de producción |
| 1.2 | Extracción paralela asíncrona (`asyncio` + rate limiter) | **Alto** (convierte latencia de suma secuencial a ~tiempo de la página más lenta, acotado por RPM real del proyecto) | **Neutral** (mismo número de llamadas; no reduce tokens) | **Medio** — no afecta calidad de contenido directamente, pero rompe el modelo de checkpoint actual si no se rediseña (ver A.3) | **Medio-Alto** — rediseño de checkpoint por página + manejo de 429 con backoff |
| 1.3 | Payloads de imagen optimizados (WebP/JPEG, DPI reducido) | **Bajo-Medio** — el tiempo dominante es la inferencia del modelo, no la subida del payload; el efecto en latencia es marginal | **Medio** — Gemini factura tokens de imagen según resolución/tiles; menor DPI reduce ese costo de forma medible | **Medio** — DPI bajo puede degradar OCR en subíndices, exponentes y fuentes pequeñas de fórmulas/tablas densas; requiere validación empírica del piso de DPI aceptable | **Bajo** |
| 2.1 | Lotes dinámicos + backoff exponencial (elimina sleep fijo) | **Alto** dentro de la etapa de vectorización (14% del total) — el `sleep(2)` fijo es puro tiempo muerto no condicionado a la respuesta real de la API | **Neutral/Bajo** (mismos tokens procesados, menos *overhead* de llamadas HTTP) | **Bajo** — cambio puramente operacional, sin tocar contenido ni estructura de datos | **Bajo** |
| 2.2 | Caché de embeddings por hash SHA-256 (deduplicación) | **Medio** — depende del grado de duplicación real en el corpus (encabezados repetidos, texto boilerplate entre exámenes/sílabos de una misma plantilla) | **Medio-Alto** si hay alta duplicación estructural entre documentos de la misma serie | **Bajo**, con una condición: el hash debe calcularse sobre el texto *final* que se envía a embedding (incluyendo cualquier prefijo de contexto), e invalidarse si cambian `chunk_size`, `overlap` o la versión del modelo de embedding | **Bajo-Medio** — diseño de clave de caché + estrategia de invalidación |
| 3.1 | Metadatos en JSONB + RPC híbrida (GIN + pgvector) | **Bajo** directo sobre el pipeline de ingesta; **indirecto positivo** en latencia de consulta al permitir prefiltrado por metadata antes de la búsqueda vectorial | **Bajo** (ligero ahorro de tokens de embedding si el body se acorta) | **Medio-Alto** si se implementa como sustitución total (headers fuera del body); **Bajo** si se implementa como diseño dual (contexto corto en body + JSONB completo, ver A.2) | **Medio-Alto** — migración de esquema, backfill de filas existentes, reescritura de RPC, reindexado GIN |
| 3.2 | Pipeline desacoplado / streaming por documento | **Alto en teoría, acotado en la práctica** — el techo de ganancia por solapamiento es ≤ (14%+4%) = ~18% del tiempo total mientras la extracción siga siendo 82% del tiempo; su valor crece proporcionalmente *después* de aplicar 1.1/1.2 | **Neutral** | **Alto** — exposición de documentos parcialmente ingresados si no se implementa máquina de estados explícita (ver A.3); mayor superficie de bugs de concurrencia | **Alto** |

**Lectura clave de la matriz:** las dos propuestas de mayor esfuerzo (1.1 y 3.2) no son necesariamente las de mayor riesgo por sí mismas — el riesgo depende enteramente de si se implementa la mitigación descrita en la sección A. Sin esas mitigaciones, ambas son de riesgo alto; con ellas, el riesgo baja a medio/bajo a cambio de esfuerzo adicional real, no cosmético.

---

## C. Hoja de Ruta de Implementación Recomendada

### Fase 1 — Quick Wins (impacto inmediato, riesgo mínimo)

Cambios que no tocan la arquitectura del pipeline ni la estructura de datos, y que no requieren validación de calidad extensa antes de desplegarse.

- **2.1 — Lotes dinámicos + backoff exponencial.** Elimina el `time.sleep(2)` estático, sube `batch_size` a 20-50, implementa backoff solo ante 429. Cero riesgo de contenido, ganancia directa en la etapa de vectorización.
- **2.2 (infraestructura) — Tabla de caché de embeddings por hash.** Puedes desplegar la infraestructura (tabla + lookup) de inmediato aunque el *hit rate* inicial sea bajo; no hay downside, y empieza a acumular valor desde el primer documento reprocesado.
- **1.3 — Optimización de payloads de imagen, con gate de validación previo.** No es un "cámbialo y listo": antes de bajar DPI en producción, corre una prueba A/B en 15-20 páginas con contenido matemático denso comparando fidelidad de extracción a 200 DPI/PNG vs. 150 DPI/JPEG 85%. Si la fidelidad se mantiene (mismo criterio de validación que en A.1), despliega. Este gate es barato y evita degradar silenciosamente la calidad de OCR en fórmulas.

**Por qué estas y no otras en Fase 1:** ninguna requiere rediseñar el modelo de checkpoint (a diferencia de 1.2/3.2) ni migrar el esquema de base de datos (a diferencia de 3.1), y ninguna tiene el riesgo semántico de 1.1 o 3.1.

---

### Fase 2 — Optimizaciones de Alto Impacto (extracción y paralelismo)

Aquí se ataca el cuello de botella real (82% del tiempo), aceptando mayor esfuerzo de ingeniería a cambio del mayor retorno.

- **1.2 — Extracción paralela asíncrona.** Implementa `asyncio.Semaphore` con el límite leído desde configuración (no hardcodeado — valida la cuota real del proyecto en la consola de AI Studio, ya que puede ser más alta que los 8 RPM actuales). **Requisito bloqueante antes de habilitar en producción:** rediseño de checkpoint a archivos por página (ver A.3) — sin esto, no despliegues paralelismo, porque pierdes la capacidad de reanudar limpiamente ante corte de cuota.
- **1.1 — Extracción híbrida, en modo *shadow* primero.** Implementa la heurística compuesta de la sección A.1 (no solo conteo de caracteres). Antes de usarla para decidir el enrutamiento real, córrela en modo *shadow*: procesa un lote de documentos con ambas rutas (nativa y Vision) en paralelo, compara resultados, mide la tasa de divergencia/falsos positivos. Solo activa el enrutamiento real como fuente única de verdad después de validar contra la muestra etiquetada de 30-50 páginas.

**Por qué van juntas en Fase 2:** ambas tocan la etapa de extracción directamente (el 82% del tiempo total), y ambas requieren la misma pieza de infraestructura previa — el checkpoint por página de A.3 — antes de poder desplegarse con seguridad.

---

### Fase 3 — Refactorización Estructural (esquema, JSONB, RPCs, streaming)

Cambios de mayor alcance arquitectónico, a ejecutar una vez que Fases 1 y 2 estén estables en producción y se tenga visibilidad real de dónde queda el nuevo cuello de botella.

- **3.1 — Metadatos en JSONB, con diseño dual (no sustitución total).** Migra el esquema, agrega índice GIN, reescribe `search_resource_chunks` para soportar filtrado híbrido. Mantén una versión corta de contexto en el texto que se embebe (ver A.2) — no elimines por completo los headers del cuerpo vectorizado. Ejecuta la evaluación A/B de Recall@5/MRR antes de hacer el backfill masivo de documentos ya ingresados; si el backfill requiere re-generar embeddings existentes, cuantifica ese costo (número de chunks × costo por token) antes de comprometerte a la migración completa.
- **3.2 — Pipeline en streaming, con máquina de estados por página.** Solo tiene sentido implementarlo después de 1.1/1.2, porque su techo de ganancia (~18% del tiempo total con la distribución actual) crece proporcionalmente una vez que extracción deja de dominar el 82%. Requiere: tabla de progreso persistida, flag `documento_completo`, e idempotencia en cada etapa (reutilizando el hash SHA-256 de 2.2 como clave de deduplicación en ingesta, no solo en embeddings).

**Nota operativa transversal:** para cargas masivas no interactivas (backfill completo de un catálogo de cursos, reprocesamiento nocturno), evalúa la Batch API de Gemini como ruta alternativa a la paralelización en tiempo real — ofrece ~50% de descuento en tokens con hasta 24h de turnaround. No reemplaza a 1.2 para ingestas puntuales donde la latencia importa, pero es una palanca de costo real para volúmenes grandes donde el turnaround no es crítico.

---

## Resumen ejecutivo de secuenciación

```
Fase 1 (días)     →  2.1, infraestructura de 2.2, 1.3 con gate de validación
Fase 2 (1-2 sem)  →  Checkpoint por página (prerrequisito) → 1.2 → 1.1 en shadow mode → 1.1 en producción
Fase 3 (2-4 sem)  →  3.1 (diseño dual + A/B de retrieval) → 3.2 (máquina de estados)
```

El orden no es arbitrario: **1.2 y 1.1 comparten el mismo prerrequisito de checkpoint**, y **3.2 depende de que 1.1/1.2 ya hayan movido el cuello de botella** para que su ganancia relativa valga el esfuerzo y el riesgo de concurrencia adicional que introduce.