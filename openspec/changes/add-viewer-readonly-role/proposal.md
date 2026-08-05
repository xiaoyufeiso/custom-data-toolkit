# Proposal: viewer 只读角色

## Intent

将 `operator` 更名为 `viewer`：可浏览数据管理与海关字典并导出，禁止一切写操作；用户管理仍仅 `admin`。

## Scope

### In Scope

- 角色值 `admin` | `viewer`；库内 `operator` 迁移为 `viewer`
- 业务写接口 `require_writer`（仅 admin）
- viewer：读 + 导出；不可导入模板/写操作
- 前端隐藏写操作；用户管理默认角色 `viewer`

### Out of Scope

- Casbin / 细粒度权限
- 前端 API Key 页
- `/public/*` 变更
