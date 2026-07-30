import { http } from '@/shared/api/http';

export type ApiKey = {
  id: number;
  name: string;
  keyPrefix: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ApiKeyCreateResponse = ApiKey & {
  key: string;
};

export type ApiKeyCreatePayload = {
  name: string;
};

export type ApiKeyUpdatePayload = {
  name?: string;
  enabled?: boolean;
};

export async function listApiKeys(): Promise<ApiKey[]> {
  const { data } = await http.get<ApiKey[]>('/api-keys');
  return data;
}

export async function createApiKey(
  payload: ApiKeyCreatePayload,
): Promise<ApiKeyCreateResponse> {
  const { data } = await http.post<ApiKeyCreateResponse>('/api-keys', payload);
  return data;
}

export async function updateApiKey(
  id: number,
  payload: ApiKeyUpdatePayload,
): Promise<ApiKey> {
  const { data } = await http.patch<ApiKey>(`/api-keys/${id}`, payload);
  return data;
}

export async function deleteApiKey(id: number): Promise<void> {
  await http.delete(`/api-keys/${id}`);
}
