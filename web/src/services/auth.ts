import { http } from '@/shared/api/http';
import { broadcastSessionChanged } from '@/shared/auth/sessionGate';
import {
  clearSessionUser,
  setSessionUser,
} from '@/shared/auth/sessionUser';

export type AdminRole = 'admin' | 'viewer';

export type AdminUser = {
  id: number;
  username: string;
  role: AdminRole;
  enabled: boolean;
};

export async function fetchCsrf(): Promise<string> {
  const { data } = await http.get<{ csrfToken: string }>('/auth/csrf');
  return data.csrfToken;
}

export async function login(username: string, password: string): Promise<AdminUser> {
  await fetchCsrf();
  const { data } = await http.post<AdminUser>('/auth/login', { username, password });
  setSessionUser(data);
  broadcastSessionChanged();
  return data;
}

export async function fetchMe(): Promise<AdminUser> {
  const { data } = await http.get<AdminUser>('/auth/me');
  setSessionUser(data);
  return data;
}

export async function logout(): Promise<void> {
  try {
    await http.post('/auth/logout');
  } finally {
    clearSessionUser();
    broadcastSessionChanged();
  }
}
