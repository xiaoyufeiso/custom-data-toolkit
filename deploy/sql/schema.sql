-- Custom Data Toolkit — 既有业务表（可重复执行）
-- 用法见文件末尾注释；勿在此文件放管理员表（由 Alembic 迁移创建）

CREATE TABLE IF NOT EXISTS `currency` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `code` varchar(10) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS `rate` (
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

-- 导入示例（WSL；日常用账号 customs_app，勿用 root）：
--   mysql -h 172.28.112.1 -P 3306 -u customs_app -p customs_data_toolkit < deploy/sql/schema.sql
--   mysql -h 172.28.112.1 -P 3306 -u customs_app -p customs_data_toolkit_test < deploy/sql/schema.sql
-- 注意：backend/.env 的 DATABASE_URL 用户名须为 customs_app，库名与上面一致。
