# Tasks: 海关数据字典管理（第一版）

> 状态：Proposed（默认假设已写入文档）。每个切片：plan →（用户确认）→ implement → verify → test → review → document。  
> **未获切片 Plan 确认前禁止写业务代码。**

## 0. 文档与门禁

- [x] 0.1 需求澄清（标准值自由填写、单表+类型筛选、停用代替删除、原始值不可改）
- [x] 0.2 共用 Redis 默认假设：第三方写正式 Hash、按类型拆 key、仅增量同步、缺失成功后 ZREM、导入搁置
- [x] 0.3 更新 product / architecture / ADR-011 / 本 change
- [x] 0.4 切片 1 Plan 获用户确认后开始编码

## 1. 后端 — 模型与迁移

- [x] 1.1 映射表模型 + Alembic 迁移
- [x] 1.2 预置类型常量（country/continent）
- [x] 1.3 单元：唯一约束元数据、trim、dict_type 枚举（原始值不可变校验留包 2 service）

## 2. 后端 — 标准字典 API + 增量 Redis

- [x] 2.1 列表筛选分页：类型 / 原始值 / 标准值 / 启停
- [x] 2.2 创建 / 更新标准值 / 启停（无删除、无改原始值）
- [x] 2.3 增量 HSET/HDEL、失败标记、单条重试；重放同步且不删第三方 field
- [x] 2.4 集成测试（Session + CSRF；fakeredis）

## 3. 后端 — 缺失字典

- [x] 3.1 读 ZSET 列表（按类型拆 key）、筛选分页
- [x] 3.2 处理：写 MySQL → 正式同步成功 → ZREM；失败不删 missing
- [x] 3.3 导出当前筛选全量 xlsx（不改 Redis）
- [x] 3.4 集成测试

## 4. 前端

- [x] 4.1 标准字典页：统一列表 + 类型筛选、详情、新增、编辑标准值、启停、重同步
- [x] 4.2 缺失字典页：列表、处理、导出、刷新
- [x] 4.3 前端测试
- [x] 4.4 E4：批量停用（UI 删除=软删）+ 批量同步；布局对齐货币页；去掉顶部重放同步

## 5. 验证与文档

- [x] 5.1 对照 Delta Scenario 逐条 Verify（见下方 Verification）
- [x] 5.2 实跑：后端 customs-dict 相关 pytest 13 passed；前端 `src/views/customsDict` 11 passed；tsc 无新增阻断
- [x] 5.3 更新 `docs/api.md`、`operations.md`（REDIS_URL）、`progress.md`
- [x] 5.4 归档进 `openspec/specs/customs-dict/`；change 移至 `openspec/changes/archive/add-customs-dict-mgmt/`

### Verification（2026-08-03）

| Scenario | 证据 | 结果 |
|---|---|---|
| Filter by dictionary type | API list `dictType` + 前端筛选 | PASS |
| Create without code-list check | `test_customs_dict_api` 创建 | PASS |
| Disable HDEL keeps other fields | `test_customs_dict_api` 停用 + 第三方 field | PASS |
| Sync failure keeps MySQL | `test_customs_dict_redis_failure` | PASS |
| Handle missing ZREM after sync | `test_customs_dict_missing_api` | PASS |
| Failed formal sync keeps missing | `test_customs_dict_missing_sync_fail` | PASS |
| No import / type-edit UI | 前端无入口；Deferred | PASS |
| Batch soft-delete + batch resync | `test_customs_dict_batch_api` + 前端测试 | PASS |

BLOCKER：无。MINOR：本地缺失页需 Redis 有数据（联调种子，非产品缺陷）。

## Deferred（本 change 不做）

- 标准字典**导入** / 模板
- 整表覆盖式全量 Redis 同步（temp + RENAME）
- 缺失处理历史页
- 操作日志
- 标准值强制列表 / ISO 校验
- 字典类型编辑

## TBD / Approval

无阻塞 Open Questions；切片开工前仅需用户确认对应 Plan。
