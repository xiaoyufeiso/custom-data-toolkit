import axios from 'axios';
import { getAuthGeneration } from '@/shared/auth/authGeneration';
import { notifySessionUnauthorized } from '@/shared/auth/sessionGate';
import { clearSessionUser } from '@/shared/auth/sessionUser';

const CSRF_COOKIE = 'cdt_csrf';
/** 随请求传递，axios 克隆 config 后仍可读；后端忽略未知头 */
const AUTH_GENERATION_HEADER = 'X-Cdt-Auth-Generation';

function readCookie(name: string): string {
  const prefix = `${encodeURIComponent(name)}=`;
  const hit = document.cookie.split('; ').find((item) => item.startsWith(prefix));
  if (!hit) return '';
  return decodeURIComponent(hit.slice(prefix.length));
}

function readAuthGeneration(config: { headers?: unknown } | undefined): number | undefined {
  if (!config?.headers || typeof config.headers !== 'object') return undefined;
  const headers = config.headers as {
    get?: (key: string) => string | undefined;
    [key: string]: unknown;
  };
  const raw = typeof headers.get === 'function'
    ? headers.get(AUTH_GENERATION_HEADER)
    : (headers[AUTH_GENERATION_HEADER] ?? headers['x-cdt-auth-generation']);
  if (raw == null || raw === '') return undefined;
  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
}

/** 管理端 Session Cookie 请求客户端（轻量，不走 Bearer token 模板层） */
export const http = axios.create({
  baseURL: '/api/v1',
  timeout: 15000,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

http.interceptors.request.use((config) => {
  config.headers.set(AUTH_GENERATION_HEADER, String(getAuthGeneration()));
  const method = (config.method ?? 'get').toLowerCase();
  if (['post', 'put', 'patch', 'delete'].includes(method)) {
    const csrf = readCookie(CSRF_COOKIE);
    if (csrf) {
      config.headers.set('X-CSRF-Token', csrf);
    }
  }
  return config;
});

http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!axios.isAxiosError(error)) {
      return Promise.reject(error);
    }
    const status = error.response?.status;
    const code = (error.response?.data as { code?: string } | undefined)?.code;
    const url = String(error.config?.url ?? '');
    const isLoginOrCsrf = url.includes('/auth/login') || url.includes('/auth/csrf');
    // 仅 Session 失效（含停用清会话）；改密密码错误等 Auth.LoginFailed 不踢出
    if (status === 401 && code === 'Auth.Unauthorized' && !isLoginOrCsrf) {
      const startedAt = readAuthGeneration(error.config);
      // 登录/退出后世代已变：忽略登录前发出的过期 401，避免清掉新会话
      if (startedAt !== undefined && startedAt !== getAuthGeneration()) {
        return Promise.reject(error);
      }
      clearSessionUser();
      notifySessionUnauthorized();
    }
    return Promise.reject(error);
  },
);
