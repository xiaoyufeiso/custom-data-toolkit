import axios from 'axios';

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
