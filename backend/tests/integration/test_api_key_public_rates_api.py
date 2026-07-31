"""API Key 管理 + 对外汇率查询 API 契约测试。"""

from __future__ import annotations

from datetime import UTC, date, datetime

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlmodel import Session

from custom_data_toolkit.config.settings import settings
from custom_data_toolkit.db.engine import engine
from custom_data_toolkit.main import app
from custom_data_toolkit.routers.auth import CSRF_COOKIE_NAME


def _db_ready() -> bool:
    try:
        with Session(engine) as session:
            session.exec(text("SELECT 1 FROM admin_users LIMIT 1"))
            session.exec(text("SELECT 1 FROM currency LIMIT 1"))
            session.exec(text("SELECT 1 FROM rate LIMIT 1"))
            session.exec(text("SELECT 1 FROM api_keys LIMIT 1"))
        return True
    except Exception:
        return False


pytestmark = pytest.mark.skipif(not _db_ready(), reason="MySQL/auth/currency/rate/api_keys tables not ready")


@pytest.fixture()
def client() -> TestClient:
    with TestClient(app) as test_client:
        yield test_client


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


def _unused_letter_code(session: Session) -> str:
    taken = {
        row[0]
        for row in session.execute(text("SELECT code FROM currency")).all()
        if row[0]
    }
    alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    start = int(datetime.now(UTC).timestamp() * 1000)
    for offset in range(len(alphabet) ** 3):
        value = (start + offset) % (len(alphabet) ** 3)
        candidate = (
            alphabet[value // (len(alphabet) ** 2)]
            + alphabet[(value // len(alphabet)) % len(alphabet)]
            + alphabet[value % len(alphabet)]
        )
        if candidate not in taken:
            return candidate
    raise RuntimeError("no free 3-letter currency code available for test")


def test_admin_api_key_and_public_rates_flow(client: TestClient) -> None:
    # 管理端未登录访问
    unauthorized = client.get("/api/v1/api-keys")
    assert unauthorized.status_code == 401

    headers = _login(client)
    suffix = datetime.now(UTC).strftime("%H%M%S%f")
    with Session(engine) as session:
        code = _unused_letter_code(session)

    created_currency = client.post(
        "/api/v1/currencies",
        json={"name": f"Public Rate {suffix}", "code": code},
        headers=headers,
    )
    assert created_currency.status_code == 201
    currency_id = created_currency.json()["id"]

    created_rate = client.post(
        "/api/v1/rates",
        json={
            "currencyId": currency_id,
            "date": date.today().isoformat(),
            "data": "7.1200",
            "checked": True,
        },
        headers=headers,
    )
    assert created_rate.status_code == 201
    rate_id = created_rate.json()["id"]

    created_key = client.post(
        "/api/v1/api-keys",
        json={"name": f"etl-{suffix}"},
        headers=headers,
    )
    assert created_key.status_code == 201
    key_body = created_key.json()
    assert key_body["key"].startswith("cdt_")
    key_id = key_body["id"]
    plaintext_key = key_body["key"]

    listed = client.get("/api/v1/api-keys")
    assert listed.status_code == 200
    target = next(item for item in listed.json() if item["id"] == key_id)
    assert "key" not in target

    public_ok = client.get(
        "/api/v1/public/rates",
        params={"code": code, "date": date.today().isoformat()},
        headers={"X-API-Key": plaintext_key},
    )
    assert public_ok.status_code == 200
    assert len(public_ok.json()["items"]) >= 1

    code_not_found = client.get(
        "/api/v1/public/rates",
        params={"code": "QQQ", "date": date.today().isoformat()},
        headers={"X-API-Key": plaintext_key},
    )
    assert code_not_found.status_code == 404
    assert code_not_found.json()["code"] == "Currency.NotFound"

    disabled = client.patch(
        f"/api/v1/api-keys/{key_id}",
        json={"enabled": False},
        headers=headers,
    )
    assert disabled.status_code == 200
    assert disabled.json()["enabled"] is False

    public_rejected = client.get(
        "/api/v1/public/rates",
        params={"code": code, "date": date.today().isoformat()},
        headers={"X-API-Key": plaintext_key},
    )
    assert public_rejected.status_code == 401
    assert public_rejected.json()["code"] == "Auth.InvalidApiKey"

    # cleanup
    key_deleted = client.delete(f"/api/v1/api-keys/{key_id}", headers=headers)
    assert key_deleted.status_code == 204
    rate_deleted = client.delete(f"/api/v1/rates/{rate_id}", headers=headers)
    assert rate_deleted.status_code == 204
    currency_deleted = client.delete(f"/api/v1/currencies/{currency_id}", headers=headers)
    assert currency_deleted.status_code == 204
