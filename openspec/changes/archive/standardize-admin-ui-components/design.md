# Design: 管理端 UI 组件库化与视觉统一

## Component Mapping

| 当前实现 | 目标组件 |
|---|---|
| 原生 `<table>` | `@tendata-biz-components/biz-table` |
| 自写页码按钮、原生 pageSize select | `tendata-ui Pagination` |
| 页面内新建/编辑 Card | `tendata-ui Modal` |
| 原生 `<select>` | `tendata-ui Select` |
| 原生日期 input | `tendata-ui DatePicker` |
| 原生 checkbox | `tendata-ui Checkbox` |
| `window.confirm` | `tendata-ui Popconfirm` 或 Modal 确认能力 |
| 原生 `<form>` + 手写 label | `tendata-ui Form` 与表单项 |
| 自定义通用按钮视觉 | `tendata-ui Button` |

## Architecture Decisions

### Decision: 业务表格统一使用 BizTable

- **选择**：货币、汇率、API Key 三个列表使用 `@tendata-biz-components/biz-table`。
- **理由**：公司业务表格组件已安装，能统一列、加载、空态和交互样式。
- **约束**：如 BizTable 的现有版本无法表达必要行为，实施切片必须停止并报告，不得静默回退为自建表格。

### Decision: 表单使用 Modal

- **选择**：新建/编辑表单由页面内 Card 改为 `tendata-ui Modal`。
- **理由**：减少页面布局跳动，统一管理后台编辑体验。
- **约束**：API Key 创建后的明文只展示一次规则必须保持；关闭 Modal 后不得持久化明文。

### Decision: 组件库默认主题优先

- **选择**：移除通用控件的硬编码边框、颜色、hover/disabled 样式。
- **保留**：页面布局、表格外容器、领域专属首字母索引和必要尺寸约束。
- **禁止**：为复刻旧视觉而覆盖组件库通用状态样式。

### Decision: 首字母选择器保留领域组件

新建汇率货币选择器继续作为 `rates` 领域组件，但其触发器、弹层、列表、按钮、加载/空态应优先由 tendata-ui 原语组合。必须保留：

- 全量货币分页串行加载
- 按 code 首字母分组
- 无 code 归 `#`
- 右侧仅显示有数据的字母
- 点击字母滚动到分组
- `code (name)` 展示格式
- 点击外部关闭和鼠标滚轮操作

### Decision: 大效果先于小效果

实施顺序：

1. 逐页完成表格、分页、Modal 和核心表单控件替换；
2. 重组领域专属货币选择器；
3. 登录页组件化；
4. 最后处理 `react-intl`、label/ARIA、间距和残余样式。

## Data Flow and Contracts

- 页面 service、请求参数、响应类型与 API 路径保持不变。
- 分页仍由既有 `page` / `pageSize` 驱动。
- 汇率日期控件需继续向 API 提交 `YYYY-MM-DD`。
- 货币选择仍提交 `currencyId`。
- UI 重构不得改变 Session Cookie、CSRF 或公开 API Key 鉴权。

## Testing Strategy

- 每页至少覆盖：加载、空态、分页、打开/关闭 Modal、提交成功、提交失败、删除确认。
- 汇率页额外覆盖日期筛选、checked、日期排序和首字母货币选择器。
- API Key 页额外覆盖一次性明文展示、启停和删除。
- 登录页覆盖提交、loading、成功跳转和失败提示。
- 每个切片运行相关组件测试、全量类型检查、lint 和前端构建。

## Compatibility

- 不修改路由、API 或数据库。
- 桌面后台优先；移动端完整适配仍不在 MVP 范围。
- 暂缓需求在本变更完成后再排期，以避免在旧 UI 上重复实现。

## Active Change Coordination

- `improve-rate-create-currency-picker`：本变更以其已确认的首字母选择行为为基线，只重组 UI 原语，不删减功能。
- `add-currency-prefix-suggestions`、`add-duplicate-currency-name-warnings`、`add-currency-rate-counts`：均为 deferred；应在本 UI 组件库化完成后实施，避免在旧页面结构上重复开发。
- `add-currency-rate-mgmt`：不修改其领域行为、API 和鉴权要求。
