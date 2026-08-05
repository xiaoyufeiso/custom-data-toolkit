import {
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  http,
  HttpResponse,
} from 'msw';
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { server } from '@/test/msw/server';
import { renderWithProviders } from '@/test/utils/render';
import AdminUsersView from '@/views/adminUsers';

vi.mock('@/services/auth', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/services/auth')>();
  return {
    ...original,
    fetchMe: vi.fn(async () => ({
      id: 1,
      username: 'admin',
      role: 'admin' as const,
      enabled: true,
    })),
  };
});

vi.mock('tendata-ui', async (importOriginal) => {
  const original = await importOriginal<typeof import('tendata-ui')>();
  return {
    ...original,
    Select: ({
      onChange,
      options = [],
      placeholder,
      value,
    }: {
      onChange?: (nextValue: string) => void;
      options?: Array<{ label: React.ReactNode; value: string }>;
      placeholder?: string;
      value?: string;
    }) => (
      <select
        aria-label={placeholder}
        value={value ?? ''}
        onChange={(event) => onChange?.(event.target.value)}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={String(option.value)} value={String(option.value)}>
            {option.label}
          </option>
        ))}
      </select>
    ),
    Drawer: ({
      open,
      title,
      onClose,
      children,
    }: {
      open?: boolean;
      title?: React.ReactNode;
      onClose?: () => void;
      children?: React.ReactNode;
    }) => (open ? (
      <div data-testid="detail-drawer">
        <div>{title}</div>
        <button type="button" onClick={onClose}>关闭</button>
        {children}
      </div>
    ) : null),
  };
});

vi.mock('@tendata-biz-components/biz-table', () => ({
  default: ({
    columns = [],
    dataSource = [],
    onRow,
    page,
  }: {
    columns?: Array<{
      key?: string;
      render?: (value: unknown, row: Record<string, unknown>) => React.ReactNode;
    }>;
    dataSource?: Array<Record<string, unknown>>;
    onRow?: (row: Record<string, unknown>) => { onClick?: () => void };
    page?: {
      total?: number;
      showTotal?: (total: number) => React.ReactNode;
    };
  }) => (
    <div data-testid="biz-table">
      {dataSource.map((row) => {
        const usernameColumn = columns.find((column) => column.key === 'username');
        const rowProps = onRow?.(row);
        return (
          <div
            key={String(row.id)}
            data-testid={`row-${String(row.username)}`}
            onClick={rowProps?.onClick}
            role="button"
            tabIndex={0}
          >
            {usernameColumn?.render
              ? usernameColumn.render(row.username, row)
              : <span>{String(row.username)}</span>}
            <span>{String(row.role)}</span>
          </div>
        );
      })}
      {page?.showTotal?.(page.total ?? 0)}
    </div>
  ),
}));

const USERS_URL = 'http://localhost/api/v1/admin-users';

const listResponse = {
  items: [
    {
      id: 1,
      username: 'admin',
      role: 'admin',
      enabled: true,
      createdAt: '2026-08-04T00:00:00Z',
      updatedAt: '2026-08-04T00:00:00Z',
    },
  ],
  page: 1,
  pageSize: 20,
  total: 1,
};

describe('AdminUsersView', () => {
  beforeEach(() => {
    server.use(
      http.get(USERS_URL, () => HttpResponse.json(listResponse)),
    );
  });

  it('renders user list and opens detail', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AdminUsersView />);

    expect(await screen.findByText('查询列表')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'admin' })).toBeInTheDocument();
    expect(screen.getByText('共 1 条')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'admin' }));
    expect(await screen.findByTestId('detail-drawer')).toBeInTheDocument();
    expect(screen.getByText('用户详情')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '编辑' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '重置密码' })).toBeInTheDocument();
  });

  it('creates a user from modal', async () => {
    const user = userEvent.setup();
    const createPayload = vi.fn();
    server.use(
      http.post(USERS_URL, async ({ request }) => {
        createPayload(await request.json());
        return HttpResponse.json({
          id: 2,
          username: 'op1',
          role: 'viewer',
          enabled: true,
          createdAt: '2026-08-04T00:00:00Z',
          updatedAt: '2026-08-04T00:00:00Z',
        }, { status: 201 });
      }),
    );

    renderWithProviders(<AdminUsersView />);
    await screen.findByRole('button', { name: 'admin' });
    await user.click(screen.getByRole('button', { name: '新建用户' }));
    expect(await screen.findByLabelText('用户名')).toBeInTheDocument();

    await user.type(screen.getByLabelText('用户名'), 'op1');
    await user.type(screen.getByLabelText('密码'), 'password1');
    await user.click(screen.getByRole('button', { name: '保存' }));

    await waitFor(() => {
      expect(createPayload).toHaveBeenCalledWith({
        username: 'op1',
        password: 'password1',
        role: 'viewer',
      });
    });
  });
});
