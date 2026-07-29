# 技术方案

## 技术栈

- 语言：TypeScript（前端）/ Python 3.12+（后端）
- 框架：React + Vite / FastAPI
- 数据库：MySQL（复用 `currency`、`rate`）
- ORM / 迁移：SQLModel + Alembic
- 包管理：pnpm / uv
- 部署：本机/内网（MVP）

## 架构概述

单体全栈布局：`web/` + `backend/`。管理端经 Session 访问业务 API；外部系统经 API Key 访问 `/api/v1/public/rates`。后端四层：routers → services → repositories → models。

## 核心模块

- auth：管理员登录与会话
- currency：货币主数据
- rate：汇率读写
- api_key：Key 管理与对外鉴权

## 数据模型

- 既有：`currency` 1—N `rate`（唯一键 currency_id+date）
- 新增：`admin_users`、`admin_sessions`、`api_keys`
- 详见 `docs/database.md`

## 技术约束

- MUST：管理端与对外鉴权隔离
- MUST：API Key / 密码只存哈希
- MUST：JSON camelCase，Python snake_case
- MUST：不实现海关字典表与接口
- SHOULD：列表均分页
- SHOULD：配置走 Pydantic Settings

## 已做决策

### MySQL 复用既有表
- **选择**：不迁 PostgreSQL
- **理由**：爬虫与存量数据已在 MySQL

### 鉴权双轨
- **选择**：Session + API Key
- **理由**：浏览器后台与系统调用场景不同

## 部署环境

- 开发：本机 Vite + Uvicorn + MySQL
- 详见 `docs/deployment.md`
