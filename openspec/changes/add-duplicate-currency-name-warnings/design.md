# Design: 货币同名软提醒

## API Direction

复用 `add-currency-prefix-suggestions` 定义的管理端推荐接口，并为名称建议返回同名计数，或提供等价的同名计数查询能力。最终 API 形态在该 change 进入实现计划时确认，但 MUST 满足：

- 以 trim 后、大小写不敏感的完整名称统计；
- 编辑时支持排除当前 `currencyId`；
- 不改变创建/更新接口允许同名的行为。

## UI Behavior

- 用户输入名称时展示名称前缀推荐。
- 只有用户点击某条推荐后，才在输入框下方显示浅色文案：`已存在 n 条同名货币`。
- 用户继续修改名称后，清除该计数提示，直到再次选择推荐。
- 保存时独立执行同名检查；即使用户未选择推荐，只要存在同名货币也必须二次确认。
- 用户确认后仍调用现有创建/更新 API。

## Data and Security

- 不增加名称唯一索引，不修改 `currency.name` 语义。
- 沿用管理端 Session；保存写请求仍需要 CSRF。
- 检查与保存之间可能发生并发变化，因此提示仅供决策，不承诺强一致。

## Dependency

本 change 依赖或复用 `add-currency-prefix-suggestions` 的名称前缀推荐能力；若独立实施，必须先提供等价查询能力。
