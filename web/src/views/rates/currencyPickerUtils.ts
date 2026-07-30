import type { Currency } from '@/services/currency';

export type CurrencyLike = Pick<Currency, 'id' | 'name' | 'code'>;

/** Group key: A–Z or `#` (no code / non-letter initial). */
export type InitialKey = string;

export type CurrencyGroup = {
  initial: InitialKey;
  items: CurrencyLike[];
};

export type CurrencyPageResult = {
  items: CurrencyLike[];
  total: number;
};

const PAGE_FETCH_SIZE = 100;

export function getCodeInitial(code: string | null | undefined): InitialKey {
  if (code == null) return '#';
  const trimmed = code.trim();
  if (!trimmed) return '#';
  const first = trimmed[0]!.toUpperCase();
  if (first >= 'A' && first <= 'Z') return first;
  return '#';
}

export function formatCurrencyOptionLabel(currency: CurrencyLike): string {
  return currency.code ? `${currency.code} (${currency.name})` : currency.name;
}

/**
 * Group by code initial; within group sort by full code then name then id.
 * Group order: A–Z then `#`.
 */
export function groupCurrenciesByCodeInitial(currencies: CurrencyLike[]): CurrencyGroup[] {
  const map = new Map<InitialKey, CurrencyLike[]>();
  currencies.forEach((currency) => {
    const key = getCodeInitial(currency.code);
    const bucket = map.get(key);
    if (bucket) {
      bucket.push(currency);
    } else {
      map.set(key, [currency]);
    }
  });

  Array.from(map.values()).forEach((bucket) => {
    bucket.sort((a, b) => {
      const codeA = (a.code ?? '').toUpperCase();
      const codeB = (b.code ?? '').toUpperCase();
      if (codeA !== codeB) return codeA.localeCompare(codeB);
      const nameCmp = a.name.localeCompare(b.name, 'zh');
      if (nameCmp !== 0) return nameCmp;
      return a.id - b.id;
    });
  });

  const keys = Array.from(map.keys()).sort((a, b) => {
    if (a === '#') return 1;
    if (b === '#') return -1;
    return a.localeCompare(b);
  });

  return keys.map((initial) => ({
    initial,
    items: map.get(initial) ?? [],
  }));
}

/** Index letters that have at least one currency (T3). */
export function indexLettersFromGroups(groups: CurrencyGroup[]): InitialKey[] {
  return groups.map((g) => g.initial);
}

/**
 * Serially fetch all currency pages via existing list API (scheme A).
 * Stops on empty page or when accumulated length >= total.
 */
export async function fetchAllCurrencies(
  listPage: (pageNum: number, size: number) => Promise<CurrencyPageResult>,
  pageSize: number = PAGE_FETCH_SIZE,
): Promise<CurrencyLike[]> {
  const all: CurrencyLike[] = [];
  let pageNum = 1;
  let total = Number.POSITIVE_INFINITY;

  while (all.length < total) {
    // Serial page fetch is required (T5); parallel would race and complicate cancel.
    // eslint-disable-next-line no-await-in-loop
    const data = await listPage(pageNum, pageSize);
    const items = data.items ?? [];
    total = typeof data.total === 'number' ? data.total : all.length + items.length;
    if (items.length === 0) break;
    all.push(...items);
    if (all.length >= total) break;
    pageNum += 1;
    if (pageNum > 10_000) break;
  }

  return all;
}
