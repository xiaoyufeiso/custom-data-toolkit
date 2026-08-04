# Custom Data Toolkit 系统架构

> 状态：Architecture Baseline（draft）  
> 目标：本机/内网可运行的后台管理系统 MVP  
> 上游文档：`product.md`；行为细节见 OpenSpec；外部表见 `data-contract.md`

## 1. 技术栈

| 层 | 选择 |
|---|---|
| 前端 | React + TypeScript + Vite |
| 前端包管理器 | pnpm |
| UI | 优先 tendata-ui / 公司前端模板约定 |
| 服务端状态 | SWR |
| 本地全局状态 | Zustand（仅 UI 状态） |
| 后端 | Python 3.12+ / FastAPI |
| Python 环境 | uv |
| ORM | SQLModel |
| 数据库迁移 | Alembic |
| 数据库 | **MySQL**（复用现有 `currency` / `rate`；字典映射为应用自有表） |
| 缓存 / 字典投影 | **Redis**（与第三方共用：正式 Hash + 缺失 ZSET；本系统 MySQL 权威 + 增量同步） |
| API | REST + OpenAPI |
| 管理端认证 | Session + HttpOnly Cookie + CSRF |
| 对外认证 | API Key（`X-API-Key`）；字典下游主要读 Redis |
| 后端测试 | Pytest |
| 前端测试 | Vitest + React Testing Library + MSW |

## 2. 项目结构（目标骨架）

```text
custom-data-toolkit/
├─ web/                    # React 前端
├─ backend/                # FastAPI 后端
├─ docs/                   # 传统工程文档
├─ openspec/               # SDD / Spec 真相来源与变更
├─ AGENTS.md
└─ README.md
```

- 全栈根目录不创建 Node workspace。
- 前端依赖只安装在 `web/`。
- 后端依赖由 `backend/pyproject.toml` 与 `uv.lock` 管理。
- Schema 变更通过 Alembic；对已有 `currency`/`rate` 以「对齐既有表」方式建模，新增表走迁移。

## 3. 前端边界

前端负责：

- 登录页与后台布局（侧栏 + 内容区）。
- 货币、汇率、海关字典（国家/洲）页面的列表/表单/确认框。
- 请求加载、空态、错误与重试。
- 管理端 Session Cookie 请求（credentials）与 CSRF 头。

前端不负责：

- 最终鉴权判定。
- 汇率唯一性与外键约束的最终保证。
- API Key 管理 UI（2026-07-31 起搁置；后端 `/api-keys` 与对外 `X-API-Key` 鉴权仍保留）。
- 存储 API Key 明文。
- 处理历史 / 操作日志 UI（搁置）；不做整表覆盖全量同步。

建议域划分：

```text
web/src/
├─ pages/
├─ views/
│  ├─ auth/
│  ├─ currencies/
│  ├─ rates/
│  └─ customsDict/    # types / mappings / missing
├─ shared/
├─ store/
└─ router/
```

## 4. 后端边界

分层（MUST）：

```text
routers → services → repositories → models
```

- Router：HTTP、参数校验、依赖注入鉴权。
- Service：业务规则与事务。
- Repository：SQLModel 查询。
- Model：表与 Schema 家族。

模块建议：

- `auth`：管理端登录会话
- `currency`：货币
- `rate`：汇率
- `api_key`：API Key 管理与对外鉴权依赖
- `customs_dict`：字典类型、映射与 Redis 同步（见 `customs-dict` change / ADR-011）

## 5. 鉴权架构

```text
浏览器 ──Session+CSRF──► /api/v1/auth|currencies|rates|api-keys|customs-dict...
外部系统 ──X-API-Key──► /api/v1/public/rates
下游 / 第三方 ──共用 Redis──► customs:{type}:dict（Hash）与 :missing（ZSET）
```

- 管理端与对外 API 鉴权链路 MUST 隔离。
- API Key 仅存哈希；校验时对提交明文做同样哈希比对。
- 字典：本系统经管理端流程对约定 key 做增量写/删 missing；第三方也可写正式 Hash；不得在对外 `/public/*` 提供字典写接口。

## 6. 数据与外部系统

- MySQL 中已有爬虫写入的 `currency` / `rate` 数据，系统 MUST 兼容读写。
- 本系统不运行爬虫；不假设写入频率，列表查询 MUST 支持分页。
- 海关字典映射表为本系统自有表（Alembic）。Redis 同步默认仅 `HSET`/`HDEL`，禁止第一版整表覆盖（ADR-011）。

## 7. 非功能

- JSON 对外字段 camelCase；Python 内部 snake_case。
- 配置经 Pydantic Settings；提交 `.env.example`，不提交 `.env`。
- 日志 MUST NOT 打印密码、Session、API Key 明文。

## 8. 后续骨架生成

工程壳通过公司 scaffold-kit / Tendata fullstack 生成后 merge 进本目录，保留 `docs/`、`openspec/`、`AGENTS.md`。
