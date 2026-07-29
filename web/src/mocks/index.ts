/**
 * MSW 启动入口。
 *
 * 调用方应在应用挂载之前 await 该函数，确保首屏请求也能被拦截。
 * 仅当 `import.meta.env.VITE_ENABLE_MOCK === 'true'` 时真正启动 Service Worker，
 * 其它情况下直接 resolve，避免打包产物引入 MSW 运行时。
 */
export const enableMocks = async (): Promise<void> => {
  if (import.meta.env.VITE_ENABLE_MOCK !== 'true') {
    return;
  }

  // 使用动态 import，保证生产构建时 MSW 代码不会被打入业务 bundle。
  const { worker } = await import('./browser');

  await worker.start({
    // 未被 handler 命中的请求直接透传到真实后端，避免影响未 mock 的接口。
    onUnhandledRequest: 'bypass',
    serviceWorker: {
      // 与 vite `base: './'` 的部署策略保持一致，指向 public 目录下的脚本。
      url: `${import.meta.env.BASE_URL}mockServiceWorker.js`,
    },
    quiet: false,
  });

  // 在控制台给出明显提示，避免误把 mock 数据当作真实数据。
  // eslint-disable-next-line no-console
  console.info('[MSW] 本地 mock 已启用');
};
