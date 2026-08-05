from __future__ import annotations

from datetime import datetime

from sqlmodel import Session, col, func, select

from custom_data_toolkit.models.admin import AdminAuditLog


class AuditLogRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def add(self, row: AdminAuditLog) -> AdminAuditLog:
        self.session.add(row)
        self.session.commit()
        self.session.refresh(row)
        return row

    def get(self, log_id: int) -> AdminAuditLog | None:
        return self.session.get(AdminAuditLog, log_id)

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
        stmt = select(AdminAuditLog)
        count_stmt = select(func.count()).select_from(AdminAuditLog)

        if actor_username:
            like = f"%{actor_username.strip()}%"
            stmt = stmt.where(col(AdminAuditLog.actor_username).like(like))
            count_stmt = count_stmt.where(col(AdminAuditLog.actor_username).like(like))
        if action:
            stmt = stmt.where(AdminAuditLog.action == action.strip())
            count_stmt = count_stmt.where(AdminAuditLog.action == action.strip())
        if resource_type:
            stmt = stmt.where(AdminAuditLog.resource_type == resource_type.strip())
            count_stmt = count_stmt.where(
                AdminAuditLog.resource_type == resource_type.strip(),
            )
        if created_from is not None:
            stmt = stmt.where(AdminAuditLog.created_at >= created_from)
            count_stmt = count_stmt.where(AdminAuditLog.created_at >= created_from)
        if created_to is not None:
            stmt = stmt.where(AdminAuditLog.created_at <= created_to)
            count_stmt = count_stmt.where(AdminAuditLog.created_at <= created_to)

        total = int(self.session.exec(count_stmt).one())
        if sort_order == "asc":
            order = (col(AdminAuditLog.created_at).asc(), col(AdminAuditLog.id).asc())
        else:
            # 默认与显式 desc：时间倒序
            order = (col(AdminAuditLog.created_at).desc(), col(AdminAuditLog.id).desc())
        items = list(
            self.session.exec(
                stmt.order_by(*order)
                .offset((page - 1) * page_size)
                .limit(page_size),
            ).all(),
        )
        return items, total
