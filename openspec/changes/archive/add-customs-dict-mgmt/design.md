# Design: 海关数据字典管理（第一版）

## 数据模型（应用自有表，Alembic）

### 字典类型（预置常量，无管理 API）

| 编码 | 名称 | 用途 |
|---|---|---|
| `country` | 国家 | 列表筛选；Redis key 分区；唯一性作用域 |
| `continent` | 洲 | 同上 |

**不拆**国家表 / 洲表。不提供类型编辑。

### 映射表（建议名 `customs_dict_mapping`）

| 逻辑字段 | 说明 |
|---|---|
| id | 主键 |
| dict_type | `country` \| `continent` |
| raw_value | 原始值；`(dict_type, raw_value)` 唯一；**创建后不可改** |
| standard_value | 标准值（单字段；**不校验业务码表**） |
| enabled | 启用/停用 |
| source | `manual` \| `missing`（导入来源预留，本版不用） |
| sync_status | `synced` \| `pending` \| `failed` |
| sync_error | 脱敏失败原因 |
| last_synced_at | 最近成功同步时间 |
| created_by / updated_by | 管理员 |
| created_at / updated_at | 时间戳 |

约束：

- 保存前 trim 首尾空格；精确区分大小写；不折叠全半角/内部空格
- 新增默认启用；无物理删除 API
- 校验仅：非空、长度、类型枚举、原始值唯一、禁止改 raw_value

## Redis 共用假设（已采纳默认）

| 项 | 默认 |
|---|---|
| 正式 Hash | 第三方**也会写**；本系统有读写权 |
| Key 拆分 | **按类型拆**：`customs:{type}:dict`（Hash）、`customs:{type}:dict:missing`（ZSET） |
| 本系统写正式字典 | **仅增量** `HSET`（启用）/ `HDEL`（停用或需移除本系统 field） |
| 整表覆盖全量 | **第一版不做**（禁止 temp+RENAME 覆盖，以免删除第三方 field） |
| 重放同步（可选） | 遍历 MySQL 启用集 HSET + 已停用 HDEL；**保留** Redis 中 MySQL 没有的 field |
| 缺失 | 第三方写入 ZSET；本系统只读列表；处理成功且正式同步成功后 **ZREM** |
| 导入 | 搁置 |

若后续确认「仅本系统写正式 Hash」，可增量增加整表替换全量，而不必改 MySQL 模型。

## 同步流程

1. MySQL 事务提交成功 → 尝试 Redis 增量同步 → 更新 `sync_status`
2. 失败：不回滚 MySQL；详情提供「重新同步」
3. 缺失处理：校验同类型原始值未占用 → 写入 MySQL（source=`missing`）→ HSET 成功 → ZREM → 列表移除；HSET 失败则不 ZREM

## API（管理端，Session + CSRF）

- 标准字典：列表（筛类型/原始值/标准值/启停）、详情、创建、更新标准值、启停、单条重同步、可选重放同步
- 缺失：列表（筛类型/原始值）、处理、导出 xlsx（当前筛选全量）
- 无 DELETE；无导入；无类型 CRUD

## 前端

- 标准字典：统一列表 + **字典类型筛选**（不必拆成两个互不相关的业务模块）
- 缺失字典：列表、处理抽屉、导出
- 不实现：导入、处理历史、操作日志、类型编辑、整表覆盖全量按钮

## 风险与演进

- 无书面 Redis 约定时，以联调对方实际写入为准微调解析。
- 从「增量」演进到「整表覆盖」成本低；相反则高 — 故默认禁止覆盖。
- Redis 不可用时仍可维护 MySQL，依赖重试。
