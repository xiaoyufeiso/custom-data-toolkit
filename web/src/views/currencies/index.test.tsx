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
import CurrenciesView from '@/views/currencies';

vi.mock('tendata-ui', async (importOriginal) => {
  const original = await importOriginal<typeof import('tendata-ui')>();
  return {
    ...original,
    AutoComplete: ({
      onChange,
      onKeyDown,
      onSelect,
      options = [],
      placeholder,
      value,
    }: {
      onChange?: (nextValue: string) => void;
      onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
      onSelect?: (nextValue: string) => void;
      options?: Array<{ key: string; label: React.ReactNode; value: string }>;
      placeholder?: string;
      value?: string;
    }) => (
      <div>
        <input
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange?.(event.target.value)}
          onKeyDown={onKeyDown}
        />
        {options.map((option) => (
          <button
            type="button"
            key={option.key}
            onClick={() => onSelect?.(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
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
    onChange,
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
    onChange?: (pagination: { current?: number; pageSize?: number }) => void;
    onRow?: (row: Record<string, unknown>) => { onClick?: () => void };
    page?: {
      current?: number;
      pageSize?: number;
      total?: number;
      showTotal?: (total: number) => React.ReactNode;
    };
    rowSelection?: {
      columnWidth?: number;
      selectedRowKeys?: React.Key[];
      onChange?: (keys: React.Key[]) => void;
    };
  }) => {
    const nameColumn = columns.find((column) => column.key === 'name');
    const selectedKeys = rowSelection?.selectedRowKeys ?? [];
    return (
      <div
        data-testid="biz-table"
        data-selection-column-width={rowSelection?.columnWidth}
      >
        <div>
          <input
            type="checkbox"
            aria-label="全选当前页"
            checked={dataSource.length > 0 && selectedKeys.length === dataSource.length}
            onChange={(event) => rowSelection?.onChange?.(
              event.target.checked ? dataSource.map((row) => row.id as React.Key) : [],
            )}
          />
          全选当前页
        </div>
        {dataSource.map((row) => {
          const rowProps = onRow?.(row);
          return (
            <div
              key={String(row.id)}
              data-testid={`row-${String(row.id)}`}
              onClick={rowProps?.onClick}
              onKeyDown={undefined}
              role="button"
              tabIndex={0}
            >
              <input
                type="checkbox"
                aria-label={`选择${String(row.name)}`}
                checked={selectedKeys.includes(row.id as React.Key)}
                onClick={(event) => event.stopPropagation()}
                onChange={(event) => rowSelection?.onChange?.(
                  event.target.checked
                    ? [...selectedKeys, row.id as React.Key]
                    : selectedKeys.filter((key) => key !== row.id),
                )}
              />
              {nameColumn?.render
                ? nameColumn.render(row.name, row)
                : <span>{String(row.name)}</span>}
              <span>{String(row.code ?? '—')}</span>
            </div>
          );
        })}
        {page?.showTotal?.(page.total ?? 0)}
        {(page?.total ?? 0) > (page?.pageSize ?? 20) ? (
          <button
            type="button"
            onClick={() => onChange?.({
              current: (page?.current ?? 1) + 1,
              pageSize: page?.pageSize,
            })}
          >
            下一页
          </button>
        ) : null}
      </div>
    );
  },
}));

const CURRENCIES_URL = 'http://localhost/api/v1/currencies';
const CURRENCY_SUGGESTIONS_URL = `${CURRENCIES_URL}/suggestions`;

const listResponse = {
  items: [
    { id: 1, name: '人民币', code: 'CNY' },
    { id: 2, name: '美元', code: 'USD' },
  ],
  page: 1,
  pageSize: 20,
  total: 2,
};

describe('CurrenciesView', () => {
  it('renders currencies with BizTable data and library pagination', async () => {
    server.use(
      http.get(CURRENCIES_URL, () => HttpResponse.json(listResponse)),
    );

    renderWithProviders(<CurrenciesView />);

    expect(await screen.findByRole('button', { name: '人民币' })).toBeInTheDocument();
    expect(screen.getByText('CNY')).toBeInTheDocument();
    expect(screen.getByText('共 2 条')).toBeInTheDocument();
    expect(screen.getByText('筛选条件')).toBeInTheDocument();
    expect(screen.getByText('查询列表')).toBeInTheDocument();
    expect(screen.queryByText('批量操作')).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: '批量操作' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '批量删除' })).not.toBeInTheDocument();
    expect(screen.getByTestId('biz-table')).toHaveAttribute(
      'data-selection-column-width',
      '32',
    );
  });

  it('shows case-insensitive prefix suggestions without searching automatically', async () => {
    const user = userEvent.setup();
    let listRequests = 0;
    const suggestionPrefixes: string[] = [];
    server.use(
      http.get(CURRENCIES_URL, () => {
        listRequests += 1;
        return HttpResponse.json(listResponse);
      }),
      http.get(CURRENCY_SUGGESTIONS_URL, ({ request }) => {
        suggestionPrefixes.push(
          new URL(request.url).searchParams.get('prefix') ?? '',
        );
        return HttpResponse.json([
          {
            id: 1,
            name: '人民币',
            code: 'CNY',
            matchField: 'code',
          },
          {
            id: 3,
            name: '离岸人民币',
            code: 'CNH',
            matchField: 'code',
          },
        ]);
      }),
    );

    renderWithProviders(<CurrenciesView />);
    await screen.findByText('人民币');

    const input = screen.getByPlaceholderText('搜索名称或字母代码');
    await user.type(input, 'cn');
    expect(await screen.findByRole('button', { name: 'CNY (人民币)' })).toBeInTheDocument();
    expect(suggestionPrefixes).toContain('cn');
    expect(listRequests).toBe(1);

    await user.click(screen.getByRole('button', { name: 'CNY (人民币)' }));
    expect(input).toHaveValue('CNY');
    expect(listRequests).toBe(1);

    await user.click(input);
    await user.keyboard('{Enter}');
    await waitFor(() => {
      expect(listRequests).toBe(2);
    });
  });

  it('keeps server-side pagination behavior', async () => {
    const user = userEvent.setup();
    const requestedPages: string[] = [];
    server.use(
      http.get(CURRENCIES_URL, ({ request }) => {
        const requestedPage = new URL(request.url).searchParams.get('page') ?? '';
        requestedPages.push(requestedPage);
        return HttpResponse.json({
          items: requestedPage === '2'
            ? [{ id: 21, name: '欧元', code: 'EUR' }]
            : listResponse.items,
          page: Number(requestedPage),
          pageSize: 20,
          total: 21,
        });
      }),
    );

    renderWithProviders(<CurrenciesView />);
    await screen.findByText('人民币');

    await user.click(screen.getByRole('button', { name: '下一页' }));

    expect(await screen.findByText('欧元')).toBeInTheDocument();
    expect(requestedPages).toContain('2');
  });

  it('creates a currency through the modal form', async () => {
    const user = userEvent.setup();
    const createPayload = vi.fn();
    server.use(
      http.get(CURRENCIES_URL, () => HttpResponse.json(listResponse)),
      http.post(CURRENCIES_URL, async ({ request }) => {
        createPayload(await request.json());
        return HttpResponse.json(
          { id: 3, name: '欧元', code: 'EUR' },
          { status: 201 },
        );
      }),
    );

    renderWithProviders(<CurrenciesView />);
    await screen.findByText('人民币');

    await user.click(screen.getByRole('button', { name: '新建货币' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await user.type(screen.getByLabelText('名称'), '欧元');
    await user.type(screen.getByLabelText('字母代码（可选）'), 'eur');
    await user.click(screen.getByRole('button', { name: '保存' }));

    await waitFor(() => {
      expect(createPayload).toHaveBeenCalledWith({
        name: '欧元',
        code: 'EUR',
      });
    });
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('updates a currency through edit modal from detail', async () => {
    const user = userEvent.setup();
    const updatePayload = vi.fn();
    server.use(
      http.get(CURRENCIES_URL, () => HttpResponse.json(listResponse)),
      http.put(`${CURRENCIES_URL}/1`, async ({ request }) => {
        updatePayload(await request.json());
        return HttpResponse.json({ id: 1, name: '人民币新版', code: 'CNY' });
      }),
    );

    renderWithProviders(<CurrenciesView />);
    await user.click(await screen.findByRole('button', { name: '人民币' }));
    expect(await screen.findByTestId('detail-drawer')).toBeInTheDocument();
    expect(screen.getByText('货币详情')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '编辑' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('编辑货币')).toBeInTheDocument();
    const nameInput = screen.getByLabelText('名称');
    await user.clear(nameInput);
    await user.type(nameInput, '人民币新版');
    await user.click(screen.getByRole('button', { name: '保存' }));

    await waitFor(() => {
      expect(updatePayload).toHaveBeenCalledWith({
        name: '人民币新版',
        code: 'CNY',
      });
    });
  });

  it('batch deletes selected currencies only after confirmation', async () => {
    const user = userEvent.setup();
    const deletePayload = vi.fn();
    server.use(
      http.get(CURRENCIES_URL, () => HttpResponse.json(listResponse)),
      http.post(`${CURRENCIES_URL}/batch-delete`, async ({ request }) => {
        deletePayload(await request.json());
        return new HttpResponse(null, { status: 204 });
      }),
    );

    renderWithProviders(<CurrenciesView />);
    await screen.findByText('人民币');

    expect(screen.queryByRole('button', { name: '删除' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: '选择人民币' }));
    await user.click(screen.getByRole('button', { name: '批量删除' }));
    expect(await screen.findByText('确认删除选中的 1 条货币？')).toBeInTheDocument();
    expect(
      screen.getByRole('dialog').closest('.tendata-ui-modal-wrapper'),
    ).toBeInTheDocument();
    expect(screen.getByRole('dialog').querySelector('[role="img"]')).toBeInTheDocument();
    expect(deletePayload).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: '确认' }));
    await waitFor(() => {
      expect(deletePayload).toHaveBeenCalledWith({ ids: [1] });
    });
  });

  it('selects all rows on the current page', async () => {
    const user = userEvent.setup();
    server.use(
      http.get(CURRENCIES_URL, () => HttpResponse.json(listResponse)),
    );

    renderWithProviders(<CurrenciesView />);
    await screen.findByText('人民币');

    await user.click(screen.getByRole('checkbox', { name: '全选当前页' }));

    expect(screen.getByRole('button', { name: '批量删除' })).toBeInTheDocument();
  });

  it('clears current-page selection when pagination changes', async () => {
    const user = userEvent.setup();
    server.use(
      http.get(CURRENCIES_URL, ({ request }) => {
        const requestedPage = new URL(request.url).searchParams.get('page');
        return HttpResponse.json({
          items: requestedPage === '2'
            ? [{ id: 21, name: '欧元', code: 'EUR' }]
            : listResponse.items,
          page: Number(requestedPage),
          pageSize: 20,
          total: 21,
        });
      }),
    );

    renderWithProviders(<CurrenciesView />);
    await screen.findByText('人民币');

    await user.click(screen.getByRole('checkbox', { name: '选择人民币' }));
    expect(screen.getByRole('button', { name: '批量删除' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '下一页' }));

    expect(await screen.findByText('欧元')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '批量删除' })).not.toBeInTheDocument();
  });

  it('returns to the previous page when all rows on the current page are deleted', async () => {
    const user = userEvent.setup();
    const deletePayload = vi.fn();
    let deleted = false;
    server.use(
      http.get(CURRENCIES_URL, ({ request }) => {
        const requestedPage = new URL(request.url).searchParams.get('page');
        return HttpResponse.json({
          items: requestedPage === '2'
            ? [{ id: 21, name: '欧元', code: 'EUR' }]
            : listResponse.items,
          page: Number(requestedPage),
          pageSize: 20,
          total: deleted ? 20 : 21,
        });
      }),
      http.post(`${CURRENCIES_URL}/batch-delete`, async ({ request }) => {
        deletePayload(await request.json());
        deleted = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );

    renderWithProviders(<CurrenciesView />);
    await screen.findByText('人民币');
    await user.click(screen.getByRole('button', { name: '下一页' }));
    await screen.findByText('欧元');

    await user.click(screen.getByRole('checkbox', { name: '选择欧元' }));
    await user.click(screen.getByRole('button', { name: '批量删除' }));
    await user.click(screen.getByRole('button', { name: '确认' }));

    expect(await screen.findByText('人民币')).toBeInTheDocument();
    expect(deletePayload).toHaveBeenCalledWith({ ids: [21] });
  });

  it('clears stale selection and refreshes without partial success', async () => {
    const user = userEvent.setup();
    let listRequests = 0;
    server.use(
      http.get(CURRENCIES_URL, () => {
        listRequests += 1;
        return HttpResponse.json(listResponse);
      }),
      http.post(`${CURRENCIES_URL}/batch-delete`, () => HttpResponse.json(
        {
          code: 'BatchDelete.StaleSelection',
          message: '部分货币已不存在，请刷新列表后重试。',
          details: { missingIds: [1] },
        },
        { status: 409 },
      )),
    );

    renderWithProviders(<CurrenciesView />);
    await screen.findByText('人民币');
    await user.click(screen.getByRole('checkbox', { name: '选择人民币' }));
    await user.click(screen.getByRole('button', { name: '批量删除' }));
    await user.click(screen.getByRole('button', { name: '确认' }));

    await waitFor(() => {
      expect(listRequests).toBeGreaterThan(1);
    });
    expect(screen.queryByRole('button', { name: '批量删除' })).not.toBeInTheDocument();
  });
});
