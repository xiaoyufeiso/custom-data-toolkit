# Design: 货币列表展示关联汇率数量

## API Change

`GET /api/v1/currencies` 的每个列表项新增：

```json
{
  "rateCount": 12
}
```

`rateCount` MUST 为非负整数，表示该货币关联的全部 `rate` 行数。

## Query Approach

- 在 repository 层使用聚合查询（如 `LEFT JOIN` + `COUNT(rate.id)` 或分页货币 ID 的批量分组计数）。
- MUST 避免按货币逐条查询的 N+1。
- 无关联汇率时返回 `0`。
- 原分页、搜索和默认排序语义不变。

## Data, Migration and Security

- 只读聚合，不新增列、不修改 `currency` / `rate` 表，不需要迁移。
- 沿用管理端 Session 鉴权。
- 不影响 `/public/*`。

## Compatibility

响应增加字段，对忽略未知字段的客户端向后兼容；前端 TypeScript 类型和接口文档需在实现时同步更新。
