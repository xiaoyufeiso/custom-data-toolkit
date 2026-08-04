# Proposal: 标准字典 xlsx 导入/导出

## Intent

为标准字典提供与**缺失导出同构**的 xlsx 导出/导入，支持导出→改标准值→再导入（upsert），以及「缺失导出填标准值后导入标准字典」。

## Scope

### In Scope

- 共享表头：`字典类型编码 | 字典类型名称 | 原始值 | 出现次数 | 标准值 | 备注`
- `GET /customs-dict/mappings/export`：当前筛选全量（默认仅启用）
- `POST /customs-dict/mappings/import`：multipart xlsx；upsert；汇总 created/updated/failed
- `source=import`；导入**不**自动 ZREM missing
- 管理端标准字典页：导出、导入、模板（表头）

### Out of Scope

- 整表覆盖 Redis、异步队列、缺失页独立导入按钮、类型管理、物理删除

## Approach

复用 openpyxl；表头常量前后端/缺失导出共用；路由挂在 `/{id}` 之前。
