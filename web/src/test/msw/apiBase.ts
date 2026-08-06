/**
 * 测试环境中 jsdom 的默认 origin。
 * 与 axios baseURL（测试环境为空）拼接后的最终请求地址一致。
 */
export const TEST_API_ORIGIN = 'http://localhost';

/** 测试环境使用的登录页地址，供 request 拦截器解析 hostname 时使用。 */
export const TEST_LOGIN_URL = `${TEST_API_ORIGIN}/login`;
