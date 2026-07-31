# Design: 货币与汇率搜索前缀推荐

## Decision: 使用专用推荐接口

- 新增管理端只读接口：`GET /api/v1/currencies/suggestions`
- 查询参数：
  - `prefix`：必填，trim 后非空
  - `field`：`nameOrCode` 或 `code`
  - `limit`：可选，默认和最大值均为 10
- 返回精简货币项：`id`、`name`、`code`、`matchField`
- 匹配采用大小写不敏感的前缀匹配，不复用现有 `q` 的包含匹配语义。
- `matchField` 为 `code` 或 `name`；同一货币同时匹配时取优先级更高的字段。
- 排序依次为：完全匹配、code 前缀、名称前缀；同组按规范化后的 code、名称和 ID 稳定排序。

## Rationale

专用接口能供货币页和汇率页复用，避免前端拉取全量货币，也不会把既有列表查询 `q` 从包含匹配改成前缀匹配。

## Data and Security

- 不修改数据库列或既有数据语义。
- 可基于现有 `currency.name` / `currency.code` 查询；是否增加索引须在实现计划中依据数据量和查询计划决定。
- 接口沿用管理端 Session 鉴权；只读请求不需要 CSRF。
- 前端需要防抖、忽略过期响应，并对结果数量设限。
- 下拉列表最多展示 10 条并固定最大高度，超出可视高度时使用鼠标滚轮纵向滚动；禁止横向滚动。

## Compatibility

- `GET /currencies?q=` 保持不变。
- 选择推荐项只更新输入值；现有点击搜索/回车搜索行为保持不变。
- 货币页选择后填入 `matchField` 对应的 code 或名称；汇率页始终填入 code。
