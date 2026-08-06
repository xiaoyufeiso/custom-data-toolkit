import type { RequestHandler } from 'msw';

/**
 * 浏览器 Mock 模式（`pnpm start:mock`）的 MSW handlers。
 * 业务页默认打真实后端；需要本地无后端联调时再在此补充接口。
 */
export const handlers: RequestHandler[] = [];
