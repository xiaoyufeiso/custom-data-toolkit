import { http } from '@/shared/api/http';

export type Rate = {
  id: number;
  currencyId: number;
  currencyCode: string | null;
  currencyName: string;
  date: string;
  data: string;
  checked: boolean;
  createTime: string;
  updateTime: string;
};

export type RateListResponse = {
  items: Rate[];
  page: number;
  pageSize: number;
  total: number;
};

export type RateListParams = {
  currencyId?: number;
  code?: string;
  date?: string;
  dateFrom?: string;
  dateTo?: string;
  checked?: boolean;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
};

export type RateCreatePayload = {
  currencyId: number;
  date: string;
  data: string;
  checked?: boolean;
};

export type RateUpdatePayload = {
  data?: string;
  checked?: boolean;
};

export async function listRates(params: RateListParams): Promise<RateListResponse> {
  const { data } = await http.get<RateListResponse>('/rates', { params });
  return data;
}

export async function createRate(payload: RateCreatePayload): Promise<Rate> {
  const { data } = await http.post<Rate>('/rates', payload);
  return data;
}

export async function updateRate(id: number, payload: RateUpdatePayload): Promise<Rate> {
  const { data } = await http.put<Rate>(`/rates/${id}`, payload);
  return data;
}

export async function deleteRate(id: number): Promise<void> {
  await http.delete(`/rates/${id}`);
}
