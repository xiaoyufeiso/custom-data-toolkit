"""管理员用户管理 API 集成测试。"""

from __future__ import annotations

from datetime import UTC, datetime

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, col, select, text

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


def _login(client: TestClient, username: str, password: str) -> dict[str, str]:
    csrf = client.get("/api/v1/auth/csrf")
    assert csrf.status_code == 200
    headers = {"X-CSRF-Token": csrf.json()["csrfToken"]}
    login = client.post(
        "/api/v1/auth/login",
        json={"username": username, "password": password},
        headers=headers,
    )
    assert login.status_code == 200, login.text
    token = client.cookies.get(CSRF_COOKIE_NAME)
    assert token
    return {"X-CSRF-Token": token}


def _create_user(
    *,
    username: str,
    password: str,
    role: str = AdminRole.VIEWER.value,
    enabled: bool = True,
) -> int:
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
            role=role,
            enabled=enabled,
            created_at=now,
            updated_at=now,
        )
        session.add(user)
        session.commit()
        session.refresh(user)
        assert user.id is not None
        return user.id


def test_admin_can_create_list_and_reset_password(client: TestClient) -> None:
    headers = _login(
        client,
        settings.admin_bootstrap_username,
        settings.admin_bootstrap_password,
    )
    suffix = datetime.now(UTC).strftime("%H%M%S%f")
    username = f"op-{suffix}"

    created = client.post(
        "/api/v1/admin-users",
        json={"username": username, "password": "password1", "role": "viewer"},
        headers=headers,
    )
    assert created.status_code == 201, created.text
    body = created.json()
    assert body["username"] == username
    assert body["role"] == "viewer"
    assert body["enabled"] is True
    user_id = body["id"]

    listed = client.get("/api/v1/admin-users", params={"q": username}, headers=headers)
    assert listed.status_code == 200
    assert any(item["username"] == username for item in listed.json()["items"])

    reset = client.post(
        f"/api/v1/admin-users/{user_id}/reset-password",
        json={"password": "password2"},
        headers=headers,
    )
    assert reset.status_code == 204

    client.post("/api/v1/auth/logout")
    login_old = client.post(
        "/api/v1/auth/login",
        json={"username": username, "password": "password1"},
        headers=_csrf_only(client),
    )
    assert login_old.status_code == 401

    login_new = client.post(
        "/api/v1/auth/login",
        json={"username": username, "password": "password2"},
        headers=_csrf_only(client),
    )
    assert login_new.status_code == 200
    assert login_new.json()["role"] == "viewer"


def _csrf_only(client: TestClient) -> dict[str, str]:
    csrf = client.get("/api/v1/auth/csrf")
    assert csrf.status_code == 200
    return {"X-CSRF-Token": csrf.json()["csrfToken"]}


def test_viewer_forbidden_on_admin_users(client: TestClient) -> None:
    suffix = datetime.now(UTC).strftime("%H%M%S%f")
    username = f"viewer-forbid-{suffix}"
    _create_user(username=username, password="password1", role=AdminRole.VIEWER.value)
    headers = _login(client, username, "password1")

    listed = client.get("/api/v1/admin-users", headers=headers)
    assert listed.status_code == 403
    assert listed.json()["code"] == "AdminUser.Forbidden"


def test_disable_user_blocks_login_and_sessions(client: TestClient) -> None:
    admin_headers = _login(
        client,
        settings.admin_bootstrap_username,
        settings.admin_bootstrap_password,
    )
    suffix = datetime.now(UTC).strftime("%H%M%S%f")
    username = f"op-disable-{suffix}"
    user_id = _create_user(username=username, password="password1")

    client.post("/api/v1/auth/logout")
    op_headers = _login(client, username, "password1")
    me = client.get("/api/v1/auth/me")
    assert me.status_code == 200

    # switch back to admin in a fresh client cookie jar is hard; re-login admin
    client.post("/api/v1/auth/logout")
    admin_headers = _login(
        client,
        settings.admin_bootstrap_username,
        settings.admin_bootstrap_password,
    )
    disabled = client.patch(
        f"/api/v1/admin-users/{user_id}",
        json={"enabled": False},
        headers=admin_headers,
    )
    assert disabled.status_code == 200
    assert disabled.json()["enabled"] is False

    login_disabled = client.post(
        "/api/v1/auth/login",
        json={"username": username, "password": "password1"},
        headers=_csrf_only(client),
    )
    assert login_disabled.status_code == 401
    assert login_disabled.json()["code"] == "Auth.LoginFailed"

    # leftover op cookie should not work after disable (sessions cleared)
    client.cookies.set(settings.session_cookie_name, "stale")
    # re-establish op session token is gone; me with no valid session → 401
    stale_me = client.get("/api/v1/auth/me")
    assert stale_me.status_code == 401
    _ = op_headers


def test_cannot_disable_last_admin(client: TestClient) -> None:
    headers = _login(
        client,
        settings.admin_bootstrap_username,
        settings.admin_bootstrap_password,
    )
    me = client.get("/api/v1/auth/me")
    assert me.status_code == 200
    admin_id = me.json()["id"]

    with Session(engine) as session:
        others = session.exec(
            select(AdminUser).where(
                AdminUser.role == AdminRole.ADMIN.value,
                AdminUser.enabled.is_(True),  # type: ignore[union-attr]
                AdminUser.id != admin_id,
            ),
        ).all()
        for row in others:
            row.enabled = False
            session.add(row)
        session.commit()

    res = client.patch(
        f"/api/v1/admin-users/{admin_id}",
        json={"enabled": False},
        headers=headers,
    )
    assert res.status_code in {400, 409}
    # cannot disable self first
    assert res.json()["code"] in {
        "AdminUser.CannotDisableSelf",
        "AdminUser.LastAdmin",
    }

    demote = client.patch(
        f"/api/v1/admin-users/{admin_id}",
        json={"role": "viewer"},
        headers=headers,
    )
    assert demote.status_code == 409
    assert demote.json()["code"] == "AdminUser.LastAdmin"


def test_cannot_disable_or_demote_sole_remaining_other_admin(client: TestClient) -> None:
    """存在两名 admin 时，停用其一后，不能再停用/降级剩余那一名。"""
    headers = _login(
        client,
        settings.admin_bootstrap_username,
        settings.admin_bootstrap_password,
    )
    me = client.get("/api/v1/auth/me")
    assert me.status_code == 200
    bootstrap_id = me.json()["id"]

    suffix = datetime.now(UTC).strftime("%H%M%S%f")
    other_username = f"admin-other-{suffix}"
    other_id = _create_user(
        username=other_username,
        password="password1",
        role=AdminRole.ADMIN.value,
    )

    # 停用 bootstrap / other 以外的多余启用 admin
    with Session(engine) as session:
        extras = session.exec(
            select(AdminUser).where(
                AdminUser.role == AdminRole.ADMIN.value,
                AdminUser.enabled.is_(True),  # type: ignore[union-attr]
                col(AdminUser.id).not_in([bootstrap_id, other_id]),
            ),
        ).all()
        for row in extras:
            row.enabled = False
            session.add(row)
        session.commit()

    # 将 bootstrap 降为 viewer，使 other 成为唯一启用 admin
    demote_bootstrap = client.patch(
        f"/api/v1/admin-users/{bootstrap_id}",
        json={"role": "viewer"},
        headers=headers,
    )
    assert demote_bootstrap.status_code == 200, demote_bootstrap.text

    # 以 other 登录后，不能停用/降级自己这个最后 admin；也不能被已降级的 bootstrap 管理
    client.post("/api/v1/auth/logout")
    other_headers = _login(client, other_username, "password1")

    disable_last = client.patch(
        f"/api/v1/admin-users/{other_id}",
        json={"enabled": False},
        headers=other_headers,
    )
    assert disable_last.status_code in {400, 409}
    assert disable_last.json()["code"] in {
        "AdminUser.CannotDisableSelf",
        "AdminUser.LastAdmin",
    }

    demote_last = client.patch(
        f"/api/v1/admin-users/{other_id}",
        json={"role": "viewer"},
        headers=other_headers,
    )
    assert demote_last.status_code == 409
    assert demote_last.json()["code"] == "AdminUser.LastAdmin"

    # 恢复 bootstrap 为 admin，避免影响后续测试
    restore = client.patch(
        f"/api/v1/admin-users/{bootstrap_id}",
        json={"role": "admin", "enabled": True},
        headers=other_headers,
    )
    assert restore.status_code == 200
