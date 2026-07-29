"""随机令牌与哈希工具。"""

from __future__ import annotations

import hashlib
import hmac
import secrets


def new_token(nbytes: int = 32) -> str:
    return secrets.token_urlsafe(nbytes)


def sha256_hex(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def digest_equal(left: str, right: str) -> bool:
    return hmac.compare_digest(left, right)
