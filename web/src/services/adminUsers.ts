import type { AdminRole, AdminUser } from '@/services/auth';
import { http } from '@/shared/api/http';

export type AdminUserItem = AdminUser & {
  createdAt: string;
  updatedAt: string;
};

export type AdminUserListResponse = {
  items: AdminUserItem[];
  page: number;
  pageSize: number;
  total: number;
};

export async function listAdminUsers(params: {
  q?: string;
  role?: AdminRole;
  enabled?: boolean;
  page?: number;
  pageSize?: number;
}): Promise<AdminUserListResponse> {
  const { data } = await http.get<AdminUserListResponse>('/admin-users', { params });
  return data;
}

export async function createAdminUser(payload: {
  username: string;
  password: string;
  role: AdminRole;
}): Promise<AdminUserItem> {
  const { data } = await http.post<AdminUserItem>('/admin-users', payload);
  return data;
}

export async function updateAdminUser(
  id: number,
  payload: { role?: AdminRole; enabled?: boolean },
): Promise<AdminUserItem> {
  const { data } = await http.patch<AdminUserItem>(`/admin-users/${id}`, payload);
  return data;
}

export async function resetAdminUserPassword(
  id: number,
  password: string,
): Promise<void> {
  await http.post(`/admin-users/${id}/reset-password`, { password });
}
