/// <reference types="vite/client" />

declare module '@tendata-ui/icon';
declare module '@tendata-biz-components/text-tooltip';

interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string;
  readonly VITE_APP_BASE_API: string;
  readonly VITE_PUBLIC_APIENV: 'uat' | 'pro';
  /** 是否启用 MSW 本地 mock，仅 'true' 时生效。 */
  readonly VITE_ENABLE_MOCK?: 'true' | 'false';
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
