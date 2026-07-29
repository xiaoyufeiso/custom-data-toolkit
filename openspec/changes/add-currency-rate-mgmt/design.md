# Design: 货币汇率管理与对外查询 API

## Technical Approach

在 FastAPI 后端以领域模块实现 auth / currency / rate / api_key；React 管理端提供登录与三个业务页。对外查询独立路由前缀 `/api/v1/public`，仅校验 API Key。既有表用 SQLModel 映射；新表 Alembic 迁移。

## Architecture Decisions

### Decision: 鉴权双轨
- **选择**：管理端 Session+CSRF；对外 X-API-Key
- **理由**：调用形态不同，隔离降低风险
- **权衡**：两套中间件与测试路径

### Decision: 复用 rate.data 字符串
- **选择**：不改为 numeric
- **理由**：兼容存量与爬虫写入
- **权衡**：数值计算需调用方自行解析

### Decision: 无数据返回空列表
- **选择**：货币存在但无汇率 → 200 + []
- **理由**：便于 ETL 幂等消费
- **权衡**：调用方需区分 404（无货币）与空列表

## Data Flow

```text
爬虫(外部) ──写入──► MySQL rate/currency
管理员 UI ──Session──► 管理 API ──► 读写 MySQL
外部系统 ──API Key──► public rates ──► 读 MySQL
```

## File Changes（骨架就绪后预期）

- `backend/src/.../models/` — currency, rate, admin_*, api_key
- `backend/src/.../repositories|services|routers/` — 四域实现
- `backend/alembic/versions/` — 管理表迁移
- `web/src/views/auth|currencies|rates|api-keys/` — 页面
- `docs/*` — 若实现偏离则回写契约
