import {
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { renderWithProviders } from '@/test/utils/render';
import LoginView from '@/views/auth';

const loginMock = vi.fn();
const navigateMock = vi.fn();
const messageSuccess = vi.fn();
const messageError = vi.fn();

vi.mock('@/services/auth', () => ({
  login: (...args: unknown[]) => loginMock(...args),
}));

vi.mock('react-router-dom', async (importOriginal) => {
  const original = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...original,
    useNavigate: () => navigateMock,
    useSearchParams: () => [new URLSearchParams('redirect=/rates')],
  };
});

vi.mock('tendata-ui', async (importOriginal) => {
  const original = await importOriginal<typeof import('tendata-ui')>();
  return {
    ...original,
    message: {
      ...original.message,
      success: (...args: unknown[]) => messageSuccess(...args),
      error: (...args: unknown[]) => messageError(...args),
    },
  };
});

describe('LoginView', () => {
  beforeEach(() => {
    loginMock.mockReset();
    navigateMock.mockReset();
    messageSuccess.mockReset();
    messageError.mockReset();
  });

  it('submits credentials, shows success, and redirects', async () => {
    const user = userEvent.setup();
    loginMock.mockResolvedValueOnce({
      id: 1,
      username: 'admin',
      role: 'admin',
      enabled: true,
    });

    renderWithProviders(<LoginView />, { route: '/login?redirect=/rates' });

    expect(screen.getByLabelText('用户名')).toBeInTheDocument();
    expect(screen.getByLabelText('密码')).toBeInTheDocument();

    await user.clear(screen.getByLabelText('用户名'));
    await user.type(screen.getByLabelText('用户名'), 'ops');
    await user.type(screen.getByLabelText('密码'), 'secret-pass');
    await user.click(screen.getByRole('button', { name: '登录' }));

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith('ops', 'secret-pass');
    });
    expect(messageSuccess).toHaveBeenCalledWith('登录成功');
    expect(navigateMock).toHaveBeenCalledWith('/rates', { replace: true });
  });

  it('shows a generic failure message when login fails', async () => {
    const user = userEvent.setup();
    loginMock.mockRejectedValueOnce(new Error('unauthorized'));

    renderWithProviders(<LoginView />);

    await user.type(screen.getByLabelText('密码'), 'wrong');
    await user.click(screen.getByRole('button', { name: '登录' }));

    await waitFor(() => {
      expect(messageError).toHaveBeenCalledWith('登录失败：用户名或密码错误');
    });
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it('renders English copy', () => {
    renderWithProviders(<LoginView />, { locale: 'en' });

    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.getByLabelText('Username')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
  });
});
