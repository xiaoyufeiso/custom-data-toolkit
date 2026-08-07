import {
  useEffect,
  useRef,
  type Dispatch,
  type SetStateAction,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { message } from 'tendata-ui';
import { fetchMe, type AdminUser } from '@/services/auth';
import {
  isAdminOnlyPath,
  isSameAdminUser,
  notifySessionSwitched,
  registerSessionGate,
  subscribeSessionBroadcast,
} from '@/shared/auth/sessionGate';
import { loginPathWithRedirect, DEFAULT_AFTER_LOGIN } from '@/shared/auth/loginRedirect';
import { clearSessionUser } from '@/shared/auth/sessionUser';
import { useTranslate } from '@/shared/hooks';

const POLL_MS = 10_000;

type Options = {
  enabled: boolean;
  user: AdminUser | null;
  setUser: Dispatch<SetStateAction<AdminUser | null>>;
  pathname: string;
};

/**
 * 多标签 Session 同步：
 * - Cookie 已是他人 → Toast「账号已切换」并刷新菜单；非 admin 离开系统管理页
 * - Session 失效（含停用）→ Toast 并踢回登录
 * - focus / visibility / 轮询 / BroadcastChannel 触发重验
 */
export function useSessionGuard({
  enabled,
  user,
  setUser,
  pathname,
}: Options): void {
  const navigate = useNavigate();
  const t = useTranslate();
  const userRef = useRef(user);
  const pathnameRef = useRef(pathname);
  const syncingRef = useRef(false);

  userRef.current = user;
  pathnameRef.current = pathname;

  useEffect(() => {
    if (!enabled) return undefined;

    const controller = new AbortController();

    const kickToLogin = () => {
      clearSessionUser();
      setUser(null);
      message.warning(t('common.session.expired'));
      navigate(
        loginPathWithRedirect(pathnameRef.current || DEFAULT_AFTER_LOGIN),
        { replace: true },
      );
    };

    const applySwitched = (me: AdminUser) => {
      setUser(me);
      message.info(t('common.session.switched'));
      if (me.role !== 'admin' && isAdminOnlyPath(pathnameRef.current)) {
        navigate('/currencies', { replace: true });
      }
    };

    const unregister = registerSessionGate({
      onUnauthorized: kickToLogin,
      onSwitched: applySwitched,
    });

    const sync = async () => {
      if (syncingRef.current) return;
      if (document.visibilityState === 'hidden') return;
      if (controller.signal.aborted) return;
      syncingRef.current = true;
      try {
        const me = await fetchMe(controller.signal);
        if (controller.signal.aborted) return;
        const known = userRef.current;
        if (!isSameAdminUser(known, me)) {
          if (known) {
            notifySessionSwitched(me);
          } else {
            setUser(me);
          }
        } else {
          setUser(me);
        }
      } catch {
        // 取消 / 401 Auth.Unauthorized 由 http 拦截器处理；其它错误不强制踢出
      } finally {
        syncingRef.current = false;
      }
    };

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        void sync();
      }
    };

    void sync();
    const timer = window.setInterval(() => {
      void sync();
    }, POLL_MS);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    const unsubscribeBroadcast = subscribeSessionBroadcast(() => {
      void sync();
    });

    return () => {
      controller.abort();
      unregister();
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
      unsubscribeBroadcast();
    };
  }, [enabled, navigate, setUser, t]);
}
