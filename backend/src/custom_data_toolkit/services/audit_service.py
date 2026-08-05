from __future__ import annotations

import json
import logging
from datetime import UTC, datetime
from typing import Any

from sqlmodel import Session

from custom_data_toolkit.db.engine import engine
from custom_data_toolkit.middleware.error_handler import NotFoundException
from custom_data_toolkit.models.admin import AdminAuditLog
from custom_data_toolkit.repositories.audit_log_repository import AuditLogRepository
from custom_data_toolkit.services.auth_service import AuthContext

logger = logging.getLogger(__name__)

_RESOURCE_IDS_MAX = 2000
_SUMMARY_MAX = 4000


def _join_ids(ids: list[Any] | None) -> str:
    if not ids:
        return ""
    text = ",".join(str(item) for item in ids)
    if len(text) <= _RESOURCE_IDS_MAX:
        return text
    return text[: _RESOURCE_IDS_MAX - 3] + "..."


def _dump_summary(summary: dict[str, Any] | None) -> str:
    payload = summary or {}
    text = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
    if len(text) <= _SUMMARY_MAX:
        return text
    return text[: _SUMMARY_MAX - 3] + "..."


class AuditService:
    def __init__(self, repository: AuditLogRepository) -> None:
        self.repository = repository

    def list_page(
        self,
        *,
        actor_username: str | None,
        action: str | None,
        resource_type: str | None,
        created_from: datetime | None,
        created_to: datetime | None,
        sort_order: str | None,
        page: int,
        page_size: int,
    ) -> tuple[list[AdminAuditLog], int]:
        return self.repository.list_page(
            actor_username=actor_username,
            action=action,
            resource_type=resource_type,
            created_from=created_from,
            created_to=created_to,
            sort_order=sort_order,
            page=page,
            page_size=page_size,
        )

    def get(self, log_id: int) -> AdminAuditLog:
        row = self.repository.get(log_id)
        if row is None:
            raise NotFoundException("审计记录不存在。", error_code="Audit.NotFound")
        return row


def record_admin_audit(
    auth: AuthContext,
    *,
    action: str,
    resource_type: str,
    resource_ids: list[Any] | None = None,
    summary: dict[str, Any] | None = None,
) -> None:
    """Best-effort append; never raises to callers."""
    try:
        now = datetime.now(UTC).replace(tzinfo=None)
        row = AdminAuditLog(
            actor_user_id=auth.user.id,
            actor_username=auth.user.username,
            action=action,
            resource_type=resource_type,
            resource_ids=_join_ids(resource_ids),
            summary=_dump_summary(summary),
            created_at=now,
        )
        with Session(engine) as session:
            AuditLogRepository(session).add(row)
    except Exception:  # noqa: BLE001 — 审计不得阻断业务
        logger.exception("failed to record admin audit action=%s", action)
