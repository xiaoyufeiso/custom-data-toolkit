import { http, HttpResponse, delay } from 'msw';

/**
 * MSW 请求处理器集合。
 *
 * 约定：
 * - 路径前缀与业务真实接口保持一致，避免切换 mock/真实环境时改动业务代码；
 * - 请求拦截器默认返回 response.data（见 `src/shared/utils/request/index.ts`），
 *   因此这里的 JSON 结构直接对应业务层接收到的数据；
 * - 统一使用 `delay()` 模拟网络耗时，方便调试 loading/骨架屏状态。
 *
 * 业务可按需新增 handler，也可将不同模块拆分到独立文件后再合并导出。
 */
export const handlers = [
  /**
   * 示例：GET /user/
   * 对应 `src/services/index.ts` 中的 `getUserInfo`。
   */
  http.get('*/api/auth/user/info', async ({ params }) => {
    await delay(200);
    const { id } = params;
    return HttpResponse.json({
      id: Number(id),
      name: `Mock 用户-${id}`,
      email: `mock_${id}@tendata.net`,
    });
  }),
];
