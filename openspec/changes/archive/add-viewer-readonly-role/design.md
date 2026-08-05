# Design: viewer 只读角色

## 角色

| 角色 | 能力 |
|---|---|
| `admin` | 全量（含用户管理、业务写、API Key） |
| `viewer` | 货币/汇率/字典读 + 字典 export；自改密；无用户管理 |

## 鉴权

- `CurrentAuthDep`：已登录（admin + viewer）
- `require_writer`：仅启用 `admin` → 业务写 / API Key / import-template
- `require_admin`：用户管理

## 数据

- Alembic：`UPDATE admin_users SET role='viewer' WHERE role='operator'`
- 枚举：`AdminRole.VIEWER = "viewer"`
