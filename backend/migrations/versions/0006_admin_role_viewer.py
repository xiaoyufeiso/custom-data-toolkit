"""rename admin_users.role operator -> viewer

Revision ID: 0006_admin_role_viewer
Revises: 0005_admin_user_role_enabled
Create Date: 2026-08-04
"""

from __future__ import annotations

from collections.abc import Sequence

from alembic import op

revision: str = "0006_admin_role_viewer"
down_revision: str | None = "0005_admin_user_role_enabled"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        "UPDATE admin_users SET role = 'viewer' WHERE role = 'operator'",
    )


def downgrade() -> None:
    op.execute(
        "UPDATE admin_users SET role = 'operator' WHERE role = 'viewer'",
    )
