#!/bin/sh
set -eu

# 默认执行迁移；接外部库且迁移由发布流水线负责时，设 RUN_MIGRATIONS=false
if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  echo "[entrypoint] waiting for database then alembic upgrade head"
  i=0
  until alembic upgrade head; do
    i=$((i + 1))
    if [ "$i" -ge 40 ]; then
      echo "[entrypoint] alembic failed after retries" >&2
      exit 1
    fi
    echo "[entrypoint] db not ready, retry $i/40..."
    sleep 3
  done
fi

exec "$@"
