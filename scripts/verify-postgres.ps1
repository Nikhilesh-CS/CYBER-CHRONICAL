$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$composeFile = Join-Path $root "infra\docker-compose.test.yml"
$python = Join-Path $root ".venv\Scripts\python.exe"
$serviceRoot = Join-Path $root "services\api"
$databaseUrl = "postgresql+psycopg://cyber_chronicle:cyber_chronicle_test_only@127.0.0.1:55432/cyber_chronicle_test"

function Assert-CommandSucceeded([string]$step) {
    if ($LASTEXITCODE -ne 0) { throw "$step failed with exit code $LASTEXITCODE" }
}

if (-not (Test-Path -LiteralPath $python)) {
    throw "Python environment is missing. Create .venv and install services/api[dev] first."
}

docker compose -f $composeFile up -d --wait
Assert-CommandSucceeded "PostgreSQL container startup"
try {
    $env:CYBER_CHRONICLE_DATABASE_URL = $databaseUrl
    $env:CYBER_CHRONICLE_TEST_DATABASE_URL = $databaseUrl
    Push-Location $serviceRoot
    try {
        & $python -m alembic downgrade base
        Assert-CommandSucceeded "Initial migration cleanup"
        & $python -m alembic upgrade head
        Assert-CommandSucceeded "PostgreSQL migration upgrade"
        & $python -m pytest tests\test_postgres_integration.py -m integration
        Assert-CommandSucceeded "PostgreSQL integration tests"
        & $python -m alembic check
        Assert-CommandSucceeded "Migration drift check"
        & $python -m alembic downgrade base
        Assert-CommandSucceeded "Migration downgrade"
        & $python -m alembic upgrade head
        Assert-CommandSucceeded "Migration re-upgrade"
    }
    finally {
        Pop-Location
    }
}
finally {
    Remove-Item Env:CYBER_CHRONICLE_DATABASE_URL -ErrorAction SilentlyContinue
    Remove-Item Env:CYBER_CHRONICLE_TEST_DATABASE_URL -ErrorAction SilentlyContinue
    docker compose -f $composeFile down --volumes
    Assert-CommandSucceeded "PostgreSQL container cleanup"
}
