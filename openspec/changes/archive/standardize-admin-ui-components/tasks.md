# Tasks: 管理端 UI 组件库化与视觉统一

> 按独立可验收页面拆分；严格执行 plan → implement → verify → test → review → document。

## 大效果切片

### 1. 货币管理页面统一

- [x] 1.1 BizTable 替换手写表格，保持现有列、加载和空态
- [x] 1.2 Pagination 替换自写分页，保持 page/pageSize 行为
- [x] 1.3 Modal + Form/Input 替换页面内新建/编辑 Card
- [x] 1.4 Popconfirm/等价组件替换 `window.confirm`
- [x] 1.5 实跑货币页相关测试、类型检查和构建

### 2. 汇率管理页面统一

- [x] 2.1 BizTable + Pagination 替换手写列表与分页
- [x] 2.2 Select、DatePicker、Checkbox 替换原生筛选和表单控件
- [x] 2.3 Modal 承载新建/编辑；Popconfirm/等价组件承载删除确认
- [x] 2.4 保持日期排序、筛选、创建、编辑和删除行为
- [x] 2.5 实跑汇率页相关测试、类型检查和构建（`tsc` / stylelint / vitest currencies+rates / `build:pro` 通过）

### 3. 新建汇率货币选择器组件库化

- [x] 3.1 使用 tendata-ui 原语重组触发器、弹层、列表、loading 和空态
- [x] 3.2 保留全量加载、首字母分组/索引、滚动、`#` 和 `code (name)`
- [x] 3.3 覆盖选择、点击外部关闭、滚轮和字母跳转测试

### 4. API Key 管理页面统一

> **Deferred（2026-07-31）**：前端 API Key 模块已整体移除并搁置；本切片暂不实施。后端 `/api-keys` 与对外鉴权不受影响。

- [ ] 4.1 BizTable + Pagination 替换手写列表与分页
- [ ] 4.2 Modal + Form/Input 承载创建流程
- [ ] 4.3 使用组件库确认/开关交互，保持启停和删除行为
- [ ] 4.4 验证明文 Key 只展示一次且关闭后清除
- [ ] 4.5 实跑 API Key 页相关测试、类型检查和构建

### 5. 登录页组件化

- [x] 5.1 使用 tendata-ui Form/Input/Button，移除原生 form/label 组合
- [x] 5.2 修复 Button 不支持的 `block` 属性导致的类型错误（全宽用 `classNames` + 布局样式）
- [x] 5.3 保持登录、loading、错误提示和 redirect 行为（`views/auth/index.test.tsx`）

## 小效果切片

### 6. 国际化与可访问性

- [x] 6.1 范围页用户文案接入 react-intl（货币/汇率已有；登录新增 `locales/*/auth.ts`；API Key 随 §4 Deferred）
- [x] 6.2 Form.Item label 关联输入；登录中英文 label/按钮可辨识
- [x] 6.3 登录中英文文案测试；货币/汇率既有英文化测试保留

### 7. 视觉与样式收口

- [x] 7.1 删除登录页手写 label 状态样式；选择器分区标题改用主题变量
- [x] 7.2 保留布局与领域专属样式（登录居中卡、货币选择器索引）
- [x] 7.3 桌面端冒烟：登录 Form + 货币/汇率既有组件回归测试通过

## 完整验收

- [x] 8.1 对照本 change Scenario（API Key 页除外，见 §4 Deferred）
- [x] 8.2 `tsc`、stylelint、相关 vitest、`build:pro` 通过（全仓 `eslint` 仍有历史 `no-void` 等债，非本切片引入）
- [x] 8.3 确认 API、数据库、认证权限和依赖配置均未变化
- [x] 8.4 更新本 tasks 与 `openspec/specs/ui.md` 后归档 change
