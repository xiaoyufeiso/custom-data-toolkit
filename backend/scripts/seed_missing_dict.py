#!/usr/bin/env python3
"""向本地 Redis 写入海关缺失字典测试数据（ZSET）。

Key：customs:{dictType}:dict:missing
Member：原始值；Score：出现次数

用法（在 backend 目录）:
  uv run python scripts/seed_missing_dict.py
  uv run python scripts/seed_missing_dict.py --replace
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from custom_data_toolkit.config.settings import settings  # noqa: E402
from custom_data_toolkit.services.customs_dict_redis import missing_dict_key  # noqa: E402

# dictType -> { rawValue: occurrenceCount }
SEED: dict[str, dict[str, float]] = {
    "country": {
        "USA": 42,
        "U.S.A.": 28,
        "美国": 35,
        "Korea": 19,
        "KOR": 18,
        "中国台湾": 15,
        "VNM": 12,
        "Vietnam": 9,
        "unknown-land": 3,
        "N/A": 7,
        "日本": 22,
        "JPN": 16,
    },
    "continent": {
        "Asia": 31,
        "ASIA": 14,
        "Europe": 20,
        "EU": 11,
        "North America": 17,
        "NA": 8,
        "非洲": 6,
        "未知大洲": 2,
    },
}


def main() -> int:
    parser = argparse.ArgumentParser(description="Seed missing-dict ZSET test data")
    parser.add_argument(
        "--replace",
        action="store_true",
        help="写入前删除对应 key（默认合并/覆盖同名 member）",
    )
    parser.add_argument(
        "--redis-url",
        default=None,
        help="覆盖 REDIS_URL（默认读环境/.env）",
    )
    args = parser.parse_args()

    import redis

    redis_url = args.redis_url or settings.redis_url
    client = redis.Redis.from_url(redis_url, decode_responses=True)
    client.ping()
    print(f"Redis OK: {redis_url}")

    for dict_type, members in SEED.items():
        key = missing_dict_key(dict_type)
        if args.replace:
            client.delete(key)
            print(f"deleted {key}")
        added = client.zadd(key, members)
        total = client.zcard(key)
        print(f"{key}: upserted={added}, zcard={total}")
        top = client.zrevrange(key, 0, 4, withscores=True)
        for member, score in top:
            print(f"  {score:>6.0f}  {member}")

    print("done.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
