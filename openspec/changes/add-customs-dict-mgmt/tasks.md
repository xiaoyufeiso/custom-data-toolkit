# Tasks: 海关数据字典管理（第一版）

> 状态：Proposed（默认假设已写入文档）。每个切片：plan →（用户确认）→ implement → verify → test → review → document。  
> **未获切片 Plan 确认前禁止写业务代码。**

## 0. 文档与门禁

- [x] 0.1 需求澄清（标准值自由填写、单表+类型筛选、停用代替删除、原始值不可改）
- [x] 0.2 共用 Redis 默认假设：第三方写正式 Hash、按类型拆 key、仅增量同步、缺失成功后 ZREM、导入搁置
- [x] 0.3 更新 product / architecture / ADR-011 / 本 change
- [ ] 0.4 切片 1 Plan 获用户确认后开始编码

## 1. 后端 — 模型与迁移

- [ ] 1.1 映射表模型 + Alembic 迁移
- [ ] 1.2 预置类型常量（country/continent）
- [ ] 1.3 单元：唯一约束、trim、原始值不可变、无内容码表校验

## 2. 后端 — 标准字典 API + 增量 Redis

- [ ] 2.1 列表筛选分页：类型 / 原始值 / 标准值 / 启停
- [ ] 2.2 创建 / 更新标准值 / 启停（无删除、无改原始值）
- [ ] 2.3 增量 HSET/HDEL、失败标记、单条重试；（可选）重放同步且不删第三方 field
- [ ] 2.4 集成测试（Session + CSRF；Redis 可用 fakeredis）

## 3. 后端 — 缺失字典

- [ ] 3.1 读 ZSET 列表（按类型拆 key）、筛选分页
- [ ] 3.2 处理：写 MySQL → 正式同步成功 → ZREM；失败不删 missing
- [ ] 3.3 导出当前筛选全量 xlsx（不改 Redis）
- [ ] 3.4 集成测试

## 4. 前端

- [ ] 4.1 标准字典页：统一列表 + 类型筛选、详情、新增、编辑标准值、启停、重同步
- [ ] 4.2 缺失字典页：列表、处理、导出、刷新
- [ ] 4.3 前端测试

## 5. 验证与文档

- [ ] 5.1 对照 Delta Scenario 逐条 Verify
- [ ] 5.2 实跑前后端测试与构建
- [ ] 5.3 更新 `docs/api.md`、`operations.md`（Redis 配置）、`progress.md`
- [ ] 5.4 评审无 BLOCKER 后归档进 `openspec/specs/customs-dict/`

## Deferred（本 change 不做）

- 标准字典**导入** / 模板
- 整表覆盖式全量 Redis 同步（temp + RENAME）
- 缺失处理历史页
- 操作日志
- 标准值强制列表 / ISO 校验
- 字典类型编辑

## TBD / Approval

无阻塞 Open Questions；切片开工前仅需用户确认对应 Plan。
