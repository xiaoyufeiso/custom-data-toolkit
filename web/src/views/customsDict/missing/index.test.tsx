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
import CustomsDictMissingView from '@/views/customsDict/missing';

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
          <option key={option.value} value={option.value}>
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
      maskClosable = true,
    }: {
      open?: boolean;
      title?: React.ReactNode;
      onClose?: () => void;
      children?: React.ReactNode;
      maskClosable?: boolean;
    }) => (open ? (
      <div data-testid="detail-drawer">
        <div>{title}</div>
        <button type="button" onClick={onClose}>关闭</button>
        {maskClosable ? (
          <button type="button" onClick={onClose}>遮罩</button>
        ) : null}
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
    rowSelection,
  }: {
    columns?: Array<{
      key?: string;
      dataIndex?: string;
      render?: (value: unknown, row: Record<string, unknown>) => React.ReactNode;
    }>;
    dataSource?: Array<Record<string, unknown>>;
    onRow?: (row: Record<string, unknown>) => { onClick?: () => void };
    page?: {
      total?: number;
      showTotal?: (total: number) => React.ReactNode;
    };
    rowSelection?: unknown;
  }) => (
    <div data-testid="biz-table" data-has-selection={rowSelection ? 'yes' : 'no'}>
      {dataSource.map((row) => {
        const rawColumn = columns.find((column) => column.key === 'rawValue');
        const rowProps = onRow?.(row);
        return (
          <div
            key={`${String(row.dictType)}:${String(row.rawValue)}`}
            data-testid={`row-${String(row.rawValue)}`}
            onClick={rowProps?.onClick}
            role="button"
            tabIndex={0}
          >
            {rawColumn?.render
              ? rawColumn.render(row.rawValue, row)
              : <span>{String(row.rawValue)}</span>}
            <span>{String(row.occurrenceCount)}</span>
          </div>
        );
      })}
      {page?.showTotal?.(page.total ?? 0)}
    </div>
  ),
}));

const MISSING_URL = 'http://localhost/api/v1/customs-dict/missing';
const HANDLE_URL = `${MISSING_URL}/handle`;
const TYPES_OPTIONS_URL = 'http://localhost/api/v1/customs-dict/types/options';

const typeOptions = [
  { code: 'country', name: '国家' },
  { code: 'continent', name: '洲' },
];

const listResponse = {
  items: [
    {
      dictType: 'country',
      dictTypeLabel: '国家',
      rawValue: 'KOR',
      occurrenceCount: 12,
    },
  ],
  page: 1,
  pageSize: 20,
  total: 1,
};

describe('CustomsDictMissingView', () => {
  beforeEach(() => {
    server.use(
      http.get(TYPES_OPTIONS_URL, () => HttpResponse.json(typeOptions)),
    );
  });

  it('renders missing list without actions column', async () => {
    let requestedType = '';
    server.use(
      http.get(MISSING_URL, ({ request }) => {
        requestedType = new URL(request.url).searchParams.get('dictType') ?? '';
        return HttpResponse.json(listResponse);
      }),
    );

    renderWithProviders(<CustomsDictMissingView />);

    expect(await screen.findByRole('button', { name: 'KOR' })).toBeInTheDocument();
    expect(screen.getByText('查询列表')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('共 1 条')).toBeInTheDocument();
    expect(screen.getByText('筛选条件')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '导出' })).toBeInTheDocument();
    expect(requestedType).toBe('country');
    expect(screen.queryByRole('button', { name: '处理' })).not.toBeInTheDocument();
    expect(screen.queryByText('批量操作')).not.toBeInTheDocument();
    expect(screen.queryByText('已选择 0 项')).not.toBeInTheDocument();
    expect(screen.getByTestId('biz-table')).toHaveAttribute('data-has-selection', 'no');
  });

  it('uses bordered reset and link-style refresh', async () => {
    server.use(
      http.get(MISSING_URL, () => HttpResponse.json(listResponse)),
    );

    renderWithProviders(<CustomsDictMissingView />);
    await screen.findByRole('button', { name: 'KOR' });

    const reset = screen.getByRole('button', { name: '重置' });
    const refresh = screen.getByRole('button', { name: '刷新' });
    expect(reset.querySelector('svg')).toBeNull();
    expect(refresh.querySelector('svg')).not.toBeNull();
  });

  it('handles a missing item from detail drawer', async () => {
    const user = userEvent.setup();
    const handlePayload = vi.fn();
    server.use(
      http.get(MISSING_URL, () => HttpResponse.json(listResponse)),
      http.post(HANDLE_URL, async ({ request }) => {
        handlePayload(await request.json());
        return HttpResponse.json({
          id: 9,
          dictType: 'country',
          rawValue: 'KOR',
          standardValue: '韩国',
          enabled: true,
          source: 'missing',
          syncStatus: 'synced',
          syncError: null,
          lastSyncedAt: null,
          createdBy: 1,
          updatedBy: 1,
          createdAt: '2026-07-31T00:00:00Z',
          updatedAt: '2026-07-31T00:00:00Z',
        });
      }),
    );

    renderWithProviders(<CustomsDictMissingView />);
    await user.click(await screen.findByRole('button', { name: 'KOR' }));
    expect(await screen.findByTestId('detail-drawer')).toBeInTheDocument();
    expect(screen.getByText('缺失详情')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '处理' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('处理缺失')).toBeInTheDocument();
    await user.type(screen.getByLabelText('标准值'), '韩国');
    await user.click(screen.getByRole('button', { name: '保存' }));

    await waitFor(() => {
      expect(handlePayload).toHaveBeenCalledWith({
        dictType: 'country',
        rawValue: 'KOR',
        standardValue: '韩国',
      });
    });
    await waitFor(() => {
      expect(screen.queryByTestId('detail-drawer')).not.toBeInTheDocument();
    });
  });
});
