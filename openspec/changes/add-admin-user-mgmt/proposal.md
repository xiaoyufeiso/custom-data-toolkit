# Proposal: 管理端用户管理

## Intent

支持管理员维护后台账号：用户名、密码、角色（admin/operator）、启停；仅 admin 可访问用户管理。

## Scope

### In Scope

- `admin_users` 增加 `role`、`enabled`
- 用户列表 / 新建 / 改角色与启停 / 管理员重置密码
- 登录校验启停；停用踢会话
- 侧栏左下角用户菜单进入「用户管理」（仅 admin）；operator 仅可退出

### Out of Scope

- Casdoor/Casbin/SSO/自助注册
- 细粒度模块权限、物理删除、审计日志、强制首登改密

## Approach

角色制两档；软停用；业务 API 对 admin/operator 均开放；用户管理 API 仅 admin。
