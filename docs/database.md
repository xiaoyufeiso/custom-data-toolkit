# Custom Data Toolkit 数据库规格

> 状态：Data Model Baseline（draft）  
> 数据库：MySQL  
> 上游文档：`requirements.md`、`spec.md`

## 1. 通用约定

- 数据库：**MySQL 8**（本地空库自建，不使用 PostgreSQL/SQLite）。
- 既有业务表 `currency`、`rate` **按用户提供的 DDL 在本地创建**，不改变列语义；有公司库时可改为直连，结构须一致。
- 新增表使用 Alembic 迁移创建。
- 表名与字段名使用既有风格（既有表为小写；新增表建议 `snake_case`）。
- 密码与 API Key 只存安全哈希。
- 日期时间：既有 `rate.create_time` / `update_time` 为 `datetime(6)`；应用写入时与库约定保持一致。

## 2. 实体关系

```text
currency 1 ── N rate
admin_user 1 ── N admin_session   （若会话入库）
admin_user 可选关联创建 api_key（MVP 可不强绑，仅记录 created_by）
```

## 3. 既有表（复用）

### 3.1 currency

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | bigint | PK, AI | 货币 ID |
| name | varchar(100) | NOT NULL | 货币名称 |
| code | varchar(10) | NULL | 货币三位码（对外查询键） |

说明：

- 无 DB 级 `code` 唯一索引时，应用层对非空 `code` SHOULD 做唯一校验。
- 删除前 MUST 确认无关联 `rate`。

### 3.2 rate

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | bigint | PK, AI | 汇率 ID |
| data | varchar(50) | NOT NULL | 汇率值（字符串，兼容既有库） |
| date | date | NOT NULL | 业务日 |
| create_time | datetime(6) | NOT NULL | 创建时间 |
| update_time | datetime(6) | NOT NULL | 更新时间 |
| checked | tinyint(1) | NOT NULL | 是否已核对 |
| currency_id | bigint | NOT NULL, FK → currency.id | 货币 |

索引与约束：

- `UNIQUE (currency_id, date)`
- FK：`rate.currency_id` → `currency.id`

原始 DDL 参考：

```sql
CREATE TABLE `currency` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `code` varchar(10) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE `rate` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `data` varchar(50) NOT NULL,
  `date` date NOT NULL,
  `create_time` datetime(6) NOT NULL,
  `update_time` datetime(6) NOT NULL,
  `checked` tinyint(1) NOT NULL,
  `currency_id` bigint(20) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_currency_date` (`currency_id`,`date`),
  KEY `rate_currency_id_5040f34e_fk_currency_id` (`currency_id`),
  CONSTRAINT `rate_currency_id_5040f34e_fk_currency_id`
    FOREIGN KEY (`currency_id`) REFERENCES `currency` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
```

## 4. 新增表（MVP）

### 4.1 admin_users

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | bigint | PK, AI | 管理员 ID |
| username | varchar(64) | UNIQUE, NOT NULL | 登录名 |
| password_hash | varchar(255) | NOT NULL | Argon2id 哈希 |
| created_at | datetime(6) | NOT NULL | 创建时间 |
| updated_at | datetime(6) | NOT NULL | 更新时间 |

首版通过迁移或启动种子写入一名管理员（凭据来自环境变量，不明文写进仓库）。

### 4.2 admin_sessions

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | bigint | PK, AI | 会话行 ID |
| user_id | bigint | FK → admin_users.id | 管理员 |
| session_token_hash | varchar(255) | UNIQUE, NOT NULL | Session ID 哈希 |
| csrf_secret_hash | varchar(255) | NOT NULL | CSRF 相关密钥哈希 |
| expires_at | datetime(6) | NOT NULL | 过期时间 |
| created_at | datetime(6) | NOT NULL | 创建时间 |

### 4.3 api_keys

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | bigint | PK, AI | Key ID |
| name | varchar(100) | NOT NULL | 显示名称 |
| key_prefix | varchar(16) | NOT NULL | 明文前缀（便于列表辨认） |
| key_hash | varchar(255) | UNIQUE, NOT NULL | 完整 Key 哈希 |
| enabled | tinyint(1) | NOT NULL, default 1 | 是否启用 |
| created_by | bigint | NULL, FK admin_users | 创建人 |
| created_at | datetime(6) | NOT NULL | 创建时间 |
| updated_at | datetime(6) | NOT NULL | 更新时间 |

## 5. 本轮不做的表

- 海关字典及相关映射表：不创建。见 `openspec/specs/customs-dict/spec.md`。

## 6. 迁移策略

1. 对 `currency`/`rate`：SQLModel 映射既有表；若空库开发，提供与生产一致的初始 DDL 或 migration 重建。
2. 对 `admin_users` / `admin_sessions` / `api_keys`：Alembic 正向迁移。
3. 禁止手改生产库结构而不走迁移。
