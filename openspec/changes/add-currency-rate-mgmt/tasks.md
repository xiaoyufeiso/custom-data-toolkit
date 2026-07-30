# Tasks: 货币汇率管理与对外查询 API

## 0. 工程基线

- [x] 0.1 用户确认门禁（手工改汇率 / 查询形态 / 预置管理员）
- [x] 0.2 scaffold-kit / Tendata 生成 React + Python 骨架并 merge
- [ ] 0.3 配置 MySQL、CORS、`.env.example`；smoke 通过

## 1. 后端 — 认证

- [x] 1.1 `admin_users` / `admin_sessions` 模型与迁移
- [x] 1.2 种子管理员（环境变量，启动时 bootstrap）
- [x] 1.3 登录 / 退出 / me / csrf / change-password
- [x] 1.4 契约测试（含 CSRF、401；DB 未就绪时 skip）
- [x] 1.5 环境就绪后：`alembic upgrade` + 跑通集成测试与登录页

## 2. 后端 — 货币

- [x] 2.1 映射既有 `currency` 表
- [x] 2.2 CRUD API + 有汇率禁止删除
- [x] 2.3 集成测试
- [x] 2.4 前端货币页

## 3. 后端 — 汇率

- [x] 3.1 映射既有 `rate` 表
- [x] 3.2 列表筛选分页 + CRUD
- [x] 3.3 唯一键冲突处理
- [x] 3.4 集成测试

## 4. 后端 — API Key 与对外查询

- [x] 4.1 `api_keys` 表与管理 API
- [x] 4.2 `GET /public/rates` + Key 校验
- [x] 4.3 集成测试（单日/区间/停用 Key）

## 5. 前端

- [x] 5.1 登录页与鉴权路由
- [ ] 5.2 后台布局 + 侧栏（沿用模板布局，暂不重做）
- [x] 5.3 货币管理页
- [x] 5.4 汇率管理页
- [x] 5.5 API Key 管理页（一次性明文展示）

## 6. 验证与文档

- [ ] 6.1 对照 `docs/testing.md` 勾选核心项
- [ ] 6.2 更新 `progress.md`
- [ ] 6.3 变更归档：Delta 合并进 `openspec/specs/` 领域 spec
