/*
 Navicat Premium Dump SQL

 Source Server         : etl@192.168.11.98
 Source Server Type    : MySQL
 Source Server Version : 50722 (5.7.22)
 Source Host           : 192.168.11.98:16111
 Source Schema         : globiz_rates

 Target Server Type    : MySQL
 Target Server Version : 50722 (5.7.22)
 File Encoding         : 65001

 Date: 29/07/2026 16:07:21
*/

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for currency
-- ----------------------------
DROP TABLE IF EXISTS `currency`;
CREATE TABLE `currency` (
  `id` bigint(20) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `code` varchar(10) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=224 DEFAULT CHARSET=utf8;

-- ----------------------------
-- Records of currency
-- ----------------------------
BEGIN;
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (1, 'Andorran franc', 'ADF');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (2, 'Andorran peseta', 'ADP');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (3, 'UAE dirham', 'AED');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (4, 'Afghan afghani', 'AFA');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (5, 'Afghan Afghani', 'AFN');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (6, 'Albanian lek', 'ALL');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (7, 'Armenian dram', 'AMD');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (8, 'Netherlands Antillean guilder', 'ANG');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (9, 'Angolan kwanza', 'AOA');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (10, 'Angolan kwanza', 'AON');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (11, 'Argentine peso', 'ARS');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (12, 'Austrian shilling', 'ATS');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (13, 'Australian dollar', 'AUD');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (14, 'Aruban guilder', 'AWF');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (15, 'Aruban guilder', 'AWG');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (16, 'Azerbaijani manat', 'AZM');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (17, 'New azerbaijani Manat', 'AZN');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (18, 'Convertible mark', 'BAM');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (19, 'Barbados dollar', 'BBD');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (20, 'Bangladeshi taka', 'BDT');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (21, 'Belgian franc', 'BEF');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (22, 'Bulgarian lev', 'BGL');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (23, 'Bulgarian lev', 'BGN');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (24, 'Bahraini dinar', 'BHD');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (25, 'Burundian franc', 'BIF');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (26, 'Bermudian dollar', 'BMD');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (27, 'Brunei dollar', 'BND');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (28, 'Boliviano', 'BOB');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (29, 'Brazilian real', 'BRL');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (30, 'Bahamian dollar', 'BSD');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (31, 'Bhutanese ngultrum', 'BTN');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (32, 'Botswana pula', 'BWP');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (33, 'Belarusian ruble', 'BYN');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (34, 'Belarusian ruble', 'BYR');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (35, 'Belize dollar', 'BZD');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (36, 'Canadian dollar', 'CAD');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (37, 'Congolese franc', 'CDF');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (38, 'Swiss franc', 'CHF');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (39, 'Chilean peso', 'CLP');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (40, 'Chinese yuan renminbi (RMB)', 'CNY');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (41, 'Colombian peso', 'COP');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (42, 'Costa Rican colon', 'CRC');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (43, 'Cuban convertible Peso', 'CUC');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (44, 'Cuban peso', 'CUP');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (45, 'Cape Verde escudo', 'CVE');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (46, 'Cypriot pound', 'CYP');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (47, 'Czech koruna', 'CZK');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (48, 'German Deutsche mark', 'DEM');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (49, 'Djiboutian franc', 'DJF');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (50, 'Danish krone', 'DKK');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (51, 'Dominican peso', 'DOP');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (52, 'Algerian dinar', 'DZD');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (53, 'Ecuadorian sucre', 'ECS');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (54, 'Estonian kroon', 'EEK');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (55, 'Egyptian pound', 'EGP');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (56, 'Eritrean nakfa', 'ERN');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (57, 'Spanish peseta', 'ESP');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (58, 'Ethipian birr', 'ETB');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (59, 'Euro', 'EUR');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (60, 'Finnish markka', 'FIM');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (61, 'Fiji dollar', 'FJD');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (62, 'Falkland Islands pound', 'FKP');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (63, 'Old french franc', 'FRA');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (64, 'French franc', 'FRF');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (65, 'Pound sterling', 'GBP');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (66, 'Georgian lari', 'GEL');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (67, 'Guernsey Pound', 'GGP');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (68, 'Ghanaian new cedi', 'GHC');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (69, 'Ghanaian Cedi', 'GHS');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (70, 'Gibraltar pound', 'GIP');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (71, 'Gambian dalasi', 'GMD');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (72, 'Guinean franc', 'GNF');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (73, 'Greek drachma', 'GRD');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (74, 'Guatemalan quetzal', 'GTQ');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (75, 'Guyanese dollar', 'GYD');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (76, 'Hong Kong dollar', 'HKD');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (77, 'Honduran lempira', 'HNL');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (78, 'Croatian kuna', 'HRK');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (79, 'Haitian gourde', 'HTG');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (80, 'Hungarian forint', 'HUF');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (81, 'Indonesian rupiah', 'IDR');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (82, 'Irish punt', 'IEP');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (83, 'Israeli new shekel', 'ILS');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (84, 'Manx pound', 'IMP');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (85, 'Indian rupee', 'INR');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (86, 'Iraqi dinar', 'IQD');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (87, 'Iranian rial', 'IRR');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (88, 'Icelandic króna', 'ISK');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (89, 'Italian lira', 'ITL');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (90, 'Jersey pound', 'JEP');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (91, 'Jamaican dollar', 'JMD');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (92, 'Jordanian dinar', 'JOD');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (93, 'Japanese yen', 'JPY');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (94, 'Kenyan shilling', 'KES');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (95, 'Kyrgyzstani som', 'KGS');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (96, 'Cambodian riel', 'KHR');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (97, 'Kiribati dollar', 'KID');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (98, 'Comoro franc', 'KMF');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (99, 'North Korean won', 'KPW');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (100, 'South Korean won', 'KRW');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (101, 'Kuwaiti dinar', 'KWD');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (102, 'Cayman Islands dollar', 'KYD');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (103, 'Kazakhstani tenge', 'KZT');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (104, 'Lao kip', 'LAK');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (105, 'Lebanese pound', 'LBP');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (106, 'Sri Lankan rupee', 'LKR');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (107, 'Liberian dollar', 'LRD');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (108, 'Lesotho loti', 'LSL');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (109, 'Lithuanian litas', 'LTL');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (110, 'Luxembourg franc', 'LUF');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (111, 'Latvian lats', 'LVL');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (112, 'Libyan dinar', 'LYD');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (113, 'Moroccan dirham', 'MAD');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (114, 'Monégasque franc', 'MCF');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (115, 'Moldovan leu', 'MDL');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (116, 'Malagasy ariayry', 'MGA');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (117, 'Malagasy franc', 'MGF');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (118, 'Macedonian denar', 'MKD');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (119, 'Myanma kyat', 'MMK');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (120, 'Mongolian tugrik', 'MNT');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (121, 'Macanese pataca', 'MOP');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (122, 'Mauritanian ouguiya', 'MRO');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (123, 'Mauritanian ouguiya', 'MRU');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (124, 'Maltese lira', 'MTL');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (125, 'Mauritian rupee', 'MUR');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (126, 'Maldivian rufiyaa', 'MVR');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (127, 'Malawian kwacha', 'MWK');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (128, 'Mexican peso', 'MXN');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (129, 'Malaysian ringgit', 'MYR');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (130, 'Mozambican metical', 'MZM');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (131, 'Mozambican metical', 'MZN');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (132, 'Namibian dollar', 'NAD');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (133, 'Nigerian naira', 'NGN');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (134, 'Nicaraguan córdoba', 'NIO');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (135, 'Netherlands guilder', 'NLG');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (136, 'Norwegian krone', 'NOK');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (137, 'Nepalese rupee', 'NPR');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (138, 'New Taiwan dollar', 'NTD');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (139, 'New Zealand dollar', 'NZD');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (140, 'Omani rial', 'OMR');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (141, 'Panamanian balboa', 'PAB');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (142, 'Peruvian nuevo sol', 'PEN');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (143, 'Papua New Guinean kina', 'PGK');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (144, 'Philippine peso', 'PHP');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (145, 'Pakistani rupee', 'PKR');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (146, 'Polish zloty', 'PLN');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (147, 'Seborga luigino', 'PSL');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (148, 'Portguese escudo', 'PTE');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (149, 'Paraguayan guaraní', 'PYG');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (150, 'Qatari riyal', 'QAR');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (151, 'Romanian leu', 'ROL');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (152, 'Romanian new Leu', 'RON');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (153, 'Serbian dinar', 'RSD');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (154, 'Russian ruble', 'RUB');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (155, 'Rwandan franc', 'RWF');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (156, 'Saudi riyal', 'SAR');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (157, 'Solomon Islands dollar', 'SBD');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (158, 'Seychelles rupee', 'SCR');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (159, 'Sudanese dinar', 'SDD');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (160, 'Sudanese pound', 'SDG');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (161, 'Sudanese dinar', 'SDP');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (162, 'Swedish krona', 'SEK');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (163, 'Singapore dollar', 'SGD');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (164, 'Saint Helena pound', 'SHP');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (165, 'Slovenian tolar', 'SIT');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (166, 'Slovak koruna', 'SKK');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (167, 'Sierra Leonean leone', 'SLL');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (168, 'Somali shilling', 'SOS');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (169, 'Seborga luigino', 'SPL');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (170, 'Surinamese dollar', 'SRD');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (171, 'Surinamese guilder', 'SRG');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (172, 'South Sudanese Pound', 'SSP');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (173, 'São Tomé dobra', 'STD');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (174, 'São Tomé dobra', 'STN');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (175, 'Salvadoran colon', 'SVC');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (176, 'Syrian pound', 'SYP');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (177, 'Swazi lilangeni', 'SZL');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (178, 'Thai baht', 'THB');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (179, 'Tajikistani somoni', 'TJS');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (180, 'Turkmenistani manat', 'TMM');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (181, 'Turkmenistani new manat', 'TMT');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (182, 'Tunisian dinar', 'TND');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (183, 'Tongan pa\'anga', 'TOP');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (184, 'Turkish lira', 'TRL');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (185, 'Turkish lira', 'TRY');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (186, 'Trinidad dollar', 'TTD');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (187, 'Tuvaluan dollar', 'TVD');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (188, 'New Taiwan dollar', 'TWD');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (189, 'Tanzanian shilling', 'TZS');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (190, 'Ukrainian hryvnia', 'UAH');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (191, 'Ugandan shilling', 'UGX');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (192, 'Urugayan peso', 'UYP');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (193, 'Urugayan peso', 'UYU');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (194, 'Uzbekitan som', 'UZS');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (195, 'Vatican Lira', 'VAL');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (196, 'Venezualan bolivar', 'VEB');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (197, 'Venezualan bolivar fuerte', 'VEF');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (198, 'sovereign bolivar', 'VES');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (199, 'Vietnamese đồng', 'VND');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (200, 'Vanuatu vatu', 'VUV');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (201, 'Samoan tala', 'WST');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (202, 'CFA Franc BEAC', 'XAF');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (203, 'Silver gram', 'XAG');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (204, 'Gold gram', 'XAU');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (205, 'Peer-to-peer digital currency', 'XBT');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (206, 'East Caribbean dollar', 'XCD');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (207, 'Copper highgrade', 'XCP');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (208, 'Special drawing right', 'XDR');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (209, 'ECU', 'XEU');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (210, 'CFA Franc BCEAO', 'XOF');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (211, 'Palladium gram', 'XPD');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (212, 'French pacific franc', 'XPF');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (213, 'Platinum gram', 'XPT');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (214, 'ADB Unit of Account', 'XUA');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (215, 'Yemeni rial', 'YER');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (216, 'Yugoslav dinar', 'YUN');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (217, 'South African rand', 'ZAR');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (218, 'Zambian kwacha', 'ZMK');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (219, 'Zambian kwacha', 'ZMW');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (220, 'Zimbabwe dollar', 'ZWD');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (221, 'Zimbabwe dollar', 'ZWL');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (222, 'Malaysian ringgit import', 'MYR_IM');
INSERT INTO `currency` (`id`, `name`, `code`) VALUES (223, 'Malaysian ringgit export', 'MYR_EX');
COMMIT;

SET FOREIGN_KEY_CHECKS = 1;
