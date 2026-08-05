# Design: 管理端操作审计

## 谁可看 / 谁产生

| 角色 | 产生审计 | 查看审计 / 系统管理 |
|---|---|---|
| `admin` | 业务写、用户管理、改密 | 是 |
| `viewer` | 仅自改密 | **否**（侧栏无系统管理；API 403） |

## 数据

表 `admin_audit_log`：

- `actor_user_id` / `actor_username`
- `action`（稳定码，如 `currency.create`、`auth.change_password`）
- `resource_type` / `resource_ids`（批量逗号分隔，过长截断）
- `summary`（JSON；禁止密码、API Key 明文）
- `created_at`

## 埋点

- Router 写接口成功返回前调用 `AuditService.record_best_effort`（独立 session；失败只打日志，不阻断主业务）
- 不记：login/logout、export、import-template、GET

## API

- `GET /api/v1/audit-logs`：`require_admin`；筛选 `actorUsername` / `action` / `resourceType` / `createdFrom` / `createdTo` / `sortOrder`
- `GET /api/v1/audit-logs/{id}`：详情
- viewer → 403 `AdminUser.Forbidden`

## UI

- 侧栏「系统管理」仅 admin：用户管理 + 操作审计
- 路由 `/audit-logs`：`RequireAdmin`
- 列：时间、操作者、操作；点操作开详情
