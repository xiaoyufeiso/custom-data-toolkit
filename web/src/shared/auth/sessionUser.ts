import type { AdminUser } from '@/services/auth';

const STORAGE_KEY = 'cdt_session_user';

export function getSessionUser(): AdminUser | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AdminUser;
    if (
      typeof parsed?.id !== 'number'
      || typeof parsed?.username !== 'string'
      || (parsed.role !== 'admin' && parsed.role !== 'viewer')
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function setSessionUser(user: AdminUser): void {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(user));
}

export function clearSessionUser(): void {
  sessionStorage.removeItem(STORAGE_KEY);
}
