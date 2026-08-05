import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  isAdminOnlyPath,
  isSameAdminUser,
  notifySessionUnauthorized,
  registerSessionGate,
} from '@/shared/auth/sessionGate';
import type { AdminUser } from '@/services/auth';

const admin: AdminUser = {
  id: 1,
  username: 'admin',
  role: 'admin',
  enabled: true,
};

const viewer: AdminUser = {
  id: 8,
  username: 'user',
  role: 'viewer',
  enabled: true,
};

describe('sessionGate', () => {
  afterEach(() => {
    sessionStorage.clear();
    vi.useRealTimers();
  });

  it('compares identity by id/username/role/enabled', () => {
    expect(isSameAdminUser(admin, { ...admin })).toBe(true);
    expect(isSameAdminUser(admin, viewer)).toBe(false);
    expect(isSameAdminUser(admin, { ...admin, role: 'viewer' })).toBe(false);
    expect(isSameAdminUser(null, admin)).toBe(false);
  });

  it('detects admin-only paths', () => {
    expect(isAdminOnlyPath('/audit-logs')).toBe(true);
    expect(isAdminOnlyPath('/admin-users')).toBe(true);
    expect(isAdminOnlyPath('/currencies')).toBe(false);
  });

  it('notifySessionUnauthorized clears cache and calls handler once', () => {
    vi.useFakeTimers();
    sessionStorage.setItem('cdt_session_user', JSON.stringify(admin));
    const onUnauthorized = vi.fn();
    const unregister = registerSessionGate({
      onUnauthorized,
      onSwitched: vi.fn(),
    });

    notifySessionUnauthorized();
    notifySessionUnauthorized();

    expect(onUnauthorized).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem('cdt_session_user')).toBeNull();

    unregister();
    vi.runAllTimers();
  });
});
