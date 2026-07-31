SET FOREIGN_KEY_CHECKS=0;

-- 清空旧测试数据
TRUNCATE TABLE rate;
TRUNCATE TABLE currency;

-- 抽样货币（含标准3字母码、带下划线码）
INSERT INTO currency (id, name, code) VALUES (1, 'Andorran franc', 'ADF');
INSERT INTO currency (id, name, code) VALUES (3, 'UAE dirham', 'AED');
INSERT INTO currency (id, name, code) VALUES (40, 'Chinese yuan renminbi (RMB)', 'CNY');
INSERT INTO currency (id, name, code) VALUES (59, 'Euro', 'EUR');
INSERT INTO currency (id, name, code) VALUES (222, 'Malaysian ringgit import', 'MYR_IM');
INSERT INTO currency (id, name, code) VALUES (100, 'No code currency', NULL);

-- 抽样汇率（currency_id=1 的几条）
INSERT INTO rate (id, data, date, create_time, update_time, checked, currency_id) VALUES (37, '6.581429', '2000-07-06', '2021-08-16 11:34:55.070361', '2021-08-16 11:34:55.070379', 0, 1);
INSERT INTO rate (id, data, date, create_time, update_time, checked, currency_id) VALUES (40, '6.579353', '2000-07-09', '2021-08-16 11:34:55.070501', '2021-08-16 11:34:55.070519', 0, 1);
INSERT INTO rate (id, data, date, create_time, update_time, checked, currency_id) VALUES (181, '6.549845', '2000-11-27', '2021-08-16 11:34:55.077282', '2021-08-16 11:34:55.077299', 1, 1);

-- currency_id=40 (CNY) 的几条
INSERT INTO rate (id, data, date, create_time, update_time, checked, currency_id) VALUES (10001, '7.120000', '2026-07-01', '2026-07-01 09:00:00.000000', '2026-07-01 09:00:00.000000', 1, 40);
INSERT INTO rate (id, data, date, create_time, update_time, checked, currency_id) VALUES (10002, '7.115000', '2026-07-02', '2026-07-02 09:00:00.000000', '2026-07-02 09:00:00.000000', 0, 40);
INSERT INTO rate (id, data, date, create_time, update_time, checked, currency_id) VALUES (10003, '7.130000', '2026-07-03', '2026-07-03 09:00:00.000000', '2026-07-03 09:00:00.000000', 1, 40);

-- currency_id=3 (AED) 的一条
INSERT INTO rate (id, data, date, create_time, update_time, checked, currency_id) VALUES (20001, '1.950000', '2026-07-01', '2026-07-01 09:00:00.000000', '2026-07-01 09:00:00.000000', 0, 3);

SET FOREIGN_KEY_CHECKS=1;
