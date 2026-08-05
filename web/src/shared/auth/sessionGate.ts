import type { AdminUser } from '@/services/auth';
import { clearSessionUser, setSessionUser } from '@/shared/auth/sessionUser';

export type SessionGateHandlers = {
  onUnauthorized: () => void;
  onSwitched: (user: AdminUser) => void;
};

const CHANNEL_NAME = 'cdt-session';

let handlers: SessionGateHandlers | null = null;
let unauthorizedLock = false;

export function isSameAdminUser(a: AdminUser | null, b: AdminUser): boolean {
  if (!a) return false;
  return a.id === b.id && a.username === b.username && a.role === b.role && a.enabled === b.enabled;
}

export function registerSessionGate(next: SessionGateHandlers): () => void {
  handlers = next;
  return () => {
    if (handlers === next) {
      handlers = null;
    }
  };
}

/** Session 失效（含停用清会话）：清本地缓存并通知 UI 踢回登录。 */
export function notifySessionUnauthorized(): void {
  if (unauthorizedLock) return;
  unauthorizedLock = true;
  clearSessionUser();
  handlers?.onUnauthorized();
  window.setTimeout(() => {
    unauthorizedLock = false;
  }, 1500);
}

/** 同浏览器其它标签换了账号：更新缓存并通知 UI 刷新菜单。 */
export function notifySessionSwitched(user: AdminUser): void {
  setSessionUser(user);
  handlers?.onSwitched(user);
}

export function broadcastSessionChanged(): void {
  try {
    const channel = new BroadcastChannel(CHANNEL_NAME);
    channel.postMessage({ type: 'changed', at: Date.now() });
    channel.close();
  } catch {
    // BroadcastChannel 不可用时忽略（仍有 focus/轮询兜底）
  }
}

export function subscribeSessionBroadcast(onChanged: () => void): () => void {
  try {
    const channel = new BroadcastChannel(CHANNEL_NAME);
    channel.onmessage = () => {
      onChanged();
    };
    return () => {
      channel.close();
    };
  } catch {
    return () => {};
  }
}

export function isAdminOnlyPath(pathname: string): boolean {
  return pathname === '/admin-users'
    || pathname.startsWith('/admin-users/')
    || pathname === '/audit-logs'
    || pathname.startsWith('/audit-logs/');
}
