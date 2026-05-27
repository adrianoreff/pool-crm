# Run production operational reset against linked Supabase project.
# Usage:
#   .\run-production-reset.ps1 -DryRun    # BEGIN + reset SQL + ROLLBACK
#   .\run-production-reset.ps1 -Commit      # BEGIN + reset SQL + COMMIT (destructive)

param(
    [switch]$DryRun,
    [switch]$Commit
)

$ErrorActionPreference = 'Stop'
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Resolve-Path (Join-Path $ScriptDir '..\..')
$SqlFile = Join-Path $ScriptDir 'production_operational_reset.sql'

if (-not $DryRun -and -not $Commit) {
    Write-Host 'Specify -DryRun or -Commit' -ForegroundColor Yellow
    exit 1
}

if ($DryRun -and $Commit) {
    Write-Host 'Use only one of -DryRun or -Commit' -ForegroundColor Yellow
    exit 1
}

$tail = if ($DryRun) { 'ROLLBACK;' } else { 'COMMIT;' }
$modeLabel = if ($DryRun) { 'DRY RUN (ROLLBACK)' } else { 'COMMIT (PRODUCTION)' }

if ($Commit) {
    Write-Host ''
    Write-Host '*** DESTRUCTIVE: This will permanently delete operational data in the LINKED Supabase project ***' -ForegroundColor Red
    $confirm = Read-Host 'Type RESET PRODUCTION to continue'
    if ($confirm -ne 'RESET PRODUCTION') {
        Write-Host 'Aborted.' -ForegroundColor Yellow
        exit 1
    }
}

$wrapperSql = @"
BEGIN;
SELECT '$modeLabel' AS reset_mode, NOW() AS started_at;
$(Get-Content -Raw -Path $SqlFile)
$tail
"@

$tempFile = [System.IO.Path]::GetTempFileName() + '.sql'
try {
    $utf8NoBom = New-Object System.Text.UTF8Encoding $false
    $normalized = $wrapperSql -replace "`r`n", "`n"
    [System.IO.File]::WriteAllText($tempFile, $normalized, $utf8NoBom)
    Write-Host "Running reset: $modeLabel" -ForegroundColor Cyan
    Push-Location $RepoRoot
    npx supabase db query --linked -f $tempFile
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    Write-Host "Done: $modeLabel" -ForegroundColor Green
    if ($DryRun) {
        Write-Host 'No data was changed (transaction rolled back).' -ForegroundColor Green
    } else {
        Write-Host 'Data was committed. Clear appointment-photos in Storage if needed (see README_RESET.md).' -ForegroundColor Green
    }
}
finally {
    Pop-Location
    if (Test-Path $tempFile) { Remove-Item $tempFile -Force }
}
