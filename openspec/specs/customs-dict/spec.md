# 海关字典管理 Specification（占位）

## Purpose

为海关数据字典与标准名称映射管理预留规范位置。该能力属于 Custom Data Toolkit 的规划模块，但 **本轮需求未就绪**。

## Scope

### In Scope（未来）

- 字典与标准名称映射关系的管理（待需求定义）
- 预期方向：货币（或其他海关字段）**名称 ↔ 标准 code** 的映射维护（未确认，不可实现）
- 相关管理界面与 API（待需求定义）

### Out of Scope（当前 MVP）

- 任何字典表结构、迁移、API、页面或测试实现
- 从本占位文档推断具体字段或接口并编码
- 在对外汇率 API 上临时用 `name` 冒充字典能力

## Constraints & Assumptions

- 假设：字典需求将以独立 OpenSpec change 引入（例如 `add-customs-dict-mgmt`）。
- 假设：在字典就绪前，对外查询只认 `code`（ADR-009）。
- 约束：在字典 change 评审通过前，实现 MUST NOT 添加字典业务代码。
- 约束：需求不清时停下来交给人工确认，不自行发明字段。

## Requirements

（无。待产品补充需求后填写 Requirements + Scenarios。）

## Decisions

### Decision: 本轮仅占位
- **选择**：只保留本文件与 Requirement 中的 Out of Scope 声明
- **理由**：需求正文仍为 TODO，避免错误实现

## Verification Checklist

- [ ] MVP 代码与路由中不存在海关字典功能
- [ ] 未创建字典相关数据库表
- [ ] 后续启动字典工作时新建 change，而非直接在无 Spec 情况下编码
