"""对外 globiz 风格只读 API（deploy/api/globiz-rates-api.md）。"""

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


pytestmark = pytest.mark.skipif(not _db_ready(), reason="MySQL tables not ready")


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


def _create_key(client: TestClient) -> str:
    headers = _login(client)
    suffix = datetime.now(UTC).strftime("%H%M%S%f")
    res = client.post(
        "/api/v1/api-keys",
        json={"name": f"globiz-{suffix}"},
        headers=headers,
    )
    assert res.status_code == 201
    return res.json()["key"]


def test_root_and_currencies_with_key(client: TestClient) -> None:
    key = _create_key(client)
    headers = {"X-API-Key": key}

    root = client.get("/", headers=headers)
    assert root.status_code == 200
    body = root.json()
    assert body["currencies"].endswith("/currencies/")
    assert body["rates"].endswith("/rates/")

    listed = client.get("/currencies/?page=1&size=5", headers=headers)
    assert listed.status_code == 200
    page = listed.json()
    assert "count" in page
    assert "results" in page
    assert page.get("previous") is None
    if page["count"] > 5:
        assert page["next"] is not None
        assert "page=2" in page["next"]

    if page["results"]:
        currency_id = page["results"][0]["id"]
        detail = client.get(f"/currencies/{currency_id}/", headers=headers)
        assert detail.status_code == 200
        assert detail.json()["id"] == currency_id


def test_rates_filter_and_detail(client: TestClient) -> None:
    key = _create_key(client)
    headers = {"X-API-Key": key}
    admin = _login(client)
    suffix = datetime.now(UTC).strftime("%H%M%S%f")
    code = f"G{suffix[-2:]}X"[:3].upper()
    # ensure 3-letter-ish unique: use admin create
    with Session(engine) as session:
        taken = {row[0] for row in session.execute(text("SELECT code FROM currency")).all() if row[0]}
    alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    start = int(datetime.now(UTC).timestamp() * 1000)
    code = "ZZZ"
    for offset in range(1000):
        value = (start + offset) % (26**3)
        candidate = (
            alphabet[value // (26**2)]
            + alphabet[(value // 26) % 26]
            + alphabet[value % 26]
        )
        if candidate not in taken:
            code = candidate
            break

    created_currency = client.post(
        "/api/v1/currencies",
        json={"name": f"Globiz {suffix}", "code": code},
        headers=admin,
    )
    assert created_currency.status_code == 201
    currency_id = created_currency.json()["id"]
    created_rate = client.post(
        "/api/v1/rates",
        json={
            "currencyId": currency_id,
            "date": date.today().isoformat(),
            "data": "1.2345",
            "checked": True,
        },
        headers=admin,
    )
    assert created_rate.status_code == 201
    rate_id = created_rate.json()["id"]

    listed = client.get(
        "/rates/",
        params={
            "currencyCode": code,
            "dateStart": date.today().isoformat(),
            "dateEnd": date.today().isoformat(),
            "size": 20,
        },
        headers=headers,
    )
    assert listed.status_code == 200
    results = listed.json()["results"]
    assert any(item["id"] == rate_id for item in results)
    hit = next(item for item in results if item["id"] == rate_id)
    assert hit["currency"] == code
    assert hit["data"] == "1.2345"
    assert "checked" not in hit

    detail = client.get(f"/rates/{rate_id}/", headers=headers)
    assert detail.status_code == 200
    assert detail.json()["currency"] == code

    missing = client.get("/rates/999999999/", headers=headers)
    assert missing.status_code == 404
    assert missing.json()["detail"] == "Not found."

    client.delete(f"/api/v1/rates/{rate_id}", headers=admin)
    client.delete(f"/api/v1/currencies/{currency_id}", headers=admin)


def test_auth_required_when_enabled(client: TestClient) -> None:
    if not settings.public_api_auth_enabled:
        pytest.skip("PUBLIC_API_AUTH_ENABLED is false")
    res = client.get("/currencies/")
    assert res.status_code == 401
    assert "detail" in res.json()

    bad = client.get("/currencies/", headers={"X-API-Key": "cdt_invalid"})
    assert bad.status_code == 401


def test_auth_disabled_allows_anonymous(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "public_api_auth_enabled", False)
    res = client.get("/currencies/?page=1&size=1")
    assert res.status_code == 200
    assert "results" in res.json()


def test_openapi_json(client: TestClient) -> None:
    key = _create_key(client)
    res = client.get("/openapi", headers={"X-API-Key": key})
    assert res.status_code == 200
    assert "openapi" in res.json()
