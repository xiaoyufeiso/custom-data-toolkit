"""create customs_dict_type with seed country/continent

Revision ID: 0004_customs_dict_type
Revises: 0003_customs_dict_mapping
Create Date: 2026-08-03
"""

from __future__ import annotations

from collections.abc import Sequence
from datetime import datetime

import sqlalchemy as sa
from alembic import op

revision: str = "0004_customs_dict_type"
down_revision: str | None = "0003_customs_dict_mapping"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "customs_dict_type",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("code", sa.String(length=32), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.text("1")),
        sa.Column("created_by", sa.BigInteger(), nullable=True),
        sa.Column("updated_by", sa.BigInteger(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=False), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=False), nullable=False),
        sa.ForeignKeyConstraint(["created_by"], ["admin_users.id"]),
        sa.ForeignKeyConstraint(["updated_by"], ["admin_users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("code", name="uq_customs_dict_type_code"),
    )
    op.create_index("ix_customs_dict_type_code", "customs_dict_type", ["code"])

    now = datetime(2026, 8, 3, 0, 0, 0)
    op.bulk_insert(
        sa.table(
            "customs_dict_type",
            sa.column("code", sa.String),
            sa.column("name", sa.String),
            sa.column("enabled", sa.Boolean),
            sa.column("created_at", sa.DateTime),
            sa.column("updated_at", sa.DateTime),
        ),
        [
            {
                "code": "country",
                "name": "国家",
                "enabled": True,
                "created_at": now,
                "updated_at": now,
            },
            {
                "code": "continent",
                "name": "洲",
                "enabled": True,
                "created_at": now,
                "updated_at": now,
            },
        ],
    )


def downgrade() -> None:
    op.drop_index("ix_customs_dict_type_code", table_name="customs_dict_type")
    op.drop_table("customs_dict_type")
