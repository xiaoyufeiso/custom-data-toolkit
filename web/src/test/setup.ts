import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import {
  afterAll, afterEach, beforeAll, vi,
} from 'vitest';
import { DEFAULT_LOCALE } from '@/locales';
import { configureAuth } from '@/shared/utils/request';
import useLocaleStore from '@/store/useLocaleStore';
import { TEST_LOGIN_URL } from '@/test/msw/apiBase';
import { server } from '@/test/msw/server';

const ResizeObserverMock = function ResizeObserverMock() {};

ResizeObserverMock.prototype.observe = () => {};
ResizeObserverMock.prototype.unobserve = () => {};
ResizeObserverMock.prototype.disconnect = () => {};

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  value: ResizeObserverMock,
});

Object.defineProperty(window, 'scrollTo', {
  writable: true,
  value: vi.fn(),
});

beforeAll(() => {
  configureAuth({ loginUrl: TEST_LOGIN_URL });
  server.listen({ onUnhandledRequest: 'error' });
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  localStorage.clear();
  useLocaleStore.setState({ locale: DEFAULT_LOCALE });
  document.cookie = 'token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT';
  document.cookie = 'refresh_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT';
});

afterAll(() => {
  server.close();
});
