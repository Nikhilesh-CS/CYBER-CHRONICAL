import os
import subprocess
import sys
from pathlib import Path


def test_initial_migration_upgrades_and_downgrades(tmp_path: Path) -> None:
    service_root = Path(__file__).resolve().parents[1]
    database_url = f"sqlite:///{(tmp_path / 'migration.db').as_posix()}"
    environment = {**os.environ, "CYBER_CHRONICLE_DATABASE_URL": database_url}
    upgrade = subprocess.run(
        [sys.executable, "-m", "alembic", "upgrade", "head"],
        cwd=service_root,
        env=environment,
        capture_output=True,
        text=True,
        timeout=30,
    )
    assert upgrade.returncode == 0, upgrade.stderr
    downgrade = subprocess.run(
        [sys.executable, "-m", "alembic", "downgrade", "base"],
        cwd=service_root,
        env=environment,
        capture_output=True,
        text=True,
        timeout=30,
    )
    assert downgrade.returncode == 0, downgrade.stderr
