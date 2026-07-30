# Custom Data Toolkit API 规格

> 状态：API Baseline（draft）  
> Base URL：`/api/v1`  
> 管理端认证：HttpOnly Session Cookie + CSRF  
> 对外认证：`X-API-Key`

## 1. 通用约定

- 请求/响应：JSON。
- Python 内部：snake_case；对外 JSON：camelCase。
- 日期：`YYYY-MM-DD`。
- 日期时间：ISO 8601。
- 管理端 Cookie 请求启用 `credentials`。
- 管理端写操作（POST/PUT/PATCH/DELETE）MUST 带 `X-CSRF-Token`。
- 例外：`POST /auth/logout` 仅依赖有效 Session Cookie（避免 CSRF 状态不同步导致无法退出）。
- 分页查询参数：`page`（从 1 开始）、`pageSize`（默认 20，最大 100）。
- 分页响应：

```json
{
  "items": [],
  "page": 1,
  "pageSize": 20,
  "total": 0
}
```

### 1.1 Session Cookie

- Cookie 名：配置项，默认 `cdt_session`。
- `HttpOnly=true`，`Path=/`，`SameSite=Lax`。
- `Secure`：非 development 为 true。
- 有效期：7 天。

### 1.2 CSRF

- `GET /auth/csrf` 获取 token。
- 写请求头：`X-CSRF-Token: <token>`。
- 失败：403，错误码 `Auth.CsrfFailed`。

### 1.3 API Key

- 请求头：`X-API-Key: <plain-key>`。
- 仅用于 `/api/v1/public/*`。

## 2. 错误格式

```json
{
  "code": "Currency.HasRates",
  "message": "该货币仍有关联汇率，无法删除。",
  "requestId": "..."
}
```

说明：

- `code`：机器可读错误码，供联调/日志；**前端面向用户的提示 MUST 只展示 `message`，不得拼接 `code`**。
- `message`：面向用户的中文说明。

| 状态码 | 场景 |
|---:|---|
| 200 | 查询或修改成功 |
| 201 | 创建成功 |
| 204 | 无响应体成功 |
| 400 | 业务无法处理 |
| 401 | 未登录 / Session 失效 / API Key 无效 |
| 403 | CSRF 失败或禁止操作 |
| 404 | 资源不存在 |
| 409 | 唯一性或状态冲突 |
| 422 | 字段校验失败 |
| 500 | 未预期错误 |

## 3. 管理端认证

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/auth/csrf` | 获取 CSRF |
| POST | `/auth/login` | 登录 |
| GET | `/auth/me` | 当前管理员 |
| POST | `/auth/logout` | 退出 |
| POST | `/auth/change-password` | 修改密码 |

登录请求：

```json
{
  "username": "admin",
  "password": "********"
}
```

登录成功：设置 Session Cookie，返回当前用户（不含密码）。

修改密码成功后：撤销**其他**会话，当前会话保留。

**无** `/auth/register`。

## 4. 货币

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/currencies` | 分页列表；可选 `q` 按 name/code 模糊 |
| POST | `/currencies` | 创建 |
| GET | `/currencies/{id}` | 详情 |
| PUT | `/currencies/{id}` | 更新 |
| DELETE | `/currencies/{id}` | 删除 |

创建/更新 body：

```json
{
  "name": "人民币",
  "code": "CNY"
}
```

- `code`：可选；若提供 MUST 为 1~10 位字母或下划线（如 `CNY`、`MYR_IM`，忽略大小写）。非法格式：400，`Currency.InvalidCode`。
- **更新时**：请求体若显式带 `"code": null`（或空串），表示清空 code；省略 `code` 字段则保持原值不变。
- 删除冲突（仍有汇率）：409，`Currency.HasRates`。
- `code` 冲突：409，`Currency.CodeConflict`。

## 5. 汇率（管理端）

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/rates` | 分页列表 |
| POST | `/rates` | 创建 |
| GET | `/rates/{id}` | 详情 |
| PUT | `/rates/{id}` | 更新 |
| DELETE | `/rates/{id}` | 删除 |

列表查询参数：

- `currencyId` 或 `code`（可选）
- `date` 或 `dateFrom`+`dateTo`（可选）
- `checked`（可选，boolean）
- `page` / `pageSize`

创建 body：

```json
{
  "currencyId": 1,
  "date": "2026-07-29",
  "data": "7.1200",
  "checked": false
}
```

更新 body（均可选，至少一项）：

```json
{
  "data": "7.1300",
  "checked": true
}
```

唯一冲突：409，`Rate.DuplicateCurrencyDate`。

列表项建议字段：`id`、`currencyId`、`currencyCode`、`currencyName`、`date`、`data`、`checked`、`createTime`、`updateTime`。

## 6. API Key（管理端）

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api-keys` | 列表 |
| POST | `/api-keys` | 创建（响应含一次性 `key` 明文） |
| PATCH | `/api-keys/{id}` | 更新 name / enabled |
| DELETE | `/api-keys/{id}` | 删除 |

创建请求：

```json
{ "name": "etl-service" }
```

创建响应示例：

```json
{
  "id": 1,
  "name": "etl-service",
  "keyPrefix": "cdt_ab12",
  "key": "cdt_ab12...full-secret-only-once",
  "enabled": true,
  "createdAt": "2026-07-29T10:00:00+08:00"
}
```

列表项 MUST NOT 包含完整 `key`。

## 7. 对外公开接口

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/public/rates` | 按货币 **code** 查询汇率 |

查询参数：

- `code`：必填（货币字母码，如 `CNY`、`MYR_IM`）。**不支持按货币名称查询**（名称映射留给后续海关字典；见 ADR-009 / ADR-010）。
- 时间：`date` **或** `dateFrom`+`dateTo`（必填其一；区间时两者都必填且 from≤to）

鉴权：`X-API-Key`

成功：200

```json
{
  "items": [
    {
      "currencyCode": "CNY",
      "date": "2026-07-29",
      "data": "7.1200",
      "checked": true
    }
  ]
}
```

- 货币 code 不存在：404，`Currency.NotFound`
- 无汇率记录：200，`items: []`
- API Key 无效：401，`Auth.InvalidApiKey`

## 8. 健康检查

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/health` | 进程存活 |
| GET | `/ready` | 依赖（如 DB）就绪 |

（具体是否挂在 `/api/v1` 下以实现/模板为准，骨架阶段对齐 Tendata 约定。）
