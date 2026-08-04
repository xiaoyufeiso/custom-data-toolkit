# Custom Data Toolkit 开发进展

> 可选状态板（无看板时使用）。不替代 Git 历史，不复述 OpenSpec `tasks.md` 每一项。

## 当前状态

- 阶段：功能分支已合并；已完成 OpenSpec 归档
- 整体状态：`main` 含字典全链路 + 管理端列表 UI；剩余可选 `standardize-admin-ui-components` 登录页/i18n 收口
- 最后更新：2026-08-04

## 里程碑

| 里程碑 | 状态 |
|---|---|
| M0–M6 汇率 MVP 及发布整理 | 完成 |
| 海关字典第一版文档 / Redis 默认假设 | 完成 |
| 海关字典第一版开发（包 1–5） | 完成 |
| 标准字典导入/导出 | 完成（已归档） |
| 字典类型管理 | 完成（已归档） |
| 管理端列表 UI 统一 | 完成（已归档） |

## 阻塞

无。整表覆盖 / 处理历史 / 操作日志等仍为 Deferred。

## 下一步

1. （可选）`standardize-admin-ui-components`：登录页 / i18n / 视觉收口后归档
2. （可选）E5 Redis 友好错误文案；API 契约迁 OpenAPI

## 日志（摘录）

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
