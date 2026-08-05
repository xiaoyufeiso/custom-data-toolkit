import { http } from '@/shared/api/http';

export type AuditLogItem = {
  id: number;
  actorUserId: number | null;
  actorUsername: string;
  action: string;
  resourceType: string;
  resourceIds: string;
  summary: Record<string, unknown>;
  createdAt: string;
};

export type AuditLogListResponse = {
  items: AuditLogItem[];
  page: number;
  pageSize: number;
  total: number;
};

export async function listAuditLogs(params: {
  actorUsername?: string;
  action?: string;
  resourceType?: string;
  createdFrom?: string;
  createdTo?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}): Promise<AuditLogListResponse> {
  const { data } = await http.get<AuditLogListResponse>('/audit-logs', { params });
  return data;
}

export async function getAuditLog(id: number): Promise<AuditLogItem> {
  const { data } = await http.get<AuditLogItem>(`/audit-logs/${id}`);
  return data;
}
