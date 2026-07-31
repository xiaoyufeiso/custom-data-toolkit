# Design: 管理页面内批量删除与 API Key 筛选

## Confirmed Decisions

- 领域：货币、汇率、API Key。
- 全选范围：仅当前分页，不跨页保留选择。
- 批量大小：1～100 个唯一正整数 ID。
- 失败策略：整批原子失败；任一 ID 不存在时不删除任何记录。
- API Key 名称筛选：去除首尾空格后，不区分大小写的包含匹配。
- API Key 状态筛选：全部、启用、停用。
- 现有单条删除 API 保留；不提供撤销、重做或级联删除。

## API Design

新增：

```text
POST /api/v1/currencies/batch-delete
POST /api/v1/rates/batch-delete
POST /api/v1/api-keys/batch-delete
```

统一请求：

```json
{ "ids": [1, 2, 3] }
```

- 成功：`204 No Content`。
- 请求必须携带有效 Session Cookie 和 `X-CSRF-Token`。
- 使用 POST action，避免 DELETE 请求体在客户端和网关中的兼容问题。
- `ids` 为空、重复、非正整数或超过 100 条：`422`。
- 任一 ID 不存在：`409 BatchDelete.StaleSelection`，`details.missingIds` 返回缺失 ID。
- 货币有关联汇率：`409 Currency.HasRates`，`details.blockedIds` 返回阻塞 ID。
- 批量错误响应在既有 `code/message/requestId` 上增加可选 `details`；普通错误保持兼容。

扩展：

```text
GET /api/v1/api-keys?name=etl&enabled=true
```

- `name` 可选，空白值按未提供处理，不区分大小写包含匹配。
- `enabled` 可选 boolean。
- 两者同时提供时使用 AND。
- 响应继续保持现有 `ApiKeyPublic[]`，当前变更不迁移为服务端分页。

## Transaction and Repository Design

后端继续遵循 `router → service → repository → model`：

- Repository 使用单次 `IN` 查询获取选中记录，不逐 ID 查询。
- Service 比较请求 ID 与实际结果，缺失时在写入前失败。
- 货币 Repository 使用单次查询返回存在关联汇率的 currency ID。
- 全部校验通过后在同一事务删除并仅提交一次。
- 任一校验或数据库错误均回滚；数据库 FK 作为并发写入的最终兜底。
- 单条删除路径保持不变。

## Frontend Interaction

- 三页列表使用 BizTable `rowSelection`，框选列统一设为 32px。
- 顶部操作区显示 tendata-ui 危险按钮“删除选中项（N）”。
- 未选择时按钮禁用；操作列不再包含删除。
- 点击后使用居中的 tendata-ui `Modal.confirm` 展示选中数量和“删除后无法撤销”，警告图标及颜色直接使用组件默认值。
- 翻页、改变 pageSize、应用/清除筛选或主动刷新时清空选择。
- 成功后清空选择并刷新；若当前页删除后为空且页码大于 1，则回退上一页。
- 原子失败时不显示部分成功；约束失败保留选择供管理员调整，过期选择错误则清空并刷新。
- API Key 名称和状态筛选使用 tendata-ui Input/Select，筛选后继续由前端对返回数组分页。
- 所有新增用户文案使用 `react-intl`。

## Security and Compatibility

- 管理端批量写操作沿用 Session + CSRF，不新增权限。
- 不在 `/public/*` 增加写接口。
- API Key 列表与错误日志不得出现明文 Key。
- 不修改 MySQL 表和外部数据契约。
- 保留单条删除 API，已有调用方无需迁移。

## Testing Strategy

- 后端：三个批量端点的成功、空/重复/超限 ID、缺失 ID、CSRF、未登录和事务回滚。
- 货币：混合可删/有关联汇率时整批回滚，并验证无 N+1。
- API Key：名称包含、大小写、空白、enabled 及组合筛选。
- 前端：单选、当前页全选、取消、顶部按钮禁用/计数、确认、成功、原子失败。
- 前端：翻页、pageSize、筛选和刷新清空选择；删除后页码回退。
- API Key：创建明文一次性展示、启停和筛选行为不得回归。

## Active Change Coordination

- `standardize-admin-ui-components`：直接重叠 API Key 切片 4；该切片实施时应同时接入 BizTable、筛选和批量删除，不先做一套临时原生表格方案。
- `add-currency-rate-mgmt`：保留其单条 CRUD、`Currency.HasRates`、Session/CSRF 和 API Key 明文规则；本变更只追加批量能力。
- `add-currency-prefix-suggestions`、`add-duplicate-currency-name-warnings`、`add-currency-rate-counts`：仍为 deferred，与本变更不合并。
- 操作记录/撤销需求继续搁置；批量确认必须明确不可撤销。

## TBD / Approval

无。需求与关键契约已确认；实现仍须按切片 Plan 门禁逐项审批。
