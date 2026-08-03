from __future__ import annotations

import re
from typing import Any, Protocol

import redis

from custom_data_toolkit.config.settings import settings

_PASSWORD_IN_URL = re.compile(r"(://[^:/@]+:)([^@/]+)(@)")

DICT_TYPE_LABELS = {
    "country": "国家",
    "continent": "洲",
}

# 标准字典导出/导入与缺失导出共用表头（按列名匹配）
CUSTOMS_DICT_XLSX_HEADERS = (
    "字典类型编码",
    "字典类型名称",
    "原始值",
    "出现次数",
    "标准值",
    "备注",
)

IMPORT_MAX_ROWS = 1000


class RedisClient(Protocol):
    def hset(self, name: str, key: str | None = None, value: str | None = None) -> int: ...

    def hdel(self, name: str, *keys: str) -> int: ...

    def zcard(self, name: str) -> int: ...

    def zrevrange(
        self,
        name: str,
        start: int,
        end: int,
        withscores: bool = False,
    ) -> list[Any]: ...

    def zrem(self, name: str, *values: str) -> int: ...


def formal_dict_key(dict_type: str) -> str:
    return f"customs:{dict_type}:dict"


def missing_dict_key(dict_type: str) -> str:
    return f"customs:{dict_type}:dict:missing"


def sanitize_redis_error(exc: BaseException) -> str:
    message = str(exc)
    message = _PASSWORD_IN_URL.sub(r"\1***\3", message)
    if settings.redis_url:
        message = message.replace(settings.redis_url, "[redis]")
    return message[:512]


def create_redis_client() -> redis.Redis:
    return redis.Redis.from_url(settings.redis_url, decode_responses=True)


class CustomsDictRedisStore:
    """Formal Hash incremental writer + missing ZSET reader/remover."""

    def __init__(self, client: RedisClient) -> None:
        self._client = client

    def put(self, *, dict_type: str, raw_value: str, standard_value: str) -> None:
        self._client.hset(formal_dict_key(dict_type), raw_value, standard_value)

    def remove(self, *, dict_type: str, raw_value: str) -> None:
        self._client.hdel(formal_dict_key(dict_type), raw_value)

    def list_missing_page(
        self,
        *,
        dict_type: str,
        raw_value: str | None,
        page: int,
        page_size: int,
    ) -> tuple[list[tuple[str, float]], int]:
        key = missing_dict_key(dict_type)
        if raw_value:
            all_items = self._client.zrevrange(key, 0, -1, withscores=True)
            filtered = [
                (str(member), float(score))
                for member, score in all_items
                if raw_value in str(member)
            ]
            total = len(filtered)
            start = (page - 1) * page_size
            return filtered[start : start + page_size], total

        total = int(self._client.zcard(key))
        start = (page - 1) * page_size
        end = start + page_size - 1
        page_items = self._client.zrevrange(key, start, end, withscores=True)
        return [(str(member), float(score)) for member, score in page_items], total

    def list_missing_all(
        self,
        *,
        dict_type: str,
        raw_value: str | None,
    ) -> list[tuple[str, float]]:
        items, _ = self.list_missing_page(
            dict_type=dict_type,
            raw_value=raw_value,
            page=1,
            page_size=10_000_000,
        )
        return items

    def remove_missing(self, *, dict_type: str, raw_value: str) -> None:
        self._client.zrem(missing_dict_key(dict_type), raw_value)
