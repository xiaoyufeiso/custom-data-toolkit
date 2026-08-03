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
  };
});

vi.mock('@tendata-biz-components/biz-table', () => ({
  default: ({
    columns = [],
    dataSource = [],
  }: {
    columns?: Array<{
      key?: string;
      dataIndex?: string;
      render?: (value: unknown, row: Record<string, unknown>) => React.ReactNode;
    }>;
    dataSource?: Array<Record<string, unknown>>;
  }) => (
    <div data-testid="biz-table">
      {dataSource.map((row) => {
        const actions = columns.find((column) => column.key === 'actions');
        return (
          <div key={String(row.id)} data-testid={`row-${String(row.id)}`}>
            <span>{String(row.code)}</span>
            <span>{String(row.name)}</span>
            <span>{String(row.mappingCount)}</span>
            {actions?.render?.(null, row)}
          </div>
        );
      })}
    </div>
  ),
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
    expect(await screen.findByText('country')).toBeInTheDocument();
    expect(screen.getByText('国家')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '新建类型' }));
    await user.type(screen.getByLabelText('类型编码'), 'port');
    await user.type(screen.getByLabelText('类型名称'), '口岸');
    await user.click(screen.getByRole('button', { name: '确定' }));

    await waitFor(() => {
      expect(createPayload).toHaveBeenCalledWith({ code: 'port', name: '口岸' });
    });
  });

  it('blocks disable when API returns HasMappings', async () => {
    const user = userEvent.setup();
    server.use(
      http.get(TYPES_URL, () => HttpResponse.json(listResponse)),
      http.post(`${TYPES_URL}/1/disable`, () => HttpResponse.json(
        { code: 'CustomsDictType.HasMappings', message: '该类型下仍有映射记录，无法停用。' },
        { status: 409 },
      )),
    );

    renderWithProviders(<CustomsDictTypesView />);
    await screen.findByText('country');
    await user.click(screen.getByRole('button', { name: '停用' }));
    await waitFor(() => {
      expect(screen.getByText('country')).toBeInTheDocument();
    });
  });
});
