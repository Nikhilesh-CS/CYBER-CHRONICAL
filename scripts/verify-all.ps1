$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$python = Join-Path $root ".venv\Scripts\python.exe"
if (-not (Test-Path -LiteralPath $python)) {
    throw "Python environment is missing. Create .venv and install services/api[dev] first."
}

function Assert-CommandSucceeded([string]$step) {
    if ($LASTEXITCODE -ne 0) { throw "$step failed with exit code $LASTEXITCODE" }
}

Push-Location $root
try {
    & $python -m ruff check services\api\src services\api\tests
    Assert-CommandSucceeded "Python lint"
    & $python -m pytest services\api\tests -m "not integration"
    Assert-CommandSucceeded "Offline backend tests"
    & (Join-Path $PSScriptRoot "verify-postgres.ps1")
    npm run lint
    Assert-CommandSucceeded "Frontend lint"
    npm test
    Assert-CommandSucceeded "Frontend tests"
}
finally {
    Pop-Location
}
