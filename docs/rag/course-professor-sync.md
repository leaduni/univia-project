# Sincronización de cursos y docentes

El filtro docente local usa `rag_course_professors`, una copia N:M de las asociaciones
de Supabase para los cursos presentes en `resource_chunks`. Las etiquetas del recurso
se conservan. Si el recurso no tiene nombre docente, la recuperación muestra todos
los nombres asociados al curso, ordenados y separados por `;`.

## Preparación y primera carga

Ejecuta desde `backend`, con `RAG_DATABASE_URL` apuntando al PostgreSQL destino y las
credenciales Supabase existentes del backend. `--expected-database` debe coincidir
con el nombre real de la base destino.

```powershell
.\.venv\Scripts\python.exe -m scripts.rag.sync_course_professors --expected-database univia_rag
.\.venv\Scripts\python.exe -m scripts.rag.sync_course_professors --expected-database univia_rag --apply --apply-schema
```

El primer comando solo inspecciona. El segundo aplica
`base_de_datos/rag_local/004_course_professors.sql` y sincroniza la tabla. Aplica esta
migración y la primera sincronización antes de desplegar la búsqueda que la consume.

Si PostgreSQL está en otro host, agrega `--allow-remote-target` a ambos comandos y
comprueba el nombre esperado de la base. Esta opción permite un destino remoto;
no cambia `RAG_STORE` ni la configuración de embeddings.

## Actualización posterior

```powershell
.\.venv\Scripts\python.exe -m scripts.rag.sync_course_professors --expected-database univia_rag --apply
```

Repite la sincronización después de cambiar asociaciones curso-docente o incorporar
recursos de nuevos cursos. No hay sincronización automática. El proceso solo hace
SELECT en Supabase y escribe `rag_course_professors` en PostgreSQL; no revectoriza.

## Validación y fallos

El script pagina las asociaciones, valida el conteo exacto y los IDs, rechaza
duplicados y compara dos lecturas completas. Una lectura fallida o un snapshot
cambiante aborta antes de escribir. Un snapshot vacío también aborta; `--allow-empty`
solo debe usarse si se confirmó que todos los cursos del corpus dejaron de tener
asociaciones remotas.

La aplicación usa una tabla temporal y una transacción: inserta o actualiza el
snapshot confirmado, elimina relaciones obsoletas únicamente dentro de los cursos
incluidos y comprueba el conteo final. Un fallo revierte la transacción. Relaciones
de cursos fuera del corpus no se eliminan. Repetir el mismo snapshot conserva filas
y timestamps sin cambios. La salida incluye conteos y un hash del snapshot, sin
credenciales ni nombres docentes.

Validación local del 6 de octubre de 2026: 104 asociaciones en 26 de los 54 cursos;
29.909 chunks conservados. Curso 27 y profesor 62 recuperan material sin etiquetas
de recurso. El filtro de un profesor ajeno al curso devuelve cero resultados.

Las búsquedas requieren pgvector con [escaneos iterativos HNSW](https://github.com/pgvector/pgvector#iterative-index-scans) (0.8 o posterior);
el entorno validado usa 0.8.7. Cada búsqueda habilita `strict_order` solo dentro de
su transacción para completar candidatos después del filtro.
