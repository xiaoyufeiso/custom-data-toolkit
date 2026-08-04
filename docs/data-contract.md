# Custom Data Toolkit — 外部数据契约

> 权威层：本系统**不拥有**、但必须兼容读写的外部/既有表语义。  
> 应用自有表（`admin_users`、`admin_sessions`、`api_keys` 等）以 Alembic 迁移与模型为准，不在此重复维护 DDL。

## 1. 范围

| 表 | 归属 | 本系统 |
|---|---|---|
| `currency` | 既有/爬虫侧写入 | 映射读写；不改列语义 |
| `rate` | 既有/爬虫侧写入 | 映射读写；不改列语义 |

数据库：**MySQL 8**。本地空库用 `deploy/sql/schema.sql` 对齐结构。

## 2. 实体关系

```text
currency 1 ── N rate
```

## 3. currency

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | bigint | PK, AI | 货币 ID |
| name | varchar(100) | NOT NULL | 货币名称 |
| code | varchar(10) | NULL | 货币字母码；对外查询键 |

应用层约定（不改 DDL，见 ADR-010）：

- 非空 `code` MUST 匹配 `^[A-Z_]{1,10}$`（入库前大写规范化）；非法 → 400 `Currency.InvalidCode`
- 非空 code 应用层唯一；冲突 → 409 `Currency.CodeConflict`
- 空 / NULL 允许（兼容历史）
- 删除前 MUST 确认无关联 `rate`

## 4. rate

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | bigint | PK, AI | 汇率 ID |
| data | varchar(50) | NOT NULL | 汇率值（**字符串**） |
| date | date | NOT NULL | 业务日 |
| create_time | datetime(6) | NOT NULL | 创建时间 |
| update_time | datetime(6) | NOT NULL | 更新时间 |
| checked | tinyint(1) | NOT NULL | 是否已核对 |
| currency_id | bigint | NOT NULL, FK → currency.id | 货币 |

约束：

- `UNIQUE (currency_id, date)`
- FK：`rate.currency_id` → `currency.id`

## 5. 参考 DDL

与 `deploy/sql/schema.sql` 保持一致：

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

## 6. 变更规则

- 外部表列语义变更：先与数据方确认 → 更新本文 → 再改 ORM/校验/调用方。
- 本系统 MUST NOT 为方便实现而擅自缩短/改写 `data` 字符串语义或去掉唯一键。
- 海关字典映射/类型表为本系统**自有表**（非本文外部表）：结构与语义以 Alembic 迁移 + `openspec/specs/customs-dict/spec.md` 为准；勿与 `currency`/`rate` 混用。
