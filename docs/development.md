# Custom Data Toolkit — 开发手册

> 权威层：贡献者如何在本地搭建、开发、测试与提交流程。  
> 不是架构说明（见 `architecture.md`），也不是部署运维（见 `operations.md`）。

## 1. 前置条件

- Node.js + pnpm（前端）
- Python 3.12+ + uv（后端）
- MySQL 8（本地或 Docker；账号约定见下）
- Docker（本地海关字典 Redis；见下）
- 工作区优先：`/home/fei/custom-data-toolkit`（WSL）

## 2. 本地搭建

```text
1. MySQL 可用（开发库 + 测试库）
2. 导入外部表 DDL：deploy/sql/schema.sql（currency / rate）
3. 启动本地 Redis（海关字典；见 §2.1）
4. cd backend && cp -n .env.example .env && uv sync --group dev --group test
5. alembic upgrade head
6. cd web && pnpm install
7. 分别启动 backend / web，或 scripts/tendata-fullstack.mjs（若可用）
```

### 2.1 本地 Redis（海关字典）

本机约定容器名 `cdt-redis`：主机 `127.0.0.1:16379` → 容器 `6379`，AOF 持久化到 Docker volume `cdt-redis-data`。  
`backend/.env` 中 `REDIS_URL=redis://127.0.0.1:16379/0`（与 `.env.example` 一致）。

首次创建（仅一次）：

```bash
docker run -d --name cdt-redis \
  --restart unless-stopped \
  -p 127.0.0.1:16379:6379 \
  -v cdt-redis-data:/data \
  redis:7-alpine \
  redis-server --appendonly yes
```

每次开发前若容器已存在但未运行，启动：

```bash
docker start cdt-redis
```

常用检查：

```bash
docker ps --filter name=cdt-redis
redis-cli -h 127.0.0.1 -p 16379 ping   # 若本机装了 redis-cli
```

说明：自动化测试使用 fakeredis，不依赖该容器；联调标准/缺失字典时需要真实 Redis。

可选种子脚本（backend 目录）：

```bash
uv run python scripts/seed_missing_dict.py          # 缺失字典 Redis 测试数据
uv run python scripts/seed_audit_logs.py --replace  # 审计日志：覆盖全部 action 各 1 条
```

WSL 建库示例（主机/库名须与 `backend/.env` 一致；应用账号固定 `customs_app`）：

```bash
cd ~/custom-data-toolkit

mysql -h 172.28.112.1 -P 3306 -u root -p -e "
CREATE DATABASE IF NOT EXISTS customs_data_toolkit CHARACTER SET utf8;
CREATE DATABASE IF NOT EXISTS customs_data_toolkit_test CHARACTER SET utf8;
CREATE USER IF NOT EXISTS 'customs_app'@'%' IDENTIFIED BY 'change-me';
GRANT ALL PRIVILEGES ON customs_data_toolkit.* TO 'customs_app'@'%';
GRANT ALL PRIVILEGES ON customs_data_toolkit_test.* TO 'customs_app'@'%';
FLUSH PRIVILEGES;
"

mysql -h 172.28.112.1 -P 3306 -u customs_app -p \
  customs_data_toolkit < deploy/sql/schema.sql
mysql -h 172.28.112.1 -P 3306 -u customs_app -p \
  customs_data_toolkit_test < deploy/sql/schema.sql
```

`.env` 连接串用户名须为 `customs_app`，勿用 `root`。环境变量名见 `operations.md`；密钥不提交仓库。

可选 Docker 空库：

```bash
docker run -d --name cdt-mysql \
  -e MYSQL_ROOT_PASSWORD=root \
  -e MYSQL_DATABASE=custom_data_toolkit \
  -p 3306:3306 mysql:8
```

## 3. 常用命令

| 场景 | 命令 |
|---|---|
| 启动 Redis | `docker start cdt-redis`（首次见 §2.1） |
| 后端依赖 | `cd backend && uv sync --group dev --group test` |
| 后端开发 | `cd backend && ~/.local/bin/uv run uvicorn custom_data_toolkit.main:app --reload --host 127.0.0.1 --port 8000` |
| 后端测试 | `cd backend && uv run pytest` |
| 后端 lint | `cd backend && uv run ruff check .` |
| 迁移 | `cd backend && uv run alembic upgrade head` |
| 前端依赖 | `cd web && pnpm install` |
| 前端开发（UAT） | `cd web && pnpm start:uat` |
| 前端测试 | `cd web && pnpm test`（以 package.json scripts 为准） |

本地联调时先起 Redis，再分别打开两个终端启动前后端：

```bash
# Redis（海关字典联调需要）
docker start cdt-redis

# 前端
cd web
pnpm start:uat
==
# 后端
cd backend
~/.local/bin/uv run uvicorn custom_data_toolkit.main:app \
  --reload --host 127.0.0.1 --port 8000
```

国内网络下后端首次拉包可配置 uv 镜像，例如：

```bash
UV_INDEX_URL=https://pypi.tuna.tsinghua.edu.cn/simple uv sync --group dev --group test
```

## 4. 切片工作流（强制）

对齐 `fullstack-ai-development-workflow` 与 `AGENTS.md`：

```text
plan →（用户确认）→ implement → verify → test → review → document → commit
```

- 一次只做一个可独立评审的纵向切片。
- 后端：model → repository → service → router。
- 前端：type → service → view → page（`pages` 仅路由壳）。
- Plan 未确认不得写业务代码。
- 完成宣称必须有：Spec 在范围内、相关测试实跑、文档写回权威层、风险说清。

新需求走 `openspec/changes/<change-id>/`（proposal → design/tasks/delta → 实现 → 归档）。

## 5. 测试分层

### 后端单元

- 密码哈希与校验；API Key 生成与哈希比对。
- 货币删除前「是否仍有汇率」；日期区间 from ≤ to。

### 后端集成

- MySQL 约束与 Alembic；登录/CSRF/会话。
- 货币 CRUD 与有汇率删除冲突；汇率唯一键冲突。
- API Key 创建可用、停用后对外 401（当 `PUBLIC_API_AUTH_ENABLED=true`）；globiz `GET /rates/` 等可用。

### 前端

- 登录校验与错误提示；货币/汇率列表与确认框。
- 前端 API Key 管理 UI 已搁置（见 `docs/progress.md` 2026-07-31）；管理端不再验收密钥页面。

### Smoke

- 健康检查 → 登录 → 货币/汇率可见。
- 对外查询仍可用后端已有 API Key（可通过接口或运维脚本创建）；管理端 UI 创建 Key 路径暂不验收。

### MVP 验收清单（发布前勾选）

> 勾选日期：2026-07-31（`chore/m6-release-wrapup`）。实跑：`backend` pytest（auth/currency/rate/public）、`web` vitest 51、`tsc --noEmit`、`vite build --mode uat`。

**认证**

- [x] 无自助注册；预置管理员可登录；错误不泄露用户是否存在
- [x] Session Cookie HttpOnly；CSRF 失败不能写；退出后管理接口 401

**货币与汇率**

- [x] CRUD 符合 OpenSpec / 产品不变量；有关联汇率不能删货币
- [x] 同货币同日 409；可维护 `data`/`checked`；筛选分页正确

**API Key 与对外**

- [x] （前端 UI 搁置，仅后端验收）有效 Key 可查公开汇率；无效/停用 401
- [x] 未知 code 404；无数据空列表

**范围**

- [x] 无海关字典页面、路由、表、API

### 切片完成定义

1. 相关权威文档已更新（若有行为变化）
2. 相关自动化测试通过
3. 手工或 smoke 覆盖关键路径
4. change `tasks.md` 与（可选）`docs/progress.md` 已更新

## 6. 分支与提交

- 提交信息：`类型(范围): 中文简述`（如 `feat(rate): 实现汇率列表筛选`）
- 不提交 `.env`、密码、API Key 明文
- 仅在用户要求时创建 commit

## 7. 迁移约定

- 外部表 `currency`/`rate`：映射既有结构，语义见 `data-contract.md`；空库用 `deploy/sql/schema.sql`
- 应用自有表：Alembic 正向迁移（以 `backend/migrations` 为准）
- 禁止手改生产库结构而不走迁移

## 8. 常见失败

| 现象 | 排查 |
|---|---|
| 后端依赖很慢 | 未配国内 PyPI 镜像；首次冷缓存 |
| DB 连不上 | `.env` 主机/库名/账号是否与 MySQL 一致；是否用 `customs_app` |
| 管理端写 403 | 是否带 `X-CSRF-Token`；是否先 `GET /auth/csrf` |
| 公开查询 401 | Key 是否明文正确、是否已停用 |

