# Design: 管理端用户管理

## Data

- `admin_users.role`: `admin` | `operator`（bootstrap = admin）
- `admin_users.enabled`: bool，默认 true
- 密码仅哈希；响应不回传密码

## Safety

- 禁止停用自己
- 禁止停用/降级最后一个启用 admin
- 停用时删除该用户全部 session
- 停用账号登录失败文案与密码错误一致

## API

- `GET/POST /admin-users`，`PATCH /admin-users/{id}`，`POST /admin-users/{id}/reset-password`
- `/auth/me` 增加 `role`、`enabled`

## UI

- 入口：侧栏左下角用户下拉（admin：用户管理 + 退出；operator：退出）；路由 `meta.roles=['admin']`，不进业务菜单
- 列表页对齐现有筛选即查 / QueryListCard / 详情 Drawer
