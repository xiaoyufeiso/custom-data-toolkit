"""海关缺失字典：正式同步失败时不删除 missing。"""

from __future__ import annotations

from datetime import UTC, datetime

import fakeredis
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
from custom_data_toolkit.services.customs_dict_redis import (
    CustomsDictRedisStore,
    missing_dict_key,
)
from custom_data_toolkit.services.customs_dict_service import CustomsDictService


class _FailFormalStore(CustomsDictRedisStore):
    def put(self, *, dict_type: str, raw_value: str, standard_value: str) -> None:
        raise RuntimeError("formal hash unavailable")

    def remove_missing(self, *, dict_type: str, raw_value: str) -> None:
        raise AssertionError("must not zrem when formal sync failed")


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
def fake_redis() -> fakeredis.FakeRedis:
    client = fakeredis.FakeRedis(decode_responses=True)
    yield client
    client.flushall()


@pytest.fixture()
def client(fake_redis: fakeredis.FakeRedis):
    def _override(session: SessionDep) -> CustomsDictService:
        return CustomsDictService(
            CustomsDictRepository(session),
            _FailFormalStore(fake_redis),
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


def test_missing_handle_keeps_zset_when_formal_sync_fails(
    client: TestClient,
    fake_redis: fakeredis.FakeRedis,
) -> None:
    headers = _login(client)
    raw = f"同步失败缺失-{datetime.now(UTC).strftime('%H%M%S%f')}"
    key = missing_dict_key("continent")
    fake_redis.zadd(key, {raw: 3})

    handled = client.post(
        "/api/v1/customs-dict/missing/handle",
        json={"dictType": "continent", "rawValue": raw, "standardValue": "ASIA"},
        headers=headers,
    )
    assert handled.status_code == 200, handled.text
    assert handled.json()["syncStatus"] == "failed"
    assert fake_redis.zscore(key, raw) == 3
