import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

/**
 * 浏览器端 MSW Worker 实例。
 *
 * - 仅用于本地开发环境，通过 `VITE_ENABLE_MOCK=true` 启用；
 * - 依赖 `public/mockServiceWorker.js`（由 `pnpm exec msw init public/` 生成），
 *   生产构建不应启动 worker。
 */
export const worker = setupWorker(...handlers);
