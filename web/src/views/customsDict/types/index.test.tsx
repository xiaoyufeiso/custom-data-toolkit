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
import CustomsDictTypesView from '@/views/customsDict/types';

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
    rowSelection,
  }: {
    columns?: Array<{
      key?: string;
      dataIndex?: string;
      render?: (value: unknown, row: Record<string, unknown>) => React.ReactNode;
    }>;
    dataSource?: Array<Record<string, unknown>>;
    onRow?: (row: Record<string, unknown>) => { onClick?: () => void };
    rowSelection?: {
      selectedRowKeys?: React.Key[];
      onChange?: (keys: React.Key[]) => void;
    };
  }) => {
    const selectedKeys = rowSelection?.selectedRowKeys ?? [];
    return (
      <div data-testid="biz-table">
        {dataSource.map((row) => {
          const codeColumn = columns.find((column) => column.key === 'code');
          const rowProps = onRow?.(row);
          return (
            <div
              key={String(row.id)}
              data-testid={`row-${String(row.id)}`}
              onClick={rowProps?.onClick}
              role="button"
              tabIndex={0}
            >
              <input
                type="checkbox"
                aria-label={`选择${String(row.code)}`}
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
              {codeColumn?.render
                ? codeColumn.render(row.code, row)
                : <span>{String(row.code)}</span>}
              <span>{String(row.name)}</span>
              <span>{String(row.mappingCount)}</span>
            </div>
          );
        })}
      </div>
    );
  },
}));

const TYPES_URL = 'http://localhost/api/v1/customs-dict/types';

const listResponse = {
  items: [
    {
      id: 1,
      code: 'country',
      name: '国家',
      enabled: true,
      mappingCount: 2,
      createdBy: 1,
      updatedBy: 1,
      createdAt: '2026-08-03T00:00:00Z',
      updatedAt: '2026-08-03T00:00:00Z',
    },
  ],
  page: 1,
  pageSize: 20,
  total: 1,
};

describe('CustomsDictTypesView', () => {
  it('renders type list and creates a type', async () => {
    const user = userEvent.setup();
    const createPayload = vi.fn();
    server.use(
      http.get(TYPES_URL, () => HttpResponse.json(listResponse)),
      http.post(TYPES_URL, async ({ request }) => {
        createPayload(await request.json());
        return HttpResponse.json(
          {
            ...listResponse.items[0],
            id: 2,
            code: 'port',
            name: '口岸',
            mappingCount: 0,
          },
          { status: 201 },
        );
      }),
    );

    renderWithProviders(<CustomsDictTypesView />);
    expect(await screen.findByText('查询列表')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'country' })).toBeInTheDocument();
    expect(screen.getByText('国家')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.queryByText('状态')).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText('状态')).not.toBeInTheDocument();
    expect(screen.queryByText('批量操作')).not.toBeInTheDocument();
    expect(screen.queryByText('已选择 0 项')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '新建类型' }));
    await user.type(screen.getByPlaceholderText('country'), 'port');
    await user.type(screen.getByLabelText('类型名称'), '口岸');
    await user.click(screen.getByRole('button', { name: '保存' }));

    await waitFor(() => {
      expect(createPayload).toHaveBeenCalledWith({ code: 'port', name: '口岸' });
    }, { timeout: 8000 });
  });

  it('opens detail drawer from code link and deletes from detail', async () => {
    const user = userEvent.setup();
    server.use(
      http.get(TYPES_URL, () => HttpResponse.json(listResponse)),
      http.post(`${TYPES_URL}/1/disable`, () => HttpResponse.json(
        { code: 'CustomsDictType.HasMappings', message: '该类型下仍有映射记录，无法删除。' },
        { status: 409 },
      )),
    );

    renderWithProviders(<CustomsDictTypesView />);
    await user.click(await screen.findByRole('button', { name: 'country' }));
    expect(await screen.findByTestId('detail-drawer')).toBeInTheDocument();
    expect(screen.getByText('类型详情')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '删除' }));
    await waitFor(() => {
      expect(screen.getByTestId('detail-drawer')).toBeInTheDocument();
    });
  });

  it('batch deletes selected types and reports HasMappings failures', async () => {
    const user = userEvent.setup();
    const disableHit = vi.fn();
    server.use(
      http.get(TYPES_URL, () => HttpResponse.json({
        ...listResponse,
        items: [
          listResponse.items[0],
          {
            ...listResponse.items[0],
            id: 2,
            code: 'port',
            name: '口岸',
            mappingCount: 0,
          },
        ],
        total: 2,
      })),
      http.post(`${TYPES_URL}/1/disable`, () => {
        disableHit(1);
        return HttpResponse.json(
          { code: 'CustomsDictType.HasMappings', message: '该类型下仍有映射记录，无法停用。' },
          { status: 409 },
        );
      }),
      http.post(`${TYPES_URL}/2/disable`, () => {
        disableHit(2);
        return HttpResponse.json({
          ...listResponse.items[0],
          id: 2,
          code: 'port',
          name: '口岸',
          enabled: false,
          mappingCount: 0,
        });
      }),
    );

    renderWithProviders(<CustomsDictTypesView />);
    await screen.findByRole('button', { name: 'port' });

    await user.click(screen.getByRole('checkbox', { name: '选择country' }));
    await user.click(screen.getByRole('checkbox', { name: '选择port' }));
    expect(screen.getByText('已选择 2 项')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '批量删除' }));

    await waitFor(() => {
      expect(disableHit).toHaveBeenCalledWith(1);
      expect(disableHit).toHaveBeenCalledWith(2);
    });
  });
});
