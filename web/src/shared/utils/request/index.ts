import axios, {
  AxiosError,
  AxiosResponse,
} from 'axios';
import type {
  RequestAuthConfig,
  RequestInstance,
  TokenPayload,
  RefreshTokenResponse,
  InternalRequestConfig,
  RequestConfig,
} from './types';

/**
 * 默认鉴权配置：
 * 业务可在应用初始化阶段通过 configureAuth 覆盖。
 */
const authConfig: RequestAuthConfig = {
  enableTokenRefresh: false,
  tokenStorageKey: 'token',
  refreshTokenStorageKey: 'refresh_token',
  tokenType: 'Bearer',
  refreshUrl: '/api/auth/oauth2/token',
  refreshAuthHeader: 'Basic dGVuZGF0YTp0ZW5kYXRh',
  redirectToLoginOnAuthFailure: true,
  loginRedirectQueryKey: 'targetUrl',
  loginUrl: '',
};

let refreshPromise: Promise<string> | null = null;
let hasRedirectedToLogin = false;

const request = axios.create({
  baseURL: import.meta.env.VITE_APP_BASE_API,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
}) as RequestInstance;

/** 判断是否浏览器环境，避免 SSR/测试环境下直接访问 window。 */
const isBrowser = () => typeof window !== 'undefined';

/**
 * 读取指定 cookie：
 * - 仅在浏览器环境生效
 * - 返回解码后的值；不存在时返回空字符串
 */
const getCookieValue = (cookieKey: string): string => {
  if (!isBrowser()) {
    return '';
  }

  const targetPrefix = `${encodeURIComponent(cookieKey)}=`;
  const cookieItems = document.cookie ? document.cookie.split('; ') : [];
  const matched = cookieItems.find((item) => item.startsWith(targetPrefix));
  if (!matched) {
    return '';
  }

  return decodeURIComponent(matched.slice(targetPrefix.length));
};

/**
 * 写入 cookie：
 * - 默认 path=/，确保全站请求都能读取
 * - SameSite=Lax，减少跨站场景风险
 * - https 场景追加 Secure
 */
const setCookieValue = (cookieKey: string, value: string): void => {
  if (!isBrowser()) {
    return;
  }

  const cookieSegments = [
    `${encodeURIComponent(cookieKey)}=${encodeURIComponent(value)}`,
    'Path=/',
    'SameSite=Lax',
  ];

  if (window.location.protocol === 'https:') {
    cookieSegments.push('Secure');
  }

  document.cookie = cookieSegments.join('; ');
};

/**
 * 删除 cookie：
 * 通过设置过期时间为过去时间点触发浏览器删除。
 */
const removeCookieValue = (cookieKey: string): void => {
  if (!isBrowser()) {
    return;
  }

  const cookieSegments = [
    `${encodeURIComponent(cookieKey)}=`,
    'Path=/',
    'Expires=Thu, 01 Jan 1970 00:00:00 GMT',
    'SameSite=Lax',
  ];

  if (window.location.protocol === 'https:') {
    cookieSegments.push('Secure');
  }

  document.cookie = cookieSegments.join('; ');
};

/**
 * 获取当前页面上下文：
 * 用于判断是否应跳转登录/错误页，以及白名单登录回跳策略。
 */
const getCurrentPageContext = () => {
  if (!isBrowser()) {
    return {
      isLoginPage: false,
    };
  }

  // 这些判断用于避免重定向死循环，并兼容历史登录路由约定。
  const currentHostname = window.location.hostname;
  const loginHostname = new URL(authConfig.loginUrl).hostname;
  const isLoginPage = currentHostname.includes(loginHostname);

  return {
    isLoginPage,
  };
};

const getResponseCode = (responseData: unknown): number | null => {
  if (!responseData) {
    return null;
  }

  if (typeof responseData === 'object') {
    const data = responseData as { code?: unknown };
    if (typeof data.code === 'number') {
      return data.code;
    }
    if (typeof data.code === 'string') {
      const parsedCode = Number(data.code);
      if (Number.isFinite(parsedCode)) {
        return parsedCode;
      }
    }
    return null;
  }

  if (typeof responseData === 'string') {
    try {
      const parsed = JSON.parse(responseData) as { code?: unknown };
      if (typeof parsed.code === 'number') {
        return parsed.code;
      }
      if (typeof parsed.code === 'string') {
        const parsedCode = Number(parsed.code);
        if (Number.isFinite(parsedCode)) {
          return parsedCode;
        }
      }
    } catch {
      return null;
    }
  }

  return null;
};

/** 从 cookie 读取 access token。 */
const getAccessToken = (): string => getCookieValue(authConfig.tokenStorageKey);

/** 从 cookie 读取 refresh token。 */
const getRefreshToken = (): string => getCookieValue(authConfig.refreshTokenStorageKey);

/** 持久化 token 到 cookie。 */
const setTokenPayload = (payload: TokenPayload): void => {
  setCookieValue(authConfig.tokenStorageKey, payload.accessToken);

  if (payload.refreshToken) {
    setCookieValue(authConfig.refreshTokenStorageKey, payload.refreshToken);
  }
};

/** 清理 cookie 中的 token。 */
const clearTokenPayload = (): void => {
  removeCookieValue(authConfig.tokenStorageKey);
  removeCookieValue(authConfig.refreshTokenStorageKey);
};

/**
 * 将刷新接口返回值规范化为内部结构。
 * 若缺少 access token，返回 null 表示响应无效。
 */
const getTokenPayloadFromRefreshResponse = (
  responseData: RefreshTokenResponse,
): TokenPayload | null => {
  const accessToken = responseData.access_token || responseData.accessToken || '';
  if (!accessToken) {
    return null;
  }

  return {
    accessToken,
    refreshToken: responseData.refresh_token || responseData.refreshToken,
  };
};

/**
 * 跳转登录页：
 * - 白名单页面带 targetUrl 回跳参数
 * - 已在登录页时不重复跳转
 */
const redirectToLogin = (): void => {
  if (!isBrowser()
    || !authConfig.redirectToLoginOnAuthFailure
    || hasRedirectedToLogin
    || !authConfig.loginUrl) {
    return;
  }

  const { isLoginPage } = getCurrentPageContext();
  if (isLoginPage) {
    return;
  }

  hasRedirectedToLogin = true;

  window.location.href = authConfig.loginUrl;
};

/** 鉴权失败收敛动作：清 token + 登录跳转。 */
const handleAuthFailure = (): void => {
  clearTokenPayload();
  redirectToLogin();
};

/**
 * 刷新 access token（single-flight）：
 * 并发场景复用同一个 refreshPromise，避免同时发多次刷新请求。
 */
const refreshAccessToken = async (): Promise<string> => {
  if (refreshPromise) {
    // 已有刷新请求在进行时，后续请求直接等待同一个 Promise。
    return refreshPromise;
  }

  refreshPromise = (async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      throw new Error('Missing refresh token');
    }

    const payload = new URLSearchParams({
      grant_type: 'refresh_token',
      scope: 'server',
      refresh_token: refreshToken,
    });

    const headers: Record<string, string> = {
      'Content-Type': 'application/x-www-form-urlencoded',
    };

    if (authConfig.refreshAuthHeader) {
      headers.authorization = authConfig.refreshAuthHeader;
    }

    const response = await request.post<RefreshTokenResponse, RefreshTokenResponse>(
      authConfig.refreshUrl,
      payload,
      {
        headers,
        skipAuth: true,
        skipAuthRefresh: true,
        withCredentials: true,
      },
    );

    const tokenPayload = getTokenPayloadFromRefreshResponse(response);
    if (!tokenPayload) {
      throw new Error('Invalid refresh token response');
    }

    setTokenPayload(tokenPayload);
    return tokenPayload.accessToken;
  })()
    .catch((error) => {
      handleAuthFailure();
      throw error;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
};

const isRefreshEnabled = (): boolean => authConfig.enableTokenRefresh;

/** 运行时更新鉴权配置。 */
request.configureAuth = (patch) => {
  Object.assign(authConfig, patch);
  return { ...authConfig };
};

/** 获取当前鉴权配置快照。 */
request.getAuthConfig = () => ({ ...authConfig });

/**
 * 请求拦截器：
 * 1. 按配置注入 Authorization
 * 2. 若正在刷新 token，先等待刷新完成后再发业务请求
 */
request.interceptors.request.use(
  async (config: InternalRequestConfig) => {
    if (config.skipAuth) {
      return config;
    }

    if (isRefreshEnabled()) {
      if (refreshPromise) {
        await refreshPromise;
      }
    }

    const accessToken = getAccessToken();
    if (accessToken && config.headers) {
      config.headers.Authorization = `${authConfig.tokenType} ${accessToken}`.trim();
    }

    return config;
  },
  (error) => Promise.reject(error),
);

/**
 * 响应拦截器统一分流：
 * - 500：上报全局错误
 * - 403：跳转 403 页面
 * - 401(code=2)：跳 oops 页面
 * - 401(其他)：尝试一次 refresh 后重放；失败则登录收敛
 */
request.interceptors.response.use(
  (response: AxiosResponse) => response.data,
  async (error: AxiosError) => {
    const responseStatus = error.response?.status;
    const responseCode = getResponseCode(error.response?.data);
    const originalConfig = error.config as InternalRequestConfig | undefined;
    const { isLoginPage } = getCurrentPageContext();

    // 500：非登录页、且非审计上报接口时，上报 global-error。
    if (responseStatus === 500 && !isLoginPage) {
      return Promise.reject(error);
    }

    // 403：统一跳转无权限页。
    if (responseStatus === 403) {
      redirectToLogin();
      return Promise.reject(error);
    }

    // 401 + code=2：按“被踢下线”处理，跳转 oops。
    if (responseStatus === 401 && responseCode === 2) {
      clearTokenPayload();
      redirectToLogin();
      return Promise.reject(error);
    }

    // 常规 401：开启续期时仅重试一次，避免循环请求。
    if (responseStatus === 401 && originalConfig && !originalConfig.skipAuthRefresh) {
      const alreadyRetried = originalConfig.hasRetriedAuth === true;
      const canRefresh = isRefreshEnabled() && !originalConfig.skipAuth;

      if (!alreadyRetried && canRefresh) {
        originalConfig.hasRetriedAuth = true;
        try {
          const latestAccessToken = await refreshAccessToken();
          originalConfig.headers = originalConfig.headers || {};
          originalConfig.headers.Authorization = `${authConfig.tokenType} ${latestAccessToken}`.trim();
          return request(originalConfig);
        } catch (refreshError) {
          return Promise.reject(refreshError);
        }
      }
    }

    // 401 最终兜底：不可重试或续期失败后，执行登录收敛。
    if (responseStatus === 401) {
      handleAuthFailure();
    }

    return Promise.reject(error);
  },
);

export const { configureAuth, getAuthConfig } = request;

/** GET 请求封装。 */
export const get = <T = unknown>(
  url: string,
  config?: RequestConfig,
): Promise<T> => request.get(url, config);

/** POST 请求封装。 */
export const post = <T = unknown>(
  url: string,
  data?: unknown,
  config?: RequestConfig,
): Promise<T> => request.post(url, data, config);

/** PUT 请求封装。 */
export const put = <T = unknown>(
  url: string,
  data?: unknown,
  config?: RequestConfig,
): Promise<T> => request.put(url, data, config);

/** DELETE 请求封装。 */
export const del = <T = unknown>(
  url: string,
  config?: RequestConfig,
): Promise<T> => request.delete(url, config);

export default request;
