# Design: 对外 API 对齐 globiz

## 挂载

应用根路径直挂（无 `/api`、`/api/v1`、`/public` 前缀），与文档 curl 一致。

## 鉴权

| `PUBLIC_API_AUTH_ENABLED` | 行为 |
|---|---|
| `true`（默认） | 必须有效 `X-API-Key` |
| `false` | 不校验 Key |

开关仅运维/部署改 `.env` 或环境变量；无管理端 UI、调用方不可改。

## 错误

公开路由优先 DRF 风格 `{"detail": "..."}`（HTTPException）；管理端仍用 `{code,message,requestId}`。

## 废弃

卸载并删除 `GET /api/v1/public/rates` 实现与契约描述。
