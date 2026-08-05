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
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { server } from '@/test/msw/server';
import { renderWithProviders } from '@/test/utils/render';
import AuditLogsView from '@/views/auditLogs';

vi.mock('tendata-ui', async (importOriginal) => {
  const original = await importOriginal<typeof import('tendata-ui')>();
  return {
    ...original,
    Select: ({
      onChange,
      options = [],
      placeholder,
      value,
      disabled,
    }: {
      onChange?: (nextValue: string | undefined) => void;
      options?: Array<{ label: React.ReactNode; value: string }>;
      placeholder?: string;
      value?: string;
      disabled?: boolean;
    }) => (
      <select
        aria-label={placeholder}
        value={value ?? ''}
        disabled={disabled}
        onChange={(event) => onChange?.(event.target.value || undefined)}
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
    page,
  }: {
    columns?: Array<{
      key?: string;
      dataIndex?: string;
      render?: (value: unknown, row: Record<string, unknown>) => React.ReactNode;
    }>;
    dataSource?: Array<Record<string, unknown>>;
    page?: {
      total?: number;
      showTotal?: (total: number) => React.ReactNode;
    };
  }) => (
    <div data-testid="biz-table">
      {dataSource.map((row) => {
        const actionColumn = columns.find((column) => column.key === 'action');
        return (
          <div key={String(row.id)} data-testid={`row-${String(row.id)}`}>
            <span>{String(row.actorUsername)}</span>
            {actionColumn?.render
              ? actionColumn.render(row.action, row)
              : <span>{String(row.action)}</span>}
          </div>
        );
      })}
      {page?.showTotal?.(page.total ?? 0)}
    </div>
  ),
}));

const AUDIT_URL = 'http://localhost/api/v1/audit-logs';

describe('AuditLogsView', () => {
  it('lists audit logs and opens detail from action label', async () => {
    const user = userEvent.setup();
    server.use(
      http.get(AUDIT_URL, () => HttpResponse.json({
        items: [
          {
            id: 11,
            actorUserId: 1,
            actorUsername: 'admin',
            action: 'currency.batch_delete',
            resourceType: 'currency',
            resourceIds: '1,2,3',
            summary: { count: 3 },
            createdAt: '2026-08-04T08:00:00',
          },
        ],
        page: 1,
        pageSize: 20,
        total: 1,
      })),
    );

    renderWithProviders(<AuditLogsView />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '批量删除货币' })).toBeInTheDocument();
    });
    expect(screen.getByText('admin')).toBeInTheDocument();
    expect(screen.queryByText(/货币\s*·\s*3/)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '批量删除货币' }));
    expect(await screen.findByTestId('detail-drawer')).toBeInTheDocument();
    expect(screen.getByText('1,2,3')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('locks resource type when action selected and filters actions by resource type', async () => {
    const user = userEvent.setup();
    server.use(
      http.get(AUDIT_URL, () => HttpResponse.json({
        items: [],
        page: 1,
        pageSize: 20,
        total: 0,
      })),
    );

    renderWithProviders(<AuditLogsView />);

    const actionSelect = await screen.findByLabelText('操作');
    const resourceSelect = screen.getByLabelText('资源类型');

    await user.selectOptions(resourceSelect, 'rate');
    expect(actionSelect).toHaveTextContent('新建汇率');
    expect(actionSelect).not.toHaveTextContent('新建货币');

    await user.selectOptions(actionSelect, 'rate.create');
    expect(resourceSelect).toBeDisabled();
    expect(resourceSelect).toHaveValue('rate');
  });
});
