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
import { http as client } from '@/shared/api/http';
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
