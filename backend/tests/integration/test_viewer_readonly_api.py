"""viewer 只读：可读/可导出，不可写。"""

from __future__ import annotations

from datetime import UTC, datetime

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, select, text

from custom_data_toolkit.config.settings import settings
from custom_data_toolkit.db.engine import engine
from custom_data_toolkit.main import app
from custom_data_toolkit.models import AdminUser
from custom_data_toolkit.models.admin import AdminRole
from custom_data_toolkit.routers.auth import CSRF_COOKIE_NAME
from custom_data_toolkit.security import hash_password


def _db_ready() -> bool:
    try:
        with Session(engine) as session:
            session.exec(text("SELECT role, enabled FROM admin_users LIMIT 1"))
        return True
    except Exception:
        return False


pytestmark = pytest.mark.skipif(
    not _db_ready(),
    reason="MySQL admin_users.role/enabled not ready",
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


def _create_viewer(username: str, password: str = "password1") -> int:
    with Session(engine) as session:
        existing = session.exec(
            select(AdminUser).where(AdminUser.username == username),
        ).first()
        if existing is not None:
            session.delete(existing)
            session.commit()
        now = datetime.now(UTC).replace(tzinfo=None)
        user = AdminUser(
            username=username,
            password_hash=hash_password(password),
            role=AdminRole.VIEWER.value,
            enabled=True,
            created_at=now,
            updated_at=now,
        )
        session.add(user)
        session.commit()
        session.refresh(user)
        assert user.id is not None
        return user.id


def test_viewer_can_read_and_export_but_not_write(client: TestClient) -> None:
    suffix = datetime.now(UTC).strftime("%H%M%S%f")
    username = f"viewer-ro-{suffix}"
    _create_viewer(username)
    headers = _login(client, username, "password1")

    listed = client.get("/api/v1/currencies", headers=headers)
    assert listed.status_code == 200

    rates = client.get("/api/v1/rates", headers=headers)
    assert rates.status_code == 200

    missing = client.get("/api/v1/customs-dict/missing", headers=headers)
    assert missing.status_code == 200

    export_missing = client.get("/api/v1/customs-dict/missing/export", headers=headers)
    assert export_missing.status_code == 200
    assert "spreadsheetml" in export_missing.headers.get("content-type", "")

    export_mappings = client.get("/api/v1/customs-dict/mappings/export", headers=headers)
    assert export_mappings.status_code == 200

    create = client.post(
        "/api/v1/currencies",
        json={"name": f"viewer-blocked-{suffix}", "code": "VBX"},
        headers=headers,
    )
    assert create.status_code == 403
    assert create.json()["code"] == "Auth.Forbidden"

    template = client.get(
        "/api/v1/customs-dict/mappings/import-template",
        headers=headers,
    )
    assert template.status_code == 403
    assert template.json()["code"] == "Auth.Forbidden"

    api_keys = client.get("/api/v1/api-keys", headers=headers)
    assert api_keys.status_code == 403
    assert api_keys.json()["code"] == "Auth.Forbidden"

    _ = settings  # keep settings import used for consistency with other tests
