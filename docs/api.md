# Custom Data Toolkit API 规格

> 状态：API Baseline（draft，**过渡权威**）  
> 目标：迁出为 OpenAPI（生成或手写 `openapi.yaml`）后，本文降级为索引。  
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
| GET | `/currencies/suggestions` | 名称/code 前缀推荐 |
| POST | `/currencies` | 创建 |
| GET | `/currencies/{id}` | 详情 |
| PUT | `/currencies/{id}` | 更新 |
| DELETE | `/currencies/{id}` | 删除 |
| POST | `/currencies/batch-delete` | 原子批量删除 1～100 条 |

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

推荐查询参数：

- `prefix`：必填，trim 后非空，最长 100 字符。
- `field`：`nameOrCode` 或 `code`，默认 `nameOrCode`。
- `limit`：1～10，默认 10。
- 返回 `id`、`name`、`code`、`matchField`；匹配忽略大小写。
- 排序为完全匹配、code 前缀、名称前缀，同组稳定排序。

批量删除请求：

```json
{ "ids": [1, 2, 3] }
```

- `ids` MUST 包含 1～100 个唯一正整数；非法请求返回 422。
- 任一 ID 不存在：409，`BatchDelete.StaleSelection`，且不删除任何记录。
- 任一货币仍有关联汇率：409，`Currency.HasRates`，且不删除任何记录。
- 批量冲突响应可在通用错误结构上增加 `details.missingIds` 或 `details.blockedIds`。
- 成功：204。现有单条删除接口保持兼容。

## 5. 汇率（管理端）

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/rates` | 分页列表 |
| POST | `/rates` | 创建 |
| GET | `/rates/{id}` | 详情 |
| PUT | `/rates/{id}` | 更新 |
| DELETE | `/rates/{id}` | 删除 |
| POST | `/rates/batch-delete` | 原子批量删除 1～100 条 |
| POST | `/rates/batch-check` | 原子批量核对 1～100 条 |

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

批量删除请求：

```json
{ "ids": [1, 2, 3] }
```

- `ids` MUST 包含 1～100 个唯一正整数；非法请求返回 422。
- 任一 ID 不存在：409，`BatchDelete.StaleSelection`，`details.missingIds` 返回缺失 ID，且不删除任何记录。
- 成功：204。现有单条删除接口保持兼容。

批量核对复用相同的 `ids` 请求结构：

- 任一 ID 不存在：409，`BatchCheck.StaleSelection`，`details.missingIds` 返回缺失 ID，且不核对任何记录。
- 已核对记录保持不变且不刷新 `updateTime`；未核对记录更新为已核对。
- 成功：204。

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

## 8. 海关数据字典（管理端）

Session + CSRF（写操作）。仅增量同步 Redis，不做整表覆盖。字典类型以表 `customs_dict_type` 为准（种子 `country`/`continent`）；写映射/导入要求类型存在且启用。

### 8.0 字典类型

前缀：`/api/v1/customs-dict/types`。

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/customs-dict/types` | 列表；query：`enabled`、`q`、`page`、`pageSize`；项含 `mappingCount` |
| GET | `/customs-dict/types/options` | 仅启用项：`[{ code, name }]`，供下拉 |
| GET | `/customs-dict/types/suggestions` | 启用类型 code/name 前缀推荐；query：`prefix`、`limit`≤10；项含 `matchField` |
| POST | `/customs-dict/types` | 新建（`code`+`name`；code 规范化为小写） |
| PATCH | `/customs-dict/types/{id}` | 仅改 `name`；提交不同 `code` → 400 `CustomsDictType.CodeImmutable` |
| POST | `/customs-dict/types/{id}/enable` | 启用 |
| POST | `/customs-dict/types/{id}/disable` | 停用；有任意映射行 → 409 `CustomsDictType.HasMappings` |

常见错误码：`CustomsDictType.NotFound`、`CustomsDictType.DuplicateCode`、`CustomsDictType.InvalidCode`、`CustomsDictType.HasMappings`、`CustomsDictType.CodeImmutable`。

### 8.1 标准字典映射

前缀：`/api/v1/customs-dict/mappings`。

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/customs-dict/mappings` | 列表；query：`dictType`、`q`（OR 模糊 raw/standard）、`rawValue`、`standardValue`、`enabled`、`page`、`pageSize` |
| GET | `/customs-dict/mappings/suggestions` | 启用映射 raw/standard 前缀推荐；query：`prefix`、可选 `dictType`、`limit`≤10；项含 `matchField` |
| GET | `/customs-dict/mappings/export` | 导出当前筛选全量 xlsx（默认 `enabled=true`；支持 `q`）；表头与缺失导出同构 |
| GET | `/customs-dict/mappings/import-template` | 下载仅含表头的导入模板 xlsx |
| POST | `/customs-dict/mappings/import` | multipart 上传 xlsx；upsert；单行失败不整批回滚；`source=import` |
| GET | `/customs-dict/mappings/{id}` | 详情 |
| POST | `/customs-dict/mappings` | 新建（默认启用，source=`manual`） |
| PATCH | `/customs-dict/mappings/{id}` | 仅更新 `standardValue`；若提交不同 `rawValue` → 400 `CustomsDict.RawValueImmutable` |
| POST | `/customs-dict/mappings/{id}/enable` | 启用并 HSET |
| POST | `/customs-dict/mappings/{id}/disable` | 停用并 HDEL（不删第三方其它 field） |
| POST | `/customs-dict/mappings/{id}/resync` | 单条重试同步 |
| POST | `/customs-dict/mappings/batch-disable` | 批量停用（UI「批量删除」）；MySQL 原子；Redis 可部分失败 |
| POST | `/customs-dict/mappings/batch-resync` | 批量同步选中行；汇总成功/失败 |
| POST | `/customs-dict/mappings/replay-sync?dictType=` | 按类型重放：启用 HSET、停用 HDEL；保留 Redis 中未知 field（管理端 UI 已不用） |

批量 body：`{ "ids": [1, 2] }`（1～100，正整数且唯一）。

`batch-disable` 成功：`{ "disabled": 2, "syncFailed": 0, "failedIds": [] }`。缺 ID：409 `BatchDelete.StaleSelection`，`details.missingIds`，不改任何行。  
`batch-resync` 成功：`{ "synced": 1, "failed": 1, "failedIds": [2], "total": 2 }`。缺 ID：同上 409。  
说明：管理端「删除」语义为停用（软删），非物理删除。

创建/更新 body（camelCase）：

```json
{
  "dictType": "country",
  "rawValue": "中国大陆",
  "standardValue": "CHN"
}
```

常见错误码：`CustomsDict.NotFound`、`CustomsDict.DuplicateRawValue`、`CustomsDict.RawValueImmutable`、`CustomsDict.InvalidType`、`CustomsDict.EmptyValue`。  
Redis 失败时 MySQL 仍保存，`syncStatus` 为 `failed`/`pending`，`syncError` 脱敏。

导入/导出 xlsx 表头（与缺失导出一致）：`字典类型编码 | 字典类型名称 | 原始值 | 出现次数 | 标准值 | 备注`。  
导入必填：`字典类型编码`、`原始值`、`标准值`（类型须为**启用**类型）；忽略名称/次数/备注。同类型原始值已存在则更新标准值并增量同步 Redis；不存在则新建（`source=import`，默认启用）。导入**不**自动 ZREM missing。建议单文件 ≤1000 行数据。  
导入成功 body：`{ "created": 1, "updated": 2, "failed": 1, "errors": [{ "row": 3, "message": "..." }] }`。整文件表头非法等 → 4xx；单行失败计入 `failed`，其它行继续。

### 8.2 缺失字典

前缀：`/api/v1/customs-dict/missing`。缺失数据来自第三方 ZSET；本系统只读列表/处理/导出。

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/customs-dict/missing` | 列表；可选 `dictType`（空则聚合全部启用类型）、`rawValue`、`page`、`pageSize`；按出现次数降序 |
| GET | `/customs-dict/missing/suggestions` | 缺失原始值前缀推荐；query：可选 `dictType`、`prefix`、`limit`≤10 |
| POST | `/customs-dict/missing/handle` | 处理：写 MySQL（source=`missing`）→ 正式 Hash 成功后 ZREM |
| GET | `/customs-dict/missing/export` | 导出当前筛选全量 xlsx（不改 Redis；无 `dictType` 时导出全部启用类型） |

处理 body：

```json
{
  "dictType": "country",
  "rawValue": "中国大陆",
  "standardValue": "CHN"
}
```

同类型原始值已存在 → 409 `CustomsDict.DuplicateRawValue`。正式同步失败则 missing **不删**；单条 `resync` 成功后会尝试 ZREM。

## 9. 健康检查

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/health` | 进程存活 |
| GET | `/ready` | 依赖（如 DB）就绪 |

（具体是否挂在 `/api/v1` 下以实现/模板为准，骨架阶段对齐 Tendata 约定。）
