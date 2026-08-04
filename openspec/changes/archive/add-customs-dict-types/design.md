# Design: 字典类型管理

## 表 `customs_dict_type`

- `code` 唯一，1～32，`^[a-z][a-z0-9_]*$`，创建后不可改
- `name` trim 非空
- `enabled` 软删；有任意 `customs_dict_mapping`（含停用）时不可 `disable`
- 迁移种子：country/国家、continent/洲

## 校验

| 场景 | 规则 |
|---|---|
| 写映射 / 处理缺失 / 导入 | code 存在且 enabled |
| 列表筛映射 | 允许历史 code（含已停用类型） |
| 导出名称 | 查类型表 name，缺失回退 code |

## API

前缀 `/api/v1/customs-dict/types`；Session；写 + CSRF。

列表带 `mappingCount`。`/options` 仅启用项。
