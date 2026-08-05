#!/usr/bin/env python3
"""向 MySQL 写入覆盖全部审计 action 的测试数据。

用法（在 backend 目录）:
  uv run python scripts/seed_audit_logs.py
  uv run python scripts/seed_audit_logs.py --replace
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import UTC, datetime, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from sqlmodel import Session, col, select  # noqa: E402

from custom_data_toolkit.config.settings import settings  # noqa: E402
from custom_data_toolkit.db.engine import engine  # noqa: E402
from custom_data_toolkit.models import AdminUser  # noqa: E402
from custom_data_toolkit.models.admin import AdminAuditLog  # noqa: E402

# (action, resource_type, resource_ids, summary)
SEED_ACTIONS: list[tuple[str, str, str, dict]] = [
    ("currency.create", "currency", "9001", {"name": "测试货币", "code": "TST"}),
    ("currency.update", "currency", "9001", {"name": "测试货币改", "code": "TST"}),
    ("currency.delete", "currency", "9002", {"count": 1}),
    ("currency.batch_delete", "currency", "9003,9004,9005", {"count": 3}),
    (
        "rate.create",
        "rate",
        "9101",
        {"currencyId": 9001, "currencyCode": "TST", "date": "2026-08-01"},
    ),
    (
        "rate.update",
        "rate",
        "9101",
        {"currencyCode": "TST", "date": "2026-08-01", "checked": True},
    ),
    ("rate.delete", "rate", "9102", {"count": 1}),
    ("rate.batch_delete", "rate", "9103,9104", {"count": 2}),
    ("rate.batch_check", "rate", "9105,9106,9107", {"count": 3}),
    (
        "customs_dict_type.create",
        "customs_dict_type",
        "9201",
        {"code": "demo_type", "name": "演示类型"},
    ),
    (
        "customs_dict_type.update",
        "customs_dict_type",
        "9201",
        {"code": "demo_type", "name": "演示类型改"},
    ),
    ("customs_dict_type.enable", "customs_dict_type", "9201", {"code": "demo_type"}),
    ("customs_dict_type.disable", "customs_dict_type", "9201", {"code": "demo_type"}),
    (
        "customs_dict_mapping.create",
        "customs_dict_mapping",
        "9301",
        {"dictType": "country", "rawValue": "USA", "standardValue": "美国"},
    ),
    (
        "customs_dict_mapping.update",
        "customs_dict_mapping",
        "9301",
        {"dictType": "country", "rawValue": "USA", "standardValue": "美利坚"},
    ),
    (
        "customs_dict_mapping.enable",
        "customs_dict_mapping",
        "9301",
        {"rawValue": "USA"},
    ),
    (
        "customs_dict_mapping.disable",
        "customs_dict_mapping",
        "9301",
        {"rawValue": "USA"},
    ),
    (
        "customs_dict_mapping.resync",
        "customs_dict_mapping",
        "9301",
        {"rawValue": "USA", "syncStatus": "synced"},
    ),
    (
        "customs_dict_mapping.batch_disable",
        "customs_dict_mapping",
        "9302,9303",
        {"count": 2},
    ),
    (
        "customs_dict_mapping.batch_resync",
        "customs_dict_mapping",
        "9302,9303",
        {"count": 2},
    ),
    (
        "customs_dict_mapping.import",
        "customs_dict_mapping",
        "",
        {"created": 5, "updated": 2, "failed": 1},
    ),
    (
        "customs_dict_missing.handle",
        "customs_dict_missing",
        "9304",
        {"dictType": "country", "rawValue": "KOR", "standardValue": "韩国"},
    ),
    (
        "admin_user.create",
        "admin_user",
        "9501",
        {"username": "demo_viewer", "role": "viewer"},
    ),
    (
        "admin_user.update",
        "admin_user",
        "9501",
        {"username": "demo_viewer", "role": "viewer", "enabled": False},
    ),
    ("admin_user.reset_password", "admin_user", "9501", {"reset": True}),
    ("auth.change_password", "admin_user", "1", {"changed": True}),
]

SEED_TAG = {"seed": "seed_audit_logs"}


def main() -> int:
    parser = argparse.ArgumentParser(description="Seed admin_audit_log test rows")
    parser.add_argument(
        "--replace",
        action="store_true",
        help="先删除本脚本标记的旧种子行再写入",
    )
    args = parser.parse_args()

    with Session(engine) as session:
        actor = session.exec(
            select(AdminUser).where(
                AdminUser.username == settings.admin_bootstrap_username,
            ),
        ).first()
        if actor is None:
            print(
                f"bootstrap admin '{settings.admin_bootstrap_username}' not found",
                file=sys.stderr,
            )
            return 1

        if args.replace:
            old = session.exec(
                select(AdminAuditLog).where(
                    col(AdminAuditLog.summary).like('%"seed":"seed_audit_logs"%'),
                ),
            ).all()
            for row in old:
                session.delete(row)
            session.commit()
            print(f"removed {len(old)} previous seed rows")

        # 前端暂无入口：清理 API Key / 重放同步相关审计（含历史种子）
        retired = session.exec(
            select(AdminAuditLog).where(
                col(AdminAuditLog.action).in_(
                    [
                        "api_key.create",
                        "api_key.update",
                        "api_key.delete",
                        "customs_dict_mapping.replay_sync",
                    ],
                ),
            ),
        ).all()
        for row in retired:
            session.delete(row)
        if retired:
            session.commit()
            print(f"removed {len(retired)} retired api_key/replay_sync rows")

        now = datetime.now(UTC).replace(tzinfo=None)
        for index, (action, resource_type, resource_ids, summary) in enumerate(
            SEED_ACTIONS,
        ):
            payload = {**summary, **SEED_TAG}
            session.add(
                AdminAuditLog(
                    actor_user_id=actor.id,
                    actor_username=actor.username,
                    action=action,
                    resource_type=resource_type,
                    resource_ids=resource_ids,
                    summary=json.dumps(payload, ensure_ascii=False, separators=(",", ":")),
                    created_at=now - timedelta(minutes=len(SEED_ACTIONS) - index),
                ),
            )
        session.commit()
        print(f"inserted {len(SEED_ACTIONS)} audit seed rows for actor={actor.username}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
