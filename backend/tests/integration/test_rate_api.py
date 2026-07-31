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


def test_unauthorized_list_rates(client: TestClient) -> None:
    res = client.get("/api/v1/rates")
    assert res.status_code == 401


def test_unauthorized_batch_rate_operations(client: TestClient) -> None:
    for path in ("batch-delete", "batch-check"):
        res = client.post(f"/api/v1/rates/{path}", json={"ids": [1]})
        assert res.status_code == 401


def test_rate_crud_filter_and_duplicate(client: TestClient) -> None:
    headers = _login(client)
    suffix = datetime.now(UTC).strftime("%H%M%S%f")
    with Session(engine) as session:
        code = _unused_letter_code(session)

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


def test_rate_batch_operations_contract_and_atomicity(client: TestClient) -> None:
    headers = _login(client)
    suffix = datetime.now(UTC).strftime("%H%M%S%f")
    with Session(engine) as session:
        code = _unused_letter_code(session)

    currency = client.post(
        "/api/v1/currencies",
        json={"name": f"Batch Rate Currency {suffix}", "code": code},
        headers=headers,
    )
    assert currency.status_code == 201
    currency_id = currency.json()["id"]

    rate_ids: list[int] = []
    for day_offset in range(2):
        created = client.post(
            "/api/v1/rates",
            json={
                "currencyId": currency_id,
                "date": (date.today() + timedelta(days=day_offset)).isoformat(),
                "data": "1.0",
                "checked": False,
            },
            headers=headers,
        )
        assert created.status_code == 201
        rate_ids.append(created.json()["id"])

    invalid_batches = (
        [],
        [rate_ids[0], rate_ids[0]],
        [0],
        [-1],
        ["1"],
        [1.5],
        [True],
        list(range(1, 102)),
    )
    for path in ("batch-delete", "batch-check"):
        for invalid_ids in invalid_batches:
            invalid = client.post(
                f"/api/v1/rates/{path}",
                json={"ids": invalid_ids},
                headers=headers,
            )
            assert invalid.status_code == 422

    without_csrf = client.post(
        "/api/v1/rates/batch-delete",
        json={"ids": rate_ids},
    )
    assert without_csrf.status_code == 403

    missing_id = 9_223_372_036_854_775_000
    stale = client.post(
        "/api/v1/rates/batch-delete",
        json={"ids": [rate_ids[0], missing_id]},
        headers=headers,
    )
    assert stale.status_code == 409
    assert stale.json()["code"] == "BatchDelete.StaleSelection"
    assert stale.json()["details"]["missingIds"] == [missing_id]
    assert client.get(f"/api/v1/rates/{rate_ids[0]}").status_code == 200

    check_without_csrf = client.post(
        "/api/v1/rates/batch-check",
        json={"ids": rate_ids},
    )
    assert check_without_csrf.status_code == 403

    stale_check = client.post(
        "/api/v1/rates/batch-check",
        json={"ids": [rate_ids[0], missing_id]},
        headers=headers,
    )
    assert stale_check.status_code == 409
    assert stale_check.json()["code"] == "BatchCheck.StaleSelection"
    assert stale_check.json()["details"]["missingIds"] == [missing_id]
    assert client.get(f"/api/v1/rates/{rate_ids[0]}").json()["checked"] is False

    already_checked = client.put(
        f"/api/v1/rates/{rate_ids[1]}",
        json={"checked": True},
        headers=headers,
    )
    assert already_checked.status_code == 200
    checked_update_time = already_checked.json()["updateTime"]

    checked = client.post(
        "/api/v1/rates/batch-check",
        json={"ids": rate_ids},
        headers=headers,
    )
    assert checked.status_code == 204
    assert client.get(f"/api/v1/rates/{rate_ids[0]}").json()["checked"] is True
    assert (
        client.get(f"/api/v1/rates/{rate_ids[1]}").json()["updateTime"]
        == checked_update_time
    )

    deleted = client.post(
        "/api/v1/rates/batch-delete",
        json={"ids": rate_ids},
        headers=headers,
    )
    assert deleted.status_code == 204
    for rate_id in rate_ids:
        assert client.get(f"/api/v1/rates/{rate_id}").status_code == 404

    currency_deleted = client.delete(f"/api/v1/currencies/{currency_id}", headers=headers)
    assert currency_deleted.status_code == 204
