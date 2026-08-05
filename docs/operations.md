# Custom Data Toolkit — 运维与交付

> 权威层：环境配置名、部署顺序、迁移执行、健康检查与回滚边界。  
> 本地开发步骤见 `development.md`。不在本文保存真实密钥。

## 1. 运行拓扑

```text
浏览器 → web (Vite, 默认 5173)
           ↓ /api 代理
         backend (FastAPI/Uvicorn, 默认 8000)
           ↓
         MySQL（外部 currency/rate + 应用管理表）
           ↓
         Redis（海关字典正式 Hash + 缺失 ZSET，可与第三方共用）
```

## 2. 环境变量（名称，非密钥）

提交 `.env.example`，不提交 `.env`。

| 变量 | 说明 |
|---|---|
| `DATABASE_URL` | MySQL 连接串 |
| `SESSION_COOKIE_NAME` | 默认 `cdt_session` |
| `SESSION_TTL_SECONDS` | 默认 `604800`（7 天） |
| `CORS_ORIGINS` | 前端源，须支持 credentials |
| `ADMIN_BOOTSTRAP_USERNAME` | 首启管理员用户名 |
| `ADMIN_BOOTSTRAP_PASSWORD` | 首启管理员密码（仅本地/受控环境） |
| `REDIS_URL` | 海关字典共用 Redis（正式 Hash / 缺失 ZSET）；本地默认 `redis://127.0.0.1:16379/0`（Docker 映射，见 `development.md`） |
| `APP_ENV` | `development` / `production` |

生产环境：`Secure` Cookie、禁止把 bootstrap 密码写入仓库或日志。

## 3. 构建与启动顺序

```text
1. MySQL 可达；外部表已按 data-contract / schema.sql 对齐
2. backend: alembic upgrade head
3. 启动 backend（默认 8000）
4. 启动 web（默认 5173）
5. 健康检查 → 管理端登录 →（可选）用 API Key 测公开查询
```

具体命令以仓库 `README.md`、`scripts/` 与 `backend`/`web` 包脚本为准。

## 4. 迁移执行

- 发布前在目标环境执行 `alembic upgrade head`。
- 外部表结构变更不由本应用随意改写；须先更新 `data-contract.md` 并与数据方确认。
- 回滚：优先用 Alembic downgrade（若有）；否则按发布清单人工回退并记录。

## 5. 健康检查

| 路径 | 含义 |
|---|---|
| `GET /health`（以实现为准） | 进程存活 |
| `GET /ready`（以实现为准） | 依赖（如 DB）就绪 |

## 6. 日志与密钥

- 日志 MUST NOT 打印密码、Session 明文、API Key 明文。
- 密钥轮换：停用旧 API Key → 发放新 Key → 确认调用方切换。

## 7. 备份与回滚（MVP）

- MVP 目标为本机/内网可运行，不要求 K8s/公网高可用手册。
- 数据备份与恢复策略由环境负责人约定；应用侧保证迁移可追溯。

## 8. 责任边界

| 事项 | 负责 |
|---|---|
| 业务行为变更 | 开发 + OpenSpec 评审 |
| 外部表语义变更 | 数据方确认 + 更新 `data-contract.md` |
| 生产密钥与网络 | 环境/运维负责人 |
| 发布勾选验收清单 | 见 `development.md` §5 |
