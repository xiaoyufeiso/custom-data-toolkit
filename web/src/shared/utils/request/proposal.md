# 无感 Token 自动续期技术实现方案

## 1. 需求概述

目标：在不打断用户操作的前提下，实现 access token 过期自动续期；仅在 refresh token 失效或续期失败时才引导用户重新登录。

本方案基于当前项目 `axios` 统一请求层（`src/shared/utils/request.ts`）重构，不沿用 `util.js` 的全局 XHR hook 方式。

## 2. 现有方案问题（基于参考 util.js 的复盘）

- 续期触发与 axios 请求链路割裂：`xhook.after` 监听网络请求，难以和当前 React + axios 请求层统一治理。
- 并发控制不足：多个请求同时触发续期时，可能发生重复 refresh、竞态覆盖 token。
- 失败收敛不清晰：401/403 与“被踢下线”等场景边界不清，容易出现重复跳转或逻辑分叉。
- 可维护性差：大量环境判断、页面白名单、脚本注入逻辑耦合在工具类，不利于扩展与测试。

## 3. 功能清单

- [ ] 统一 token 读写与清理（access token / refresh token）
- [ ] 响应 401 后支持“单次重试 + 被动续期”
- [ ] 同时仅允许一个 refresh 请求在飞（single-flight）
- [ ] 刷新期间其余业务请求等待刷新结果后自动继续
- [ ] 刷新失败时统一清理登录态并跳转登录页
- [ ] 防止死循环（refresh 接口不再触发 refresh；业务请求最多重试一次）
- [ ] 支持多标签页 token 同步（可选增强）
- [ ] 提供可观测埋点（刷新成功率、失败原因、重试次数）

## 4. 设计原则

- 单一入口：所有鉴权逻辑只在 `request.ts` 及其配套模块处理。
- 单飞刷新：任何时刻只有一个 refresh 请求，其他请求复用同一个 Promise。
- 可恢复优先：token 失效优先尝试续期，续期失败再登出。
- 明确边界：区分“可续期失效”和“不可续期失效（refresh 失效/被踢下线）”。
- 最小侵入：业务层 API 调用代码尽量不改。

## 5. 整体架构

```text
src/
  shared/
    utils/
      request/
        index.ts             # 请求/响应拦截器，重试与排队逻辑
        tokenStore.ts        # token 读写与清理
        refreshManager.ts    # single-flight 刷新管理
        authEvents.ts        # 登出事件、跨标签页同步（可选）
        authTypes.ts         # Token 数据类型与请求扩展类型
        services.ts          # refresh API 封装（skipAuth）
```

## 6. 关键流程设计

### 6.1 响应后被动续期（Reactive Refresh）

触发条件：
- 响应状态为 401
- 当前请求允许鉴权重试
- 当前请求尚未重试（`hasRetriedAuth !== true`）

流程：
1. 响应拦截器捕获 401。
2. 若响应体 `code === 2`（被踢下线），直接跳转 `account/error#/oops`。
3. 其他场景若满足重试条件，设置 `hasRetriedAuth = true`。
4. 调用 `refreshManager.refresh()` 获取新 token。
5. 成功后重放原请求（仅一次）。
6. 刷新失败或不可重试时，按登录跳转策略收敛（支持 whitelist 下带 `targetUrl`）。

### 6.4 其他状态码兜底

- `500`：非登录页且当前请求不是审计上报接口时，上报 `global-error` 到  
  `account/api/audit/logs/user/send-message`，上报内容包含 `path` 和错误 `message`。
- `403`：统一跳转 `account/error#/403`。

### 6.2 单飞刷新与排队

`refreshManager` 维护全局变量：
- `refreshPromise: Promise<TokenPayload> | null`

机制：
- 如果 `refreshPromise` 存在，后续请求直接 `await refreshPromise`。
- 如果不存在，创建 refresh 请求并赋值。
- 刷新结束（成功/失败）后清空 `refreshPromise`。

这样可保证高并发下只发一个 refresh 请求。

### 6.3 刷新失败收敛策略

刷新失败的典型场景：
- refresh token 失效（401/403）
- 后端明确返回“被踢下线/账号异常”业务码
- 网络超时且超过重试上限

统一动作：
1. 清理本地 token 与用户态缓存。
2. 广播登出事件（可选，用于多标签页同步）。
3. 跳转 `config.loginHost` 登录页（带 `redirect` 回跳地址）。

## 7. 状态机（建议）

```text
[VALID]
[VALID] --收到401--> [REFRESHING] --成功并重放--> [VALID]
  | 失败
  v
[UNAUTHORIZED] --跳转登录--> [LOGGED_OUT]
```

## 8. 请求扩展字段约定

给 axios config 增加扩展字段：
- `skipAuth?: boolean`：不注入 token（如登录、刷新接口）
- `skipAuthRefresh?: boolean`：401 不触发 refresh
- `hasRetriedAuth?: boolean`：内部使用，标记该请求是否已重试

refresh 接口必须设置：
- `skipAuth = true`
- `skipAuthRefresh = true`

## 9. 核心伪代码

```ts
// request interceptor
if (!config.skipAuth) {
  if (refreshManager.isRefreshing()) {
    await refreshManager.wait();
  }
  config.headers.Authorization = `Bearer ${tokenStore.getAccessToken()}`;
}

// response interceptor
if (status === 401 && !config.skipAuthRefresh && !config.hasRetriedAuth) {
  config.hasRetriedAuth = true;
  await refreshManager.refresh();
  config.headers.Authorization = `Bearer ${tokenStore.getAccessToken()}`;
  return request(config);
}

// refresh manager
if (!refreshPromise) {
  refreshPromise = authService.refreshToken()
    .then(saveToken)
    .catch(handleLogout)
    .finally(() => { refreshPromise = null; });
}
return refreshPromise;
```

## 10. 与当前项目的改造点

- 改造 [request.ts](/D:/TING/code/react-templates/src/shared/utils/request.ts)
  - 增加请求扩展类型、401 自动重试、统一失败收敛。
- 新增 `src/shared/utils/request/tokenStore.ts`
  - 集中处理 token 读写、过期阈值判断、清理逻辑。
- 新增 `src/shared/utils/request/refreshManager.ts`
  - 实现 single-flight 刷新与等待队列。
- 新增 `src/shared/utils/request/services.ts`
  - 封装 refresh 接口，避免与业务接口混写。
- 可选新增 `src/shared/utils/request/authEvents.ts`
  - 处理 BroadcastChannel / storage 事件，同步多标签页登录态。

## 11. 边界场景与防坑

- 避免循环刷新：refresh 请求本身不可触发 refresh。
- 避免无限重试：每个请求仅允许自动重试一次。
- 网络抖动：refresh 可做一次指数退避重试（建议最多 1 次）。
- 并发请求风暴：禁止每个 401 都独立刷新，必须共用 single-flight。

## 12. 测试清单

- [ ] access token 正常，请求直通
- [ ] 多并发请求同时遇到过期，仅触发一次 refresh
- [ ] 401 后被动续期成功，原请求自动重放成功
- [ ] refresh 401/403，统一登出并跳转登录
- [ ] 500 时触发 `global-error` 上报（且不上报上报接口自身）
- [ ] 403 时统一跳转 `account/error#/403`
- [ ] refresh 超时/网络错误，重试后失败，统一登出
- [ ] refresh 接口自身 401 不触发递归刷新
- [ ] 多标签页下，A 页刷新 token 后 B 页可感知（若启用同步）

## 13. 分阶段实施计划

1. 第 1 阶段：抽离 tokenStore 与 refreshManager，保留现有 request 行为。
2. 第 2 阶段：接入 request 拦截器被动续期能力（401 触发）。
3. 第 3 阶段：接入统一登出与登录跳转、埋点。
4. 第 4 阶段：补齐单元测试与联调验证。
5. 第 5 阶段：灰度发布，观察 refresh 成功率与 401 下降情况。

## 14. 风险与依赖

- 依赖后端 refresh 接口返回规范：需明确成功/失败结构与失败业务码。
- 若 refresh token 存于 JS 可读存储（localStorage/cookie 非 HttpOnly），存在被脚本窃取风险；建议后端逐步迁移 HttpOnly Cookie。
- 登录跳转策略需与网关/SSO 规则统一（是否带 redirect、白名单域名策略）。

## 15. 需要确认的接口契约（实施前）

- refresh 接口路径、请求参数、响应结构
- “被踢下线/账号禁用”业务码定义
- access token 与 refresh token 的精确过期语义
- 是否支持并推荐 HttpOnly refresh token

## 16. 全局开关设计（新增）

### 16.1 目标

当应用被外层框架包裹，且外层已通过 `xhook` 或网关层处理 token 续期时，本应用可关闭续期能力，避免重复续期与策略冲突。

### 16.2 开关定义（仅 request 配置项）

在 `request` 模块提供统一配置项：
- `enableTokenRefresh: boolean`
- 默认值：`true`

由业务在应用启动时显式配置，例如：

```ts
import request from '@/shared/utils/request';

request.configureAuth({
  enableTokenRefresh: false,
});
```

### 16.3 生效范围

关闭后（`false`）：
- 不执行响应 401 后的自动续期与重放
- 不触发本应用“续期失败后统一登出”逻辑

保留能力：
- 可继续注入 `Authorization`（若当前业务仍依赖本地 token）
- 其余统一错误处理逻辑保持可配置（按项目实际决定）

### 16.4 request 层接入点

在 `request.ts` 增加：
- `configureAuth(partialConfig)`：用于业务侧调整开关
- `getAuthConfig()`：供拦截器读取当前开关
- 在请求拦截器和响应拦截器进入续期分支前统一判断 `enableTokenRefresh`

示例伪代码：

```ts
const authConfig = {
  enableTokenRefresh: true,
};

export const configureAuth = (patch: Partial<typeof authConfig>) => {
  Object.assign(authConfig, patch);
};

const isTokenRefreshEnabled = () => authConfig.enableTokenRefresh;

// request interceptor
if (isTokenRefreshEnabled() && !config.skipAuth) {
  // no proactive refresh
}

// response interceptor
if (
  isTokenRefreshEnabled() &&
  status === 401 &&
  !config.skipAuthRefresh &&
  !config.hasRetriedAuth
) {
  // reactive refresh logic...
}
```

### 16.5 推荐落地方式

- 默认启用（兼容当前独立运行场景）
- 被外层框架托管时，在业务入口初始化阶段执行：
  - `request.configureAuth({ enableTokenRefresh: false })`
- 在 README 或接入文档补充该配置项说明，避免多团队集成时行为不一致
