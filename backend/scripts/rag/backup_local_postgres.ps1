param(
    [string]$OutputDirectory = (Join-Path $env:LOCALAPPDATA 'UNIVIA\rag-backups')
)

$ErrorActionPreference = 'Stop'

$backendDirectory = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$repositoryRoot = (Resolve-Path (Join-Path $backendDirectory '..')).Path.TrimEnd('\')
$composeFile = Join-Path $backendDirectory 'docker-compose.rag.local.yml'
$resolvedOutput = [System.IO.Path]::GetFullPath($OutputDirectory).TrimEnd('\')

if (-not (Test-Path -LiteralPath $composeFile -PathType Leaf)) {
    throw "No se encontró el Compose local: $composeFile"
}
if ($resolvedOutput.Equals($repositoryRoot, [StringComparison]::OrdinalIgnoreCase) -or
    $resolvedOutput.StartsWith($repositoryRoot + '\', [StringComparison]::OrdinalIgnoreCase)) {
    throw 'El backup debe guardarse fuera del repositorio.'
}

function Invoke-RagCompose {
    param([string[]]$ComposeArguments)

    $result = & docker compose -f $composeFile @ComposeArguments 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "Falló docker compose (código $LASTEXITCODE). Revisa Docker Desktop y el estado de rag-postgres."
    }
    return $result
}

New-Item -ItemType Directory -Path $resolvedOutput -Force | Out-Null
$timestamp = [DateTime]::UtcNow.ToString('yyyyMMddTHHmmssZ')
$fileName = "univia-rag-$timestamp.dump"
$backupPath = Join-Path $resolvedOutput $fileName
$manifestPath = Join-Path $resolvedOutput "univia-rag-$timestamp.json"
$containerPath = "/tmp/$fileName"

if ((Test-Path -LiteralPath $backupPath) -or (Test-Path -LiteralPath $manifestPath)) {
    throw "El destino ya existe y no se sobrescribirá: $backupPath"
}

$null = Invoke-RagCompose @('exec', '-T', 'rag-postgres', 'pg_isready', '-U', 'univia_rag', '-d', 'univia_rag')
$contractRows = Invoke-RagCompose @(
    'exec', '-T', 'rag-postgres', 'psql', '-U', 'univia_rag', '-d', 'univia_rag',
    '-At', '-F', '|', '-c',
    'SELECT embedding_provider, embedding_model, embedding_dimensions, embedding_version, count(*) FROM resource_chunks GROUP BY 1,2,3,4'
)
$contractLines = @($contractRows | ForEach-Object { "$($_)".Trim() } | Where-Object { $_ })
if ($contractLines.Count -ne 1) {
    throw "Se esperaba un único contrato de embeddings; se encontraron $($contractLines.Count). No se generó el backup."
}

$contract = $contractLines[0].Split('|')
if ($contract.Count -ne 5) {
    throw 'PostgreSQL devolvió un contrato de embeddings con formato inesperado.'
}
if ($contract[2] -ne '256') {
    throw "La dimensión local es $($contract[2]), no 256. No se generó el backup."
}

$null = Invoke-RagCompose @(
    'exec', '-T', 'rag-postgres', 'pg_dump', '-U', 'univia_rag', '-d', 'univia_rag',
    '-Fc', '-f', $containerPath
)
$archiveListing = Invoke-RagCompose @('exec', '-T', 'rag-postgres', 'pg_restore', '--list', $containerPath)
if (-not $archiveListing) {
    throw 'pg_restore no pudo listar el archivo; el backup no pasó la verificación.'
}

$null = & docker cp "univia-rag-postgres:$containerPath" $backupPath 2>&1
if ($LASTEXITCODE -ne 0) {
    throw "No se pudo copiar el backup del contenedor (código $LASTEXITCODE)."
}

$backupFile = Get-Item -LiteralPath $backupPath
if ($backupFile.Length -le 0) {
    throw "El backup está vacío: $backupPath"
}
$sha256 = (Get-FileHash -LiteralPath $backupPath -Algorithm SHA256).Hash.ToLowerInvariant()
$containerHashOutput = Invoke-RagCompose @('exec', '-T', 'rag-postgres', 'sha256sum', '--', $containerPath)
$containerHash = ("$containerHashOutput" -split '\s+')[0].ToLowerInvariant()
if ($containerHash -ne $sha256) {
    throw 'El SHA-256 del archivo copiado no coincide con el temporal del contenedor.'
}
$manifest = [ordered]@{
    created_at_utc = [DateTime]::UtcNow.ToString('o')
    database = 'univia_rag'
    archive_format = 'pg_dump custom'
    archive_file = $fileName
    archive_bytes = $backupFile.Length
    sha256 = $sha256
    embedding_provider = $contract[0]
    embedding_model = $contract[1]
    embedding_dimensions = [int]$contract[2]
    embedding_version = $contract[3]
    chunk_count = [long]$contract[4]
    archive_list_verified = $true
}
$manifest | ConvertTo-Json | Set-Content -LiteralPath $manifestPath -Encoding utf8

try {
    $null = Invoke-RagCompose @('exec', '-T', 'rag-postgres', 'rm', '-f', '--', $containerPath)
} catch {
    Write-Warning 'El backup quedó verificado, pero no se pudo retirar el temporal dentro del contenedor.'
}

Write-Output "Backup verificado: $backupPath"
Write-Output "Manifiesto: $manifestPath"
Write-Output "Chunks: $($manifest.chunk_count) | SHA-256: $sha256"
