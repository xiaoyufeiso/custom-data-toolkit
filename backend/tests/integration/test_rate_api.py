"""汇率管理端 API 契约测试。"""

from __future__ import annotations

from datetime import UTC, date, datetime, timedelta

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
        return True
    except Exception:
        return False


pytestmark = pytest.mark.skipif(not _db_ready(), reason="MySQL currency/auth tables not ready")


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


def _unused_digit_code(session: Session) -> str:
    for n in range(1000):
        candidate = f"{(int(datetime.now(UTC).timestamp() * 1000) + n) % 1000:03d}"
        row = session.execute(
            text("SELECT id FROM currency WHERE code = :code LIMIT 1"),
            {"code": candidate},
        ).first()
        if row is None:
            return candidate
    raise RuntimeError("no free 3-digit currency code available for test")


def test_unauthorized_list_rates(client: TestClient) -> None:
    res = client.get("/api/v1/rates")
    assert res.status_code == 401


def test_rate_crud_filter_and_duplicate(client: TestClient) -> None:
    headers = _login(client)
    suffix = datetime.now(UTC).strftime("%H%M%S%f")
    with Session(engine) as session:
        code = _unused_digit_code(session)

    currency = client.post(
        "/api/v1/currencies",
        json={"name": f"Rate Currency {suffix}", "code": code},
        headers=headers,
    )
    assert currency.status_code == 201
    currency_id = currency.json()["id"]

    day = date.today()
    created = client.post(
        "/api/v1/rates",
        json={
            "currencyId": currency_id,
            "date": day.isoformat(),
            "data": "7.1200",
            "checked": False,
        },
        headers=headers,
    )
    assert created.status_code == 201
    body = created.json()
    rate_id = body["id"]
    assert body["currencyId"] == currency_id
    assert body["currencyCode"] == code
    assert body["data"] == "7.1200"
    assert body["checked"] is False

    conflict = client.post(
        "/api/v1/rates",
        json={
            "currencyId": currency_id,
            "date": day.isoformat(),
            "data": "7.1300",
            "checked": False,
        },
        headers=headers,
    )
    assert conflict.status_code == 409
    assert conflict.json()["code"] == "Rate.DuplicateCurrencyDate"

    listed = client.get(
        "/api/v1/rates",
        params={
            "code": code,
            "dateFrom": (day - timedelta(days=1)).isoformat(),
            "dateTo": (day + timedelta(days=1)).isoformat(),
        },
    )
    assert listed.status_code == 200
    assert listed.json()["total"] >= 1
    assert any(item["id"] == rate_id for item in listed.json()["items"])

    updated = client.put(
        f"/api/v1/rates/{rate_id}",
        json={"data": "7.1300", "checked": True},
        headers=headers,
    )
    assert updated.status_code == 200
    assert updated.json()["data"] == "7.1300"
    assert updated.json()["checked"] is True

    deleted = client.delete(f"/api/v1/rates/{rate_id}", headers=headers)
    assert deleted.status_code == 204

    currency_deleted = client.delete(f"/api/v1/currencies/{currency_id}", headers=headers)
    assert currency_deleted.status_code == 204
