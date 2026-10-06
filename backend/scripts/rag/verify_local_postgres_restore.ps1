param(
    [Parameter(Mandatory = $true)]
    [string]$BackupPath
)

$ErrorActionPreference = 'Stop'
$backendDirectory = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$composeFile = Join-Path $backendDirectory 'docker-compose.rag.local.yml'
if (-not (Test-Path -LiteralPath $BackupPath -PathType Leaf)) {
    throw "No se encontró el archivo de backup: $BackupPath"
}
$resolvedBackup = (Resolve-Path -LiteralPath $BackupPath).Path
$manifestPath = [System.IO.Path]::ChangeExtension($resolvedBackup, '.json')

if (-not (Test-Path -LiteralPath $composeFile -PathType Leaf)) {
    throw "No se encontró el Compose local: $composeFile"
}
if (-not (Test-Path -LiteralPath $manifestPath -PathType Leaf)) {
    throw "No se encontró el manifiesto asociado: $manifestPath"
}

$manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
$backupItem = Get-Item -LiteralPath $resolvedBackup
$actualHash = (Get-FileHash -LiteralPath $resolvedBackup -Algorithm SHA256).Hash.ToLowerInvariant()
if ($actualHash -ne $manifest.sha256 -or $backupItem.Length -ne [long]$manifest.archive_bytes) {
    throw 'El backup no coincide con el SHA-256 o tamaño declarado en su manifiesto.'
}

function Invoke-RagCompose {
    param([string[]]$ComposeArguments)

    $result = & docker compose -f $composeFile @ComposeArguments 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Falló docker compose (código $LASTEXITCODE)."
    }
    return $result
}

$stamp = [Guid]::NewGuid().ToString('N')
$restoreDatabase = "univia_restore_check_$stamp"
$containerArchive = "/tmp/$restoreDatabase.dump"
$databaseCreated = $false
$archiveCopied = $false

try {
    $null = Invoke-RagCompose @('exec', '-T', 'rag-postgres', 'pg_isready', '-U', 'univia_rag', '-d', 'univia_rag')
    $null = & docker cp $resolvedBackup "univia-rag-postgres:$containerArchive" 2>&1
    $archiveCopied = $true
    if ($LASTEXITCODE -ne 0) {
        throw "No se pudo copiar el backup al contenedor (código $LASTEXITCODE)."
    }

    $null = Invoke-RagCompose @('exec', '-T', 'rag-postgres', 'createdb', '-U', 'univia_rag', $restoreDatabase)
    $databaseCreated = $true
    $null = Invoke-RagCompose @(
        'exec', '-T', 'rag-postgres', 'pg_restore', '--exit-on-error', '--no-owner',
        '--no-privileges', '-U', 'univia_rag', '-d', $restoreDatabase, $containerArchive
    )

    $contractOutput = Invoke-RagCompose @(
        'exec', '-T', 'rag-postgres', 'psql', '-U', 'univia_rag', '-d', $restoreDatabase,
        '-At', '-F', '|', '-c',
        'SELECT embedding_provider, embedding_model, embedding_dimensions, embedding_version, count(*) FROM resource_chunks GROUP BY 1,2,3,4'
    )
    $contractLines = @($contractOutput | ForEach-Object { "$($_)".Trim() } | Where-Object { $_ })
    if ($contractLines.Count -ne 1) {
        throw "La restauración contiene $($contractLines.Count) contratos de embeddings; se esperaba uno."
    }
    $actualContract = $contractLines[0].Split('|')
    $expectedContract = @(
        [string]$manifest.embedding_provider,
        [string]$manifest.embedding_model,
        [string]$manifest.embedding_dimensions,
        [string]$manifest.embedding_version,
        [string]$manifest.chunk_count
    )
    if (($actualContract -join '|') -ne ($expectedContract -join '|')) {
        throw 'El conteo o contrato de embeddings restaurado no coincide con el manifiesto.'
    }

    $indexOutput = Invoke-RagCompose @(
        'exec', '-T', 'rag-postgres', 'psql', '-U', 'univia_rag', '-d', $restoreDatabase,
        '-At', '-c',
        "SELECT count(*) FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'resource_chunks' AND ((indexname = 'resource_chunks_embedding_hnsw_idx' AND indexdef ILIKE '%USING hnsw%' AND indexdef ILIKE '%vector_cosine_ops%') OR indexname = 'idx_resource_chunks_contenido_fts')"
    )
    if ([int]("$indexOutput".Trim()) -ne 2) {
        throw 'La restauración no contiene los índices HNSW y FTS esperados.'
    }

    $searchOutput = Invoke-RagCompose @(
        'exec', '-T', 'rag-postgres', 'psql', '-U', 'univia_rag', '-d', $restoreDatabase,
        '-At', '-c',
        'SELECT count(*) FROM (SELECT id FROM resource_chunks ORDER BY embedding <=> (SELECT embedding FROM resource_chunks LIMIT 1) LIMIT 3) AS nearest'
    )
    if ([int]("$searchOutput".Trim()) -ne 3) {
        throw 'La búsqueda vectorial de humo no devolvió tres filas.'
    }

    Write-Output "RESTAURACION_OK | database=$restoreDatabase | chunks=$($manifest.chunk_count) | indices=HNSW+FTS | busqueda_vectorial=3"
}
finally {
    if ($databaseCreated) {
        try {
            $null = Invoke-RagCompose @('exec', '-T', 'rag-postgres', 'dropdb', '-U', 'univia_rag', $restoreDatabase)
            Write-Output "Base temporal eliminada: $restoreDatabase"
        } catch {
            Write-Warning "No se pudo eliminar la base temporal $restoreDatabase. Elimínala manualmente tras revisar su contenido."
        }
    }
    if ($archiveCopied) {
        try {
            $null = Invoke-RagCompose @('exec', '-T', 'rag-postgres', 'rm', '-f', '--', $containerArchive)
        } catch {
            Write-Warning 'No se pudo eliminar el dump temporal del contenedor.'
        }
    }
}
