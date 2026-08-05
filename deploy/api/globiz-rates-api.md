# globiz-rates API 接口文档

## 1. 基础信息

- 数据格式：JSON
- 实际接口没有 `/api` 前缀

## 2. 接口总览

| 接口 | 方法 | 入参 | 出参 |
|---|---|---|---|
| `/` | GET | 无 | API 入口链接 |
| `/currencies/` | GET | 分页参数 | 货币分页列表 |
| `/currencies/{id}/` | GET | `id: integer` | 单个货币对象 |
| `/rates/` | GET | 分页、筛选参数 | 汇率分页列表 |
| `/rates/{id}/` | GET | `id: integer` | 单条汇率对象 |

## 3. 通用分页参数

列表接口支持以下分页参数：

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---:|---:|---|
| `page` | integer | 否 | `1` | 页码 |
| `size` | integer | 否 | `5` | 每页数量，最大 `1000` |

分页响应格式：

```json
{
  "count": 221,
  "next": "http://localhost:8080/currencies/?page=2&size=20",
  "previous": null,
  "results": []
}
```

| 字段 | 类型 | 说明 |
|---|---|---|
| `count` | integer | 总记录数 |
| `next` | string/null | 下一页地址 |
| `previous` | string/null | 上一页地址 |
| `results` | array | 当前页数据 |

## 4. 获取货币列表

### 请求

```http
GET /currencies/
```

示例：

```bash
curl "http://localhost:8080/currencies/?page=1&size=20"
```

### 入参

| 参数 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `page` | integer | 否 | 页码 |
| `size` | integer | 否 | 每页数量，最大 `1000` |

### 出参

```json
{
  "count": 221,
  "next": "http://localhost:8080/currencies/?page=2&size=20",
  "previous": null,
  "results": [
    {
      "id": 1,
      "name": "人民币",
      "code": "CNY"
    }
  ]
}
```

| 字段 | 类型 | 说明 |
|---|---|---|
| `results[].id` | integer | 货币 ID |
| `results[].name` | string | 货币名称 |
| `results[].code` | string | 三位货币代码 |

## 5. 获取单个货币

### 请求

```http
GET /currencies/{id}/
```

示例：

```bash
curl http://localhost:8080/currencies/1/
```

### 入参

| 参数 | 类型 | 必填 | 位置 | 说明 |
|---|---|---:|---|---|
| `id` | integer | 是 | URL 路径 | 货币 ID |

### 出参

```json
{
  "id": 1,
  "name": "人民币",
  "code": "CNY"
}
```

## 6. 获取汇率列表

### 请求

```http
GET /rates/
```

示例：

```bash
curl "http://localhost:8080/rates/?currencyCode=USD&dateStart=2024-01-01&dateEnd=2024-12-31&size=20"
```

### 入参

| 参数 | 类型 | 必填 | 说明 |
|---|---|---:|---|
| `page` | integer | 否 | 页码 |
| `size` | integer | 否 | 每页数量，最大 `1000` |
| `currencyCode` | string | 否 | 货币代码，例如 `USD`、`CNY` |
| `dateStart` | string | 否 | 起始日期，格式 `YYYY-MM-DD` |
| `dateEnd` | string | 否 | 结束日期，格式 `YYYY-MM-DD` |

### 出参

```json
{
  "count": 1,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 100,
      "data": "7.1234",
      "currency": "USD",
      "date": "2024-01-01"
    }
  ]
}
```

| 字段 | 类型 | 说明 |
|---|---|---|
| `results[].id` | integer | 汇率 ID |
| `results[].data` | string | 汇率值 |
| `results[].currency` | string | 三位货币代码 |
| `results[].date` | string | 汇率日期，格式 `YYYY-MM-DD` |

## 7. 获取单条汇率

### 请求

```http
GET /rates/{id}/
```

示例：

```bash
curl http://localhost:8080/rates/100/
```

### 入参

| 参数 | 类型 | 必填 | 位置 | 说明 |
|---|---|---:|---|---|
| `id` | integer | 是 | URL 路径 | 汇率 ID |

### 出参

```json
{
  "id": 100,
  "data": "7.1234",
  "currency": "USD",
  "date": "2024-01-01"
}
```

## 8. 获取 OpenAPI 文档

### 请求

```http
GET /openapi
```

请求 JSON 格式：

```bash
curl \
  -H "Accept: application/json" \
  http://localhost:8080/openapi
```

保存为文件：

```bash
curl \
  -H "Accept: application/json" \
  http://localhost:8080/openapi \
  -o openapi.json
```

## 9. 异常格式

项目没有自定义 DRF 异常处理器，使用 DRF 默认异常格式。

### 404：资源不存在

```json
{
  "detail": "Not found."
}
```

### 405：请求方法不支持

```json
{
  "detail": "Method \"POST\" not allowed."
}
```

当前 ViewSet 只实现了 `GET` 列表和详情接口，不支持新增、修改、删除。

### 400：请求参数错误

```json
{
  "date": [
    "Enter a valid date."
  ]
}
```

### 404：页码错误

```json
{
  "detail": "Invalid page."
}
```

### 401：未认证

如果部署环境增加了认证配置，可能返回：

```json
{
  "detail": "Authentication credentials were not provided."
}
```

### 403：权限不足

```json
{
  "detail": "You do not have permission to perform this action."
}
```

## 10. 注意事项

1. 实际接口路径为 `/currencies/` 和 `/rates/`，不是 `/api/currencies/` 或 `/api/rates/`。
2. 汇率接口返回的 `currency` 是货币代码字符串，不是完整的货币对象。
3. 数据库中的 `data` 字段虽然表示汇率，但序列化后类型为字符串。
4. 列表接口默认每页返回 5 条数据，可通过 `size` 调整，最大为 1000。
