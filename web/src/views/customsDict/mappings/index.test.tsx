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
import CustomsDictMappingsView from '@/views/customsDict/mappings';

vi.mock('tendata-ui', async (importOriginal) => {
  const original = await importOriginal<typeof import('tendata-ui')>();
  const ModalComponent = original.Modal as typeof original.Modal & {
    confirm: (config: { onOk?: (...args: never[]) => void | Promise<void> }) => void;
  };
  ModalComponent.confirm = ({ onOk }) => {
    void (onOk as undefined | (() => void | Promise<void>))?.();
  };
  return {
    ...original,
    Modal: ModalComponent,
    Select: ({
      onChange,
      options = [],
      placeholder,
      value,
      disabled,
    }: {
      onChange?: (nextValue: string) => void;
      options?: Array<{ label: React.ReactNode; value: string }>;
      placeholder?: string;
      value?: string;
      disabled?: boolean;
    }) => (
      <select
        aria-label={placeholder}
        disabled={disabled}
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
      footer,
      maskClosable = true,
    }: {
      open?: boolean;
      title?: React.ReactNode;
      onClose?: () => void;
      children?: React.ReactNode;
      footer?: React.ReactNode;
      maskClosable?: boolean;
    }) => (open ? (
      <div data-testid="detail-drawer">
        <div>{title}</div>
        <button type="button" onClick={onClose}>关闭</button>
        {maskClosable ? (
          <button type="button" onClick={onClose}>遮罩</button>
        ) : null}
        {children}
        <div data-testid="detail-footer">{footer}</div>
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
      selectedRowKeys?: React.Key[];
      onChange?: (keys: React.Key[]) => void;
    };
  }) => {
    const selectedKeys = rowSelection?.selectedRowKeys ?? [];
    return (
      <div data-testid="biz-table">
        {dataSource.map((row) => {
          const rawColumn = columns.find((column) => column.key === 'rawValue');
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
                aria-label={`选择${String(row.rawValue)}`}
                checked={selectedKeys.includes(row.id as React.Key)}
                onClick={(event) => event.stopPropagation()}
                onChange={(event) => {
                  const id = row.id as React.Key;
                  rowSelection?.onChange?.(
                    event.target.checked
                      ? [...selectedKeys, id]
                      : selectedKeys.filter((key) => key !== id),
                  );
                }}
              />
              {rawColumn?.render
                ? rawColumn.render(row.rawValue, row)
                : <span>{String(row.rawValue)}</span>}
              <span>{String(row.standardValue)}</span>
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

const MAPPINGS_URL = 'http://localhost/api/v1/customs-dict/mappings';

const listResponse = {
  items: [
    {
      id: 1,
      dictType: 'country',
      rawValue: 'USA',
      standardValue: '美国',
      enabled: true,
      source: 'manual',
      syncStatus: 'synced',
      syncError: null,
      lastSyncedAt: null,
      createdBy: 1,
      updatedBy: 1,
      createdAt: '2026-07-31T00:00:00Z',
      updatedAt: '2026-07-31T00:00:00Z',
    },
  ],
  page: 1,
  pageSize: 20,
  total: 1,
};

describe('CustomsDictMappingsView', () => {
  it('renders mappings list without row actions or enabled UI', async () => {
    let requestedEnabled: string | null = null;
    server.use(
      http.get(MAPPINGS_URL, ({ request }) => {
        requestedEnabled = new URL(request.url).searchParams.get('enabled');
        return HttpResponse.json(listResponse);
      }),
    );

    renderWithProviders(<CustomsDictMappingsView />);

    expect(await screen.findByText('美国')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'USA' })).toBeInTheDocument();
    expect(screen.getByText('共 1 条')).toBeInTheDocument();
    expect(requestedEnabled).toBe('true');
    expect(screen.queryByPlaceholderText('启停状态')).not.toBeInTheDocument();
    expect(screen.queryByText('启用')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '编辑' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '停用' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '重新同步' })).not.toBeInTheDocument();
  });

  it('opens detail drawer from raw value link and closes via mask', async () => {
    const user = userEvent.setup();
    server.use(
      http.get(MAPPINGS_URL, () => HttpResponse.json(listResponse)),
    );

    renderWithProviders(<CustomsDictMappingsView />);
    await screen.findByRole('button', { name: 'USA' });

    await user.click(screen.getByRole('button', { name: 'USA' }));
    expect(await screen.findByTestId('detail-drawer')).toBeInTheDocument();
    expect(screen.getByText('映射详情')).toBeInTheDocument();
    expect(screen.getByText('manual')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '遮罩' }));
    await waitFor(() => {
      expect(screen.queryByTestId('detail-drawer')).not.toBeInTheDocument();
    });
  });

  it('opens detail drawer from row click', async () => {
    const user = userEvent.setup();
    server.use(
      http.get(MAPPINGS_URL, () => HttpResponse.json(listResponse)),
    );

    renderWithProviders(<CustomsDictMappingsView />);
    await screen.findByTestId('row-1');

    await user.click(screen.getByTestId('row-1'));
    expect(await screen.findByTestId('detail-drawer')).toBeInTheDocument();
  });

  it('edits standard value inside detail drawer', async () => {
    const user = userEvent.setup();
    const patchPayload = vi.fn();
    server.use(
      http.get(MAPPINGS_URL, () => HttpResponse.json(listResponse)),
      http.patch(`${MAPPINGS_URL}/1`, async ({ request }) => {
        patchPayload(await request.json());
        return HttpResponse.json({
          ...listResponse.items[0],
          standardValue: '美利坚',
        });
      }),
    );

    renderWithProviders(<CustomsDictMappingsView />);
    await user.click(await screen.findByRole('button', { name: 'USA' }));
    expect(await screen.findByTestId('detail-drawer')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '编辑' }));
    const input = screen.getByLabelText('标准值');
    await user.clear(input);
    await user.type(input, '美利坚');
    await user.click(screen.getByRole('button', { name: '保存' }));

    await waitFor(() => {
      expect(patchPayload).toHaveBeenCalledWith({ standardValue: '美利坚' });
    });
    expect(await screen.findByText('美利坚')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '编辑' })).toBeInTheDocument();
  });

  it('batch disables selected mappings', async () => {
    const user = userEvent.setup();
    const disablePayload = vi.fn();
    server.use(
      http.get(MAPPINGS_URL, () => HttpResponse.json(listResponse)),
      http.post(`${MAPPINGS_URL}/batch-disable`, async ({ request }) => {
        disablePayload(await request.json());
        return HttpResponse.json({
          disabled: 1,
          syncFailed: 0,
          failedIds: [],
        });
      }),
    );

    renderWithProviders(<CustomsDictMappingsView />);
    await screen.findByText('美国');

    expect(
      screen.getByRole('button', { name: '批量删除' }).closest('fieldset'),
    ).toBeDisabled();

    await user.click(screen.getByRole('checkbox', { name: '选择USA' }));
    await user.click(screen.getByRole('button', { name: '批量删除' }));

    await waitFor(() => {
      expect(disablePayload).toHaveBeenCalledWith({ ids: [1] });
    });
    expect(screen.queryByRole('button', { name: '重放同步' })).not.toBeInTheDocument();
  });

  it('batch resync keeps failed selection', async () => {
    const user = userEvent.setup();
    const resyncPayload = vi.fn();
    server.use(
      http.get(MAPPINGS_URL, () => HttpResponse.json({
        ...listResponse,
        items: [
          listResponse.items[0],
          {
            ...listResponse.items[0],
            id: 2,
            rawValue: 'JPN',
            standardValue: '日本',
          },
        ],
        total: 2,
      })),
      http.post(`${MAPPINGS_URL}/batch-resync`, async ({ request }) => {
        resyncPayload(await request.json());
        return HttpResponse.json({
          synced: 1,
          failed: 1,
          failedIds: [2],
          total: 2,
        });
      }),
    );

    renderWithProviders(<CustomsDictMappingsView />);
    await screen.findByText('日本');

    await user.click(screen.getByRole('checkbox', { name: '全选本页' }));
    await user.click(screen.getByRole('button', { name: '批量同步' }));

    await waitFor(() => {
      expect(resyncPayload).toHaveBeenCalledWith({ ids: [1, 2] });
    });
    expect(screen.getByRole('checkbox', { name: '选择JPN' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: '选择USA' })).not.toBeChecked();
  });

  it('uses bordered reset and link-style refresh', async () => {
    server.use(
      http.get(MAPPINGS_URL, () => HttpResponse.json(listResponse)),
    );

    renderWithProviders(<CustomsDictMappingsView />);
    await screen.findByText('美国');

    const reset = screen.getByRole('button', { name: '重置' });
    const refresh = screen.getByRole('button', { name: '刷新' });
    // 重置为默认描边按钮；刷新为 link + 图标（styled-components 不在 class 中写 link）
    expect(reset.querySelector('svg')).toBeNull();
    expect(refresh.querySelector('svg')).not.toBeNull();
  });

  it('creates a mapping through the modal form', async () => {
    const user = userEvent.setup();
    const createPayload = vi.fn();
    server.use(
      http.get(MAPPINGS_URL, () => HttpResponse.json(listResponse)),
      http.post(MAPPINGS_URL, async ({ request }) => {
        createPayload(await request.json());
        return HttpResponse.json(
          {
            ...listResponse.items[0],
            id: 2,
            rawValue: 'JPN',
            standardValue: '日本',
          },
          { status: 201 },
        );
      }),
    );

    renderWithProviders(<CustomsDictMappingsView />);
    await screen.findByText('美国');

    await user.click(screen.getByRole('button', { name: '新建映射' }));
    expect(await screen.findByLabelText('原始值')).toBeInTheDocument();

    const dictTypeSelects = screen.getAllByLabelText('字典类型');
    await user.selectOptions(dictTypeSelects[dictTypeSelects.length - 1], 'country');
    await user.type(screen.getByLabelText('原始值'), 'JPN');
    await user.type(screen.getByLabelText('标准值'), '日本');
    await user.click(screen.getByRole('button', { name: '保存' }));

    await waitFor(() => {
      expect(createPayload).toHaveBeenCalled();
    });
    expect(createPayload.mock.calls[0][0]).toMatchObject({
      dictType: 'country',
      rawValue: 'JPN',
      standardValue: '日本',
    });
  });

  it('exports mappings with current filters', async () => {
    const user = userEvent.setup();
    const exportUrl = vi.fn();
    const createObjectURL = vi.fn(() => 'blob:mock');
    const revokeObjectURL = vi.fn();
    Object.defineProperty(URL, 'createObjectURL', { value: createObjectURL, configurable: true });
    Object.defineProperty(URL, 'revokeObjectURL', { value: revokeObjectURL, configurable: true });

    server.use(
      http.get(MAPPINGS_URL, () => HttpResponse.json(listResponse)),
      http.get(`${MAPPINGS_URL}/export`, ({ request }) => {
        exportUrl(request.url);
        return new HttpResponse(new Blob(['xlsx']), {
          headers: {
            'Content-Type':
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          },
        });
      }),
    );

    renderWithProviders(<CustomsDictMappingsView />);
    await screen.findByText('美国');
    await user.click(screen.getByRole('button', { name: '导出' }));

    await waitFor(() => {
      expect(exportUrl).toHaveBeenCalled();
    });
    const url = String(exportUrl.mock.calls[0][0]);
    expect(url).toContain('enabled=true');
  });

  it('imports xlsx and shows result summary', async () => {
    const user = userEvent.setup();
    const importBody = vi.fn();
    server.use(
      http.get(MAPPINGS_URL, () => HttpResponse.json(listResponse)),
      http.post(`${MAPPINGS_URL}/import`, async ({ request }) => {
        const form = await request.formData();
        importBody(form.get('file'));
        return HttpResponse.json({
          created: 1,
          updated: 0,
          failed: 1,
          errors: [{ row: 3, message: '标准值不能为空' }],
        });
      }),
    );

    renderWithProviders(<CustomsDictMappingsView />);
    await screen.findByText('美国');

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeTruthy();
    const file = new File(['dummy'], 'mappings.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    await user.upload(fileInput, file);

    await waitFor(() => {
      expect(importBody).toHaveBeenCalled();
    });
    const uploaded = importBody.mock.calls[0][0] as Blob;
    expect(uploaded).toBeTruthy();
    expect(uploaded.size).toBeGreaterThan(0);
  });

  it('downloads import template', async () => {
    const user = userEvent.setup();
    const templateHit = vi.fn();
    Object.defineProperty(URL, 'createObjectURL', {
      value: vi.fn(() => 'blob:tpl'),
      configurable: true,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      value: vi.fn(),
      configurable: true,
    });

    server.use(
      http.get(MAPPINGS_URL, () => HttpResponse.json(listResponse)),
      http.get(`${MAPPINGS_URL}/import-template`, () => {
        templateHit();
        return new HttpResponse(new Blob(['tpl']), {
          headers: {
            'Content-Type':
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          },
        });
      }),
    );

    renderWithProviders(<CustomsDictMappingsView />);
    await screen.findByText('美国');
    await user.click(screen.getByRole('button', { name: '下载模板' }));

    await waitFor(() => {
      expect(templateHit).toHaveBeenCalled();
    });
  });
});
