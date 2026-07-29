import { http } from '@/shared/api/http';

export type AdminUser = {
  id: number;
  username: string;
};

export async function fetchCsrf(): Promise<string> {
  const { data } = await http.get<{ csrfToken: string }>('/auth/csrf');
  return data.csrfToken;
}

export async function login(username: string, password: string): Promise<AdminUser> {
  await fetchCsrf();
  const { data } = await http.post<AdminUser>('/auth/login', { username, password });
  return data;
}

export async function fetchMe(): Promise<AdminUser> {
  const { data } = await http.get<AdminUser>('/auth/me');
  return data;
}

export async function logout(): Promise<void> {
  await http.post('/auth/logout');
}
