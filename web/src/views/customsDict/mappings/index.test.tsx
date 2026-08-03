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
  return {
    ...original,
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
  };
});

vi.mock('@tendata-biz-components/biz-table', () => ({
  default: ({
    columns = [],
    dataSource = [],
    onChange,
    page,
  }: {
    columns?: Array<{
      key?: string;
      render?: (value: unknown, row: Record<string, unknown>) => React.ReactNode;
    }>;
    dataSource?: Array<Record<string, unknown>>;
    onChange?: (pagination: { current?: number; pageSize?: number }) => void;
    page?: {
      current?: number;
      pageSize?: number;
      total?: number;
      showTotal?: (total: number) => React.ReactNode;
    };
  }) => {
    const actionColumn = columns.find((column) => column.key === 'actions');
    return (
      <div data-testid="biz-table">
        {dataSource.map((row) => (
          <div key={String(row.id)}>
            <span>{String(row.rawValue)}</span>
            <span>{String(row.standardValue)}</span>
            {actionColumn?.render?.(undefined, row)}
          </div>
        ))}
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
  it('renders mappings list', async () => {
    server.use(
      http.get(MAPPINGS_URL, () => HttpResponse.json(listResponse)),
    );

    renderWithProviders(<CustomsDictMappingsView />);

    expect(await screen.findByText('USA')).toBeInTheDocument();
    expect(screen.getByText('美国')).toBeInTheDocument();
    expect(screen.getByText('共 1 条')).toBeInTheDocument();
    expect(screen.getByText('标准字典')).toBeInTheDocument();
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
    await screen.findByText('USA');

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
});
