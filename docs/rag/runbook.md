# Runbook de operación del RAG en PostgreSQL

Este runbook cubre la preparación del corpus local, el cambio de almacén por entorno y el rollback. El proveedor PostgreSQL de producción aún debe configurarse en el entorno de despliegue cuando el equipo lo elija.

## Antes de activar PostgreSQL

Confirma estas condiciones:

- El contenedor `rag-postgres` aparece `healthy`.
- La extensión `vector` está instalada.
- El total de chunks coincide con el export validado: actualmente 29,909.
- Todos los embeddings tienen 256 dimensiones y comparten proveedor/modelo/versión.
- La búsqueda vectorial funciona con filtros de curso y profesor.
- El backup puede listarse y restaurarse en una base vacía.
- El periodo de shadow reads alcanza los umbrales de calidad acordados en el benchmark.

No elimines `resource_chunks` de Supabase durante el cutover.

## Comprobaciones locales (PowerShell)

Desde `backend/`:

```powershell
.\.venv\Scripts\python.exe -m scripts.rag.preflight_postgres_cutover

docker compose -f docker-compose.rag.local.yml ps

docker compose -f docker-compose.rag.local.yml exec rag-postgres `
  psql -U univia_rag -d univia_rag -c "SELECT extversion FROM pg_extension WHERE extname = 'vector';"

docker compose -f docker-compose.rag.local.yml exec rag-postgres `
  psql -U univia_rag -d univia_rag -c "SELECT count(*) FROM resource_chunks;"

docker compose -f docker-compose.rag.local.yml exec rag-postgres `
  psql -U univia_rag -d univia_rag -c "SELECT embedding_provider, embedding_model, embedding_dimensions, embedding_version, count(*) FROM resource_chunks GROUP BY 1,2,3,4;"
```

La última consulta debe devolver un único contrato de embeddings con dimensión 256.

## Backup y verificación

El script genera el backup fuera del repositorio, valida el archivo con `pg_restore --list` y escribe un manifiesto con tamaño, SHA-256, cantidad de chunks y contrato de embeddings. Compose obtiene la contraseña de `RAG_POSTGRES_PASSWORD`; el script nunca la imprime.

```powershell
.\scripts\rag\backup_local_postgres.ps1
```

Por defecto, guarda ambos archivos en `%LOCALAPPDATA%\UNIVIA\rag-backups`. Puedes indicar otra ruta fuera del repositorio:

```powershell
.\scripts\rag\backup_local_postgres.ps1 -OutputDirectory 'D:\Backups\UNIVIA'
```

La verificación de archivo no equivale a una restauración. Antes de producción, restaura el dump en una base PostgreSQL vacía y repite conteo, contrato y búsqueda de humo.

Para verificar un dump local, usa el script de restauración. Crea una base temporal con nombre aleatorio, compara chunks y contrato con el manifiesto, revisa HNSW/FTS y ejecuta una búsqueda vectorial corta. Al terminar elimina solo esa base temporal y el archivo temporal dentro del contenedor:

```powershell
.\scripts\rag\verify_local_postgres_restore.ps1 `
  -BackupPath "$env:LOCALAPPDATA\UNIVIA\rag-backups\univia-rag-<timestamp>.dump"
```

El script no cambia `univia_rag` ni Supabase. Si falla la limpieza, informa el nombre de la base temporal para que puedas revisarla antes de borrarla.

## Cambio por entorno

Cuando se haya aprobado la calidad y el entorno PostgreSQL esté disponible:

1. Toma y verifica un backup de PostgreSQL local y del corpus Supabase.
2. Configura el secreto `RAG_DATABASE_URL` en el backend del entorno destino.
3. Configura `RAG_STORE=postgres` y `EMBEDDINGS_DIMENSIONS=256` en ese backend.
4. Reinicia el backend y confirma el healthcheck de la base RAG.
5. Prueba ingesta de un recurso de prueba, retrieval por curso/profesor y generación de contexto.
6. Vigila errores, latencia, pool y conteos durante el periodo acordado.

El host, TLS, límites de conexión, política de backup y monitoreo deben ajustarse a la plataforma PostgreSQL elegida; no copies credenciales locales a producción.

## Rollback

Si retrieval o ingesta local falla:

1. Cambia `RAG_STORE=supabase` en el entorno afectado.
2. Restaura la dimensión, proveedor y modelo de consulta compatibles con el corpus Supabase (la línea base medida tenía 1536 dimensiones).
3. Reinicia el backend y confirma que las rutas RAG responden.
4. Conserva logs sin contenido de consulta ni secretos; registra el tipo del error y la hora para investigar.

El rollback solo restaura lectura desde Supabase si las tablas remotas y sus RPC siguen intactas. No borres la tabla remota hasta cerrar el periodo de observación y verificar un restore independiente.
