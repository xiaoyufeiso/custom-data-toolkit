import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { http as client, isStaleSessionUnauthorized } from '@/shared/api/http';
import { bumpAuthGeneration } from '@/shared/auth/authGeneration';
import { notifySessionUnauthorized } from '@/shared/auth/sessionGate';

vi.mock('@/shared/auth/sessionGate', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/auth/sessionGate')>();
  return {
    ...actual,
    notifySessionUnauthorized: vi.fn(),
  };
});

const server = setupServer();

describe('http session unauthorized interceptor', () => {
  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'error' });
  });

  afterEach(() => {
    server.resetHandlers();
    vi.mocked(notifySessionUnauthorized).mockClear();
    sessionStorage.clear();
  });

  afterAll(() => {
    server.close();
  });

  it('kicks on Auth.Unauthorized', async () => {
    sessionStorage.setItem('cdt_session_user', JSON.stringify({ id: 1 }));
    server.use(
      http.get('http://localhost/api/v1/auth/me', () => (
        HttpResponse.json(
          { code: 'Auth.Unauthorized', message: '请先登录。' },
          { status: 401 },
        )
      )),
    );

    await expect(client.get('/auth/me')).rejects.toBeDefined();
    expect(notifySessionUnauthorized).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem('cdt_session_user')).toBeNull();
  });

  it('ignores stale Auth.Unauthorized after auth generation bump', async () => {
    sessionStorage.setItem('cdt_session_user', JSON.stringify({ id: 1 }));
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let requestSeen = false;
    server.use(
      http.get('http://localhost/api/v1/auth/me', async () => {
        requestSeen = true;
        await gate;
        return HttpResponse.json(
          { code: 'Auth.Unauthorized', message: '请先登录。' },
          { status: 401 },
        );
      }),
    );

    const pending = client.get('/auth/me');
    // 等请求已发出并打上世代头后，再模拟 login 递增世代
    await vi.waitFor(() => {
      expect(requestSeen).toBe(true);
    });
    bumpAuthGeneration();
    sessionStorage.setItem(
      'cdt_session_user',
      JSON.stringify({
        id: 1, username: 'admin', role: 'admin', enabled: true,
      }),
    );
    release();

    await expect(pending).rejects.toBeDefined();
    expect(notifySessionUnauthorized).not.toHaveBeenCalled();
    expect(sessionStorage.getItem('cdt_session_user')).not.toBeNull();
    expect(isStaleSessionUnauthorized(await pending.catch((e) => e))).toBe(true);
  });

  it('does not kick on Auth.LoginFailed', async () => {
    sessionStorage.setItem('cdt_session_user', JSON.stringify({ id: 1 }));
    server.use(
      http.post('http://localhost/api/v1/auth/change-password', () => (
        HttpResponse.json(
          { code: 'Auth.LoginFailed', message: '当前密码不正确。' },
          { status: 401 },
        )
      )),
    );

    await expect(client.post('/auth/change-password', {})).rejects.toBeDefined();
    expect(notifySessionUnauthorized).not.toHaveBeenCalled();
    expect(sessionStorage.getItem('cdt_session_user')).not.toBeNull();
  });
});
