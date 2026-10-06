# Benchmark de dimensiones

La decisión de dimensión compara 256, 512, 768 y 1536 con las mismas consultas y relevancias humanas.

## Preparar casos

```powershell
cd backend
.\.venv\Scripts\python.exe -m scripts.rag.create_benchmark_sample `
  --input data/rag_exports/resource_chunks.jsonl `
  --output data/rag_exports/benchmark_template.jsonl `
  --limit 50
```

En cada línea, redacta una pregunta realista en `query`, comprueba que los IDs de `relevant_chunk_ids` respondan esa pregunta y cambia `review_status` a `approved`. El benchmark no debe usar casos pendientes.

## Regla de decisión

Se elige la dimensión menor cuya Recall@10 quede a no más de 0.02 de la mejor configuración. También se registran MRR@10, nDCG@10, latencia y tamaño vectorial.

No cambies `EMBEDDINGS_DIMENSIONS` ni `RAG_STORE` hasta aprobar un resultado.
