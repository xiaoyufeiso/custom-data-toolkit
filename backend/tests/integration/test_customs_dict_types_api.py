"""海关字典类型管理 API 集成测试。"""

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
            session.exec(text("SELECT 1 FROM customs_dict_type LIMIT 1"))
            session.exec(text("SELECT 1 FROM customs_dict_mapping LIMIT 1"))
        return True
    except Exception:
        return False


pytestmark = pytest.mark.skipif(
    not _db_ready(),
    reason="MySQL admin/customs_dict tables not ready",
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


def test_types_seed_options_create_and_disable_rules(
    client: TestClient,
    fake_redis: fakeredis.FakeRedis,
) -> None:
    headers = _login(client)
    suffix = datetime.now(UTC).strftime("%H%M%S%f")
    code = f"port_{suffix[-6:]}"

    options = client.get("/api/v1/customs-dict/types/options", headers=headers)
    assert options.status_code == 200
    option_codes = {item["code"] for item in options.json()}
    assert "country" in option_codes
    assert "continent" in option_codes

    created = client.post(
        "/api/v1/customs-dict/types",
        json={"code": code.upper(), "name": "口岸"},
        headers=headers,
    )
    assert created.status_code == 201, created.text
    body = created.json()
    type_id = body["id"]
    assert body["code"] == code
    assert body["mappingCount"] == 0

    options2 = client.get("/api/v1/customs-dict/types/options", headers=headers)
    assert code in {item["code"] for item in options2.json()}

    mapping = client.post(
        "/api/v1/customs-dict/mappings",
        json={"dictType": code, "rawValue": f"RAW-{suffix}", "standardValue": "STD"},
        headers=headers,
    )
    assert mapping.status_code == 201, mapping.text
    assert fake_redis.hget(formal_dict_key(code), f"RAW-{suffix}") == "STD"

    blocked = client.post(
        f"/api/v1/customs-dict/types/{type_id}/disable",
        headers=headers,
    )
    assert blocked.status_code == 409
    assert blocked.json()["code"] == "CustomsDictType.HasMappings"

    # soft-delete mapping then still blocked (row remains)
    mapping_id = mapping.json()["id"]
    disable_mapping = client.post(
        f"/api/v1/customs-dict/mappings/{mapping_id}/disable",
        headers=headers,
    )
    assert disable_mapping.status_code == 200
    still_blocked = client.post(
        f"/api/v1/customs-dict/types/{type_id}/disable",
        headers=headers,
    )
    assert still_blocked.status_code == 409

    renamed = client.patch(
        f"/api/v1/customs-dict/types/{type_id}",
        json={"name": "新口岸", "code": "other"},
        headers=headers,
    )
    assert renamed.status_code == 400
    assert renamed.json()["code"] == "CustomsDictType.CodeImmutable"

    ok_rename = client.patch(
        f"/api/v1/customs-dict/types/{type_id}",
        json={"name": "新口岸"},
        headers=headers,
    )
    assert ok_rename.status_code == 200
    assert ok_rename.json()["name"] == "新口岸"


def test_type_suggestions_prefix(client: TestClient) -> None:
    headers = _login(client)
    suggestions = client.get(
        "/api/v1/customs-dict/types/suggestions",
        params={"prefix": "coun"},
        headers=headers,
    )
    assert suggestions.status_code == 200
    body = suggestions.json()
    assert len(body) <= 10
    assert any(item["code"] == "country" and item["matchField"] == "code" for item in body)


def test_disabled_type_rejected_on_create_mapping(client: TestClient) -> None:
    headers = _login(client)
    suffix = datetime.now(UTC).strftime("%H%M%S%f")
    code = f"tmp_{suffix[-6:]}"

    created = client.post(
        "/api/v1/customs-dict/types",
        json={"code": code, "name": "临时"},
        headers=headers,
    )
    assert created.status_code == 201
    type_id = created.json()["id"]

    disabled = client.post(
        f"/api/v1/customs-dict/types/{type_id}/disable",
        headers=headers,
    )
    assert disabled.status_code == 200

    options = client.get("/api/v1/customs-dict/types/options", headers=headers)
    assert code not in {item["code"] for item in options.json()}

    rejected = client.post(
        "/api/v1/customs-dict/mappings",
        json={"dictType": code, "rawValue": "x", "standardValue": "y"},
        headers=headers,
    )
    assert rejected.status_code == 400
    assert rejected.json()["code"] == "CustomsDict.InvalidType"
