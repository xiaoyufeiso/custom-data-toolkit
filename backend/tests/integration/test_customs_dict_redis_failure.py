"""海关标准字典 Redis 失败不回滚 MySQL。"""

from __future__ import annotations

from datetime import UTC, datetime

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlmodel import Session

from custom_data_toolkit.config.settings import settings
from custom_data_toolkit.db.engine import engine
from custom_data_toolkit.deps import SessionDep
from custom_data_toolkit.main import app
from custom_data_toolkit.repositories.customs_dict_repository import CustomsDictRepository
from custom_data_toolkit.routers.auth import CSRF_COOKIE_NAME
from custom_data_toolkit.routers.customs_dict import get_customs_dict_service
from custom_data_toolkit.services.customs_dict_redis import CustomsDictRedisStore
from custom_data_toolkit.services.customs_dict_service import CustomsDictService


class _FailingRedis:
    def hset(self, name: str, key: str | None = None, value: str | None = None) -> int:
        raise RuntimeError("redis://user:super-secret@127.0.0.1:6379/0 down")

    def hdel(self, name: str, *keys: str) -> int:
        raise RuntimeError("redis://user:super-secret@127.0.0.1:6379/0 down")


def _db_ready() -> bool:
    try:
        with Session(engine) as session:
            session.exec(text("SELECT 1 FROM admin_users LIMIT 1"))
            session.exec(text("SELECT 1 FROM customs_dict_mapping LIMIT 1"))
        return True
    except Exception:
        return False


pytestmark = pytest.mark.skipif(
    not _db_ready(),
    reason="MySQL admin/customs_dict_mapping tables not ready",
)


@pytest.fixture()
def client():
    def _override(session: SessionDep) -> CustomsDictService:
        return CustomsDictService(
            CustomsDictRepository(session),
            CustomsDictRedisStore(_FailingRedis()),
        )

    app.dependency_overrides[get_customs_dict_service] = _override
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.pop(get_customs_dict_service, None)


def _login(client: TestClient) -> dict[str, str]:
    csrf = client.get("/api/v1/auth/csrf")
    assert csrf.status_code == 200
    headers = {"X-CSRF-Token": csrf.json()["csrfToken"]}
    login = client.post(
        "/api/v1/auth/login",
        json={
            "username": settings.admin_bootstrap_username,
            "password": settings.admin_bootstrap_password,
        },
        headers=headers,
    )
    assert login.status_code == 200
    token = client.cookies.get(CSRF_COOKIE_NAME)
    assert token
    return {"X-CSRF-Token": token}


def test_redis_failure_keeps_mysql_and_marks_failed(client: TestClient) -> None:
    headers = _login(client)
    raw = f"失败映射-{datetime.now(UTC).strftime('%H%M%S%f')}"
    created = client.post(
        "/api/v1/customs-dict/mappings",
        json={"dictType": "continent", "rawValue": raw, "standardValue": "ASIA"},
        headers=headers,
    )
    assert created.status_code == 201, created.text
    body = created.json()
    assert body["syncStatus"] == "failed"
    assert "super-secret" not in (body.get("syncError") or "")

    listed = client.get(
        "/api/v1/customs-dict/mappings",
        params={"dictType": "continent", "rawValue": raw},
        headers=headers,
    )
    assert listed.status_code == 200
    assert listed.json()["total"] >= 1
