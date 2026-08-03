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
      render?: (value: unknown, row: Record<string, unknown>) => React.ReactNode;
    }>;
    dataSource?: Array<Record<string, unknown>>;
    page?: {
      total?: number;
      showTotal?: (total: number) => React.ReactNode;
    };
  }) => {
    const actionColumn = columns.find((column) => column.key === 'actions');
    return (
      <div data-testid="biz-table">
        {dataSource.map((row) => (
          <div key={`${String(row.dictType)}:${String(row.rawValue)}`}>
            <span>{String(row.rawValue)}</span>
            <span>{String(row.occurrenceCount)}</span>
            {actionColumn?.render?.(undefined, row)}
          </div>
        ))}
        {page?.showTotal?.(page.total ?? 0)}
      </div>
    );
  },
}));

const MISSING_URL = 'http://localhost/api/v1/customs-dict/missing';
const HANDLE_URL = `${MISSING_URL}/handle`;

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
  it('renders missing list with required dictType', async () => {
    let requestedType = '';
    server.use(
      http.get(MISSING_URL, ({ request }) => {
        requestedType = new URL(request.url).searchParams.get('dictType') ?? '';
        return HttpResponse.json(listResponse);
      }),
    );

    renderWithProviders(<CustomsDictMissingView />);

    expect(await screen.findByText('KOR')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('共 1 条')).toBeInTheDocument();
    expect(screen.getByText('缺失字典')).toBeInTheDocument();
    expect(requestedType).toBe('country');
  });

  it('handles a missing item', async () => {
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
    await screen.findByText('KOR');

    await user.click(screen.getByRole('button', { name: '处理' }));
    expect(await screen.findByText('处理缺失')).toBeInTheDocument();

    await user.type(screen.getByLabelText('标准值'), '韩国');
    await user.click(screen.getByRole('button', { name: '保存' }));

    await waitFor(() => {
      expect(handlePayload).toHaveBeenCalledWith({
        dictType: 'country',
        rawValue: 'KOR',
        standardValue: '韩国',
      });
    });
  });
});
