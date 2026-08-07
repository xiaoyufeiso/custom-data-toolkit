import { describe, expect, it } from 'vitest';
import {
  DEFAULT_AFTER_LOGIN,
  loginPathWithRedirect,
  sanitizeLoginRedirect,
} from '@/shared/auth/loginRedirect';

describe('loginRedirect', () => {
  it('defaults empty redirect to currencies', () => {
    expect(sanitizeLoginRedirect(null)).toBe(DEFAULT_AFTER_LOGIN);
    expect(sanitizeLoginRedirect('')).toBe(DEFAULT_AFTER_LOGIN);
  });

  it('rejects self-referential login redirect', () => {
    expect(sanitizeLoginRedirect('/login')).toBe(DEFAULT_AFTER_LOGIN);
    expect(sanitizeLoginRedirect('%2Flogin')).toBe(DEFAULT_AFTER_LOGIN);
  });

  it('keeps valid internal paths', () => {
    expect(sanitizeLoginRedirect('/rates')).toBe('/rates');
    expect(sanitizeLoginRedirect('/customs-dict/types')).toBe('/customs-dict/types');
  });

  it('does not append redirect when already on login page', () => {
    expect(loginPathWithRedirect('/login')).toBe('/login');
    expect(loginPathWithRedirect('/login', '?redirect=%2Flogin')).toBe('/login');
  });

  it('builds login path with safe redirect for protected pages', () => {
    expect(loginPathWithRedirect('/rates')).toBe('/login?redirect=%2Frates');
  });
});
