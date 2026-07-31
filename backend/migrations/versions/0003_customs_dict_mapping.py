"""create customs_dict_mapping

Revision ID: 0003_customs_dict_mapping
Revises: 0002_api_keys
Create Date: 2026-07-31
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0003_customs_dict_mapping"
down_revision: str | None = "0002_api_keys"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "customs_dict_mapping",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("dict_type", sa.String(length=32), nullable=False),
        sa.Column("raw_value", sa.String(length=255), nullable=False),
        sa.Column("standard_value", sa.String(length=255), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.text("1")),
        sa.Column("source", sa.String(length=32), nullable=False, server_default="manual"),
        sa.Column(
            "sync_status", sa.String(length=32), nullable=False, server_default="pending"
        ),
        sa.Column("sync_error", sa.String(length=512), nullable=True),
        sa.Column("last_synced_at", sa.DateTime(timezone=False), nullable=True),
        sa.Column("created_by", sa.BigInteger(), nullable=True),
        sa.Column("updated_by", sa.BigInteger(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=False), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=False), nullable=False),
        sa.ForeignKeyConstraint(["created_by"], ["admin_users.id"]),
        sa.ForeignKeyConstraint(["updated_by"], ["admin_users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("dict_type", "raw_value", name="uq_customs_dict_type_raw"),
    )
    op.create_index("ix_customs_dict_mapping_dict_type", "customs_dict_mapping", ["dict_type"])


def downgrade() -> None:
    op.drop_index("ix_customs_dict_mapping_dict_type", table_name="customs_dict_mapping")
    op.drop_table("customs_dict_mapping")
