"""认证 API 契约测试。

环境未就绪或未跑迁移时，整模块 skip。
配好 MySQL + alembic upgrade 后：
  cd backend && uv run pytest tests/integration/test_auth_api.py -q
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, text

from custom_data_toolkit.config.settings import settings
from custom_data_toolkit.db.engine import engine
from custom_data_toolkit.main import app
from custom_data_toolkit.routers.auth import CSRF_COOKIE_NAME


def _db_ready() -> bool:
    try:
        with Session(engine) as session:
            session.exec(text("SELECT 1"))
            session.exec(text("SELECT 1 FROM admin_users LIMIT 1"))
        return True
    except Exception:
        return False


pytestmark = pytest.mark.skipif(not _db_ready(), reason="MySQL/auth tables not ready")


@pytest.fixture()
def client() -> TestClient:
    with TestClient(app) as test_client:
        yield test_client


def _csrf_headers(client: TestClient) -> dict[str, str]:
    res = client.get("/api/v1/auth/csrf")
    assert res.status_code == 200
    token = res.json()["csrfToken"]
    assert client.cookies.get(CSRF_COOKIE_NAME)
    return {"X-CSRF-Token": token}


def test_login_success_and_me(client: TestClient) -> None:
    headers = _csrf_headers(client)
    login = client.post(
        "/api/v1/auth/login",
        json={"username": settings.admin_bootstrap_username, "password": settings.admin_bootstrap_password},
        headers=headers,
    )
    assert login.status_code == 200
    body = login.json()
    assert body["username"] == settings.admin_bootstrap_username
    assert body["role"] == "admin"
    assert body["enabled"] is True
    assert "password" not in body

    me = client.get("/api/v1/auth/me")
    assert me.status_code == 200
    assert me.json()["username"] == settings.admin_bootstrap_username
    assert me.json()["role"] == "admin"
    assert me.json()["enabled"] is True


def test_login_failed_generic(client: TestClient) -> None:
    headers = _csrf_headers(client)
    res = client.post(
        "/api/v1/auth/login",
        json={"username": "no-such-user", "password": "wrong"},
        headers=headers,
    )
    assert res.status_code == 401
    assert res.json()["code"] == "Auth.LoginFailed"


def test_write_without_csrf_rejected_on_change_password(client: TestClient) -> None:
    headers = _csrf_headers(client)
    client.post(
        "/api/v1/auth/login",
        json={"username": settings.admin_bootstrap_username, "password": settings.admin_bootstrap_password},
        headers=headers,
    )
    res = client.post(
        "/api/v1/auth/change-password",
        json={"currentPassword": "x", "newPassword": "y"},
    )
    assert res.status_code == 403
    assert res.json()["code"] == "Auth.CsrfFailed"


def test_logout_then_me_unauthorized(client: TestClient) -> None:
    headers = _csrf_headers(client)
    client.post(
        "/api/v1/auth/login",
        json={"username": settings.admin_bootstrap_username, "password": settings.admin_bootstrap_password},
        headers=headers,
    )
    out = client.post("/api/v1/auth/logout")
    assert out.status_code == 204
    me = client.get("/api/v1/auth/me")
    assert me.status_code == 401
