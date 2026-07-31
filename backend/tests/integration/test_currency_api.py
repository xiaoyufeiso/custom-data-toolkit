"""货币 API 契约测试（仅后端切片）。

需要 MySQL 中已有 currency / rate / admin_users。
"""

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
    """分配一个当前库中未占用的三位字母 code。"""
    taken = {
        r[0]
        for r in session.execute(text("SELECT code FROM currency")).all()
        if r[0]
    }
    alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    base = len(alphabet)

    start = int(datetime.now(UTC).timestamp() * 1000)
    for n in range(base**3):
        idx = (start + n) % (base**3)
        a = idx // (base * base)
        b = (idx // base) % base
        c = idx % base
        candidate = f"{alphabet[a]}{alphabet[b]}{alphabet[c]}"
        if candidate not in taken:
            return candidate
    raise RuntimeError("no free 3-letter currency code available for test")


def test_unauthorized_list(client: TestClient) -> None:
    res = client.get("/api/v1/currencies")
    assert res.status_code == 401
    suggestions = client.get(
        "/api/v1/currencies/suggestions",
        params={"prefix": "CN", "field": "nameOrCode"},
    )
    assert suggestions.status_code == 401


def test_unauthorized_batch_delete(client: TestClient) -> None:
    res = client.post("/api/v1/currencies/batch-delete", json={"ids": [1]})
    assert res.status_code == 401


def test_currency_batch_delete_contract(client: TestClient) -> None:
    headers = _login(client)
    suffix = datetime.now(UTC).strftime("%H%M%S%f")
    created_ids: list[int] = []
    for index in range(2):
        created = client.post(
            "/api/v1/currencies",
            json={"name": f"Batch Delete {suffix}-{index}", "code": None},
            headers=headers,
        )
        assert created.status_code == 201
        created_ids.append(created.json()["id"])

    invalid_batches = (
        [],
        [created_ids[0], created_ids[0]],
        [0],
        [-1],
        ["1"],
        [1.5],
        [True],
        list(range(1, 102)),
    )
    for invalid_ids in invalid_batches:
        invalid = client.post(
            "/api/v1/currencies/batch-delete",
            json={"ids": invalid_ids},
            headers=headers,
        )
        assert invalid.status_code == 422

    without_csrf = client.post(
        "/api/v1/currencies/batch-delete",
        json={"ids": created_ids},
    )
    assert without_csrf.status_code == 403

    stale = client.post(
        "/api/v1/currencies/batch-delete",
        json={"ids": [created_ids[0], 9_223_372_036_854_775_000]},
        headers=headers,
    )
    assert stale.status_code == 409
    assert stale.json()["code"] == "BatchDelete.StaleSelection"
    assert stale.json()["details"]["missingIds"] == [9_223_372_036_854_775_000]
    assert client.get(f"/api/v1/currencies/{created_ids[0]}").status_code == 200

    deleted = client.post(
        "/api/v1/currencies/batch-delete",
        json={"ids": created_ids},
        headers=headers,
    )
    assert deleted.status_code == 204
    for currency_id in created_ids:
        assert client.get(f"/api/v1/currencies/{currency_id}").status_code == 404


def test_currency_prefix_suggestions_are_ordered_and_bounded(client: TestClient) -> None:
    headers = _login(client)
    suffix = datetime.now(UTC).strftime("%H%M%S%f")
    base_name = f"Suggestion {suffix}"
    with Session(engine) as session:
        code = _unused_letter_code(session)

    created_ids: list[int] = []
    for index in range(12):
        created = client.post(
            "/api/v1/currencies",
            json={
                "name": base_name if index == 0 else f"{base_name} {index:02d}",
                "code": code if index == 0 else None,
            },
            headers=headers,
        )
        assert created.status_code == 201
        created_ids.append(created.json()["id"])

    wildcard_name = f"Wild%{suffix}"
    wildcard = client.post(
        "/api/v1/currencies",
        json={"name": wildcard_name, "code": None},
        headers=headers,
    )
    assert wildcard.status_code == 201
    created_ids.append(wildcard.json()["id"])

    by_name = client.get(
        "/api/v1/currencies/suggestions",
        params={"prefix": base_name.lower(), "field": "nameOrCode"},
    )
    assert by_name.status_code == 200
    assert len(by_name.json()) == 10
    assert by_name.json()[0]["name"] == base_name
    assert by_name.json()[0]["matchField"] == "name"

    by_code = client.get(
        "/api/v1/currencies/suggestions",
        params={"prefix": code.lower(), "field": "code"},
    )
    assert by_code.status_code == 200
    assert by_code.json()[0]["code"] == code
    assert by_code.json()[0]["matchField"] == "code"

    literal_wildcard = client.get(
        "/api/v1/currencies/suggestions",
        params={"prefix": f"Wild%{suffix}", "field": "nameOrCode"},
    )
    assert literal_wildcard.status_code == 200
    assert [item["name"] for item in literal_wildcard.json()] == [wildcard_name]

    empty = client.get(
        "/api/v1/currencies/suggestions",
        params={"prefix": "   ", "field": "nameOrCode"},
    )
    assert empty.status_code == 400

    deleted = client.post(
        "/api/v1/currencies/batch-delete",
        json={"ids": created_ids},
        headers=headers,
    )
    assert deleted.status_code == 204


def test_currency_crud_and_code_conflict(client: TestClient) -> None:
    headers = _login(client)
    suffix = datetime.now(UTC).strftime("%H%M%S%f")
    with Session(engine) as session:
        code = _unused_letter_code(session)

    created = client.post(
        "/api/v1/currencies",
        json={"name": f"Test Currency {suffix}", "code": code},
        headers=headers,
    )
    assert created.status_code == 201
    body = created.json()
    currency_id = body["id"]
    assert body["code"] == code

    listed = client.get("/api/v1/currencies", params={"q": code})
    assert listed.status_code == 200
    assert listed.json()["total"] >= 1

    conflict = client.post(
        "/api/v1/currencies",
        json={"name": "Dup", "code": code},
        headers=headers,
    )
    assert conflict.status_code == 409
    assert conflict.json()["code"] == "Currency.CodeConflict"

    deleted = client.delete(f"/api/v1/currencies/{currency_id}", headers=headers)
    assert deleted.status_code == 204


def test_currency_clear_code_on_update(client: TestClient) -> None:
    headers = _login(client)
    suffix = datetime.now(UTC).strftime("%H%M%S%f")
    with Session(engine) as session:
        code = _unused_letter_code(session)

    created = client.post(
        "/api/v1/currencies",
        json={"name": f"Clear Code {suffix}", "code": code},
        headers=headers,
    )
    assert created.status_code == 201
    currency_id = created.json()["id"]
    assert created.json()["code"] == code

    cleared = client.put(
        f"/api/v1/currencies/{currency_id}",
        json={"name": f"Clear Code {suffix}", "code": None},
        headers=headers,
    )
    assert cleared.status_code == 200
    assert cleared.json()["code"] is None

    deleted = client.delete(f"/api/v1/currencies/{currency_id}", headers=headers)
    assert deleted.status_code == 204


def test_currency_invalid_code_rejected(client: TestClient) -> None:
    headers = _login(client)
    # 仅允许 1~10 位字母或下划线
    for bad in ("123", "CN1", "ABCDEFGHIJK", "CN-Y", "CN.Y", "CN Y"):
        res = client.post(
            "/api/v1/currencies",
            json={"name": "Bad Code", "code": bad},
            headers=headers,
        )
        assert res.status_code == 400, bad
        assert res.json()["code"] == "Currency.InvalidCode", bad


def test_delete_blocked_when_rates_exist(client: TestClient) -> None:
    headers = _login(client)
    suffix = datetime.now(UTC).strftime("%H%M%S%f")
    with Session(engine) as session:
        code = _unused_letter_code(session)

    created = client.post(
        "/api/v1/currencies",
        json={"name": f"Rate Linked {suffix}", "code": code},
        headers=headers,
    )
    assert created.status_code == 201
    currency_id = created.json()["id"]

    now = datetime.now(UTC).replace(tzinfo=None)
    with Session(engine) as session:
        session.execute(
            text(
                "INSERT INTO rate (data, date, create_time, update_time, checked, currency_id) "
                "VALUES (:data, :date, :create_time, :update_time, :checked, :currency_id)"
            ),
            {
                "data": "1.0",
                "date": date.today().isoformat(),
                "create_time": now,
                "update_time": now,
                "checked": 0,
                "currency_id": currency_id,
            },
        )
        session.commit()

    other = client.post(
        "/api/v1/currencies",
        json={"name": f"Batch Peer {suffix}", "code": None},
        headers=headers,
    )
    assert other.status_code == 201
    other_id = other.json()["id"]

    blocked = client.post(
        "/api/v1/currencies/batch-delete",
        json={"ids": [currency_id, other_id]},
        headers=headers,
    )
    assert blocked.status_code == 409
    assert blocked.json()["code"] == "Currency.HasRates"
    assert blocked.json()["details"]["blockedIds"] == [currency_id]
    assert client.get(f"/api/v1/currencies/{other_id}").status_code == 200

    with Session(engine) as session:
        session.execute(text("DELETE FROM rate WHERE currency_id = :id"), {"id": currency_id})
        session.commit()

    deleted = client.post(
        "/api/v1/currencies/batch-delete",
        json={"ids": [currency_id, other_id]},
        headers=headers,
    )
    assert deleted.status_code == 204
