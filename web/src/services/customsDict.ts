import { http } from '@/shared/api/http';

export type CustomsDictType = 'country' | 'continent';

export type CustomsDictMapping = {
  id: number;
  dictType: CustomsDictType | string;
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

export async function listCustomsDictMappings(params: {
  dictType?: string;
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
  dictType: string;
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
  dictType: string;
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
