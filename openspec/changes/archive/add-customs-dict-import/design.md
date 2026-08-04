# Design: 标准字典导入/导出

## 格式

与缺失导出完全相同：

```text
字典类型编码 | 字典类型名称 | 原始值 | 出现次数 | 标准值 | 备注
```

- 必填：类型编码、原始值、标准值（trim）
- 忽略：类型名称、出现次数、备注
- 按表头名定位列；空行跳过；最多 1000 行

## Upsert

- 不存在 → create（source=import，enabled=true）→ 增量 HSET
- 已存在 → 仅更新 standard_value → 同步（同 PATCH）
- 单行失败不影响其它行；返回 errors[{row, message}]

## API

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/mappings/export` | query 同列表筛选；xlsx |
| GET | `/mappings/import-template` | 仅表头 |
| POST | `/mappings/import` | `file` multipart |

Session + CSRF（写）。
