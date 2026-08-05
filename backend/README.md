# tendata-customs-tools — backend

- 产品/发行名：`tendata-customs-tools`
- Application package（import / uvicorn）：`custom_data_toolkit`

```bash
cp -n .env.example .env   # 再按环境修改；勿提交 .env
uv sync --group dev --group test
uv run alembic upgrade head
uv run uvicorn custom_data_toolkit.main:app --reload --host 127.0.0.1 --port 8000
```

环境变量说明见仓库根目录 `deploy/env/README.md` 与 `docs/operations.md`。
