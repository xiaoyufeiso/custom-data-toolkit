import { http } from '@/shared/api/http';

export type CustomsDictTypeOption = {
  code: string;
  name: string;
};

export type CustomsDictTypeItem = {
  id: number;
  code: string;
  name: string;
  enabled: boolean;
  mappingCount: number;
  createdBy: number | null;
  updatedBy: number | null;
  createdAt: string;
  updatedAt: string;
};

export type CustomsDictTypeListResponse = {
  items: CustomsDictTypeItem[];
  page: number;
  pageSize: number;
  total: number;
};

export type CustomsDictMapping = {
  id: number;
  dictType: string;
  rawValue: string;
  standardValue: string;
  enabled: boolean;
  source: string;
  syncStatus: string;
  syncError: string | null;
  lastSyncedAt: string | null;
  createdBy: number | null;
  updatedBy: number | null;
  createdAt: string;
  updatedAt: string;
};

export type CustomsDictMappingListResponse = {
  items: CustomsDictMapping[];
  page: number;
  pageSize: number;
  total: number;
};

export type CustomsDictMissingItem = {
  dictType: string;
  dictTypeLabel: string;
  rawValue: string;
  occurrenceCount: number;
};

export type CustomsDictMissingListResponse = {
  items: CustomsDictMissingItem[];
  page: number;
  pageSize: number;
  total: number;
};

export type CustomsDictTypeSuggestion = {
  code: string;
  name: string;
  matchField: 'code' | 'name';
};

export type CustomsDictMappingSuggestion = {
  id: number;
  rawValue: string;
  standardValue: string;
  matchField: 'rawValue' | 'standardValue';
};

export type CustomsDictMissingSuggestion = {
  rawValue: string;
  occurrenceCount: number;
};

export async function listCustomsDictMappings(params: {
  dictType?: string;
  q?: string;
  rawValue?: string;
  standardValue?: string;
  enabled?: boolean;
  page?: number;
  pageSize?: number;
}): Promise<CustomsDictMappingListResponse> {
  const { data } = await http.get<CustomsDictMappingListResponse>(
    '/customs-dict/mappings',
    { params },
  );
  return data;
}

export async function listCustomsDictMappingSuggestions(
  prefix: string,
  dictType?: string,
  signal?: AbortSignal,
): Promise<CustomsDictMappingSuggestion[]> {
  const { data } = await http.get<CustomsDictMappingSuggestion[]>(
    '/customs-dict/mappings/suggestions',
    {
      params: { prefix, dictType, limit: 10 },
      signal,
    },
  );
  return data;
}

export async function createCustomsDictMapping(payload: {
  dictType: string;
  rawValue: string;
  standardValue: string;
}): Promise<CustomsDictMapping> {
  const { data } = await http.post<CustomsDictMapping>(
    '/customs-dict/mappings',
    payload,
  );
  return data;
}

export async function updateCustomsDictMapping(
  id: number,
  payload: { standardValue: string; rawValue?: string },
): Promise<CustomsDictMapping> {
  const { data } = await http.patch<CustomsDictMapping>(
    `/customs-dict/mappings/${id}`,
    payload,
  );
  return data;
}

export async function enableCustomsDictMapping(id: number): Promise<CustomsDictMapping> {
  const { data } = await http.post<CustomsDictMapping>(
    `/customs-dict/mappings/${id}/enable`,
  );
  return data;
}

export async function disableCustomsDictMapping(id: number): Promise<CustomsDictMapping> {
  const { data } = await http.post<CustomsDictMapping>(
    `/customs-dict/mappings/${id}/disable`,
  );
  return data;
}

export async function resyncCustomsDictMapping(id: number): Promise<CustomsDictMapping> {
  const { data } = await http.post<CustomsDictMapping>(
    `/customs-dict/mappings/${id}/resync`,
  );
  return data;
}

export async function batchDisableCustomsDictMappings(ids: number[]): Promise<{
  disabled: number;
  syncFailed: number;
  failedIds: number[];
}> {
  const { data } = await http.post<{
    disabled: number;
    syncFailed: number;
    failedIds: number[];
  }>('/customs-dict/mappings/batch-disable', { ids });
  return data;
}

export async function batchResyncCustomsDictMappings(ids: number[]): Promise<{
  synced: number;
  failed: number;
  failedIds: number[];
  total: number;
}> {
  const { data } = await http.post<{
    synced: number;
    failed: number;
    failedIds: number[];
    total: number;
  }>('/customs-dict/mappings/batch-resync', { ids });
  return data;
}

export async function listCustomsDictMissing(params: {
  dictType?: string;
  rawValue?: string;
  page?: number;
  pageSize?: number;
}): Promise<CustomsDictMissingListResponse> {
  const { data } = await http.get<CustomsDictMissingListResponse>(
    '/customs-dict/missing',
    { params },
  );
  return data;
}

export async function listCustomsDictMissingSuggestions(
  params: { dictType?: string; prefix: string },
  signal?: AbortSignal,
): Promise<CustomsDictMissingSuggestion[]> {
  const { data } = await http.get<CustomsDictMissingSuggestion[]>(
    '/customs-dict/missing/suggestions',
    {
      params: { ...params, limit: 10 },
      signal,
    },
  );
  return data;
}

export async function handleCustomsDictMissing(payload: {
  dictType: string;
  rawValue: string;
  standardValue: string;
}): Promise<CustomsDictMapping> {
  const { data } = await http.post<CustomsDictMapping>(
    '/customs-dict/missing/handle',
    payload,
  );
  return data;
}

export async function exportCustomsDictMissing(params: {
  dictType?: string;
  rawValue?: string;
}): Promise<Blob> {
  const { data } = await http.get<Blob>('/customs-dict/missing/export', {
    params,
    responseType: 'blob',
  });
  return data;
}

export type CustomsDictImportResult = {
  created: number;
  updated: number;
  failed: number;
  errors: Array<{ row: number; message: string }>;
};

export async function exportCustomsDictMappings(params: {
  dictType?: string;
  q?: string;
  rawValue?: string;
  standardValue?: string;
  enabled?: boolean;
}): Promise<Blob> {
  const { data } = await http.get<Blob>('/customs-dict/mappings/export', {
    params: {
      ...params,
      enabled: params.enabled ?? true,
    },
    responseType: 'blob',
  });
  return data;
}

export async function downloadCustomsDictImportTemplate(): Promise<Blob> {
  const { data } = await http.get<Blob>('/customs-dict/mappings/import-template', {
    responseType: 'blob',
  });
  return data;
}

export async function importCustomsDictMappings(file: File): Promise<CustomsDictImportResult> {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await http.post<CustomsDictImportResult>(
    '/customs-dict/mappings/import',
    formData,
    {
      // 去掉实例默认 application/json，让浏览器为 FormData 带上 boundary
      headers: { 'Content-Type': undefined },
    },
  );
  return data;
}

export async function listCustomsDictTypeOptions(): Promise<CustomsDictTypeOption[]> {
  const { data } = await http.get<CustomsDictTypeOption[]>('/customs-dict/types/options');
  return data;
}

export async function listCustomsDictTypes(params: {
  enabled?: boolean;
  q?: string;
  page?: number;
  pageSize?: number;
}): Promise<CustomsDictTypeListResponse> {
  const { data } = await http.get<CustomsDictTypeListResponse>('/customs-dict/types', {
    params,
  });
  return data;
}

export async function listCustomsDictTypeSuggestions(
  prefix: string,
  signal?: AbortSignal,
): Promise<CustomsDictTypeSuggestion[]> {
  const { data } = await http.get<CustomsDictTypeSuggestion[]>(
    '/customs-dict/types/suggestions',
    {
      params: { prefix, limit: 10 },
      signal,
    },
  );
  return data;
}

export async function createCustomsDictType(payload: {
  code: string;
  name: string;
}): Promise<CustomsDictTypeItem> {
  const { data } = await http.post<CustomsDictTypeItem>('/customs-dict/types', payload);
  return data;
}

export async function updateCustomsDictType(
  id: number,
  payload: { name: string; code?: string },
): Promise<CustomsDictTypeItem> {
  const { data } = await http.patch<CustomsDictTypeItem>(
    `/customs-dict/types/${id}`,
    payload,
  );
  return data;
}

export async function enableCustomsDictType(id: number): Promise<CustomsDictTypeItem> {
  const { data } = await http.post<CustomsDictTypeItem>(
    `/customs-dict/types/${id}/enable`,
  );
  return data;
}

export async function disableCustomsDictType(id: number): Promise<CustomsDictTypeItem> {
  const { data } = await http.post<CustomsDictTypeItem>(
    `/customs-dict/types/${id}/disable`,
  );
  return data;
}
