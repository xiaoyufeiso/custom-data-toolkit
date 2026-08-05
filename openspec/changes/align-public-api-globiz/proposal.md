# Proposal: 对外 API 对齐 globiz-rates 文档

## Intent

以 `deploy/api/globiz-rates-api.md` 为对外权威，废弃 `/api/v1/public/rates` 新契约。

## Scope

### In Scope

- 根路径只读：`/`、`/currencies/`、`/currencies/{id}/`、`/rates/`、`/rates/{id}/`、`/openapi`
- 分页：`page`/`size`（默认 5，最大 1000）；响应 `count/next/previous/results`
- 鉴权开关：`PUBLIC_API_AUTH_ENABLED`（运维环境变量）
- 删除旧 `GET /api/v1/public/rates`

### Out of Scope

- 管理端 `/api/v1/*` Session API 行为变更
- 公开写接口
