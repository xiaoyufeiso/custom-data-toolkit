# Custom Data Toolkit 开发进展

> 可选状态板（无看板时使用）。不替代 Git 历史，不复述 OpenSpec `tasks.md` 每一项。

## 当前状态

- 阶段：M5 完成；M6 发布整理进行中（文档已按 skill 收敛）
- 整体状态：进行中
- 最后更新：2026-07-31

## 里程碑

| 里程碑 | 状态 |
|---|---|
| M0–M5 文档/骨架/认证/货币/汇率/API Key（后端） | 完成 |
| 前端 API Key 管理模块 | 搁置（2026-07-31 从前端移除路由/页面/服务） |
| M6 发布整理（验收勾选、OpenSpec 归档、骨架裁剪） | 进行中 |

## 阻塞

无。

## 下一步

1. 对照 `development.md` §5 勾选验收项并实跑测试（前端 API Key UI 验收项暂不勾选）
2. 归档 `openspec/changes/add-currency-rate-mgmt`（合并领域 spec）
3. 裁剪前端未用骨架；API 契约迁 OpenAPI（可选）

切片级勾选见：`openspec/changes/add-currency-rate-mgmt/tasks.md`

## 日志（摘录）

### 2026-07-31

- 搁置全部前端 API Key 相关内容：删除 `web` 路由 `/api-keys`、`pages/api-keys`、`views/apiKeys`、`services/apiKey` 与菜单文案。
- 后端 API Key 管理接口与对外 `X-API-Key` 公开查询仍保留；OpenSpec 中 API Key UI / 批量删除 / 筛选切片标为 deferred。

### 2026-07-30

- 文档按 skill 收敛；删除 `docs/` 停用重定向文件（对照见 `docs/archive/README.md`）

