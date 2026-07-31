import {
  fireEvent,
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { renderWithProviders } from '@/test/utils/render';
import CurrencyPicker from './CurrencyPicker';

const currencies = [
  { id: 1, name: '美元', code: 'USD' },
  { id: 2, name: '人民币', code: 'CNY' },
  { id: 3, name: '历史币种', code: null },
];

const nativeGetComputedStyle = window.getComputedStyle;

beforeEach(() => {
  vi.spyOn(window, 'getComputedStyle').mockImplementation(
    (element) => nativeGetComputedStyle.call(window, element),
  );
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('CurrencyPicker', () => {
  it('renders grouped options and returns the selected currency id', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderWithProviders(
      <CurrencyPicker currencies={currencies} onChange={onChange} />,
    );

    await user.click(screen.getByRole('button', { name: '请选择' }));
    const listbox = await screen.findByRole('listbox', { name: '货币选项' });

    expect(listbox).toHaveTextContent('C');
    expect(listbox).toHaveTextContent('U');
    expect(listbox).toHaveTextContent('#');
    expect(screen.getByRole('button', { name: 'CNY (人民币)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '历史币种' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'CNY (人民币)' }));

    expect(onChange).toHaveBeenCalledWith('2');
    await waitFor(() => {
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
  });

  it('closes the popover when clicking outside', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CurrencyPicker currencies={currencies} />);

    await user.click(screen.getByRole('button', { name: '请选择' }));
    expect(await screen.findByRole('listbox')).toBeInTheDocument();

    await user.click(document.body);

    await waitFor(() => {
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
  });

  it('scrolls to a group from the right-hand index and keeps wheel scrolling available', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CurrencyPicker currencies={currencies} />);

    await user.click(screen.getByRole('button', { name: '请选择' }));
    const listbox = await screen.findByRole('listbox');
    const list = listbox.firstElementChild as HTMLDivElement;
    const usdSection = list.querySelector<HTMLElement>('[data-initial="U"]');
    Object.defineProperty(usdSection, 'offsetTop', {
      configurable: true,
      value: 120,
    });

    await user.click(screen.getByRole('button', { name: 'U' }));
    expect(list.scrollTop).toBe(120);

    const wheelEvent = new WheelEvent('wheel', { deltaY: 100, cancelable: true });
    fireEvent(list, wheelEvent);
    expect(wheelEvent.defaultPrevented).toBe(false);
  });

  it('uses component-library loading and empty states', async () => {
    const user = userEvent.setup();
    const { rerender } = renderWithProviders(
      <CurrencyPicker currencies={[]} loading />,
    );

    expect(screen.getByRole('button', { name: /货币加载中/ })).toBeDisabled();

    rerender(<CurrencyPicker currencies={[]} />);
    await user.click(screen.getByRole('button', { name: '请选择' }));

    expect(await screen.findByText('暂无货币')).toBeInTheDocument();
  });
});
