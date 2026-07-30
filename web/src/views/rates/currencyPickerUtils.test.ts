import {
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import {
  fetchAllCurrencies,
  formatCurrencyOptionLabel,
  getCodeInitial,
  groupCurrenciesByCodeInitial,
  indexLettersFromGroups,
} from './currencyPickerUtils';

describe('getCodeInitial', () => {
  it('maps letter codes to uppercase initial', () => {
    expect(getCodeInitial('cny')).toBe('C');
    expect(getCodeInitial('EUR')).toBe('E');
  });

  it('maps null/empty code to #', () => {
    expect(getCodeInitial(null)).toBe('#');
    expect(getCodeInitial('')).toBe('#');
    expect(getCodeInitial('   ')).toBe('#');
  });

  it('maps non-letter initial to #', () => {
    expect(getCodeInitial('1ABC')).toBe('#');
    expect(getCodeInitial('_X')).toBe('#');
  });
});

describe('groupCurrenciesByCodeInitial', () => {
  it('orders groups by code initial and sorts within group by full code', () => {
    const groups = groupCurrenciesByCodeInitial([
      { id: 1, name: '美元', code: 'USD' },
      { id: 2, name: '人民币', code: 'CNY' },
      { id: 3, name: '欧元', code: 'EUR' },
      { id: 4, name: '离岸人民币', code: 'CNH' },
    ]);

    expect(groups.map((g) => g.initial)).toEqual(['C', 'E', 'U']);
    expect(groups[0]!.items.map((c) => c.code)).toEqual(['CNH', 'CNY']);
    expect(groups[1]!.items.map((c) => c.code)).toEqual(['EUR']);
    expect(groups[2]!.items.map((c) => c.code)).toEqual(['USD']);
  });

  it('places currencies without code under #', () => {
    const groups = groupCurrenciesByCodeInitial([
      { id: 1, name: '历史币种', code: null },
      { id: 2, name: '人民币', code: 'CNY' },
    ]);

    expect(groups.map((g) => g.initial)).toEqual(['C', '#']);
    expect(groups[1]!.items[0]!.name).toBe('历史币种');
  });

  it('exposes only initials that have data for the index', () => {
    const groups = groupCurrenciesByCodeInitial([
      { id: 1, name: '人民币', code: 'CNY' },
      { id: 2, name: '美元', code: 'USD' },
    ]);
    expect(indexLettersFromGroups(groups)).toEqual(['C', 'U']);
  });
});

describe('formatCurrencyOptionLabel', () => {
  it('puts code before name', () => {
    expect(formatCurrencyOptionLabel({ id: 1, name: '人民币', code: 'CNY' })).toBe(
      'CNY (人民币)',
    );
    expect(formatCurrencyOptionLabel({ id: 2, name: '历史币种', code: null })).toBe(
      '历史币种',
    );
  });
});

describe('fetchAllCurrencies', () => {
  it('serially loads all pages until total is reached', async () => {
    const listPage = vi
      .fn()
      .mockResolvedValueOnce({
        items: [
          { id: 1, name: 'A', code: 'AAA' },
          { id: 2, name: 'B', code: 'BBB' },
        ],
        total: 3,
      })
      .mockResolvedValueOnce({
        items: [{ id: 3, name: 'C', code: 'CCC' }],
        total: 3,
      });

    const all = await fetchAllCurrencies(listPage, 2);

    expect(listPage).toHaveBeenCalledTimes(2);
    expect(listPage).toHaveBeenNthCalledWith(1, 1, 2);
    expect(listPage).toHaveBeenNthCalledWith(2, 2, 2);
    expect(all.map((c) => c.id)).toEqual([1, 2, 3]);
  });

  it('stops when a page returns no items', async () => {
    const listPage = vi.fn().mockResolvedValue({ items: [], total: 10 });
    const all = await fetchAllCurrencies(listPage, 100);
    expect(all).toEqual([]);
    expect(listPage).toHaveBeenCalledTimes(1);
  });
});
