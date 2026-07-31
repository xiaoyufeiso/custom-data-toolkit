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
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { server } from '@/test/msw/server';
import { renderWithProviders } from '@/test/utils/render';
import RatesView from '@/views/rates';

vi.mock('tendata-ui', async (importOriginal) => {
  const original = await importOriginal<typeof import('tendata-ui')>();
  const { default: dayjs } = await import('dayjs');
  type MockDatePickerProps = {
    id?: string;
    onChange?: (value: ReturnType<typeof dayjs>, dateString: string) => void;
    value?: ReturnType<typeof dayjs> | null;
  };
  const MockDatePicker = Object.assign(
    ({
      id,
      onChange,
      value,
    }: MockDatePickerProps) => (
      <input
        id={id}
        type="date"
        value={value?.format('YYYY-MM-DD') ?? ''}
        onChange={(event) => onChange?.(dayjs(event.target.value), event.target.value)}
      />
    ),
    { RangePicker: () => <div /> },
  );

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
      options?: Array<{ key: number; label: React.ReactNode; value: string }>;
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
    DatePicker: MockDatePicker,
    Select: ({
      allowClear,
      onChange,
      options = [],
      placeholder,
      value: selectedValue,
    }: {
      allowClear?: boolean;
      onChange?: (value?: string) => void;
      options?: Array<{ label: React.ReactNode; value: string }>;
      placeholder?: string;
      value?: string;
    }) => (
      <div>
        <select
          aria-label={placeholder}
          value={selectedValue ?? ''}
          onChange={(event) => onChange?.(event.target.value || undefined)}
        >
          {placeholder ? <option value="">{placeholder}</option> : null}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {allowClear && selectedValue ? (
          <button type="button" onClick={() => onChange?.(undefined)}>
            清除
            {placeholder}
          </button>
        ) : null}
      </div>
    ),
  };
});

vi.mock('@tendata-biz-components/biz-table', () => ({
  default: ({
    columns = [],
    dataSource = [],
    onChange,
    onSortChange,
    page,
    rowSelection,
  }: {
    columns?: Array<{
      dataIndex?: string;
      key?: string;
      render?: (value: unknown, row: Record<string, unknown>) => React.ReactNode;
      sortOrder?: 'ascend' | 'descend';
    }>;
    dataSource?: Array<Record<string, unknown>>;
    onChange?: (pagination: { current?: number; pageSize?: number }) => void;
    onSortChange?: (key: string, order: 'ascend' | 'descend') => void;
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
    const actionColumn = columns.find((column) => column.key === 'actions');
    const checkedColumn = columns.find((column) => column.key === 'checked');
    const dateColumn = columns.find((column) => column.key === 'date');
    const selectedKeys = rowSelection?.selectedRowKeys ?? [];
    return (
      <div
        data-testid="biz-table"
        data-selection-column-width={rowSelection?.columnWidth}
      >
        <input
          type="checkbox"
          aria-label="全选当前页"
          checked={dataSource.length > 0 && selectedKeys.length === dataSource.length}
          onChange={(event) => rowSelection?.onChange?.(
            event.target.checked ? dataSource.map((row) => row.id as React.Key) : [],
          )}
        />
        {dataSource.map((row) => (
          <div key={String(row.id)}>
            <input
              type="checkbox"
              aria-label={`选择${String(row.currencyName)} ${String(row.date)}`}
              checked={selectedKeys.includes(row.id as React.Key)}
              onChange={(event) => rowSelection?.onChange?.(
                event.target.checked
                  ? [...selectedKeys, row.id as React.Key]
                  : selectedKeys.filter((key) => key !== row.id),
              )}
            />
            <span>{String(row.currencyName)}</span>
            <span>{String(row.currencyCode ?? '—')}</span>
            <span>{String(row.date)}</span>
            <span>{String(row.data)}</span>
            {checkedColumn?.render?.(row.checked, row)}
            {actionColumn?.render?.(undefined, row)}
          </div>
        ))}
        {page?.showTotal?.(page.total ?? 0)}
        <button
          type="button"
          onClick={() => onSortChange?.(
            'date',
            dateColumn?.sortOrder === 'ascend' ? 'descend' : 'ascend',
          )}
        >
          日期切换排序
        </button>
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
const RATES_URL = 'http://localhost/api/v1/rates';

const rate = {
  id: 1,
  currencyId: 1,
  currencyCode: 'CNY',
  currencyName: '人民币',
  date: '2026-07-30',
  data: '7.1200',
  checked: true,
  createTime: '2026-07-30T00:00:00Z',
  updateTime: '2026-07-30T00:00:00Z',
};

const listResponse = {
  items: [rate],
  page: 1,
  pageSize: 20,
  total: 1,
};

const nativeGetComputedStyle = window.getComputedStyle;

beforeEach(() => {
  vi.spyOn(window, 'getComputedStyle').mockImplementation(
    (element) => nativeGetComputedStyle.call(window, element),
  );
});

afterEach(() => {
  vi.restoreAllMocks();
});

const useListHandlers = () => {
  server.use(
    http.get(CURRENCIES_URL, () => HttpResponse.json({
      items: [{ id: 1, name: '人民币', code: 'CNY' }],
      page: 1,
      pageSize: 100,
      total: 1,
    })),
    http.get(RATES_URL, () => HttpResponse.json(listResponse)),
  );
};

describe('RatesView', () => {
  it('renders rates with BizTable and library pagination', async () => {
    useListHandlers();

    renderWithProviders(<RatesView />);

    expect(await screen.findByText('人民币')).toBeInTheDocument();
    expect(screen.getByText('CNY')).toBeInTheDocument();
    expect(screen.getByText('7.1200')).toBeInTheDocument();
    expect(screen.getAllByText('已核对').length).toBeGreaterThan(1);
    expect(screen.getByText('共 1 条')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: '全部日期' })).toHaveValue('');
    expect(screen.getByRole('combobox', { name: '全部状态' })).toHaveValue('');
    expect(screen.getByTestId('biz-table')).toHaveAttribute(
      'data-selection-column-width',
      '32',
    );
    expect(
      screen.getByRole('button', { name: '批量删除' }).closest('fieldset'),
    ).toBeDisabled();
  });

  it('clears selected date mode and status through library clear controls', async () => {
    const user = userEvent.setup();
    useListHandlers();
    renderWithProviders(<RatesView />);
    await screen.findByText('人民币');

    const dateMode = screen.getByRole('combobox', { name: '全部日期' });
    await user.selectOptions(dateMode, 'single');
    expect(dateMode).toHaveValue('single');
    await user.click(screen.getByRole('button', { name: '清除全部日期' }));
    expect(dateMode).toHaveValue('');

    const status = screen.getByRole('combobox', { name: '全部状态' });
    await user.selectOptions(status, 'true');
    expect(status).toHaveValue('true');
    await user.click(screen.getByRole('button', { name: '清除全部状态' }));
    expect(status).toHaveValue('');
  });

  it('renders the rate page in English', async () => {
    useListHandlers();

    renderWithProviders(<RatesView />, { locale: 'en' });

    expect(await screen.findByRole('button', { name: 'Create rate' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Currency code (e.g. CNY)')).toBeInTheDocument();
    expect(screen.getByText('1 items')).toBeInTheDocument();
  });

  it('keeps server-side pagination and date sorting behavior', async () => {
    const user = userEvent.setup();
    const requests: URLSearchParams[] = [];
    server.use(
      http.get(CURRENCIES_URL, () => HttpResponse.json({
        items: [],
        page: 1,
        pageSize: 100,
        total: 0,
      })),
      http.get(CURRENCY_SUGGESTIONS_URL, () => HttpResponse.json([])),
      http.get(RATES_URL, ({ request }) => {
        const params = new URL(request.url).searchParams;
        requests.push(params);
        return HttpResponse.json({
          ...listResponse,
          total: 21,
          items: params.get('page') === '2'
            ? [{
              ...rate,
              id: 21,
              currencyName: '美元',
              currencyCode: 'USD',
            }]
            : [rate],
        });
      }),
    );

    renderWithProviders(<RatesView />);
    await screen.findByText('人民币');

    await user.click(screen.getByRole('checkbox', { name: '选择人民币 2026-07-30' }));
    expect(screen.getByRole('button', { name: '批量删除' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '下一页' }));
    expect(await screen.findByText('美元')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '批量删除' })).toBeInTheDocument();

    const sortButton = screen.getByRole('button', { name: '日期切换排序' });
    await user.click(sortButton);
    await waitFor(() => {
      expect(requests.some((params) => params.get('sortOrder') === 'asc')).toBe(true);
    });
    await user.click(sortButton);
    await waitFor(() => {
      expect(requests[requests.length - 1]?.get('sortOrder')).toBe('desc');
    });
  });

  it('keeps the existing code filter request parameter', async () => {
    const user = userEvent.setup();
    const requestedCodes: Array<string | null> = [];
    server.use(
      http.get(CURRENCIES_URL, () => HttpResponse.json({
        items: [],
        page: 1,
        pageSize: 100,
        total: 0,
      })),
      http.get(CURRENCY_SUGGESTIONS_URL, () => HttpResponse.json([])),
      http.get(RATES_URL, ({ request }) => {
        requestedCodes.push(new URL(request.url).searchParams.get('code'));
        return HttpResponse.json(listResponse);
      }),
    );

    renderWithProviders(<RatesView />);
    await screen.findByText('人民币');

    await user.type(screen.getByPlaceholderText('字母代码（如 CNY）'), 'cny');
    await user.click(screen.getByRole('button', { name: '筛选' }));

    await waitFor(() => {
      expect(requestedCodes).toContain('CNY');
    });
  });

  it('resets all filters, sorting, page, and row selection', async () => {
    const user = userEvent.setup();
    const requests: URLSearchParams[] = [];
    server.use(
      http.get(CURRENCIES_URL, () => HttpResponse.json({
        items: [],
        page: 1,
        pageSize: 100,
        total: 0,
      })),
      http.get(CURRENCY_SUGGESTIONS_URL, () => HttpResponse.json([])),
      http.get(RATES_URL, ({ request }) => {
        requests.push(new URL(request.url).searchParams);
        return HttpResponse.json(listResponse);
      }),
    );

    renderWithProviders(<RatesView />);
    await screen.findByText('人民币');

    const codeInput = screen.getByPlaceholderText('字母代码（如 CNY）');
    await user.type(codeInput, 'cny');
    await user.selectOptions(screen.getByRole('combobox', { name: '全部日期' }), 'single');
    await user.selectOptions(screen.getByRole('combobox', { name: '全部状态' }), 'false');
    await user.click(screen.getByRole('button', { name: '筛选' }));
    await user.click(screen.getByRole('checkbox', { name: '选择人民币 2026-07-30' }));

    await user.click(screen.getByRole('button', { name: '重置' }));

    await waitFor(() => {
      const latest = requests[requests.length - 1];
      expect(latest?.get('page')).toBe('1');
      expect(latest?.get('sortOrder')).toBe('desc');
      expect(latest?.has('code')).toBe(false);
      expect(latest?.has('date')).toBe(false);
      expect(latest?.has('checked')).toBe(false);
    });
    expect(codeInput).toHaveValue('');
    expect(screen.getByRole('combobox', { name: '全部日期' })).toHaveValue('');
    expect(screen.getByRole('combobox', { name: '全部状态' })).toHaveValue('');
    expect(screen.getByText('已选择 0 项')).toBeInTheDocument();
  });

  it('suggests code prefixes without filtering until explicitly requested', async () => {
    const user = userEvent.setup();
    let rateListRequests = 0;
    const suggestionRequests: URLSearchParams[] = [];
    server.use(
      http.get(CURRENCIES_URL, () => HttpResponse.json({
        items: [],
        page: 1,
        pageSize: 100,
        total: 0,
      })),
      http.get(CURRENCY_SUGGESTIONS_URL, ({ request }) => {
        suggestionRequests.push(new URL(request.url).searchParams);
        return HttpResponse.json([
          {
            id: 1,
            name: '人民币',
            code: 'CNY',
            matchField: 'code',
          },
          {
            id: 2,
            name: '离岸人民币',
            code: 'CNH',
            matchField: 'code',
          },
        ]);
      }),
      http.get(RATES_URL, () => {
        rateListRequests += 1;
        return HttpResponse.json(listResponse);
      }),
    );

    renderWithProviders(<RatesView />);
    await screen.findByText('人民币');

    const input = screen.getByPlaceholderText('字母代码（如 CNY）');
    await user.type(input, 'cn');
    expect(await screen.findByRole('button', { name: 'CNY (人民币)' })).toBeInTheDocument();
    expect(suggestionRequests.some(
      (params) => params.get('prefix') === 'cn' && params.get('field') === 'code',
    )).toBe(true);
    expect(rateListRequests).toBe(1);

    await user.click(screen.getByRole('button', { name: 'CNY (人民币)' }));
    expect(input).toHaveValue('CNY');
    expect(rateListRequests).toBe(1);

    await user.click(input);
    await user.keyboard('{Enter}');
    await waitFor(() => {
      expect(rateListRequests).toBe(2);
    });
  });

  it('updates a rate through the modal form', async () => {
    const user = userEvent.setup();
    const updatePayload = vi.fn();
    useListHandlers();
    server.use(
      http.put(`${RATES_URL}/1`, async ({ request }) => {
        updatePayload(await request.json());
        return HttpResponse.json({ ...rate, data: '7.1300', checked: false });
      }),
    );

    renderWithProviders(<RatesView />);
    await screen.findByText('人民币');

    await user.click(screen.getByRole('button', { name: '编辑' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    const valueInput = screen.getByLabelText('汇率值');
    await user.clear(valueInput);
    await user.type(valueInput, '7.1300');
    await user.click(screen.getByRole('checkbox', { name: '已核对' }));
    await user.click(screen.getByRole('button', { name: '保存' }));

    await waitFor(() => {
      expect(updatePayload).toHaveBeenCalledWith({
        data: '7.1300',
        checked: false,
      });
    });
  });

  it('creates a rate through the modal form', async () => {
    const user = userEvent.setup();
    const createPayload = vi.fn();
    useListHandlers();
    server.use(
      http.post(RATES_URL, async ({ request }) => {
        createPayload(await request.json());
        return HttpResponse.json(rate, { status: 201 });
      }),
    );

    renderWithProviders(<RatesView />);
    await screen.findByText('人民币');

    await user.click(screen.getByRole('button', { name: '新建汇率' }));
    await user.click(screen.getByRole('button', { name: '请选择' }));
    await user.click(screen.getByRole('button', { name: 'CNY (人民币)' }));
    await user.type(screen.getByLabelText('日期'), '2026-07-30');
    await user.type(screen.getByLabelText('汇率值'), '7.1200');
    await user.click(screen.getByRole('button', { name: '保存' }));

    await waitFor(() => {
      expect(createPayload).toHaveBeenCalledWith({
        currencyId: 1,
        date: '2026-07-30',
        data: '7.1200',
        checked: false,
      });
    });
  });

  it('batch deletes selected rates only after centered confirmation', async () => {
    const user = userEvent.setup();
    const deletePayload = vi.fn();
    useListHandlers();
    server.use(
      http.post(`${RATES_URL}/batch-delete`, async ({ request }) => {
        deletePayload(await request.json());
        return new HttpResponse(null, { status: 204 });
      }),
    );

    renderWithProviders(<RatesView />);
    await screen.findByText('人民币');

    expect(screen.queryByRole('button', { name: '删除' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: '选择人民币 2026-07-30' }));
    await user.click(screen.getByRole('button', { name: '批量删除' }));
    expect(await screen.findByText('确认删除选中的 1 条汇率？')).toBeInTheDocument();
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

  it('batch checks selected rates only after centered confirmation', async () => {
    const user = userEvent.setup();
    const checkPayload = vi.fn();
    useListHandlers();
    server.use(
      http.post(`${RATES_URL}/batch-check`, async ({ request }) => {
        checkPayload(await request.json());
        return new HttpResponse(null, { status: 204 });
      }),
    );

    renderWithProviders(<RatesView />);
    await screen.findByText('人民币');

    expect(screen.getByText('批量操作')).toBeInTheDocument();
    expect(screen.getByText('已选择 0 项')).toBeInTheDocument();
    const batchCheckButton = screen.getByRole('button', { name: '批量核对' });
    expect(batchCheckButton).toBeDisabled();
    expect(screen.queryByRole('checkbox', { name: '清空选择' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('checkbox', { name: '全选本页' }));
    expect(screen.getByText('已选择 1 项')).toBeInTheDocument();
    expect(batchCheckButton).toBeEnabled();
    await user.click(batchCheckButton);
    expect(await screen.findByText('确认核对选中的 1 条汇率？')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(checkPayload).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: '取消' }));
    expect(checkPayload).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: '批量核对' }));
    await user.click(screen.getByRole('button', { name: '确认' }));

    await waitFor(() => {
      expect(checkPayload).toHaveBeenCalledWith({ ids: [1] });
    });
  });

  it('selects all rates on the current page', async () => {
    const user = userEvent.setup();
    server.use(
      http.get(CURRENCIES_URL, () => HttpResponse.json({
        items: [],
        page: 1,
        pageSize: 100,
        total: 0,
      })),
      http.get(RATES_URL, () => HttpResponse.json({
        ...listResponse,
        items: [
          rate,
          {
            ...rate,
            id: 2,
            currencyCode: 'USD',
            currencyName: '美元',
          },
        ],
        total: 2,
      })),
    );

    renderWithProviders(<RatesView />);
    await screen.findByText('人民币');
    await user.click(screen.getByRole('checkbox', { name: '全选当前页' }));

    expect(screen.getByRole('button', { name: '批量删除' })).toBeInTheDocument();
  });

  it('returns to the previous page after deleting the last current-page rate', async () => {
    const user = userEvent.setup();
    const deletePayload = vi.fn();
    let deleted = false;
    server.use(
      http.get(CURRENCIES_URL, () => HttpResponse.json({
        items: [],
        page: 1,
        pageSize: 100,
        total: 0,
      })),
      http.get(RATES_URL, ({ request }) => {
        const requestedPage = new URL(request.url).searchParams.get('page');
        return HttpResponse.json({
          ...listResponse,
          items: requestedPage === '2'
            ? [{
              ...rate,
              id: 21,
              currencyCode: 'USD',
              currencyName: '美元',
            }]
            : [rate],
          page: Number(requestedPage),
          total: deleted ? 20 : 21,
        });
      }),
      http.post(`${RATES_URL}/batch-delete`, async ({ request }) => {
        deletePayload(await request.json());
        deleted = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );

    renderWithProviders(<RatesView />);
    await screen.findByText('人民币');
    await user.click(screen.getByRole('button', { name: '下一页' }));
    await screen.findByText('美元');
    await user.click(screen.getByRole('checkbox', { name: '选择美元 2026-07-30' }));
    await user.click(screen.getByRole('button', { name: '批量删除' }));
    await user.click(screen.getByRole('button', { name: '确认' }));

    expect(await screen.findByText('人民币')).toBeInTheDocument();
    expect(deletePayload).toHaveBeenCalledWith({ ids: [21] });
  });

  it('clears stale rate selection and refreshes the list', async () => {
    const user = userEvent.setup();
    let listRequests = 0;
    server.use(
      http.get(CURRENCIES_URL, () => HttpResponse.json({
        items: [],
        page: 1,
        pageSize: 100,
        total: 0,
      })),
      http.get(RATES_URL, () => {
        listRequests += 1;
        return HttpResponse.json(listResponse);
      }),
      http.post(`${RATES_URL}/batch-delete`, () => HttpResponse.json(
        {
          code: 'BatchDelete.StaleSelection',
          message: '部分汇率已不存在，本次未删除任何汇率，请刷新列表后重试。',
          details: { missingIds: [1] },
        },
        { status: 409 },
      )),
    );

    renderWithProviders(<RatesView />);
    await screen.findByText('人民币');
    await user.click(screen.getByRole('checkbox', { name: '选择人民币 2026-07-30' }));
    await user.click(screen.getByRole('button', { name: '批量删除' }));
    await user.click(screen.getByRole('button', { name: '确认' }));

    await waitFor(() => {
      expect(listRequests).toBeGreaterThan(1);
    });
    expect(screen.getByRole('button', { name: '批量删除' })).toBeInTheDocument();
  });

  it('clears stale batch-check selection and refreshes the list', async () => {
    const user = userEvent.setup();
    let listRequests = 0;
    server.use(
      http.get(CURRENCIES_URL, () => HttpResponse.json({
        items: [],
        page: 1,
        pageSize: 100,
        total: 0,
      })),
      http.get(RATES_URL, () => {
        listRequests += 1;
        return HttpResponse.json(listResponse);
      }),
      http.post(`${RATES_URL}/batch-check`, () => HttpResponse.json(
        {
          code: 'BatchCheck.StaleSelection',
          message: '部分汇率已不存在，本次未核对任何汇率，请刷新列表后重试。',
          details: { missingIds: [1] },
        },
        { status: 409 },
      )),
    );

    renderWithProviders(<RatesView />);
    await screen.findByText('人民币');
    await user.click(screen.getByRole('checkbox', { name: '选择人民币 2026-07-30' }));
    await user.click(screen.getByRole('button', { name: '批量核对' }));
    await user.click(screen.getByRole('button', { name: '确认' }));

    await waitFor(() => {
      expect(listRequests).toBeGreaterThan(1);
    });
    expect(screen.getByText('已选择 0 项')).toBeInTheDocument();
  });
});
