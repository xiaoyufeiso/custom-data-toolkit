# Tendata Customs Tools 开发进展

> 可选状态板（无看板时使用）。不替代 Git 历史，不复述 OpenSpec `tasks.md` 每一项。

## 当前状态

- 阶段：MVP 主链路与管理端 UI 组件库化已完成并归档；活跃仅两项 Deferred
- 整体状态：用户/viewer/审计/globiz/Session/登录页 Form+i18n 均已落地；**Docker Compose 本地编排 + Harbor 前后端镜像已落地**；**登录 redirect 自指与退出后再登录竞态已修复**
- 最后更新：2026-08-07

## 里程碑

| 里程碑 | 状态 |
|---|---|
| M0–M6 汇率 MVP 及发布整理 | 完成 |
| 海关字典第一版文档 / Redis 默认假设 | 完成 |
| 海关字典第一版开发（包 1–5） | 完成 |
| 标准字典导入/导出 | 完成（已归档） |
| 字典类型管理 | 完成（已归档） |
| 管理端列表 UI 统一 | 完成（已归档） |
| 管理端用户管理 | 完成（已归档） |
| viewer 只读角色 | 完成（已归档） |
| 管理端操作审计 | 完成（已归档） |
| 对外 API 对齐 globiz | 完成（已归档） |
| 管理端 UI 组件库化 | 完成（已归档；API Key 页仍 deferred） |
| Docker Compose 本地编排 + Harbor 镜像 | 完成 |
| 登录 Session 竞态 / redirect 自指修复 | 完成 |

## 阻塞

无。整表覆盖 / 字典处理历史仍为 Deferred。

## 下一步

1. （可选）E5 Redis 友好错误文案；API 契约迁 OpenAPI
2. （可选）恢复前端 API Key 管理 UI
3. （可选）生产环境验证 Docker 全栈（`compose --profile full`）与公司 nginx 基础镜像对齐

## 日志（摘录）

### 2026-08-07（Docker 部署 + 登录鉴权修复）

- **Docker**：后端 Harbor `python-devel`/`python-runtime` 两阶段；前端 Harbor `nodejs:20` + pnpm 构建 + Nginx runtime；Compose profile `web`/`mysql`/`redis`/`full`；迁移不在容器内自动执行
- **文档**：根 README 对外化；`deploy/docker/README.md`、`docs/operations.md` 运维向说明
- **鉴权**：`authGeneration` 世代 bump 前移（login/logout）；`loginRedirect` 消毒禁止 `redirect=/login`；`RequireAuth` 忽略 stale 401 并重试；修复退出后再登录需点两次
- **Git**：`origin/main` 推至 `4d86974`

### 2026-08-05（UI 组件库化收口并归档）

- 登录页：tendata-ui Form/Input/Button；`locales/*/auth.ts`；成功/失败/redirect 测试
- `tsc` / stylelint / 相关 vitest 43 / `build:pro` 通过；归档 `standardize-admin-ui-components`

### 2026-08-05（OpenSpec 归档）

- 归档：`add-admin-user-mgmt`、`add-viewer-readonly-role`、`add-admin-audit-log`、`align-public-api-globiz`
- 领域：`auth` 1.1（用户管理 + viewer）、新建 `audit` 1.0、`rate` 1.3（globiz 来源注记）

### 2026-08-05（对外 API 对齐 globiz）

- 权威：`deploy/api/globiz-rates-api.md`；根路径 `/currencies/`、`/rates/` 等
- `PUBLIC_API_AUTH_ENABLED` 运维开关；废弃 `/api/v1/public/rates`
- pytest：`test_globiz_public_api` 等相关通过

### 2026-08-05（Session 多标签 / 停用踢出）

- 前端 `useSessionGuard`：focus / 可见性 / 约 10s 轮询 / BroadcastChannel 重验 `/auth/me`
- Cookie 换账号 → Toast「账号已切换」并刷新侧栏；非 admin 离开系统管理页
- `401 Auth.Unauthorized`（含停用清 Session）→ Toast「登录已失效」并踢回登录
- 文档：`openspec/specs/ui.md`、`docs/product.md` 已回写；相关 vitest 通过

### 2026-08-04（操作审计）

- OpenSpec `add-admin-audit-log`：表 `admin_audit_log`、写接口埋点、`GET /audit-logs`
- 前端侧栏 `/audit-logs`：点操作文案开详情；批量一行展示数量
- pytest + vitest 通过

### 2026-08-04（viewer 只读）

- `operator` → `viewer`；迁移 `0006`；`require_writer` 挂业务写/API Key/导入模板
- viewer：可读 + 字典 export；前端隐藏写操作；pytest + vitest 通过

### 2026-08-04（用户管理）

- OpenSpec change `add-admin-user-mgmt`：`admin`/`operator` + `enabled` 软停用
- 后端：迁移、`/admin-users` CRUD、`require_admin`、登录/me/session 对齐；pytest 8 passed
- 前端：`/admin-users` 页、`RequireAdmin`；入口改左下角用户下拉（admin：用户管理+退出；operator：退出）
- 文档：`api.md` / `product.md` / `ui.md` 已回写

### 2026-08-04（合并与归档）

- 合并 `feat/admin-list-ui-unify`（含 import / types / 列表 UI）至 `main`
- 归档：`add-customs-dict-import`、`add-customs-dict-types`、`unify-admin-list-ui`、`improve-rate-create-currency-picker`
- 领域 spec 合并：`customs-dict` 0.3、`rate` 1.2（货币选择器）

### 2026-08-03（标准字典新建弹窗）

- 列表去掉「导入/导出」；前端暂不展示导出
- 「新建映射」弹窗 Tabs：单条新建 / 批量导入
- 批量导入：小字链接触发下载模板；「选择文件」后本地可滑动预览+条数；「确认导入」才上传

### 2026-08-03（列表 UI 统一）

- QueryListCard；重置/刷新规范；Content 内批量 footer；筛选标题/查询文案；去 ID 列；汇率日期非蓝；详情只读、编辑走新建同款 Modal；停用文案→删除；行高对齐；标准字典批量 loading 分离
- UI 抛光：顶栏（语言/用户/退出）；筛选区主次分区；状态 Tag；批量选中数字强调

### 2026-08-03（字典类型）

- 表 `customs_dict_type` + 种子；types API；映射校验改读 DB；类型管理页；标准/缺失下拉 `/options`

### 2026-08-03（导入/导出）

- 共享表头；标准字典 export / import-template / import（upsert，`source=import`）；前端标准页按钮；api/product 更新

### 2026-08-03（包 5）

- Verify Scenario 全 PASS；pytest 13 + vitest 11；归档 `openspec/specs/customs-dict`；change 入 archive

### 2026-08-03（E4 + UX）

- 批量停用（UI 删除=软删）+ 批量同步；隐藏停用行与启停筛选；缺失详情 Drawer + 处理

### 2026-08-03（E2）

- 详情 Drawer 右下角编辑；标准值可编辑并 PATCH 保存；编辑中禁点遮罩关闭

### 2026-08-03（E1+E3）

- 标准字典：去操作列；行/原始值进 Drawer 详情（可点遮罩关闭）；字段两列灰名黑值
- 标准/缺失：重置有框、刷新 link 无框

### 2026-07-31（包 4）

- 一级菜单「字典管理」下挂「标准字典管理」「缺失字典管理」
- 路由 `/customs-dict/mappings`、`/customs-dict/missing`；标准/缺失 views + 前端测试

### 2026-07-31（包 3）

- 缺失列表/处理/导出；正式同步成功后 ZREM；失败保留 missing；openpyxl 导出

### 2026-07-31（包 2）

- 标准字典 API + 增量 Redis（HSET/HDEL、resync、replay-sync）；fakeredis 集成测试；`REDIS_URL` 写入 operations / .env.example

### 2026-07-31（包 1）

- 新增 `customs_dict_mapping` 模型与迁移 `0003`；常量/trim/dict_type 校验；单元 4 测通过；`alembic upgrade head` 通过
- 原始值不可变规则留包 2 service

### 2026-07-31（字典默认假设）

- 采纳：第三方写正式 Hash；按类型拆 key；仅增量同步；缺失正式同步成功后 ZREM；导入搁置；内容不审核；单表+类型筛选
- 明确不做：整表覆盖全量、导入、处理历史、操作日志

### 2026-07-31（M6 / 初版字典文档）

- M6 收尾完成；废止货币名称字典占位；ADR-011；新建 `add-customs-dict-mgmt`
