"""海关标准字典批量停用 / 批量同步集成测试。"""

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
    formal_dict_key,
)
from custom_data_toolkit.services.customs_dict_service import CustomsDictService


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
            CustomsDictRedisStore(fake_redis),
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


def _create_mapping(client: TestClient, headers: dict[str, str], raw: str) -> int:
    created = client.post(
        "/api/v1/customs-dict/mappings",
        json={"dictType": "country", "rawValue": raw, "standardValue": "STD"},
        headers=headers,
    )
    assert created.status_code == 201, created.text
    return created.json()["id"]


def test_batch_disable_soft_deletes_and_hdel(
    client: TestClient,
    fake_redis: fakeredis.FakeRedis,
) -> None:
    headers = _login(client)
    suffix = datetime.now(UTC).strftime("%H%M%S%f")
    id1 = _create_mapping(client, headers, f"batch-a-{suffix}")
    id2 = _create_mapping(client, headers, f"batch-b-{suffix}")
    assert fake_redis.hget(formal_dict_key("country"), f"batch-a-{suffix}") == "STD"

    response = client.post(
        "/api/v1/customs-dict/mappings/batch-disable",
        json={"ids": [id1, id2]},
        headers=headers,
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["disabled"] == 2
    assert body["syncFailed"] == 0
    assert body["failedIds"] == []
    assert fake_redis.hget(formal_dict_key("country"), f"batch-a-{suffix}") is None

    detail = client.get(f"/api/v1/customs-dict/mappings/{id1}", headers=headers)
    assert detail.status_code == 200
    assert detail.json()["enabled"] is False
    assert detail.json()["syncStatus"] == "synced"


def test_batch_disable_stale_selection_does_not_change(client: TestClient) -> None:
    headers = _login(client)
    suffix = datetime.now(UTC).strftime("%H%M%S%f")
    mapping_id = _create_mapping(client, headers, f"batch-stale-{suffix}")

    response = client.post(
        "/api/v1/customs-dict/mappings/batch-disable",
        json={"ids": [mapping_id, 9_999_999_001]},
        headers=headers,
    )
    assert response.status_code == 409
    assert response.json()["code"] == "BatchDelete.StaleSelection"

    detail = client.get(f"/api/v1/customs-dict/mappings/{mapping_id}", headers=headers)
    assert detail.json()["enabled"] is True


def test_batch_resync_reports_partial_failure(client: TestClient) -> None:
    headers = _login(client)
    suffix = datetime.now(UTC).strftime("%H%M%S%f")
    id1 = _create_mapping(client, headers, f"resync-a-{suffix}")
    id2 = _create_mapping(client, headers, f"resync-b-{suffix}")

    failing = fakeredis.FakeRedis(decode_responses=True)

    class _FailPut(CustomsDictRedisStore):
        def put(self, *, dict_type: str, raw_value: str, standard_value: str) -> None:
            if "resync-b-" in raw_value:
                raise RuntimeError("redis://127.0.0.1:6379 fail-b")
            failing.hset(formal_dict_key(dict_type), raw_value, standard_value)

        def remove(self, *, dict_type: str, raw_value: str) -> None:
            failing.hdel(formal_dict_key(dict_type), raw_value)

        def remove_missing(self, *, dict_type: str, raw_value: str) -> None:
            return None

    def _fail_override(session: SessionDep) -> CustomsDictService:
        return CustomsDictService(CustomsDictRepository(session), _FailPut(failing))

    app.dependency_overrides[get_customs_dict_service] = _fail_override
    try:
        response = client.post(
            "/api/v1/customs-dict/mappings/batch-resync",
            json={"ids": [id1, id2]},
            headers=headers,
        )
        assert response.status_code == 200, response.text
        body = response.json()
        assert body["total"] == 2
        assert body["synced"] == 1
        assert body["failed"] == 1
        assert body["failedIds"] == [id2]
    finally:
        def _restore(session: SessionDep) -> CustomsDictService:
            return CustomsDictService(
                CustomsDictRepository(session),
                CustomsDictRedisStore(fakeredis.FakeRedis(decode_responses=True)),
            )

        app.dependency_overrides[get_customs_dict_service] = _restore
