# Proposal: 管理端操作审计

## Intent

记录管理员有影响的写操作，供 **admin** 在管理端只读查询；viewer 不可见系统管理整组。

## Scope

### In Scope

- 表 `admin_audit_log` + `GET /audit-logs`（列表/详情）
- 成功后埋点：货币/汇率/字典写（含 import、batch、缺失 handle）、API Key 写、用户管理写、自改密
- 前端侧栏「操作审计」：列表列时间为操作者/操作/资源；**点击操作文案**打开详情；无独立操作列、无勾选批量
- 批量操作记为**一行**（资源列展示数量；详情展示 id 列表）

### Out of Scope

- 登录/退出、只读 GET、字典 export、导入模板下载、失败/403
- 审计导出、清理 UI、字典处理历史
- Casbin

## 解冻

`docs/product.md` 中「操作日志」改为本 change 交付的管理端操作审计；字典「处理历史」仍搁置。
