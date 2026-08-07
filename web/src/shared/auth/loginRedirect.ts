/** 登录成功后默认落点 */
export const DEFAULT_AFTER_LOGIN = '/currencies';

/**
 * 规范化登录回跳路径，避免 redirect=/login 等自指导致登录后仍停在登录页。
 */
export function sanitizeLoginRedirect(raw: string | null | undefined): string {
  if (!raw) return DEFAULT_AFTER_LOGIN;

  let path = raw;
  try {
    path = decodeURIComponent(raw);
  } catch {
    return DEFAULT_AFTER_LOGIN;
  }

  if (!path.startsWith('/') || path.startsWith('//')) {
    return DEFAULT_AFTER_LOGIN;
  }

  const base = path.split('?')[0].split('#')[0];
  if (base === '/login' || base.startsWith('/login/')) {
    return DEFAULT_AFTER_LOGIN;
  }

  return path;
}

/** 构造登录页路径；已在登录页或回跳为登录页时不附带 redirect 参数。 */
export function loginPathWithRedirect(pathname: string, search = ''): string {
  if (pathname === '/login' || pathname.startsWith('/login/')) {
    return '/login';
  }
  const target = sanitizeLoginRedirect(`${pathname}${search}`);
  return `/login?redirect=${encodeURIComponent(target)}`;
}
