# Custom Data Toolkit 开发进展

> 记录项目状态、阻塞与下一步；不替代 Git 历史。

## 当前状态

- 阶段：M2 认证切片代码已落地，待环境跑迁移与联调
- 当前里程碑：M2 管理端认证
- 整体状态：进行中
- 最后更新：2026-07-29

## 里程碑

| 里程碑 | 交付物 | 目标日期 | 状态 |
|---|---|---|---|
| M0 文档与 Spec 基线 | docs + openspec + AGENTS | 2026-07-29 | 完成 |
| M1 工程骨架 | React + FastAPI 可启动、smoke | 2026-07-29 | 进行中（已 merge，待安装依赖） |
| M2 管理端认证 | 登录/会话/CSRF | 2026-07-29 | 进行中（代码已写，待迁移联调） |
| M3 货币管理 | 货币 CRUD 前后端 | TBD | 未开始 |
| M4 汇率管理 | 汇率列表与维护 | TBD | 未开始 |
| M5 API Key 与对外查询 | Key 管理 + public rates | TBD | 未开始 |
| M6 发布整理 | 测试、README、部署说明 | TBD | 未开始 |

## 当前已完成

- [x] 确认技术栈：React + FastAPI + MySQL
- [x] 确认鉴权：管理端 Session；对外 API Key
- [x] 确认字典本轮仅占位
- [x] 落盘 `docs/` 传统工程文档
- [x] 落盘 `openspec/` 全局三件套、字典占位、首个 change
- [x] 落盘 `AGENTS.md`、`.cursor/rules/project.mdc`、`README.md`
- [x] scaffold-kit 生成轻量全栈骨架并 merge（去 Hero / 无 Docker）
- [x] 后端 `.env.example` / settings / 依赖对齐 MySQL（pymysql）
- [x] 认证切片：模型、Alembic `0001_auth_tables`、Auth API、前端登录/鉴权壳

## 当前待办

- [ ] 本地 `.env` + `uv sync` / `pnpm install`
- [ ] `alembic upgrade head` 创建 admin 表并验证登录
- [ ] 跑 `pytest tests/unit` 与 `tests/integration/test_auth_api.py`
- [ ] M3～M5 业务切片

## 阻塞问题

| 编号 | 问题 | 负责人 | 状态 |
|---|---|---|---|
| Q-001 | 门禁确认前不进入骨架生成 | 用户 | 已关闭（已生成骨架） |
| Q-002 | 本地无公司库用何库 | AI | 已解决：本地 MySQL 8 + 自建 DDL（ADR-008） |
| Q-003 | 对外 API 是否支持货币名 | AI | 已解决：仅 code（ADR-009）；名称映射留给字典 |

## 日志

### 2026-07-29

完成：

- S3：scaffold-kit / Tendata 轻量全栈骨架生成、adapt、verify、merge
- 后端运行时对齐 MySQL（替换脚手架默认 sqlite/psycopg）
- M2 认证切片代码：admin 表迁移、Session+CSRF API、登录页与 RequireAuth

决定：

- profile 使用 sqlite 仅因 scaffold-kit 枚举限制；合并后立即改为 MySQL（与 ADR-008 一致）
- 轻量：`noDocker`、`removeSamples`、`trellis: none`
- 退出登录不校验 CSRF（与 api.md 例外一致）

问题：

- 环境未齐：迁移与集成测试待用户本地执行

下一步：

- 用户配完环境后执行 alembic upgrade → 起服务 → 验证登录
- 通过后进入货币管理切片
