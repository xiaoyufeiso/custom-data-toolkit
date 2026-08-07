# Tendata Customs Tools — 运维与交付

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

## 2. 环境配置结构

```text
backend/.env.example              → 仓库模板（变量名 + 占位 + 注释）
backend/.env                      → 运行时（gitignore；每人/每环境自备）
deploy/docker/compose.env.example → Compose 模板
deploy/docker/compose.env         → Compose 运行时（gitignore）
deploy/env/README.md              → 给部署者的短说明
deploy/docker/README.md           → Docker / Compose 用法
web/Dockerfile                    → 管理端镜像（构建上下文 web/）
web/nginx.conf                    → 管理端 Nginx（Compose web 或网关参考）
web/export-static.sh              → 导出 web-dist/ 给网关
```

**以后遵循：**

1. 只提交 `.env.example`，不提交真实 `.env`
2. 新人：`cp backend/.env.example backend/.env` 后改本机/目标环境值
3. UAT/生产：用服务器环境变量或密钥系统注入同名变量，勿把生产密码写回 Git
4. 代码不读死主机；一律经 Settings / 环境变量
5. 产品名 `tendata-customs-tools` 与 Python 包 `custom_data_toolkit` 分离（改名不强制改 import）

变量清单以 `backend/.env.example` 为准。常用项：

| 变量 | 说明 |
|---|---|
| `APP_NAME` | 默认 `tendata-customs-tools` |
| `APP_ENV` | `development` / `production`（影响 Cookie `Secure`） |
| `DATABASE_URL` / `TEST_DATABASE_URL` | MySQL |
| `REDIS_URL` | 海关字典 Redis |
| `CORS_ALLOWED_ORIGINS` | 前端源（credentials） |
| `SESSION_COOKIE_NAME` / `SESSION_TTL_SECONDS` | Session |
| `ADMIN_BOOTSTRAP_*` | 空库首启管理员（仅受控环境） |
| `PUBLIC_API_AUTH_ENABLED` | 对外 globiz 是否强制 API Key |

生产：`APP_ENV=production`、强 bootstrap 密码、正确 CORS；禁止把密码写入仓库或日志。

## 3. 构建与启动顺序

```text
1. MySQL / Redis 可达，注入 DATABASE_URL / REDIS_URL
2. 外部表按 data-contract / schema.sql 就绪
3. alembic upgrade head（发布流程执行，容器启动不自动迁移）
4. 启动 backend（8000）
5. 发布管理端静态至网关（或 Compose profile web）
6. 健康检查与冒烟
```

Docker 构建、环境变量、网关与命令详见 [`deploy/docker/README.md`](../deploy/docker/README.md)。

## 4. 迁移执行

- 发布前执行 `alembic upgrade head`（流水线或运维）；容器启动不自动迁移。
- 外部表变更须先更新 `data-contract.md` 并与数据方确认。
- 回滚：优先 Alembic downgrade（若有）；否则按发布清单人工回退。

## 5. 健康检查

| 路径 | 含义 |
|---|---|
| `GET /api/v1/health` | 进程存活 |
| `GET /api/v1/ready` | 依赖（含 DB）就绪 |

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
