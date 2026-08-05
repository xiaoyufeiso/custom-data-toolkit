"""管理端操作审计：写成功落库；仅 admin 可读；敏感字段不进 summary。"""

from __future__ import annotations

from datetime import UTC, datetime

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, select, text

from custom_data_toolkit.config.settings import settings
from custom_data_toolkit.db.engine import engine
from custom_data_toolkit.main import app
from custom_data_toolkit.models import AdminUser
from custom_data_toolkit.models.admin import AdminAuditLog, AdminRole
from custom_data_toolkit.routers.auth import CSRF_COOKIE_NAME
from custom_data_toolkit.security import hash_password


def _db_ready() -> bool:
    try:
        with Session(engine) as session:
            session.exec(text("SELECT id FROM admin_audit_log LIMIT 1"))
        return True
    except Exception:
        return False


pytestmark = pytest.mark.skipif(
    not _db_ready(),
    reason="MySQL admin_audit_log not ready",
)


@pytest.fixture()
def client() -> TestClient:
    with TestClient(app) as test_client:
        yield test_client


def _csrf_only(client: TestClient) -> dict[str, str]:
    csrf = client.get("/api/v1/auth/csrf")
    assert csrf.status_code == 200
    return {"X-CSRF-Token": csrf.json()["csrfToken"]}


def _login(client: TestClient, username: str, password: str) -> dict[str, str]:
    headers = _csrf_only(client)
    login = client.post(
        "/api/v1/auth/login",
        json={"username": username, "password": password},
        headers=headers,
    )
    assert login.status_code == 200, login.text
    token = client.cookies.get(CSRF_COOKIE_NAME)
    assert token
    return {"X-CSRF-Token": token}


def _create_viewer(username: str, password: str = "password1") -> None:
    with Session(engine) as session:
        existing = session.exec(
            select(AdminUser).where(AdminUser.username == username),
        ).first()
        if existing is not None:
            session.delete(existing)
            session.commit()
        now = datetime.now(UTC).replace(tzinfo=None)
        session.add(
            AdminUser(
                username=username,
                password_hash=hash_password(password),
                role=AdminRole.VIEWER.value,
                enabled=True,
                created_at=now,
                updated_at=now,
            ),
        )
        session.commit()


def test_admin_write_creates_audit_and_viewer_forbidden(client: TestClient) -> None:
    suffix = datetime.now(UTC).strftime("%H%M%S%f")
    admin_headers = _login(
        client,
        settings.admin_bootstrap_username,
        settings.admin_bootstrap_password,
    )

    code = f"AUD{''.join(chr(65 + int(c) % 26) for c in suffix[-4:])}"
    created = client.post(
        "/api/v1/currencies",
        json={"name": f"Audit Currency {suffix}", "code": code},
        headers=admin_headers,
    )
    assert created.status_code == 201, created.text

    listed = client.get(
        "/api/v1/audit-logs",
        params={"action": "currency.create", "pageSize": 5},
        headers=admin_headers,
    )
    assert listed.status_code == 200, listed.text
    items = listed.json()["items"]
    assert any(item["action"] == "currency.create" for item in items)
    hit = next(item for item in items if item.get("summary", {}).get("code") == code)
    assert hit["actorUsername"] == settings.admin_bootstrap_username
    assert "password" not in hit["summary"]

    detail = client.get(f"/api/v1/audit-logs/{hit['id']}", headers=admin_headers)
    assert detail.status_code == 200
    assert detail.json()["id"] == hit["id"]

    viewer_name = f"audit-viewer-{suffix}"
    _create_viewer(viewer_name)
    viewer_headers = _login(client, viewer_name, "password1")
    viewer_list = client.get("/api/v1/audit-logs", headers=viewer_headers)
    assert viewer_list.status_code == 403
    assert viewer_list.json()["code"] == "AdminUser.Forbidden"


def test_batch_delete_creates_single_audit_row(client: TestClient) -> None:
    suffix = datetime.now(UTC).strftime("%H%M%S%f")
    headers = _login(
        client,
        settings.admin_bootstrap_username,
        settings.admin_bootstrap_password,
    )

    ids: list[int] = []
    for i in range(2):
        code = f"BAT{''.join(chr(65 + int(c) % 26) for c in suffix[-3:])}{chr(65 + i)}"
        resp = client.post(
            "/api/v1/currencies",
            json={"name": f"Batch Audit {suffix}-{i}", "code": code},
            headers=headers,
        )
        assert resp.status_code == 201, resp.text
        ids.append(resp.json()["id"])

    before = client.get(
        "/api/v1/audit-logs",
        params={"action": "currency.batch_delete", "pageSize": 1},
        headers=headers,
    ).json()["total"]

    deleted = client.post(
        "/api/v1/currencies/batch-delete",
        json={"ids": ids},
        headers=headers,
    )
    assert deleted.status_code == 204, deleted.text

    after = client.get(
        "/api/v1/audit-logs",
        params={"action": "currency.batch_delete", "pageSize": 5},
        headers=headers,
    )
    assert after.status_code == 200
    assert after.json()["total"] == before + 1
    latest = after.json()["items"][0]
    assert latest["summary"]["count"] == 2
    assert str(ids[0]) in latest["resourceIds"]


def test_change_password_audit_has_no_secrets(client: TestClient) -> None:
    suffix = datetime.now(UTC).strftime("%H%M%S%f")
    username = f"audit-pwd-{suffix}"
    _create_viewer(username, password="password1")
    viewer_headers = _login(client, username, "password1")

    changed = client.post(
        "/api/v1/auth/change-password",
        json={"currentPassword": "password1", "newPassword": "password2"},
        headers=viewer_headers,
    )
    assert changed.status_code == 204, changed.text

    admin_headers = _login(
        client,
        settings.admin_bootstrap_username,
        settings.admin_bootstrap_password,
    )
    listed = client.get(
        "/api/v1/audit-logs",
        params={"action": "auth.change_password", "actorUsername": username},
        headers=admin_headers,
    )
    assert listed.status_code == 200
    items = listed.json()["items"]
    assert items
    summary = items[0]["summary"]
    assert summary.get("changed") is True
    blob = str(summary).lower()
    assert "password1" not in blob
    assert "password2" not in blob
    assert "password" not in summary


def test_export_does_not_create_audit(client: TestClient) -> None:
    headers = _login(
        client,
        settings.admin_bootstrap_username,
        settings.admin_bootstrap_password,
    )
    with Session(engine) as session:
        before = session.exec(
            select(AdminAuditLog).where(
                AdminAuditLog.action == "customs_dict_missing.export",
            ),
        ).all()
        before_count = len(before)

    exported = client.get("/api/v1/customs-dict/missing/export", headers=headers)
    assert exported.status_code == 200

    with Session(engine) as session:
        after = session.exec(
            select(AdminAuditLog).where(
                AdminAuditLog.action == "customs_dict_missing.export",
            ),
        ).all()
        assert len(after) == before_count
