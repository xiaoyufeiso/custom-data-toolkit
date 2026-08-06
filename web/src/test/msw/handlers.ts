import { http, HttpResponse, type RequestHandler } from 'msw';
import { TEST_API_ORIGIN } from '@/test/msw/apiBase';

/**
 * 默认 handlers：覆盖核心业务接口的成功分支。
 *
 * 策略说明：
 * - 页面/Hook 测试默认走真实 service → 真实 axios → 这里的 MSW 响应，
 *   保留更贴近真实运行时的调用链，减少对实现细节的 mock。
 * - 任何用例如需自定义响应（失败、分页边界、特定参数回显等），使用
 *   `server.use(http.xxx(...))` 在单测内覆盖即可，afterEach 会自动 reset。
 * - `onUnhandledRequest: 'error'` 仍在 setup.ts 中开启，作为"漏网请求"的安全网。
 */
export const handlers: RequestHandler[] = [
  // 业务页 useCanWrite：默认视为 admin，单测可 server.use 覆盖为 viewer
  http.get(`${TEST_API_ORIGIN}/api/v1/auth/me`, () => (
    HttpResponse.json({
      id: 1,
      username: 'admin',
      role: 'admin',
      enabled: true,
    })
  )),
];
