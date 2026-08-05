"""add admin_users.role and admin_users.enabled

Revision ID: 0005_admin_user_role_enabled
Revises: 0004_customs_dict_type
Create Date: 2026-08-04
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0005_admin_user_role_enabled"
down_revision: str | None = "0004_customs_dict_type"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "admin_users",
        sa.Column(
            "role",
            sa.String(length=32),
            nullable=False,
            server_default="admin",
        ),
    )
    op.add_column(
        "admin_users",
        sa.Column(
            "enabled",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("1"),
        ),
    )
    op.alter_column("admin_users", "role", server_default=None)
    op.alter_column("admin_users", "enabled", server_default=None)


def downgrade() -> None:
    op.drop_column("admin_users", "enabled")
    op.drop_column("admin_users", "role")
