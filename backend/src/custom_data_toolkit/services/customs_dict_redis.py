from __future__ import annotations

import re
from typing import Protocol

import redis

from custom_data_toolkit.config.settings import settings

_PASSWORD_IN_URL = re.compile(r"(://[^:/@]+:)([^@/]+)(@)")


class RedisHashClient(Protocol):
    def hset(self, name: str, key: str | None = None, value: str | None = None) -> int: ...

    def hdel(self, name: str, *keys: str) -> int: ...


def formal_dict_key(dict_type: str) -> str:
    return f"customs:{dict_type}:dict"


def sanitize_redis_error(exc: BaseException) -> str:
    message = str(exc)
    message = _PASSWORD_IN_URL.sub(r"\1***\3", message)
    if settings.redis_url:
        message = message.replace(settings.redis_url, "[redis]")
    return message[:512]


def create_redis_client() -> redis.Redis:
    return redis.Redis.from_url(settings.redis_url, decode_responses=True)


class CustomsDictRedisStore:
    """Incremental formal-hash writer. Never replaces the whole key."""

    def __init__(self, client: RedisHashClient) -> None:
        self._client = client

    def put(self, *, dict_type: str, raw_value: str, standard_value: str) -> None:
        self._client.hset(formal_dict_key(dict_type), raw_value, standard_value)

    def remove(self, *, dict_type: str, raw_value: str) -> None:
        self._client.hdel(formal_dict_key(dict_type), raw_value)
