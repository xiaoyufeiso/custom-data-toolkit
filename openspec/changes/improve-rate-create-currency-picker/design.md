# Design: 新建汇率货币选择器按 code 首字母索引

## Technical Approach

在 `web` 汇率视图的「新建汇率」表单内，将原生 `<select>` 替换为页面内自定义货币选择面板：

1. 调用既有 `GET /api/v1/currencies`（`page` + `pageSize`，遵守现有最大 `pageSize`）循环直至取完全部 `items`；
2. 客户端按 `code` 规范化后的首字母分组：有 `code` → 取首字符大写归入 `A`–`Z`（若首字符非 A–Z，归入 `#`，**TBD：是否与「无 code」共用 `#` 已确认无 code→`#`；非字母 code 首字符同归 `#` 为本设计默认**）；
3. 同组内按完整 `code` 升序（无 `code` 时次级键用 `name` 或 `id`，见 TBD）；
4. 面板右侧展示字母索引（仅有数据的字母/`#`）；点击后将列表滚动到该段锚点；列表可隐藏滚动条但保留滚轮滚动；
5. 选项文案为 `code (name)`（无 code 时仅名称）；选中后写回既有 `currencyId` 提交逻辑，创建汇率 API 不变。

不改后端分层、不改 Session/CSRF、不改 `/public/*`。

## Architecture Decisions

### Decision: 全量拉取在前端分页循环（方案 A）

- **选择**：复用现有分页列表 API，前端聚合；不新增「按 code 排序的全量接口」。
- **理由**：需求已确认；货币量通常有限；避免扩大 API/OpenSpec 契约面。
- **权衡**：请求次数随总量增加；需统一 loading / 错误态。

### Decision: 自定义下拉而非原生 select

- **选择**：页面内自定义面板（列表 + 右侧索引）。
- **理由**：原生 `<select>` 无法可靠实现右侧字母滚动定位。
- **权衡**：需自行处理打开/关闭、选中态、基本键盘与点击外部关闭（细节见 TBD）。

### Decision: 排序与索引纯前端

- **选择**：首字母分组与滚动索引不依赖服务端 `ORDER BY`。
- **理由**：UI 行为与展示顺序解耦于列表默认 `id` 降序。
- **权衡**：与货币管理列表页的默认排序可不一致（本变更 Out of Scope）。

## Data Flow

```text
新建汇率打开
  → 前端循环 GET /currencies?page=&pageSize=
  → 聚合 items
  → 按 code 首字母排序/分组（无 code → #）
  → 自定义面板展示 + 右侧索引点击滚动
  → 用户选择 currencyId
  → 既有 POST /rates（不变）
```

## API / DB / Auth

| 层 | 变更 |
|---|---|
| API | **无**契约变更 |
| 数据库 | **无** |
| 权限 | 仍需管理端已登录；无新权限点 |
| 外部系统 | **无** |

## File Changes（实现阶段预期，本阶段不落地）

- `web/src/views/rates/index.tsx`（及样式）— 新建表单货币选择器
- 可选：同目录小组件/工具函数（排序分组），避免抽到全局 shared 除非有第二处复用
- 测试：前端针对排序/分组/`#`/索引滚动的单测或组件测（若仓库已有同类惯例）
- 文档：实现后按需回写 `openspec/specs/ui.md` 摘要或归档本 change；**不**在本阶段改稳定 spec

## Compatibility

- 编辑汇率表单保持现状（展示货币，不引入本选择器），除非后续单独需求。
- 汇率筛选区货币相关控件不在范围。

## Confirmed TBD（实现前已锁定）

| ID | 结论 |
|---|---|
| T1 | `code` 首字符非 A–Z → `#` |
| T2 | 同组内按完整 `code` 升序；再 `name`、`id` |
| T3 | 右侧索引只显示有数据的字母/`#` |
| T4 | 点击外部关闭；本切片仅鼠标操作 |
| T5 | 分页拉全量串行 |
| T6 | 编写前端单测（`currencyPickerUtils`） |
