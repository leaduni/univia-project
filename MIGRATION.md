# Migración y mejora del RAG de UNIVIA

> **Para agentes de implementación:** ejecutar este plan por fases. Cada tarea debe cerrar con sus pruebas y criterios de aceptación antes de empezar la siguiente.

**Objetivo:** mover `resource_chunks` desde Supabase a PostgreSQL con `pgvector`, revectorizar el corpus con embeddings Matryoshka, mejorar la recuperación con búsqueda híbrida y reranking, añadir evaluación reproducible y corregir el prompt de generación de evaluaciones.

**Arquitectura:** Supabase seguirá siendo la fuente de verdad para autenticación, usuarios, cursos, recursos y datos académicos. PostgreSQL será el almacén documental del RAG. FastAPI accederá a ambos servicios y ocultará el motor vectorial detrás de un puerto `ChunkStore`, con adaptadores intercambiables para migración, pruebas y rollback.

**Stack:** FastAPI, Python 3.11+, `asyncpg`, PostgreSQL 16, `pgvector`, Docker Compose, embeddings Matryoshka, búsqueda full-text de PostgreSQL, HNSW, reranker configurable y `pytest`.

**Situación actual medida:** la base de Supabase ocupa 550 MB. `resource_chunks` ocupa 525 MB: 275 MB de tabla/TOAST y 250 MB de índices. El índice HNSW `resource_chunks_embedding_idx` ocupa 234 MB. Hay 29,909 chunks y solo 60 filas muertas, por lo que `VACUUM` no resuelve el límite de almacenamiento.

## Restricciones globales

- Solo `resource_chunks` cambia de base de datos en esta migración.
- Supabase conserva autenticación, `recursos`, `cursos`, profesores y el resto del modelo transaccional.
- PostgreSQL no tendrá foreign keys hacia tablas remotas de Supabase.
- El backend será el único cliente de la base RAG. El frontend no recibirá credenciales de PostgreSQL.
- Ingesta y retrieval deben usar el mismo proveedor, modelo, dimensión y versión de embeddings.
- No se copiarán los embeddings actuales de 1536 dimensiones: se exportará el texto y se revectorizará.
- La migración no repetirá OCR ni extracción de PDF.
- La tabla original de Supabase no se eliminará hasta completar el periodo de observación y aprobar el rollback.
- Cada cambio de almacenamiento, dimensión o modelo debe poder activarse mediante configuración.
- Ninguna fase puede depender de selección aleatoria para medir calidad.

## Resultado esperado

```text
Frontend
   |
   v
FastAPI
   |-- Supabase
   |     |-- Auth
   |     |-- usuarios, cursos, recursos y profesores
   |     `-- resto del modelo transaccional
   |
   `-- PostgreSQL + pgvector
         |-- resource_chunks
         |-- full-text search
         |-- HNSW
         `-- metadatos desnormalizados para retrieval
```

## Decisiones de diseño

### Responsabilidad de cada base

- Supabase asigna y conserva `recurso_id`, `curso_id`, profesor, título y estado del recurso.
- PostgreSQL conserva el contenido fragmentado, embedding, posición y una copia de los metadatos necesarios para filtrar y citar.
- Los identificadores remotos se almacenan como valores simples, sin foreign keys.
- Una rutina de reconciliación detecta chunks cuyo recurso ya no existe en Supabase.

### Puerto de almacenamiento

El código RAG no debe importar `supabase.Client` ni `asyncpg` directamente. Debe depender de un contrato:

```python
class ChunkStore(Protocol):
    async def replace_resource_chunks(self, resource: ResourceSnapshot, chunks: list[EmbeddedChunk]) -> int: ...
    async def delete_resource_chunks(self, recurso_id: int) -> int: ...
    async def search(self, query: RetrievalQuery) -> list[RetrievalCandidate]: ...
    async def count_resource_chunks(self, recurso_id: int) -> int: ...
    async def healthcheck(self) -> bool: ...
```

Adaptadores previstos:

- `PostgresChunkStore`: destino final.
- `SupabaseChunkStore`: compatibilidad temporal y rollback.
- `InMemoryChunkStore`: pruebas unitarias sin red ni Docker.

### Esquema local

La tabla local debe contener, como mínimo:

```sql
create extension if not exists vector;

create table resource_chunks (
    id uuid primary key,
    recurso_id integer not null,
    curso_id integer not null,
    chunk_index integer not null,
    contenido text not null,
    embedding vector(EMBEDDING_DIMENSIONS) not null,
    metadata jsonb not null default '{}'::jsonb,
    curso_nombre text,
    titulo_recurso text,
    tipo_recurso text,
    profesor_id integer,
    profesor_nombre text,
    ciclo_recurso integer,
    year_recurso integer,
    content_hash text not null,
    embedding_provider text not null,
    embedding_model text not null,
    embedding_dimensions smallint not null,
    embedding_version text not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (recurso_id, chunk_index)
);
```

Índices requeridos:

- HNSW sobre `embedding vector_cosine_ops`.
- GIN sobre `to_tsvector('spanish', contenido)`.
- B-tree sobre `recurso_id`, `curso_id`, `profesor_id` y `lower(curso_nombre)`.
- Índice único `(recurso_id, chunk_index)`.

`EMBEDDING_DIMENSIONS` se reemplaza en la migración SQL por la dimensión aprobada en la evaluación. PostgreSQL no permite cambiar libremente el tamaño de una columna `vector(n)` sin reconstruirla.

### Consistencia entre Supabase y PostgreSQL

- La ingesta consulta el recurso en Supabase y crea un `ResourceSnapshot` antes de escribir chunks.
- El reemplazo de todos los chunks de un recurso ocurre dentro de una transacción PostgreSQL.
- `rag_status='complete'` se escribe en Supabase solo después del commit PostgreSQL.
- Si el commit local falla, Supabase conserva o recibe `rag_status='failed'` con una causa técnica.
- Si falla la actualización final de Supabase después del commit local, una reconciliación idempotente corrige el estado.
- La eliminación de un recurso en Supabase requiere llamar a `delete_resource_chunks(recurso_id)` o dejarlo para la reconciliación programada.

## Fase 0: línea base y seguridad de la migración

### Tarea 0.1: congelar métricas actuales

**Archivos:**

- Crear: `backend/tests/rag/fixtures/retrieval_baseline.jsonl`
- Crear: `backend/scripts/rag/measure_storage.sql`
- Crear: `backend/scripts/rag/export_retrieval_baseline.py`

- [ ] Registrar conteo total de chunks y conteo por recurso/curso.
- [ ] Registrar tamaño de tabla, TOAST, HNSW y full-text.
- [ ] Registrar proveedor, modelo y dimensión usados por el corpus actual.
- [ ] Crear un conjunto inicial de consultas reales con curso, tema, profesor opcional y recursos/chunks relevantes.
- [ ] Guardar resultados actuales de Recall@k, MRR, nDCG y latencia para comparar después.

**Criterio de aceptación:** existe una línea base reproducible que no depende del orden aleatorio de resultados.

### Tarea 0.2: definir configuración y secretos

**Archivos:**

- Modificar: `backend/docker-compose.yml`
- Modificar: `backend/requirements.txt`
- Crear: `backend/app/rag/settings.py`
- Crear: `backend/tests/rag/test_settings.py`

Variables requeridas:

```env
RAG_STORE=postgres
RAG_DATABASE_URL=postgresql://...
RAG_DB_POOL_MIN_SIZE=1
RAG_DB_POOL_MAX_SIZE=10
EMBEDDINGS_PROVIDER=openai|gemini
EMBEDDINGS_MODEL=...
EMBEDDINGS_DIMENSIONS=512
EMBEDDINGS_VERSION=v2
RERANKER_ENABLED=false
RERANKER_MODEL=...
RERANKER_CANDIDATES=30
RERANKER_TOP_K=6
```

- [ ] Validar configuración al iniciar el backend.
- [ ] Rechazar dimensiones distintas de las declaradas por el esquema local.
- [ ] Ocultar URLs y claves de los logs.
- [ ] Mantener `RAG_STORE=supabase` como rollback temporal.

**Criterio de aceptación:** el backend falla al inicio con un mensaje claro si falta una variable obligatoria o existe una combinación incompatible.

## Fase 1: PostgreSQL local y capa de acceso

### Tarea 1.1: levantar PostgreSQL con pgvector

**Archivos:**

- Modificar: `backend/docker-compose.yml`
- Crear: `base_de_datos/rag_local/001_resource_chunks.sql`
- Crear: `base_de_datos/rag_local/002_search_functions.sql`
- Crear: `base_de_datos/rag_local/README.md`

- [ ] Añadir un servicio PostgreSQL con imagen que incluya `pgvector`.
- [ ] Usar volumen persistente y healthcheck.
- [ ] Crear usuario y base con privilegios mínimos.
- [ ] Aplicar migraciones idempotentes.
- [ ] Documentar backup, restore y recreación del índice HNSW.

**Criterio de aceptación:** `docker compose up` deja PostgreSQL saludable, con extensión, tabla e índices disponibles después de reiniciar el contenedor.

### Tarea 1.2: implementar el puerto `ChunkStore`

**Archivos:**

- Crear: `backend/app/rag/storage/__init__.py`
- Crear: `backend/app/rag/storage/models.py`
- Crear: `backend/app/rag/storage/base.py`
- Crear: `backend/app/rag/storage/postgres.py`
- Crear: `backend/app/rag/storage/supabase.py`
- Crear: `backend/app/rag/storage/factory.py`
- Crear: `backend/app/core/rag_database.py`
- Crear: `backend/tests/rag/storage/test_postgres_store.py`
- Crear: `backend/tests/rag/storage/test_store_contract.py`

- [ ] Definir `ResourceSnapshot`, `EmbeddedChunk`, `RetrievalQuery` y `RetrievalCandidate` sin imports de infraestructura.
- [ ] Crear un pool `asyncpg` durante el ciclo de vida de FastAPI y cerrarlo al apagar.
- [ ] Implementar reemplazo transaccional de todos los chunks de un recurso.
- [ ] Implementar búsqueda vectorial, full-text e híbrida.
- [ ] Implementar límites, filtros y timeouts en consultas.
- [ ] Ejecutar el mismo contrato de pruebas contra adaptador en memoria, Supabase simulado y PostgreSQL.

**Criterio de aceptación:** pipeline y retriever pueden cambiar de almacén mediante `RAG_STORE` sin cambiar sus reglas de negocio.

### Tarea 1.3: conectar la ingesta al puerto

**Archivos:**

- Modificar: `backend/app/rag/ingest.py`
- Modificar: `backend/app/rag/pipeline.py`
- Modificar: `backend/app/rag/pipeline_config.py`
- Modificar: `backend/tests/rag/test_state_consistency.py`
- Crear: `backend/tests/rag/test_cross_database_ingestion.py`

- [ ] Sustituir las escrituras directas a `resource_chunks` por `ChunkStore`.
- [ ] Mantener las actualizaciones de `recursos.rag_status` en Supabase.
- [ ] Obtener y almacenar el snapshot desnormalizado del recurso.
- [ ] Hacer el reemplazo local atómico para todos los lotes.
- [ ] Probar fallo antes del commit, fallo después del commit y reintento idempotente.

**Criterio de aceptación:** una interrupción no deja un recurso marcado como completo con chunks parciales.

## Fase 2: exportación y revectorización Matryoshka

### Tarea 2.1: exportar el corpus sin embeddings

**Archivos:**

- Crear: `backend/scripts/rag/export_chunks_from_supabase.py`
- Crear: `backend/scripts/rag/validate_export.py`
- Crear: `backend/tests/rag/test_export_chunks.py`

- [ ] Leer Supabase por páginas estables ordenadas por `id`.
- [ ] Exportar contenido, IDs, posición y metadatos unidos desde `recursos`, `cursos` y profesores.
- [ ] Excluir la columna `embedding` del archivo de exportación.
- [ ] Escribir JSONL o Parquet por lotes con checksum.
- [ ] Comparar conteos totales y por recurso contra la línea base.
- [ ] Permitir reanudar la exportación sin duplicados.

**Criterio de aceptación:** los 29,909 chunks actuales quedan representados una sola vez y cada recurso conserva todas sus posiciones.

### Tarea 2.2: corregir el contrato de embeddings

**Archivos:**

- Modificar: `backend/app/rag/embedder.py`
- Modificar: `backend/app/rag/embedding_cache.py`
- Modificar: `backend/scripts_manuales/revectorizar_chunks.py`
- Modificar: `backend/tests/rag/test_phase1_quick_wins.py`
- Crear: `backend/tests/rag/test_embedding_contract.py`

- [ ] Configurar proveedor, modelo y dimensión desde `RagSettings`.
- [ ] Solicitar la dimensión al proveedor cuando su API lo soporte; no depender de cortar listas de forma silenciosa.
- [ ] Validar dimensión y valores finitos antes de persistir.
- [ ] Separar `RETRIEVAL_DOCUMENT` y `RETRIEVAL_QUERY` cuando el proveedor lo requiera.
- [ ] Versionar la caché con proveedor, modelo, dimensión, task type y hash del contenido.
- [ ] Invalidar o ignorar entradas antiguas de 1536 dimensiones.
- [ ] Prohibir mezclar espacios vectoriales en una misma tabla activa.

**Criterio de aceptación:** un cambio de dimensión o modelo nunca reutiliza un embedding incompatible.

### Tarea 2.3: seleccionar la dimensión

**Archivos:**

- Crear: `backend/app/rag/evaluation/dimension_benchmark.py`
- Crear: `backend/tests/rag/evaluation/test_dimension_benchmark.py`
- Crear: `docs/rag/dimension-benchmark.md`

- [ ] Evaluar al menos 256, 512, 768 y 1536 dimensiones sobre el mismo dataset.
- [ ] Medir Recall@5, Recall@10, MRR@10, nDCG@10, latencia y tamaño estimado/real.
- [ ] Usar 512 como candidato inicial, no como decisión automática.
- [ ] Aprobar la menor dimensión cuya caída de Recall@10 no supere 2 puntos porcentuales frente a la mejor configuración.
- [ ] Registrar el resultado y la razón de la decisión.

**Criterio de aceptación:** la dimensión final queda respaldada por métricas y no solo por ahorro de almacenamiento.

### Tarea 2.4: importar y revectorizar

**Archivos:**

- Crear: `backend/scripts/rag/import_and_reembed.py`
- Crear: `backend/scripts/rag/verify_migration.py`
- Crear: `backend/tests/rag/test_import_and_reembed.py`

- [ ] Procesar el export por lotes y con checkpoint.
- [ ] Generar embeddings documentales con la configuración aprobada.
- [ ] Insertar mediante `PostgresChunkStore`.
- [ ] Crear el HNSW después de la carga masiva o justificar su creación previa con mediciones.
- [ ] Ejecutar `ANALYZE` después de importar.
- [ ] Comparar conteos, hashes y posiciones entre origen y destino.
- [ ] Probar una muestra de queries con embeddings generados por el mismo modelo.

**Criterio de aceptación:** origen y destino coinciden en IDs, contenido y posiciones; todos los embeddings tienen la dimensión aprobada.

## Fase 3: retriever unificado

### Tarea 3.1: separar embedding, recuperación y selección

**Archivos:**

- Modificar: `backend/app/rag/retriever.py`
- Crear: `backend/app/rag/retrieval/service.py`
- Crear: `backend/app/rag/retrieval/query_builder.py`
- Crear: `backend/app/rag/retrieval/diversity.py`
- Crear: `backend/tests/rag/retrieval/test_retrieval_service.py`

Pipeline objetivo:

```text
consulta
  -> embedding de consulta
  -> búsqueda vectorial + full-text
  -> fusión RRF
  -> pool de candidatos
  -> reranker opcional
  -> deduplicación y diversidad por recurso
  -> top-k final
```

- [ ] Reutilizar una sola implementación para chatbot y evaluaciones.
- [ ] Mantener filtros por `curso_id`, nombre normalizado y `profesor_id`.
- [ ] Conservar metadatos necesarios para referencias `[F#]`.
- [ ] Eliminar la selección aleatoria de chunks en `recuperar_contexto_semantico`.
- [ ] Aplicar diversidad después de ordenar por relevancia.
- [ ] Definir timeout y degradación controlada para embeddings, base y reranker.

**Criterio de aceptación:** la misma consulta y corpus producen el mismo ranking antes del reranker.

### Tarea 3.2: portar la búsqueda híbrida

**Archivos:**

- Modificar: `base_de_datos/rag_local/002_search_functions.sql`
- Modificar: `backend/app/rag/storage/postgres.py`
- Crear: `backend/tests/rag/storage/test_hybrid_search.py`

- [ ] Portar la combinación semántica + full-text actualmente usada por `search_chatbot_resource_chunks`.
- [ ] Conservar RRF configurable y límite de chunks por recurso.
- [ ] Sustituir joins remotos por columnas desnormalizadas.
- [ ] Evitar construir `to_tsvector` fuera del índice previsto.
- [ ] Verificar planes con `EXPLAIN (ANALYZE, BUFFERS)`.

**Criterio de aceptación:** PostgreSQL usa los índices previstos y mantiene o mejora Recall@10 y latencia p95 frente a Supabase.

### Tarea 3.3: migrar callers

**Archivos:**

- Modificar: `backend/app/chatbot/handlers.py`
- Modificar: `backend/app/routers/evaluaciones.py`
- Modificar: `backend/app/rag/generator.py`
- Modificar: `backend/tests/test_generacion_evaluaciones.py`
- Crear: `backend/tests/rag/test_chatbot_retrieval.py`

- [ ] Eliminar RPCs directas de `resource_chunks` desde handlers y routers.
- [ ] Inyectar `RetrievalService` desde FastAPI.
- [ ] Mantener autenticación Supabase antes de cualquier retrieval.
- [ ] Adaptar límites de contexto por tokens o caracteres sin cortar metadatos de fuente.
- [ ] Devolver errores de servicio consistentes sin filtrar datos de conexión.

**Criterio de aceptación:** ninguna ruta de usuario consulta `resource_chunks` mediante Supabase.

## Fase 4: reranker

### Tarea 4.1: definir interfaz y adaptador

**Archivos:**

- Crear: `backend/app/rag/reranking/base.py`
- Crear: `backend/app/rag/reranking/local.py`
- Crear: `backend/app/rag/reranking/factory.py`
- Crear: `backend/tests/rag/reranking/test_reranker_contract.py`

```python
class Reranker(Protocol):
    async def rerank(
        self,
        query: str,
        candidates: list[RetrievalCandidate],
        top_k: int,
    ) -> list[RankedCandidate]: ...
```

- [ ] Elegir un modelo multilingüe mediante benchmark, no por popularidad.
- [ ] Ejecutarlo en CPU durante desarrollo y medir memoria/latencia.
- [ ] Conservar score original, score RRF y score del reranker.
- [ ] Limitar texto por candidato para controlar costo.
- [ ] Implementar timeout y fallback al ranking RRF.
- [ ] Cargar el modelo una vez por proceso.

**Criterio de aceptación:** el reranker puede desactivarse sin cambiar la respuesta ni romper el retrieval.

### Tarea 4.2: integrar y calibrar

**Archivos:**

- Modificar: `backend/app/rag/retrieval/service.py`
- Modificar: `backend/app/rag/settings.py`
- Crear: `backend/app/rag/evaluation/reranker_benchmark.py`
- Crear: `backend/tests/rag/evaluation/test_reranker_benchmark.py`

- [ ] Recuperar entre 20 y 40 candidatos antes de rerankear.
- [ ] Comparar top 4, top 6 y top 8 como contexto final.
- [ ] Medir mejora en nDCG@10 y MRR@10.
- [ ] Rechazar configuraciones que mejoren ranking pero excedan el presupuesto de latencia acordado.
- [ ] Aplicar deduplicación/diversidad después del reranker.

**Criterio de aceptación:** el reranker mejora nDCG@10 o MRR@10 de forma medible sin degradar Recall@10 ni superar la latencia p95 aceptada.

## Fase 5: evaluator del RAG

### Tarea 5.1: dataset dorado

**Archivos:**

- Ampliar: `backend/tests/rag/fixtures/retrieval_baseline.jsonl`
- Crear: `backend/app/rag/evaluation/dataset.py`
- Crear: `backend/tests/rag/evaluation/test_dataset.py`

Cada caso debe incluir:

```json
{
  "id": "ga-001",
  "query": "...",
  "curso_id": 1,
  "profesor_id": null,
  "relevant_resource_ids": [10],
  "relevant_chunk_ids": ["..."],
  "answerable": true,
  "category": "ejercicio"
}
```

- [ ] Cubrir teoría, ejercicios, exámenes, programación y consultas abiertas.
- [ ] Incluir filtros de profesor y cursos con nombres compartidos.
- [ ] Incluir preguntas sin respuesta para medir falsos positivos.
- [ ] Versionar anotaciones y separar train/calibración de evaluación final.

**Criterio de aceptación:** el dataset contiene al menos 100 consultas revisadas y no usa las respuestas del modelo como verdad automática.

### Tarea 5.2: runner y métricas

**Archivos:**

- Crear: `backend/app/rag/evaluation/metrics.py`
- Crear: `backend/app/rag/evaluation/runner.py`
- Crear: `backend/scripts/rag/evaluate_retrieval.py`
- Crear: `backend/tests/rag/evaluation/test_metrics.py`

- [ ] Calcular Recall@5/10, Precision@k, MRR@10 y nDCG@10.
- [ ] Medir tasa de recursos correctos y tasa de resultados en casos no respondibles.
- [ ] Registrar latencia p50, p95 y errores por etapa.
- [ ] Emitir JSON para CI y Markdown para revisión humana.
- [ ] Permitir comparar dos configuraciones en la misma ejecución.

**Criterio de aceptación:** una regresión de retrieval produce un resultado no aprobado en CI según umbrales versionados.

### Tarea 5.3: evaluación de contexto y generación

**Archivos:**

- Crear: `backend/app/rag/evaluation/context_quality.py`
- Crear: `backend/app/rag/evaluation/evaluation_quality.py`
- Crear: `backend/tests/rag/evaluation/test_context_quality.py`

- [ ] Medir cobertura del tema, redundancia y diversidad documental del contexto final.
- [ ] Evaluar pertenencia al tema, fidelidad a fuentes, resolubilidad, corrección de respuesta, calidad de distractores y duplicación entre preguntas.
- [ ] Usar validaciones deterministas antes de cualquier juez LLM.
- [ ] Si se usa juez LLM, guardar prompt, modelo, versión y resultado para auditoría.
- [ ] Separar evaluación del retrieval de evaluación de la pregunta generada.

**Criterio de aceptación:** el equipo puede saber si una mala evaluación proviene del retrieval, del prompt o del modelo generador.

## Fase 6: system prompt y generación de evaluaciones

### Tarea 6.1: extraer prompts del router

**Archivos:**

- Crear: `backend/app/evaluations/prompts/system.md`
- Crear: `backend/app/evaluations/prompts/theory.md`
- Crear: `backend/app/evaluations/prompts/programming.md`
- Crear: `backend/app/evaluations/prompt_builder.py`
- Modificar: `backend/app/routers/evaluaciones.py`
- Crear: `backend/tests/evaluations/test_prompt_builder.py`

- [ ] Sacar `SYSTEM_MSG_EVALUACION` y plantillas extensas del router.
- [ ] Mantener el router dedicado a HTTP, autenticación y orquestación.
- [ ] Versionar los prompts y registrar la versión en telemetría.
- [ ] Escapar contenido RAG como datos no confiables, nunca como instrucciones.
- [ ] Incluir identificadores `[F#]` en el contexto para trazabilidad.

**Criterio de aceptación:** cambiar una plantilla no exige editar el router y cada prompt puede probarse con fixtures.

### Tarea 6.2: corregir reglas multicurso

**Archivos:**

- Modificar: `backend/app/evaluations/prompts/system.md`
- Modificar: `backend/app/evaluations/prompts/theory.md`
- Modificar: `backend/app/evaluations/prompts/programming.md`
- Crear: `backend/app/evaluations/course_profiles.py`
- Crear: `backend/tests/evaluations/test_course_profiles.py`

- [ ] Eliminar reglas geométricas obligatorias para todos los cursos.
- [ ] Definir perfiles para matemáticas, ciencias, programación y cursos conceptuales.
- [ ] Pedir equivalencia de dificultad sin copiar literalmente un examen.
- [ ] Exigir que cada pregunta indique internamente las fuentes usadas.
- [ ] Definir conducta cuando el contexto es insuficiente o contradictorio.
- [ ] Mantener el contrato JSON y las restricciones KaTeX en bloques separados.

**Criterio de aceptación:** fixtures de cursos no geométricos no reciben requisitos de coordenadas, rectas o vectores.

### Tarea 6.3: validación posterior a la generación

**Archivos:**

- Crear: `backend/app/evaluations/validator.py`
- Crear: `backend/app/evaluations/schemas.py`
- Modificar: `backend/app/routers/evaluaciones.py`
- Crear: `backend/tests/evaluations/test_validator.py`

- [ ] Validar schema, cantidad de opciones, índices de respuesta y sintaxis básica de LaTeX.
- [ ] Detectar preguntas duplicadas o variantes triviales dentro del lote.
- [ ] Verificar que pregunta, respuesta y explicación sean coherentes.
- [ ] Reintentar solo los slots inválidos, no toda la evaluación.
- [ ] Registrar motivo de rechazo sin exponer prompts o claves al usuario.

**Criterio de aceptación:** ninguna evaluación inválida llega al frontend sin pasar validaciones estructurales y semánticas mínimas.

## Fase 7: cutover, observabilidad y rollback

### Tarea 7.1: shadow reads

**Archivos:**

- Implementado: `backend/app/rag/evaluation/shadow_read.py`
- Implementado: `backend/scripts/rag/summarize_shadow_logs.py`
- Modificar: `backend/app/rag/retriever.py`
- Modificar: `backend/app/core/rag_database.py`
- Modificar: `backend/app/rag/storage/factory.py`
- Documentar: `docs/rag/shadow-read.md`
- Pruebas existentes: `backend/tests/rag/evaluation/test_shadow_read.py`

- [x] Mantener Supabase como respuesta principal durante el inicio del shadow mode.
- [x] Ejecutar PostgreSQL en paralelo para una muestra configurable de consultas.
- [x] Comparar solapamiento top-k, similitud del primer resultado, latencia y errores sin duplicar llamadas de generación con LLM.
- [x] No registrar texto de consulta, contenido académico completo ni datos personales en logs.

La implementación está conectada y apagada por defecto en código. El `.env` local quedó preparado con Supabase como primario, shadow mode habilitado y muestreo al 1%; falta reiniciar el backend y observar consultas reales. Se agregó un resumidor de logs que omite cualquier línea que no sea de shadow mode. El periodo de observación y la aprobación del criterio de calidad siguen pendientes; consulta `docs/rag/shadow-read.md`.

**Criterio de aceptación:** PostgreSQL cumple los umbrales de calidad y disponibilidad durante el periodo acordado.

### Tarea 7.2: activar PostgreSQL

**Archivos:**

- Modificar: configuración de despliegue del backend.
- Modificar: `backend/app/core/rag_database.py`
- Crear: `backend/scripts/rag/preflight_postgres_cutover.py`
- Crear: `backend/scripts/rag/backup_local_postgres.ps1`
- Crear: `backend/scripts/rag/verify_local_postgres_restore.ps1`
- Documentar: `docs/rag/runbook.md`

El preflight, el generador de backup y el verificador de restauración local están preparados. El backup local se restauró y validó: conteo, contrato, índices y búsqueda vectorial pasaron; el script eliminó la base temporal. La activación de producción sigue pendiente de elegir el proveedor PostgreSQL y aprobar las métricas de shadow reads.

- [x] Crear backup verificable y comprobar una restauración local en base temporal. Backup generado el 2026-10-06 para 29,909 chunks; el manifiesto conserva SHA-256 y contrato. Restauración, índices HNSW/FTS y búsqueda vectorial verificados; base temporal eliminada.
- [ ] Activar `RAG_STORE=postgres` por entorno.
- [ ] Vigilar errores, conexiones, p95, tamaños e índice HNSW.
- [ ] Mantener rollback por configuración hacia Supabase.
- [ ] Definir alertas por pool agotado, timeouts y desalineación de conteos.

**Criterio de aceptación:** chatbot, generación de evaluaciones e ingesta usan PostgreSQL sin degradación respecto de los umbrales aprobados.

### Tarea 7.3: retirar `resource_chunks` de Supabase

- [ ] Esperar el periodo de observación definido por el equipo.
- [ ] Crear export final y comprobar restauración.
- [ ] Confirmar que ningún archivo Python, SQL activo o dashboard consulta la tabla remota.
- [ ] Eliminar primero el HNSW remoto solo si se necesita recuperar cuota y el rollback ya no depende de él.
- [ ] Eliminar la tabla remota únicamente con aprobación explícita.
- [ ] Actualizar documentación de arquitectura y operación.

**Criterio de aceptación:** Supabase queda por debajo de su límite y el corpus puede restaurarse desde backup.

## Estrategia de pruebas

### Unitarias

- Configuración y validación de dimensiones.
- Contrato de `ChunkStore` con adaptador en memoria.
- Fusión RRF, diversidad y deduplicación.
- Métricas Recall, MRR y nDCG.
- Contrato del reranker y fallback.
- Construcción y validación de prompts.

### Integración

- PostgreSQL real con `pgvector` en Docker.
- Reemplazo transaccional por recurso.
- Búsqueda vectorial, full-text e híbrida.
- Índices usados según `EXPLAIN`.
- Estados entre Supabase y PostgreSQL ante fallos parciales.

### End-to-end

- Ingestar un documento de prueba, recuperar sus chunks y generar una evaluación.
- Buscar por curso, nombre de curso y profesor.
- Reiniciar PostgreSQL y comprobar persistencia.
- Desactivar reranker y comprobar fallback.
- Cambiar `RAG_STORE` y comprobar rollback.

## Gates de salida

La migración podrá considerarse terminada cuando:

- El destino contenga el 100 % de los chunks esperados y coincidan los hashes de contenido.
- No existan mezclas de proveedor, modelo, dimensión o versión en el índice activo.
- Recall@10 no caiga más de 2 puntos porcentuales frente a la mejor línea base aprobada.
- El reranker mejore MRR@10 o nDCG@10 de forma reproducible.
- La latencia p95 cumpla el presupuesto definido por el equipo.
- La ingesta sea atómica por recurso.
- El backend pueda volver a Supabase mediante configuración durante el periodo de observación.
- El generador produzca evaluaciones válidas para matemáticas, ciencias, programación y cursos conceptuales.
- Existan backup, restore probado, healthcheck y runbook.

## Orden de ejecución

1. Línea base y configuración.
2. PostgreSQL local y `ChunkStore`.
3. Exportación sin embeddings.
4. Benchmark de dimensiones Matryoshka.
5. Revectorización e importación.
6. Retriever híbrido unificado.
7. Evaluator del retrieval.
8. Reranker y calibración.
9. Mejora del system prompt y validación.
10. Shadow reads, cutover y observación.
11. Retiro controlado de `resource_chunks` en Supabase.

## Fuera de alcance

- Migrar autenticación o tablas transaccionales fuera de Supabase.
- Elegir ahora el proveedor definitivo de PostgreSQL en producción.
- Reextraer todos los PDF.
- Cambiar frontend salvo ajustes indispensables en contratos de error.
- Eliminar inmediatamente la tabla original.
- Adoptar microservicios separados para ingesta y retrieval en esta etapa.

## Riesgos que requieren revisión

- Un recurso cambia o se elimina en Supabase y deja chunks huérfanos en PostgreSQL.
- La caché devuelve embeddings de otra dimensión o modelo.
- El índice HNSW cabe en desarrollo, pero excede memoria o disco del host de producción.
- El reranker mejora relevancia y aumenta demasiado la latencia.
- Un prompt trata contenido recuperado como instrucciones y permite prompt injection documental.
- Un fallo después del commit local deja `rag_status` desactualizado en Supabase.
- El equipo elimina la tabla remota antes de probar restore y rollback.

