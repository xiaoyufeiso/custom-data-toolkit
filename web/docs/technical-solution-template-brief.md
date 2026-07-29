# AI 友好的 React 前端项目模版技术方案（精简版）

## 1. 目标

这是一套全新的 React 前端模版，核心目标是：

- 业务可用
- 结构稳定
- AI 友好

## 2. 技术选型

| 分类 | 选型 | 说明 |
| --- | --- | --- |
| 框架 | `React 18` | 当前统一框架基线 |
| 语言 | `TypeScript 5` | 提供稳定类型约束 |
| 构建 | `Vite` | 统一构建基座 |
| UI 底座 | `Ant Design 5` | 提供基础控件能力 |
| 组件体系 | `tendata-ui` | 统一组件层 |
| 图标体系 | `@tendata-ui/icon` | 统一图标层 |
| 工具库 | `tendata-utils` | 统一工具层 |
| 状态分层 | `Zustand + SWR` | 本地状态与服务端状态分层 |
| 路由 | `React Router DOM` | 标准路由方案 |
| 请求 | `Axios` | 统一请求层封装 |
| 日期 | `dayjs` | 统一日期处理 |
| 样式 | `Less + CSS Modules` | 样式隔离与可维护性兼顾 |
| 国际化 | `react-intl` | 统一国际化方案 |
| 代码规范 | `ESLint + Stylelint` | 工程质量基础约束 |
| Git 规范 | `Husky + lint-staged` | 提交前校验 |
| 测试 | `Vitest + React Testing Library + jsdom + @testing-library/jest-dom + @testing-library/user-event + MSW` | 单测、组件测试、接口 mock |

## 3. 三个内部基础设施的定位

### tendata-ui

- 统一组件层
- 基础组件优先复用

### @tendata-ui/icon

- 统一图标层
- 页面图标统一来源

### tendata-utils

- 统一工具层
- 通用工具优先复用

## 4. 推荐架构

- `pages`：页面入口
- `features`：业务模块主体
- `shared`：通用能力和基础设施

```text
src/
  app/
  pages/
  features/
  shared/
  store/
  locales/
  assets/
```

## 5. 工程约束

- 新代码统一 `TypeScript + TSX`
- `Zustand` 管本地状态，`SWR` 管服务端数据
- 样式统一 `Less + CSS Modules`
- 必须内置 `ESLint + Stylelint`
- 必须内置 `Husky + lint-staged`
- API、类型、表格列、图表配置、参数转换按固定目录归位

## 6. 结论

这套模板的核心是建立统一基线：

- `Antd 5` 做底座
- `tendata-ui` 做组件层
- `@tendata-ui/icon` 做图标层
- `tendata-utils` 做工具层
- `ESLint + Stylelint + Husky` 做工程质量底线
