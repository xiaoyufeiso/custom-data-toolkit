# react-templates

这是一个全新的 React 前端项目模版仓库，目标是同时满足两件事：

- 业务可用：适合复杂查询条件、表格、图表、详情页、报告页等中后台业务场景
- AI 友好：通过稳定的目录结构、分层约束和页面范式，降低 AI Coding 产出的漂移

## 推荐运行环境
node 20+（可选22.22.2）
pnpm 10+（可选10.33.4）

## 当前基线

- `React 18`
- `TypeScript 5`
- `Vite`
- `Ant Design 5`
- `tendata-ui`
- `@tendata-ui/icon`
- `tendata-utils`
- `Zustand + SWR`
- `Less + CSS Modules`
- `react-intl`
- `ESLint + Stylelint`
- `Husky + lint-staged`
- `Vitest + React Testing Library + jsdom + MSW`

## 内部基础设施

- `tendata-ui 组件库`：[https://ui.tendata.net/](https://ui.tendata.net/)
- `tendata-utils`：[https://ui.tendata.net/utils/](https://ui.tendata.net/utils/)
- `tendata 业务组件库`：[https://biz.tendata.net/](https://biz.tendata.net/)

## 方案文档

完整技术方案见：

- [完整版方案](./docs/technical-solution-template.md)
- [精简版方案](./docs/technical-solution-template-brief.md)

## 项目级 Rules

团队与 AI 共用的项目级规则见：

- [Rules 总览](./.agents/rules/README.md)

## 测试目录约定

- 单元测试、组件测试默认与被测文件就近放置
- 文件命名统一使用 `*.test.ts`、`*.test.tsx`
- 测试基础设施统一放在 `src/test/`
- 端到端测试独立放在 `e2e/` 或 `tests/e2e/`

示例：

```text
src/
  views/home/index.tsx
  views/home/index.test.tsx
  shared/utils/request/index.ts
  shared/utils/request/index.test.ts
  store/useCounterStore.ts
  store/useCounterStore.test.ts
  test/setup.ts
  test/utils/render.tsx
  test/msw/server.ts
```

## 本地开发,连接测试环境

开发服务器以 HTTPS 运行在 `https://dev.tendata.net:3000/`，证书由 `vite-plugin-mkcert` 在首次启动时自动生成。首次使用需配置 hosts：

```bash
echo '127.0.0.1 dev.tendata.net' | sudo tee -a /etc/hosts
```

项目根目录已配置 `.npmrc`，clone 后直接安装依赖即可（无需手动设置全局 npm 源）：

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm start:uat

# 构建
pnpm build:uat

# 运行单元测试
pnpm test

# 监听模式
pnpm test:watch

# 覆盖率
pnpm test:coverage

```
