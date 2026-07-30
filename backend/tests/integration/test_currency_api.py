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

    blocked = client.delete(f"/api/v1/currencies/{currency_id}", headers=headers)
    assert blocked.status_code == 409
    assert blocked.json()["code"] == "Currency.HasRates"

    with Session(engine) as session:
        session.execute(text("DELETE FROM rate WHERE currency_id = :id"), {"id": currency_id})
        session.commit()

    deleted = client.delete(f"/api/v1/currencies/{currency_id}", headers=headers)
    assert deleted.status_code == 204
