# Custom Data Toolkit 部署与本地运行

> 状态：Deployment Baseline（draft）  
> 目标：本机/内网开发运行

## 1. 运行拓扑

```text
浏览器 → web (Vite, 默认 5173)
           ↓ /api 代理
         backend (FastAPI/Uvicorn, 默认 8000)
           ↓
         MySQL (既有 currency/rate + 新增管理表)
```

## 2. 依赖

- Node.js + pnpm（前端）
- Python 3.12+ + uv（后端）
- **MySQL 8**（本地自建；无公司库时用 Docker 或本机安装均可）

推荐（效率优先）用 Docker 起空库，例如：

```bash
docker run -d --name cdt-mysql -e MYSQL_ROOT_PASSWORD=root -e MYSQL_DATABASE=custom_data_toolkit -p 3306:3306 mysql:8
```

## 3. 环境变量（草案）

提交 `.env.example`，不提交 `.env`。

建议项：

| 变量 | 说明 |
|---|---|
| `DATABASE_URL` | MySQL 连接串 |
| `SESSION_COOKIE_NAME` | 默认 `cdt_session` |
| `SESSION_TTL_SECONDS` | 默认 `604800` |
| `CORS_ORIGINS` | 前端源，含 credentials |
| `ADMIN_BOOTSTRAP_USERNAME` | 首启管理员用户名 |
| `ADMIN_BOOTSTRAP_PASSWORD` | 首启管理员密码（仅本地） |
| `APP_ENV` | `development` / `production` |

## 4. 数据库

本地无公司库时按以下顺序即可：

1. 新建空库（开发库 + 测试库）。
2. 导入既有表 DDL：`deploy/sql/schema.sql`（`currency` / `rate`，可重复执行）。
3. 业务切片阶段再执行 Alembic：创建管理表，并种子管理员。
4. 无存量数据时：管理端录入样例，或后续加种子脚本（非阻塞）。

WSL 示例（主机/库名须与 `backend/.env` 一致；数据库账号固定为 `customs_app`）：

```bash
cd ~/custom-data-toolkit

# 若尚无账号，用具备权限的管理员先创建（一次性；密码自行替换）
mysql -h 172.28.112.1 -P 3306 -u root -p -e "
CREATE DATABASE IF NOT EXISTS customs_data_toolkit CHARACTER SET utf8;
CREATE DATABASE IF NOT EXISTS customs_data_toolkit_test CHARACTER SET utf8;
CREATE USER IF NOT EXISTS 'customs_app'@'%' IDENTIFIED BY 'change-me';
GRANT ALL PRIVILEGES ON customs_data_toolkit.* TO 'customs_app'@'%';
GRANT ALL PRIVILEGES ON customs_data_toolkit_test.* TO 'customs_app'@'%';
FLUSH PRIVILEGES;
"

# 日常导入用 customs_app（可重复）
mysql -h 172.28.112.1 -P 3306 -u customs_app -p \
  customs_data_toolkit < deploy/sql/schema.sql

mysql -h 172.28.112.1 -P 3306 -u customs_app -p \
  customs_data_toolkit_test < deploy/sql/schema.sql
```

`.env` 连接串用户名须为 `customs_app`，勿再用 `root`。

## 5. 启动顺序（骨架就绪后）

```text
1. MySQL 可用
2. alembic upgrade head
3. 启动 backend
4. 启动 web
5. 打开管理端登录；用 API Key 测 /api/v1/public/rates
```

具体命令以骨架生成后的 README / scripts 为准。

## 6. 非目标

- MVP 不要求 K8s/公网生产部署手册。
- 不在文档中保存真实密码或生产连接串。
