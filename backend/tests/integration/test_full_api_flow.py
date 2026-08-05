"""
端到端接口功能测试 — 使用测试数据库中的种子数据验证所有核心接口。

运行方式（WSL）：
  DATABASE_URL=$TEST_DATABASE_URL uv run pytest backend/tests/integration/test_full_api_flow.py -v
"""

from __future__ import annotations

import os

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlmodel import Session

# 强制使用测试数据库
os.environ["DATABASE_URL"] = os.environ.get(
    "TEST_DATABASE_URL",
    "mysql+pymysql://customs_app:123456@172.28.112.1:3306/customs_data_toolkit_test",
)

from custom_data_toolkit.db.engine import engine  # noqa: E402
from custom_data_toolkit.main import app  # noqa: E402
from custom_data_toolkit.routers.auth import CSRF_COOKIE_NAME  # noqa: E402
from custom_data_toolkit.config.settings import settings  # noqa: E402


def _db_ready() -> bool:
    try:
        with Session(engine) as session:
            session.exec(text("SELECT 1 FROM currency LIMIT 1"))
            session.exec(text("SELECT 1 FROM rate LIMIT 1"))
            session.exec(text("SELECT 1 FROM admin_users LIMIT 1"))
        return True
    except Exception:
        return False


pytestmark = pytest.mark.skipif(not _db_ready(), reason="Test DB not ready")


@pytest.fixture()
def client() -> TestClient:
    with TestClient(app) as c:
        yield c


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
    assert login.status_code == 200, f"Login failed: {login.text}"
    token = client.cookies.get(CSRF_COOKIE_NAME)
    assert token
    return {"X-CSRF-Token": token}


# ─── 认证 ───


class TestAuth:
    def test_csrf(self, client: TestClient):
        res = client.get("/api/v1/auth/csrf")
        assert res.status_code == 200
        assert "csrfToken" in res.json()

    def test_login_success(self, client: TestClient):
        headers = _login(client)
        assert headers

    def test_login_wrong_password(self, client: TestClient):
        csrf = client.get("/api/v1/auth/csrf").json()["csrfToken"]
        res = client.post(
            "/api/v1/auth/login",
            json={"username": "admin", "password": "wrong"},
            headers={"X-CSRF-Token": csrf},
        )
        assert res.status_code == 401

    def test_me(self, client: TestClient):
        _login(client)
        res = client.get("/api/v1/auth/me")
        assert res.status_code == 200
        assert res.json()["username"] == settings.admin_bootstrap_username


# ─── 货币 ───


class TestCurrency:
    def test_list(self, client: TestClient):
        headers = _login(client)
        res = client.get("/api/v1/currencies", params={"page": 1, "pageSize": 10})
        assert res.status_code == 200
        data = res.json()
        assert data["total"] >= 5
        assert any(item["code"] == "CNY" for item in data["items"])

    def test_search_by_code(self, client: TestClient):
        headers = _login(client)
        res = client.get("/api/v1/currencies", params={"q": "MYR_IM"})
        assert res.status_code == 200
        assert res.json()["total"] >= 1

    def test_create_update_delete(self, client: TestClient):
        headers = _login(client)

        # 创建
        res = client.post(
            "/api/v1/currencies",
            json={"name": "Test Currency", "code": "TST"},
            headers=headers,
        )
        assert res.status_code == 201
        cid = res.json()["id"]
        assert res.json()["code"] == "TST"

        # 更新
        res = client.put(
            f"/api/v1/currencies/{cid}",
            json={"name": "Test Updated", "code": "TST_U"},
            headers=headers,
        )
        assert res.status_code == 200
        assert res.json()["code"] == "TST_U"

        # 清空 code
        res = client.put(
            f"/api/v1/currencies/{cid}",
            json={"name": "Test Updated", "code": None},
            headers=headers,
        )
        assert res.status_code == 200
        assert res.json()["code"] is None

        # 删除
        res = client.delete(f"/api/v1/currencies/{cid}", headers=headers)
        assert res.status_code == 204

    def test_invalid_code_rejected(self, client: TestClient):
        headers = _login(client)
        # 数字不允许
        res = client.post(
            "/api/v1/currencies",
            json={"name": "Bad", "code": "123"},
            headers=headers,
        )
        assert res.status_code == 400
        assert res.json()["code"] == "Currency.InvalidCode"

    def test_code_conflict(self, client: TestClient):
        headers = _login(client)
        # CNY 已存在
        res = client.post(
            "/api/v1/currencies",
            json={"name": "Dup", "code": "CNY"},
            headers=headers,
        )
        assert res.status_code == 409
        assert res.json()["code"] == "Currency.CodeConflict"

    def test_delete_blocked_with_rates(self, client: TestClient):
        headers = _login(client)
        # currency_id=1 (ADF) 有关联 rate
        res = client.delete("/api/v1/currencies/1", headers=headers)
        assert res.status_code == 409
        assert res.json()["code"] == "Currency.HasRates"


# ─── 汇率 ───


class TestRate:
    def test_list(self, client: TestClient):
        headers = _login(client)
        res = client.get("/api/v1/rates", params={"page": 1, "pageSize": 10})
        assert res.status_code == 200
        data = res.json()
        assert data["total"] >= 1

    def test_filter_by_code(self, client: TestClient):
        headers = _login(client)
        res = client.get("/api/v1/rates", params={"code": "CNY", "page": 1, "pageSize": 10})
        assert res.status_code == 200
        data = res.json()
        assert data["total"] >= 3
        assert all(item["currencyCode"] == "CNY" for item in data["items"])

    def test_filter_by_date_range(self, client: TestClient):
        headers = _login(client)
        res = client.get(
            "/api/v1/rates",
            params={"code": "CNY", "dateFrom": "2026-07-01", "dateTo": "2026-07-02", "page": 1, "pageSize": 10},
        )
        assert res.status_code == 200
        assert res.json()["total"] == 2

    def test_filter_by_checked(self, client: TestClient):
        headers = _login(client)
        res = client.get("/api/v1/rates", params={"code": "CNY", "checked": "true", "page": 1, "pageSize": 10})
        assert res.status_code == 200
        for item in res.json()["items"]:
            assert item["checked"] is True

    def test_create_update_delete(self, client: TestClient):
        headers = _login(client)

        # 创建（用 currency_id=3 AED, 新日期）
        res = client.post(
            "/api/v1/rates",
            json={"currencyId": 3, "date": "2026-07-29", "data": "1.99", "checked": False},
            headers=headers,
        )
        assert res.status_code == 201
        rid = res.json()["id"]

        # 更新
        res = client.put(
            f"/api/v1/rates/{rid}",
            json={"data": "2.01", "checked": True},
            headers=headers,
        )
        assert res.status_code == 200
        assert res.json()["data"] == "2.01"
        assert res.json()["checked"] is True

        # 删除
        res = client.delete(f"/api/v1/rates/{rid}", headers=headers)
        assert res.status_code == 204

    def test_duplicate_currency_date_rejected(self, client: TestClient):
        headers = _login(client)
        # CNY + 2026-07-01 已存在
        res = client.post(
            "/api/v1/rates",
            json={"currencyId": 40, "date": "2026-07-01", "data": "9.99", "checked": False},
            headers=headers,
        )
        assert res.status_code == 409


# ─── API Key ───


class TestApiKey:
    def test_create_list_disable_delete(self, client: TestClient):
        headers = _login(client)

        # 创建
        res = client.post("/api/v1/api-keys", json={"name": "test-key"}, headers=headers)
        assert res.status_code == 201
        body = res.json()
        key_id = body["id"]
        plaintext_key = body["key"]
        assert plaintext_key.startswith("cdt_")

        # 列表（不含明文）
        res = client.get("/api/v1/api-keys")
        assert res.status_code == 200
        items = res.json()
        found = [k for k in items if k["id"] == key_id]
        assert len(found) == 1
        assert "key" not in found[0]

        # 禁用
        res = client.patch(
            f"/api/v1/api-keys/{key_id}",
            json={"enabled": False},
            headers=headers,
        )
        assert res.status_code == 200
        assert res.json()["enabled"] is False

        # 删除
        res = client.delete(f"/api/v1/api-keys/{key_id}", headers=headers)
        assert res.status_code == 204

        return plaintext_key


# ─── 公开汇率查询 ───


class TestPublicRates:
    def _create_key(self, client: TestClient) -> str:
        headers = _login(client)
        res = client.post("/api/v1/api-keys", json={"name": "pub-test"}, headers=headers)
        assert res.status_code == 201
        return res.json()["key"]

    def test_query_by_currency_code_and_date_range(self, client: TestClient):
        key = self._create_key(client)
        res = client.get(
            "/rates/",
            params={
                "currencyCode": "CNY",
                "dateStart": "2026-07-01",
                "dateEnd": "2026-07-03",
                "size": 100,
            },
            headers={"X-API-Key": key},
        )
        assert res.status_code == 200
        data = res.json()
        assert data["count"] >= 3
        assert all(item["currency"] == "CNY" for item in data["results"])

    def test_invalid_key_rejected(self, client: TestClient):
        res = client.get(
            "/rates/",
            params={"currencyCode": "CNY", "size": 5},
            headers={"X-API-Key": "cdt_invalid_key_here"},
        )
        assert res.status_code == 401
        assert "detail" in res.json()

    def test_currency_detail_not_found(self, client: TestClient):
        key = self._create_key(client)
        res = client.get("/currencies/999999999/", headers={"X-API-Key": key})
        assert res.status_code == 404
        assert res.json()["detail"] == "Not found."

    def test_legacy_public_rates_removed(self, client: TestClient):
        key = self._create_key(client)
        res = client.get(
            "/api/v1/public/rates",
            params={"code": "CNY", "date": "2026-07-01"},
            headers={"X-API-Key": key},
        )
        assert res.status_code == 404
