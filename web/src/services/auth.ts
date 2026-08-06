import { http } from '@/shared/api/http';
import { bumpAuthGeneration } from '@/shared/auth/authGeneration';
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
  bumpAuthGeneration();
  setSessionUser(data);
  broadcastSessionChanged();
  return data;
}

export async function fetchMe(signal?: AbortSignal): Promise<AdminUser> {
  const { data } = await http.get<AdminUser>('/auth/me', { signal });
  setSessionUser(data);
  return data;
}

export async function logout(): Promise<void> {
  try {
    await http.post('/auth/logout');
  } finally {
    bumpAuthGeneration();
    clearSessionUser();
    broadcastSessionChanged();
  }
}
