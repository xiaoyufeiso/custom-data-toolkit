import { config } from '@/config';

/**
 * 测试环境中 jsdom 的默认 origin。
 * 与 axios baseURL（测试环境为空）拼接后的最终请求地址一致。
 */
export const TEST_API_ORIGIN = 'http://localhost';

/** 测试环境使用的登录页地址，供 request 拦截器解析 hostname 时使用。 */
export const TEST_LOGIN_URL = `${TEST_API_ORIGIN}/login`;

/**
 * 构造 insight-monitor 模块的绝对 URL，供 MSW handler 匹配。
 * 集中在此是为了避免 handler/测试中散落硬编码路径，后端前缀变更时只改一处。
 */
export const buildInsightMonitorUrl = (path: string): string => (
  `${TEST_API_ORIGIN}${config.host}/${config.apiVersion}${path}`
);
