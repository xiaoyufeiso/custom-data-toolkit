import type {
  AxiosInstance,
  AxiosRequestConfig as AxiosReqConfig,
  InternalAxiosRequestConfig as AxiosInternalReqConfig,
} from 'axios';

declare module 'axios' {
    /**
     * 扩展 axios 请求配置：
     * 这些字段仅在当前 request 封装内部使用，用于控制鉴权流程。
     */
    interface AxiosRequestConfig {
        /** 是否跳过 token 注入。true 常用于登录/刷新 token 接口。 */
        skipAuth?: boolean;
        /** 是否跳过 401 自动续期与重放。 */
        skipAuthRefresh?: boolean;
        /** 当前请求是否已经做过一次 401 重试，防止无限循环。 */
        hasRetriedAuth?: boolean;
    }

    /**
     * InternalAxiosRequestConfig 同步扩展，确保拦截器内拿到强类型。
     */
    interface InternalAxiosRequestConfig {
        /** 是否跳过 token 注入。 */
        skipAuth?: boolean;
        /** 是否跳过 401 自动续期与重放。 */
        skipAuthRefresh?: boolean;
        /** 是否已经重试过一次。 */
        hasRetriedAuth?: boolean;
    }
}

/**
 * 刷新 token 接口返回结构。
 * 同时兼容 snake_case / camelCase 两种后端返回风格。
 */
export interface RefreshTokenResponse {
    /** 新的 access token（snake_case）。 */
    access_token?: string;
    /** 新的 refresh token（snake_case）。 */
    refresh_token?: string;
    /** token 类型，常见值为 Bearer。 */
    token_type?: string;
    /** 新的 access token（camelCase）。 */
    accessToken?: string;
    /** 新的 refresh token（camelCase）。 */
    refreshToken?: string;
}

/**
 * 统一后的 token 载荷结构（内部使用）。
 */
export interface TokenPayload {
    /** 业务请求实际使用的 access token。 */
    accessToken: string;
    /** 用于后续续期的 refresh token。 */
    refreshToken?: string;
}

/**
 * request 鉴权配置项。
 * 通过 request.configureAuth 动态修改。
 */
export interface RequestAuthConfig {
    /** 是否启用 401 自动续期能力。默认 false，业务入口可通过 configureAuth 开启。 */
    enableTokenRefresh: boolean;
    /** access token 在 cookie 中的 key。 */
    tokenStorageKey: string;
    /** refresh token 在 cookie 中的 key。 */
    refreshTokenStorageKey: string;
    /** Authorization 前缀，默认 Bearer。 */
    tokenType: string;
    /** 刷新 token 接口地址。 */
    refreshUrl: string;
    /** 刷新 token 接口的 authorization 头。 */
    refreshAuthHeader: string;
    /** 鉴权失败后是否自动跳转登录页。 */
    redirectToLoginOnAuthFailure: boolean;
    /** 登录页回跳参数名，默认 targetUrl。 */
    loginRedirectQueryKey: string;
    /** 登录页地址。 */
    loginUrl: string;
}

/**
 * 对外暴露的请求扩展参数。
 */
export interface RequestExtraConfig {
    /** 是否跳过 token 注入。 */
    skipAuth?: boolean;
    /** 是否跳过 401 自动续期。 */
    skipAuthRefresh?: boolean;
    /** 是否已重试（内部字段，业务一般不需要手动设置）。 */
    hasRetriedAuth?: boolean;
}

export type RequestConfig = AxiosReqConfig & RequestExtraConfig;
export type InternalRequestConfig = AxiosInternalReqConfig & RequestExtraConfig;

export interface RequestInstance extends AxiosInstance {
    /** 合并更新鉴权配置，并返回更新后的完整配置。 */
    configureAuth: (patch: Partial<RequestAuthConfig>) => RequestAuthConfig;
    /** 获取当前生效的鉴权配置快照。 */
    getAuthConfig: () => RequestAuthConfig;
}
