# Proposal: 字典类型管理（动态类型表）

## Intent

解冻「字典类型编辑」：用 `customs_dict_type` 表管理类型编码/名称/启停；标准字典与缺失/导入的类型下拉改为读启用类型，不再写死 `country`/`continent`。

## Scope

### In Scope

- 类型表 + 种子 `country`/`continent`
- CRUD：新建、改名、启停；编码不可改；有映射行时禁止停用
- `GET /customs-dict/types`、`/options` 与写接口
- 映射/缺失/导入校验改为「类型存在且启用」
- 管理端「字典类型管理」页 + 菜单

### Out of Scope

- 改 code、物理删除、整表覆盖 Redis、操作日志、处理历史、类型级迁移映射

## Approach

映射表仍存 `dict_type` 字符串；业务层查类型表。Redis key 仍为 `customs:{code}:dict`。
