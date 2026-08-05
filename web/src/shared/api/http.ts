import axios from 'axios';
import { notifySessionUnauthorized } from '@/shared/auth/sessionGate';
import { clearSessionUser } from '@/shared/auth/sessionUser';

const CSRF_COOKIE = 'cdt_csrf';

function readCookie(name: string): string {
  const prefix = `${encodeURIComponent(name)}=`;
  const hit = document.cookie.split('; ').find((item) => item.startsWith(prefix));
  if (!hit) return '';
  return decodeURIComponent(hit.slice(prefix.length));
}

/** 管理端 Session Cookie 请求客户端（轻量，不走 Bearer token 模板层） */
export const http = axios.create({
  baseURL: '/api/v1',
  timeout: 15000,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

http.interceptors.request.use((config) => {
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
      clearSessionUser();
      notifySessionUnauthorized();
    }
    return Promise.reject(error);
  },
);
