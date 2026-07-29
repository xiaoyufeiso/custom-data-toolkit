# AI 友好的 React 前端项目模版技术方案

## 1. 方案目标

本模版面向前端中后台项目，重点解决以下问题：

- 业务复杂：存在大量查询条件、表格、图表、详情页、报告页、多模块联动
- UI 要求高：组件形态多，图标多，视觉一致性要求高
- AI Coding 落地难：目录不稳定、命名不统一、边界不清晰时，AI 生成代码容易失控

本方案的目标不是追求最潮技术栈，而是建立一套业务可用、结构稳定、可复制、可被 AI 理解的全新 React 前端模版。

## 2. 技术选型

| 分类 | 选型 | 说明 |
| --- | --- | --- |
| 框架 | `React 18` | 当前主流稳定基线，适合复杂中后台场景，对 AI Coding 友好 |
| 语言 | `TypeScript 5` | 提供稳定类型约束，降低协作和 AI 生成代码的不确定性 |
| 构建 | `Vite` | 启动快、构建快、配置简单，适合作为统一模板基座 |
| UI 底座 | `tendata-ui`（内部包，底层基于 Ant Design 5） | 提供成熟基础控件能力，作为统一 UI 底座 |
| 组件体系 | `tendata-ui` | 统一组件层，承接品牌化和交互一致性，优先复用 |
| 图标体系 | `@tendata-ui/icon` | 统一图标来源，避免图标风格和资源分散 |
| 工具库 | `tendata-utils` | 统一格式化、数据处理、辅助函数等通用能力 |
| 状态分层 | `Zustand + SWR` | `Zustand` 管本地状态，`SWR` 管服务端数据状态，边界清晰 |
| 路由 | `React Router DOM` | 标准 React 路由方案 |
| 请求 | `Axios` | 便于统一封装请求层、拦截器和错误处理 |
| 日期 | `dayjs` | 轻量、清晰，适合作为统一日期处理方案 |
| 样式 | `Less + CSS Modules` | 保持样式隔离，兼顾工程可维护性和页面定制能力 |
| 国际化 | `react-intl` | 适合中后台多语言场景，便于统一文案管理 |
| 代码规范 | `ESLint + Stylelint` | 统一代码和样式规范，作为模板质量基线 |
| Git 规范 | `Husky + lint-staged` | 提交前执行必要校验，降低低级问题进入仓库的概率 |
| 测试 | `Vitest + React Testing Library + jsdom + @testing-library/jest-dom + @testing-library/user-event + MSW` | 覆盖单元测试、组件测试、接口 mock |

### 2.1 测试框架技术选型方案

测试体系建议分成三层：

- 单元测试与组件测试：优先使用 `Vitest + React Testing Library`
- 浏览器环境模拟：使用 `jsdom`
- 接口 mock：使用 `MSW`

推荐组合如下：

| 分类 | 选型 | 职责 |
| --- | --- | --- |
| 测试运行器 | `Vitest` | 执行单元测试、组件测试、覆盖率统计 |
| 组件测试库 | `React Testing Library` | 面向用户视角验证页面与组件行为 |
| DOM 环境 | `jsdom` | 在 Node 环境模拟浏览器 DOM 能力 |
| DOM 断言增强 | `@testing-library/jest-dom` | 提供 `toBeInTheDocument` 等可读性更高的断言 |
| 用户交互模拟 | `@testing-library/user-event` | 模拟点击、输入、键盘操作等真实交互 |
| 网络层 mock | `MSW` | 在网络边界拦截请求，避免在业务代码中写 mock 分支 |
| 覆盖率 | `@vitest/coverage-v8` | 输出覆盖率报告，便于接入 CI 与质量平台 |

### 2.2 选型理由

#### Vitest

- 与 `Vite` 同源，能直接复用 Vite 的别名、插件和模块解析规则
- 对 `TypeScript + ESM + JSX` 支持自然，配置成本低于 `Jest`
- 更适合作为 Vite 项目的默认测试基座

#### React Testing Library

- 强调从用户视角验证行为，而不是测试组件内部实现细节
- 更适合中后台页面里的表单、按钮、列表、状态切换等交互测试
- 能减少因为重构内部实现而导致的脆弱测试

#### jsdom

- 能在测试环境中模拟常用浏览器 API
- 对 `React + antd` 这类依赖 DOM 的组件体系兼容性更稳
- 更适合作为组件测试的默认运行环境

#### @testing-library/jest-dom 与 @testing-library/user-event

- `jest-dom` 让断言语义更清晰，例如 `toBeInTheDocument`、`toHaveTextContent`
- `user-event` 比简单触发 DOM 事件更接近真实用户行为
- 两者配合能显著提升组件测试的可读性与可信度

#### MSW

- 在网络层 mock，而不是在页面、hooks、services 中写 `USE_MOCK` 之类的分支
- 能让页面、hooks、services 仍然沿用真实调用链路
- 适合既做集成测试，也做接口异常、空态、失败态等场景模拟

### 2.3 测试分层建议

| 层级 | 推荐工具 | 适用场景 |
| --- | --- | --- |
| 单元测试 | `Vitest` | 工具函数、数据转换、参数构造、store |
| Hook 测试 | `Vitest + RTL` | 复杂 hooks、分页、查询、状态流转 |
| 组件测试 | `Vitest + RTL + jsdom` | 页面区块、表单、表格操作、状态切换 |
| Service 集成测试 | `Vitest + MSW` | 请求路径、参数、响应处理 |

### 2.4 目录约定

建议统一采用以下方式：

- 单元测试、组件测试文件默认与被测文件就近放置
- 文件命名统一使用 `*.test.ts`、`*.test.tsx`
- 测试基础设施统一放在 `src/test/`
- 浏览器端本地 mock 不作为模板默认能力
- 测试环境中的 `MSW` 仅服务于测试，不侵入业务实现

示例：

```text
src/
  views/
    about/
      index.tsx
      index.test.tsx
      hooks/
        index.ts
        index.test.ts
      services/
        index.ts
        index.test.ts
  shared/
    utils/
      request/
        index.ts
        index.test.ts
  store/
    useCounterStore.ts
    useCounterStore.test.ts
  test/
    setup.ts
    utils/render.tsx
    msw/server.ts
    msw/fixtures/
```

### 2.5 选型原则

- 测试框架必须与 `Vite + React + TypeScript` 技术基线一致
- 测试不侵入页面、hooks、services 的业务实现
- mock 统一在测试层完成，而不是在生产代码里写条件分支
- 单元测试优先覆盖高价值逻辑，不追求形式上的全量覆盖率

## 3. 内部基础设施约定

### 3.1 官方入口

- `tendata-ui`：[https://ui.tendata.net/](https://ui.tendata.net/)
- `tendata-utils`：[https://ui.tendata.net/utils/](https://ui.tendata.net/utils/)

### 3.2 使用原则

- 基础组件优先查 `tendata-ui`
- 图标统一使用 `@tendata-ui/icon`
- 通用工具优先查 `tendata-utils`
- 无法确认用法时，优先看官方文档和项目内既有模式

### 3.3 导入原则

- 优先使用包公开导出入口
- 非必要不使用深路径导入
- 同一项目保持统一导入风格
- 所有依赖必须在 `package.json` 中显式声明

## 4. 架构设计

### 4.1 总体分层

推荐采用以下分层：

- `pages`：路由入口页
- `views`：页面视图层
- `shared`：稳定复用的基础设施和通用能力
- `store`：全局本地状态

### 4.2 推荐目录

```text
public/
src/
├── pages/                       # 路由级页面入口（页面壳）
│   ├── home/                    # 首页入口页
│   └── about/                   # 关于页入口
│
├── views/                       # 页面视图（与页面入口一一对应）
│   ├── home/
│   │   ├── services/            # 首页相关接口
│   │   ├── components/          # 首页业务组件
│   │   ├── hooks/               # 首页业务 hooks
│   │   ├── constants/           # 首页常量定义
│   │   └── utils/               # 首页工具函数
│   │   └── types/               # 首页类型定义
│   └── about/                   # 详情页业务模块
|             
├── shared/                      # 跨业务稳定复用层
│   ├── services/                # 通用接口
│   ├── components/              # 通用组件
│   ├── hooks/                   # 通用 hooks
│   ├── utils/                   # 通用工具函数
│   ├── constants/               # 公共常量
│   └── types/                   # 公共类型定义
│
├── store/                       # 全局本地状态
├── locales/                     # 国际化文案
|   ├── index.ts                     # 语言注册入口
|   ├── en/                          # 英文资源（按模块拆分）
|   └── zh_CN/                       # 中文资源（按模块拆分）
|
└── assets/                      # 静态资源
├── router/                      # 路由配置
├── config/                      # 全局配置（环境变量、常量）
├── styles/                      # 全局样式
├── app.tsx                      # 应用入口
├── main.tsx                     # 主入口
```

### 4.3 目录说明

| 目录 | 作用 | 推荐放置内容 | 不建议放置内容 |
| --- | --- | --- | --- |
| `src/app.tsx` | 应用级初始化层 | Provider、路由注册、全局样式、主题挂载 | 业务 API、业务组件、页面具体逻辑 |
| `src/pages` | 路由壳层 | 仅做路由壳，转发到对应 views | 业务逻辑、请求逻辑、状态逻辑 |
| `src/views` | 页面视图层 | 页面业务实现、业务组件、hooks、services、utils、types | 跨业务通用能力（应放 shared） |
| `src/shared` | 跨业务复用层 | 请求基础封装、通用组件、通用 hooks、常量、类型、工具函数 | 强依赖某个业务域概念的实现 |
| `src/store` | 全局本地状态层 | 主题、语言、布局、用户偏好、跨页面临时状态 | 服务端查询结果长期缓存 |
| `src/locales` | 国际化资源目录 | 公共文案、业务模块文案 | 业务逻辑代码 |
| `src/assets` | 静态资源目录 | 图片、插图、字体、非组件化静态资源 | 本应走 `@tendata-ui/icon` 的图标资源 |

### 4.4 目录放置原则

| 目录 | 一句话原则 | 说明 |
| --- | --- | --- |
| `app.tsx` | 只放全局初始化能力 | 这是应用启动层，不是业务实现层 |
| `pages` | 只做路由壳 | 仅转发到 views，不承载任何业务逻辑 |
| `views` | 放页面具体实现 | 页面真正的主体实现优先放这里 |
| `shared` | 放去业务语义后仍成立的能力 | 能跨模块复用，才进入 `shared` |
| `store` | 只放全局本地状态 | 服务端数据交给 `SWR` |
| `locales` | 只放文案 | 便于国际化维护和拆分 |
| `assets` | 只放静态资源 | 图标优先统一走图标体系 |

### 4.5 分层职责

#### pages

- 仅作为路由级页面入口
- 仅做路由壳，转发到对应 views 中的页面实现
- 不承载任何业务逻辑

#### views

- 页面组织实现
- 承载查询逻辑、接口调用、业务组件、表格、图表、参数转换
- 是模板最核心的一层

#### shared

- 承载跨业务复用能力
- 包括请求封装、通用组件、基础 hooks、常量、工具函数、类型定义

### 4.6 典型功能落位示例

以“标准查询页”为例，推荐按下面方式组织：

```text
src/
├── pages/
│   └── search/
│       └── index.tsx            # 查询页入口，只负责页面装配
├── views/
│   └── search/
│       ├── services/
│       │   └── index.ts         # 查询接口
│       ├── components/
│       │   ├── SearchForm.tsx   # 查询表单
│       │   └── SearchTable.tsx  # 查询结果表格
│       ├── hooks/
│       │   └── useSearchPage.ts # 查询页核心逻辑
│       ├── constants/
│       │   └── index.ts         # 查询页常量
│       └── utils/
│           └── index.tsx        # 查询页工具函数
└── shared/
    ├── services/
    │   └── request.ts           # 通用请求封装
    ├── components/
    │   └── PageContainer/       # 通用页面容器
    └── utils/
        └── index.ts             # 通用函数
```

对应职责如下：

| 路径 | 职责 |
| --- | --- |
| `pages/search/index.tsx` | 路由壳，转发到 `views/search` |
| `views/search/index.tsx` | 查询页入口，只做组装 |
| `views/search/services/` | 查询页接口定义 |
| `views/search/components/` | 查询页业务组件 |
| `views/search/hooks/` | 查询页核心逻辑 |
| `views/search/constants/` | 查询页常量与默认值 |
| `views/search/utils/` | 参数转换、列定义等辅助逻辑 |
| `shared/*` | 跨模块复用能力 |

### 4.7 落位判断规则

新增代码时，按以下顺序判断：

| 判断问题 | 放置位置 |
| --- | --- |
| 是否是路由入口？ | `pages` |
| 是否是某个视图专属能力？ | `views/<domain>` |
| 是否是跨业务复用能力？ | `shared` |
| 是否是全局本地状态？ | `store` |
| 是否是国际化文案？ | `locales` |
| 是否是静态资源？ | `assets` |

## 5. 页面范式

模板优先支持四类高频页面：

### 5.1 查询页

- 筛选区
- 列表区
- 汇总区
- 导出能力

### 5.2 详情页

- 基础信息
- 指标概览
- 分模块内容
- 关联信息区块

### 5.3 图表分析页

- 筛选区
- 指标卡
- 图表矩阵
- 洞察说明

### 5.4 报告页

- 数据区块
- 图表区块
- 富文本结论
- 导出或打印能力

## 6. 核心工程规范

### 6.1 组件规范

- 优先复用 `tendata-ui`
- 图标统一使用 `@tendata-ui/icon`
- 通用能力优先复用 `tendata-utils`
- 页面组件只做拼装
- 业务组件放在 `views/*/components`
- 通用组件放在 `shared/components`

### 6.2 API 规范

- 请求统一基于共享请求层封装
- 每个 views 页面维护自己的 services 文件
- 不在组件中直接散写请求逻辑
- 接口参数转换和响应转换单独维护

### 6.3 状态规范

- `Zustand` 管主题、语言、布局状态、用户偏好、局部 UI 状态
- `SWR` 管列表数据、详情数据、统计指标、图表数据
- 不把服务端数据长期塞进 Zustand

### 6.4 样式规范

- 页面和组件样式统一使用 `Less + CSS Modules`
- 样式与页面或组件同目录维护
- 尽量避免大面积全局样式覆盖
- 尽量避免大量内联样式

### 6.5 类型规范

- 新代码统一 `TypeScript + TSX`
- 公共接口必须有明确类型
- 复杂对象优先定义独立类型
- 参数类型、接口类型、页面展示类型应清晰分层

### 6.6 Lint 与提交规范

- 模板必须内置 `ESLint`
- 模板必须内置 `Stylelint`
- 模板必须内置 `Husky + lint-staged`
- 提交前至少校验本次改动涉及的 `ts`、`tsx`、`less`、`css` 文件
- 模板默认应提供统一的 lint 命令和 pre-commit 钩子

### 6.7 ESLint 规则说明

项目基于 `airbnb` + `@typescript-eslint` 规则集，配置文件为 `.eslintrc.cjs`。

#### 继承规则集

| 规则集 | 说明 |
| --- | --- |
| `airbnb` | JavaScript / React 社区最广泛采用的规范基线 |
| `airbnb/hooks` | React Hooks 使用规范（依赖数组、调用顺序等） |
| `plugin:@typescript-eslint/recommended` | TypeScript 推荐规则集 |
| `plugin:import/typescript` | 让 import 插件正确解析 `.ts` / `.tsx` 模块 |

#### 关键自定义规则

| 规则 | 配置 | 说明 |
| --- | --- | --- |
| `react/react-in-jsx-scope` | `off` | React 17+ 不再需要显式引入 React |
| `react/jsx-filename-extension` | 仅允许 `.tsx` / `.jsx` | 限制 JSX 只出现在合法扩展名文件中 |
| `react/function-component-definition` | `arrow-function` | 组件统一使用箭头函数声明 |
| `react/jsx-props-no-spreading` | `off` | 允许 JSX 属性展开 |
| `react/require-default-props` | `off` | 使用 TypeScript 默认值代替 defaultProps |
| `import/extensions` | `.ts/.tsx/.js/.jsx` 不需要扩展名 | 配合 Vite / TS 的模块解析 |
| `import/order` | 分组 + 字母排序 | 导入顺序：`builtin` → `external` → `internal`（`@/`）→ 相对路径 → `type`，组内按字母升序，组间不换行 |
| `import/prefer-default-export` | `off` | 允许仅有命名导出 |
| `import/no-extraneous-dependencies` | 允许 devDependencies | 开发依赖不报错 |
| `@typescript-eslint/no-unused-vars` | `warn`，忽略 `_` 前缀 | 未使用变量警告，`_` 开头参数例外 |
| `@typescript-eslint/explicit-function-return-type` | `off` | 不强制函数返回类型注解 |
| `@typescript-eslint/explicit-module-boundary-types` | `off` | 不强制导出函数的返回类型注解 |
| `no-param-reassign` | 允许修改参数属性 | 兼容 Zustand / Immer 等直接修改 draft 的场景 |
| `no-console` | `warn` | 提醒移除调试用 console |

#### 解析与路径别名

- 解析器：`@typescript-eslint/parser`，ECMAScript latest + JSX
- 路径别名 `@/*` 通过 `eslint-import-resolver-typescript` 与 `tsconfig.json` 保持一致

### 6.8 TypeScript 编译器配置说明

项目配置文件为 `tsconfig.json`（源码）和 `tsconfig.node.json`（构建工具）。

#### 源码配置（tsconfig.json）

| 选项 | 值 | 说明 |
| --- | --- | --- |
| `target` | `ES2020` | 编译目标，覆盖主流浏览器 |
| `lib` | `ES2020, DOM, DOM.Iterable` | 可用运行时类型 |
| `module` | `ESNext` | 使用 ES 模块 |
| `moduleResolution` | `bundler` | 配合 Vite 的模块解析策略 |
| `jsx` | `react-jsx` | 使用 React 17+ 自动 JSX 转换 |
| `strict` | `true` | 开启全部严格检查（`strictNullChecks`、`noImplicitAny` 等） |
| `noUnusedLocals` | `true` | 禁止未使用的局部变量 |
| `noUnusedParameters` | `true` | 禁止未使用的函数参数 |
| `noFallthroughCasesInSwitch` | `true` | switch 分支必须 break 或 return |
| `isolatedModules` | `true` | 要求每个文件可独立编译，兼容 Vite/esbuild |
| `allowImportingTsExtensions` | `true` | 允许导入带 `.ts` 扩展名的模块 |
| `noEmit` | `true` | 不输出编译产物（由 Vite 负责构建） |
| `baseUrl` + `paths` | `@/*` → `src/*` | 路径别名，保持与 Vite `resolve.alias` 一致 |

#### 构建工具配置（tsconfig.node.json）

| 选项 | 值 | 说明 |
| --- | --- | --- |
| `target` | `ES2022` | Node 环境可使用更高级语法 |
| `composite` | `true` | 支持项目引用 |
| `emitDeclarationOnly` | `true` | 仅输出类型声明 |
| 作用范围 | 仅 `vite.config.ts` | 只管理构建配置文件的类型检查 |

### 6.9 Stylelint 规则说明

项目基于 `stylelint-config-standard` + `stylelint-config-css-modules`，使用 `postcss-less` 语法解析，配置文件为 `.stylelintrc.cjs`。

#### 继承规则集

| 规则集 | 说明 |
| --- | --- |
| `stylelint-config-standard` | CSS 社区标准规范基线 |
| `stylelint-config-css-modules` | CSS Modules 相关规则支持 |

#### 语法解析

- 使用 `postcss-less` 作为自定义语法解析器，支持 Less 变量、mixin 等语法

#### 关键自定义规则

| 规则 | 配置 | 说明 |
| --- | --- | --- |
| `selector-pseudo-class-no-unknown` | 忽略 `global` / `local` / `export` | 兼容 CSS Modules 的 `:global` / `:local` 伪类 |
| `function-no-unknown` | 忽略 `fade` / `darken` / `lighten` / `mix` | 兼容 Less 内置颜色函数 |
| `at-rule-no-unknown` | `null`（关闭） | 兼容 Less 的 `@variable` 和 mixin 规则 |
| `color-function-notation` | `null`（关闭） | 不强制颜色函数写法 |
| `alpha-value-notation` | `null`（关闭） | 不强制 alpha 值格式 |
| `selector-class-pattern` | `null`（关闭） | 兼容 camelCase 命名的 CSS Modules 类名 |
| `custom-property-pattern` | `null`（关闭） | 不限制自定义属性命名格式 |
| `keyframes-name-pattern` | `null`（关闭） | 不限制 keyframes 动画命名格式 |
| `declaration-block-no-redundant-longhand-properties` | `null`（关闭） | 不强制使用简写属性 |
| `no-empty-source` | `null`（关闭） | 允许空源文件 |
| `color-function-alias-notation` | `null`（关闭） | 不强制 `rgba()` → `rgb()` 等别名写法 |
| `import-notation` | `null`（关闭） | 导入路径不要求扩展名 |

#### 忽略文件

- `node_modules/**`、`dist/**` — 第三方和构建产物
- `**/*.tsx`、`**/*.ts`、`**/*.js` — 仅检查样式文件（`.less` / `.css`）

## 7. AI 友好约束

### 7.1 目录稳定

- 页面实现优先落在 `views`
- 页面文件不堆复杂逻辑
- API、类型、图表配置、表格列、参数转换按固定目录归位

### 7.2 代码职责清晰

- 先定义类型，再写 API，再写 hooks，最后写 UI
- 图表组件只负责渲染，数据转换和 option 配置分离
- 表格列定义单独维护
- 查询参数构建单独维护

### 7.3 可预测生成

- 统一命名风格
- 统一目录层级
- 统一导入方式
- 统一页面范式

这些约束的核心目标是让 AI 能够更稳定地产生“放对位置、职责正确、便于接手”的代码。

## 8. 模版应内置的能力

建议模板直接内置以下样板能力：

- 标准查询页 demo
- 标准详情页 demo
- 标准图表分析页 demo
- 标准报告页 demo
- 国际化 demo
- 错误页和空状态页
- 权限控制 demo
- 通用请求封装
- 基础主题和样式基线

## 9. 测试策略

### 9.1 单元测试

优先覆盖：

- 参数转换函数
- 数据转换函数
- 工具函数
- 复杂 hooks

### 9.2 组件测试

优先覆盖：

- 核心交互组件
- 页面关键区块
- 状态切换逻辑
