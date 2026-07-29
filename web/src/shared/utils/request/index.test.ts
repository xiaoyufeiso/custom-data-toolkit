import { http, HttpResponse } from 'msw';
import {
  afterAll, afterEach, beforeEach, describe, expect, it,
} from 'vitest';
import {
  configureAuth, del, get, getAuthConfig, post, put,
} from '@/shared/utils/request';
import { TEST_API_ORIGIN, TEST_LOGIN_URL } from '@/test/msw/apiBase';
import { server } from '@/test/msw/server';

/**
 * request 工具测试：
 * - 覆盖 token 注入、skipAuth、401 刷新重放（enableTokenRefresh=true）、401 直接登出（enableTokenRefresh=false）、
 *   401+code=2 的核心分支；
 * - 走真实 axios + MSW 网络层，确保业务层可以放心依赖这些行为契约；
 * - 通过 stub window.location 让重定向退化为属性赋值，避免 jsdom 的 navigation 告警。
 */

type LocationStub = {
  href: string;
  hostname: string;
  protocol: string;
  origin: string;
  pathname: string;
  search: string;
};

const originalLocation = window.location;
const stubbedLocation: LocationStub = {
  href: 'http://localhost/',
  hostname: 'localhost',
  protocol: 'http:',
  origin: TEST_API_ORIGIN,
  pathname: '/',
  search: '',
};

Object.defineProperty(window, 'location', {
  configurable: true,
  value: stubbedLocation,
});

const setCookie = (key: string, value: string) => {
  document.cookie = `${key}=${encodeURIComponent(value)}; Path=/`;
};

const readCookie = (key: string): string => {
  const prefix = `${key}=`;
  const item = document.cookie
    .split('; ')
    .find((segment) => segment.startsWith(prefix));
  return item ? decodeURIComponent(item.slice(prefix.length)) : '';
};

const REFRESH_URL = `${TEST_API_ORIGIN}/api/auth/oauth2/token`;

const originalAuthConfig = getAuthConfig();

beforeEach(() => {
  stubbedLocation.href = 'http://localhost/';
  stubbedLocation.hostname = 'localhost';
});

afterEach(() => {
  configureAuth({ ...originalAuthConfig, loginUrl: TEST_LOGIN_URL });
});

afterAll(() => {
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: originalLocation,
  });
});

describe('request / baseline', () => {
  it('returns response data from mocked endpoints', async () => {
    server.use(
      http.get(`${TEST_API_ORIGIN}/api/ping`, () => HttpResponse.json({ message: 'pong' })),
    );

    const result = await get<{ message: string }>('/api/ping', { skipAuth: true });

    expect(result).toEqual({ message: 'pong' });
  });

  it('exposes post / put / delete helpers that unwrap response data', async () => {
    server.use(
      http.post(`${TEST_API_ORIGIN}/api/echo`, async ({ request }) => (
        HttpResponse.json({ method: 'POST', body: await request.json() })
      )),
      http.put(`${TEST_API_ORIGIN}/api/echo`, async ({ request }) => (
        HttpResponse.json({ method: 'PUT', body: await request.json() })
      )),
      http.delete(`${TEST_API_ORIGIN}/api/echo`, () => (
        HttpResponse.json({ method: 'DELETE' })
      )),
    );

    await expect(
      post<{ method: string; body: unknown }>('/api/echo', { a: 1 }, { skipAuth: true }),
    ).resolves.toEqual({ method: 'POST', body: { a: 1 } });

    await expect(
      put<{ method: string; body: unknown }>('/api/echo', { b: 2 }, { skipAuth: true }),
    ).resolves.toEqual({ method: 'PUT', body: { b: 2 } });

    await expect(
      del<{ method: string }>('/api/echo', { skipAuth: true }),
    ).resolves.toEqual({ method: 'DELETE' });
  });
});

describe('request / authorization', () => {
  it('injects Authorization header from cookie when skipAuth is not set', async () => {
    setCookie('token', 'access-token-123');
    let capturedAuth: string | null = null;

    server.use(
      http.get(`${TEST_API_ORIGIN}/api/protected`, ({ request }) => {
        capturedAuth = request.headers.get('authorization');
        return HttpResponse.json({ ok: true });
      }),
    );

    await expect(get('/api/protected')).resolves.toEqual({ ok: true });
    expect(capturedAuth).toBe('Bearer access-token-123');
  });

  it('does not inject Authorization when skipAuth is true', async () => {
    setCookie('token', 'should-not-be-sent');
    let capturedAuth: string | null = null;

    server.use(
      http.get(`${TEST_API_ORIGIN}/api/public`, ({ request }) => {
        capturedAuth = request.headers.get('authorization');
        return HttpResponse.json({ ok: true });
      }),
    );

    await expect(get('/api/public', { skipAuth: true })).resolves.toEqual({ ok: true });
    expect(capturedAuth).toBeNull();
  });
});

describe('request / 401 refresh flow', () => {
  describe('when enableTokenRefresh is false (default)', () => {
    it('rejects on 401 without attempting refresh and clears tokens', async () => {
      setCookie('token', 'expired-token');
      setCookie('refresh_token', 'refresh-token');
      configureAuth({ redirectToLoginOnAuthFailure: false });

      let refreshHits = 0;
      let protectedHits = 0;
      server.use(
        http.get(`${TEST_API_ORIGIN}/api/protected`, () => {
          protectedHits += 1;
          return HttpResponse.json({ message: 'unauthorized' }, { status: 401 });
        }),
        http.post(REFRESH_URL, () => {
          refreshHits += 1;
          return HttpResponse.json({ access_token: 'new-token' });
        }),
      );

      await expect(get('/api/protected')).rejects.toBeDefined();
      expect(refreshHits).toBe(0);
      expect(protectedHits).toBe(1);
      expect(readCookie('token')).toBe('');
      expect(readCookie('refresh_token')).toBe('');
    });
  });

  describe('when enableTokenRefresh is true', () => {
    beforeEach(() => {
      configureAuth({ enableTokenRefresh: true, redirectToLoginOnAuthFailure: false });
    });

    it('refreshes token once and replays the original request with the new token', async () => {
      setCookie('token', 'old-token');
      setCookie('refresh_token', 'refresh-token-abc');

      const capturedAuth: string[] = [];
      let refreshHits = 0;
      let protectedHits = 0;

      server.use(
        http.get(`${TEST_API_ORIGIN}/api/protected`, ({ request }) => {
          protectedHits += 1;
          capturedAuth.push(request.headers.get('authorization') ?? '');
          if (protectedHits === 1) {
            return HttpResponse.json({ message: 'unauthorized' }, { status: 401 });
          }
          return HttpResponse.json({ ok: true });
        }),
        http.post(REFRESH_URL, () => {
          refreshHits += 1;
          return HttpResponse.json({
            access_token: 'new-token',
            refresh_token: 'new-refresh-token',
            token_type: 'Bearer',
          });
        }),
      );

      await expect(get('/api/protected')).resolves.toEqual({ ok: true });

      expect(refreshHits).toBe(1);
      expect(protectedHits).toBe(2);
      expect(capturedAuth).toEqual(['Bearer old-token', 'Bearer new-token']);
      expect(readCookie('token')).toBe('new-token');
      expect(readCookie('refresh_token')).toBe('new-refresh-token');
    });

    it('clears tokens when the refresh endpoint returns an invalid payload', async () => {
      setCookie('token', 'expired-token');
      setCookie('refresh_token', 'bad-refresh-token');

      server.use(
        http.get(`${TEST_API_ORIGIN}/api/protected`, () => (
          HttpResponse.json({ message: 'unauthorized' }, { status: 401 })
        )),
        http.post(REFRESH_URL, () => HttpResponse.json({})),
      );

      await expect(get('/api/protected')).rejects.toBeDefined();
      expect(readCookie('token')).toBe('');
      expect(readCookie('refresh_token')).toBe('');
    });

    it('does not attempt refresh when skipAuthRefresh is true', async () => {
      setCookie('token', 'access-token');
      setCookie('refresh_token', 'refresh-token');

      let refreshHits = 0;
      let protectedHits = 0;
      server.use(
        http.get(`${TEST_API_ORIGIN}/api/protected`, () => {
          protectedHits += 1;
          return HttpResponse.json({ message: 'unauthorized' }, { status: 401 });
        }),
        http.post(REFRESH_URL, () => {
          refreshHits += 1;
          return HttpResponse.json({ access_token: 'new-token' });
        }),
      );

      await expect(get('/api/protected', { skipAuthRefresh: true })).rejects.toBeDefined();
      expect(refreshHits).toBe(0);
      expect(protectedHits).toBe(1);
    });
  });
});

describe('request / error branches', () => {
  it('rejects and does not retry on 403', async () => {
    let hits = 0;
    server.use(
      http.get(`${TEST_API_ORIGIN}/api/forbidden`, () => {
        hits += 1;
        return HttpResponse.json({ message: 'forbidden' }, { status: 403 });
      }),
    );

    await expect(get('/api/forbidden', { skipAuth: true })).rejects.toBeDefined();
    expect(hits).toBe(1);
  });

  it('rejects on 500 without reporting to audit log', async () => {
    let auditHits = 0;
    server.use(
      http.get(`${TEST_API_ORIGIN}/api/boom`, () => (
        HttpResponse.json({ message: 'kaboom' }, { status: 500 })
      )),
      http.post(`${TEST_API_ORIGIN}/api/audit/logs/user/send-message`, () => {
        auditHits += 1;
        return HttpResponse.json(true);
      }),
    );

    await expect(get('/api/boom', { skipAuth: true })).rejects.toBeDefined();
    expect(auditHits).toBe(0);
  });

  it('treats 401 with code=2 as forced logout and clears tokens without retrying', async () => {
    setCookie('token', 'access-token');
    setCookie('refresh_token', 'refresh-token');

    let refreshHits = 0;
    let protectedHits = 0;
    server.use(
      http.get(`${TEST_API_ORIGIN}/api/kicked`, () => {
        protectedHits += 1;
        return HttpResponse.json({ code: 2, message: 'kicked out' }, { status: 401 });
      }),
      http.post(REFRESH_URL, () => {
        refreshHits += 1;
        return HttpResponse.json({ access_token: 'x' });
      }),
    );

    await expect(get('/api/kicked')).rejects.toBeDefined();
    expect(refreshHits).toBe(0);
    expect(protectedHits).toBe(1);
    expect(readCookie('token')).toBe('');
    expect(readCookie('refresh_token')).toBe('');
  });
});

describe('request / configureAuth', () => {
  it('merges partial updates and returns the latest snapshot', () => {
    const snapshot = configureAuth({
      tokenType: 'CustomScheme',
      enableTokenRefresh: false,
    });

    expect(snapshot.tokenType).toBe('CustomScheme');
    expect(snapshot.enableTokenRefresh).toBe(false);
    // 未传入的字段保持原值
    expect(snapshot.tokenStorageKey).toBe(originalAuthConfig.tokenStorageKey);
    expect(getAuthConfig().tokenType).toBe('CustomScheme');
  });
});
