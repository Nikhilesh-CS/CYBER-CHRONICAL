"""add source retry checkpoint

Revision ID: f81d9d8cb0b2
Revises: cd82bdaef472
Create Date: 2026-07-22 20:15:00
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "f81d9d8cb0b2"
down_revision: Union[str, Sequence[str], None] = "cd82bdaef472"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("sources", sa.Column("next_attempt_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("sources", "next_attempt_at")
