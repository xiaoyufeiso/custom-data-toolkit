# Proposal: 新建汇率货币选择器按 code 首字母索引

## Intent

管理员在「新建汇率」时选择货币往往面临选项较多、原生下拉难定位的问题。本变更在新建汇率表单中提供按货币 `code` 首字母排序的自定义货币选择器，并在右侧提供字母索引，点击后滚动到对应字母段，以提升录入效率。

## Scope

In Scope:

- 仅「新建汇率」表单中的货币选择控件
- 覆盖全部货币：前端分页循环调用既有 `GET /currencies` 拉齐后再展示
- 按 `code` 首字母排序与分组；无 `code` 的货币并入 `#`
- 自定义下拉面板；右侧字母索引；点击字母滚动到该段
- 对应前端验收与必要测试/文档回写（若有行为写入 OpenSpec/UI 摘要）

Out of Scope:

- 修改 `GET /currencies` 契约、新增排序专用 API、放宽 `pageSize` 上限
- 货币列表页、汇率列表筛选中的货币控件、编辑汇率表单（货币通常不可改）
- API Key 按名称/状态筛选（已搁置）
- 海关字典、爬虫、鉴权/权限模型变更
- 数据库 DDL / `currency`·`rate` 列语义变更
- 共享组件库的全局默认行为改造（本变更为页面内实现，除非后续单独抽取）

## Related Specs / Docs

- `docs/product.md` — 管理员维护汇率
- `docs/architecture.md` — 前端负责列表/表单交互
- `docs/api.md` — 既有分页 `GET /currencies`（本变更不改契约）
- `docs/data-contract.md` — `currency.code` 可空
- `openspec/specs/ui.md` — 汇率列表交互摘要（归档前不改稳定正文；行为以本 change delta 为准）
- MVP 基线（已归档）：`openspec/changes/archive/add-currency-rate-mgmt/`；领域 spec：`openspec/specs/rate/spec.md`

## Approach

采用方案 A：不新增后端排序接口；前端用既有分页 API 拉全量货币，本地按 `code` 首字母排序/分组并渲染自定义选择器与字母索引。

## Impact & Risks

| 项 | 说明 |
|---|---|
| 影响面 | 主要为 `web` 新建汇率 UI；不改后端路由/表 |
| 兼容 | 管理端 API 消费者契约不变 |
| 性能 | 货币总量大时多次分页请求；MVP 可接受，需 loading/失败提示 |
| 风险 | 自定义下拉的可达性与键盘操作弱于原生 `<select>`；需基本可用 |
| 与活跃 change | 与 `add-currency-rate-mgmt` 同域（汇率页），但不改其 API 场景；实现时避免无关重构该页其它逻辑 |
