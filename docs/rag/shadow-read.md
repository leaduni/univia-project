# Shadow reads entre Supabase y PostgreSQL

Shadow mode mantiene Supabase como respuesta visible y ejecuta una búsqueda de comparación en PostgreSQL para una muestra de consultas. Los resultados locales solo se registran como métricas; no se envían al frontend ni al modelo generador.

## Requisitos

- PostgreSQL local disponible y con `resource_chunks` cargada a 256 dimensiones.
- `RAG_DATABASE_URL` configurada para el backend.
- Supabase conserva el corpus principal y la dimensión con la que fue vectorizado.
- El modelo y proveedor configurados deben ser los mismos que se usaron para el corpus PostgreSQL.

## Activación

En el `.env` del backend:

```env
RAG_STORE=supabase
RAG_SHADOW_READ_ENABLED=true
RAG_SHADOW_READ_SAMPLE_RATE=0.05
RAG_SHADOW_READ_TIMEOUT_SECONDS=6
RAG_DATABASE_URL=postgresql://...
EMBEDDINGS_DIMENSIONS=1536
```

`RAG_STORE` se mantiene en `supabase`: Supabase sigue respondiendo a las solicitudes. El pool local se inicia al habilitar shadow mode. Para apagarlo, establece `RAG_SHADOW_READ_ENABLED=false`.

Durante la observación, conserva ambos corpus sincronizados. La ingesta y los cambios de recursos escriben en el almacén primario seleccionado; shadow mode no replica escrituras a la otra base. Pausa cambios de recursos o sincroniza ambos destinos antes de comparar resultados.

Configura `EMBEDDINGS_DIMENSIONS` según la dimensión del corpus Supabase (actualmente 1536). La dimensión del corpus PostgreSQL se lee de sus metadatos y debe ser 256. La comparación se omite si proveedor o modelo no coinciden.

## Dimensiones y consumo

La consulta primaria usa la dimensión configurada para Supabase. Para OpenAI `text-embedding-3-small` y `text-embedding-3-large`, shadow mode reutiliza el vector primario: toma sus primeras 256 dimensiones y las normaliza antes de consultar PostgreSQL. Así no genera una segunda llamada de embeddings ni una llamada de generación con LLM. Si el proveedor, el modelo o la dimensión no permiten esa conversión segura, la comparación se omite y se registra el motivo. La tasa de muestreo limita la carga de PostgreSQL, no el consumo de la API de embeddings.

Empieza con una tasa baja, por ejemplo `0.01`, para limitar la carga local mientras observas los resultados. Aumenta la tasa solo después de confirmar que la base local está disponible y que el modelo/proveedor coincide con la revectorización.

## Métricas

El backend registra líneas `RAG_SHADOW_READ` con:

- solapamiento Jaccard de los IDs recuperados;
- coincidencia del primer resultado;
- diferencia absoluta de similitud del primer resultado, si ambos lados la devuelven;
- cantidad de resultados por base y latencia local.

Los errores registran únicamente el tipo de excepción y la latencia. No se registran el texto de consulta, el contenido de chunks, credenciales ni datos personales. `RAG_SHADOW_READ_FAILED` indica que la comparación no terminó; no altera la respuesta que Supabase ya entregó.

## Resumen de logs

El backend guarda solo las métricas de shadow-read (no los logs generales) en `backend/logs/rag-shadow.log`. Para resumirlas:

```powershell
 .\.venv\Scripts\python.exe -m scripts.rag.summarize_shadow_logs .\logs\rag-shadow.log
```

El resumen calcula solapamiento medio, acuerdo top-1, diferencia de score, p50/p95 de latencia, omisiones y fallos. Ignora las demás líneas y no imprime consultas ni contenido. Reúne al menos 30 comparaciones antes de usarlo como señal de cutover.

## Criterio antes del cutover

Revisa logs durante el periodo que defina el equipo y calcula los indicadores sobre consultas representativas. Shadow mode por sí solo no aprueba el cambio: compara resultados con el dataset dorado de `docs/rag/dimension-benchmark.md`, confirma latencia y disponibilidad, y prueba backup/restore antes de cambiar `RAG_STORE=postgres`.

## Evidencia de la línea base Supabase

El 2026-10-06 se tomó una muestra estratificada de 288 embeddings de la tabla actual, sin leer contenido de chunks ni llamar a modelos: 278 tuvieron norma entre 0.99 y 1.01; 10 quedaron fuera de ese intervalo. Esto es compatible con que la mayoría del corpus use embeddings normalizados, pero no demuestra el proveedor/modelo de cada fila. Documentación histórica del proyecto también registró una mezcla Gemini/OpenAI en una versión anterior del corpus. Por eso la comparación se debe leer como diferencia frente al servicio existente; la aprobación final debe apoyarse en las consultas etiquetadas y en que el proveedor/modelo configurados coincidan con el corpus local.
