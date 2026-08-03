"""海关标准字典 API 集成测试（fakeredis，不依赖真实 Redis）。"""

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


def test_customs_dict_mapping_crud_and_redis_sync(
    client: TestClient,
    fake_redis: fakeredis.FakeRedis,
) -> None:
    unauthorized = client.get("/api/v1/customs-dict/mappings")
    assert unauthorized.status_code == 401

    headers = _login(client)
    suffix = datetime.now(UTC).strftime("%H%M%S%f")
    raw = f"中国大陆-{suffix}"

    created = client.post(
        "/api/v1/customs-dict/mappings",
        json={"dictType": "country", "rawValue": f"  {raw}  ", "standardValue": " CHN "},
        headers=headers,
    )
    assert created.status_code == 201, created.text
    body = created.json()
    mapping_id = body["id"]
    assert body["rawValue"] == raw
    assert body["standardValue"] == "CHN"
    assert body["enabled"] is True
    assert body["syncStatus"] == "synced"
    assert fake_redis.hget(formal_dict_key("country"), raw) == "CHN"

    listed = client.get(
        "/api/v1/customs-dict/mappings",
        params={"dictType": "country", "rawValue": raw},
        headers=headers,
    )
    assert listed.status_code == 200
    assert listed.json()["total"] >= 1

    dup = client.post(
        "/api/v1/customs-dict/mappings",
        json={"dictType": "country", "rawValue": raw, "standardValue": "CHN"},
        headers=headers,
    )
    assert dup.status_code == 409
    assert dup.json()["code"] == "CustomsDict.DuplicateRawValue"

    bad_raw = client.patch(
        f"/api/v1/customs-dict/mappings/{mapping_id}",
        json={"standardValue": "CHN", "rawValue": "别的原始值"},
        headers=headers,
    )
    assert bad_raw.status_code == 400
    assert bad_raw.json()["code"] == "CustomsDict.RawValueImmutable"

    updated = client.patch(
        f"/api/v1/customs-dict/mappings/{mapping_id}",
        json={"standardValue": "CHN2"},
        headers=headers,
    )
    assert updated.status_code == 200
    assert updated.json()["standardValue"] == "CHN2"
    assert fake_redis.hget(formal_dict_key("country"), raw) == "CHN2"

    # 第三方 field 应在停用本条后仍保留
    fake_redis.hset(formal_dict_key("country"), "第三方字段", "XXX")

    disabled = client.post(
        f"/api/v1/customs-dict/mappings/{mapping_id}/disable",
        headers=headers,
    )
    assert disabled.status_code == 200
    assert disabled.json()["enabled"] is False
    assert fake_redis.hget(formal_dict_key("country"), raw) is None
    assert fake_redis.hget(formal_dict_key("country"), "第三方字段") == "XXX"

    enabled = client.post(
        f"/api/v1/customs-dict/mappings/{mapping_id}/enable",
        headers=headers,
    )
    assert enabled.status_code == 200
    assert fake_redis.hget(formal_dict_key("country"), raw) == "CHN2"

    replay = client.post(
        "/api/v1/customs-dict/mappings/replay-sync",
        params={"dictType": "country"},
        headers=headers,
    )
    assert replay.status_code == 200
    assert replay.json()["total"] >= 1
    assert fake_redis.hget(formal_dict_key("country"), "第三方字段") == "XXX"


def test_mappings_q_or_filter_and_suggestions(client: TestClient) -> None:
    headers = _login(client)
    suffix = datetime.now(UTC).strftime("%H%M%S%f")
    raw = f"QRaw-{suffix}"
    standard = f"QStd-{suffix}"

    created = client.post(
        "/api/v1/customs-dict/mappings",
        json={"dictType": "country", "rawValue": raw, "standardValue": standard},
        headers=headers,
    )
    assert created.status_code == 201, created.text

    by_raw = client.get(
        "/api/v1/customs-dict/mappings",
        params={"q": raw[-8:], "enabled": True},
        headers=headers,
    )
    assert by_raw.status_code == 200
    assert any(item["rawValue"] == raw for item in by_raw.json()["items"])

    by_std = client.get(
        "/api/v1/customs-dict/mappings",
        params={"q": standard[-8:], "enabled": True},
        headers=headers,
    )
    assert by_std.status_code == 200
    assert any(item["standardValue"] == standard for item in by_std.json()["items"])

    suggestions = client.get(
        "/api/v1/customs-dict/mappings/suggestions",
        params={"prefix": raw[:5], "dictType": "country"},
        headers=headers,
    )
    assert suggestions.status_code == 200
    body = suggestions.json()
    assert len(body) <= 10
    assert any(item["rawValue"] == raw and item["matchField"] == "rawValue" for item in body)
