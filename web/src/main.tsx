import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from '@/App';
import { enableMocks } from '@/mocks';
import '@/styles/global.less';

// 先启动 MSW（非 mock 模式下该 Promise 会立即 resolve），
// 再渲染应用，确保首屏请求也能被拦截。
enableMocks().finally(() => {
  ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
      <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <App />
      </HashRouter>
    </React.StrictMode>,
  );
});
