import { http } from '@/shared/api/http';

export type Currency = {
  id: number;
  name: string;
  code: string | null;
};

export type CurrencyListResponse = {
  items: Currency[];
  page: number;
  pageSize: number;
  total: number;
};

export type CurrencySuggestion = Currency & {
  matchField: 'code' | 'name';
};

export type CurrencyPayload = {
  name: string;
  code?: string | null;
};

export async function listCurrencies(params: {
  q?: string;
  page?: number;
  pageSize?: number;
}): Promise<CurrencyListResponse> {
  const { data } = await http.get<CurrencyListResponse>('/currencies', { params });
  return data;
}

export async function listCurrencySuggestions(
  prefix: string,
  field: 'nameOrCode' | 'code',
  signal?: AbortSignal,
): Promise<CurrencySuggestion[]> {
  const { data } = await http.get<CurrencySuggestion[]>('/currencies/suggestions', {
    params: { prefix, field, limit: 10 },
    signal,
  });
  return data;
}

export async function createCurrency(payload: CurrencyPayload): Promise<Currency> {
  const { data } = await http.post<Currency>('/currencies', payload);
  return data;
}

export async function updateCurrency(
  id: number,
  payload: CurrencyPayload,
): Promise<Currency> {
  const { data } = await http.put<Currency>(`/currencies/${id}`, payload);
  return data;
}

export async function deleteCurrency(id: number): Promise<void> {
  await http.delete(`/currencies/${id}`);
}

export async function batchDeleteCurrencies(ids: number[]): Promise<void> {
  await http.post('/currencies/batch-delete', { ids });
}
