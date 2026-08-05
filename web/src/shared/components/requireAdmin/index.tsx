import { ReactNode, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Spin, message } from 'tendata-ui';
import { fetchMe } from '@/services/auth';
import { useTranslate } from '@/shared/hooks';

type Props = {
  children: ReactNode;
};

const RequireAdmin = ({ children }: Props) => {
  const location = useLocation();
  const t = useTranslate();
  const [state, setState] = useState<'loading' | 'ok' | 'guest' | 'forbidden'>('loading');

  useEffect(() => {
    let cancelled = false;
    setState('loading');
    fetchMe()
      .then((me) => {
        if (cancelled) return;
        if (me.role === 'admin' && me.enabled) {
          setState('ok');
          return;
        }
        setState('forbidden');
        message.error(t('adminUsers.message.forbidden'));
      })
      .catch(() => {
        if (!cancelled) setState('guest');
      });
    return () => {
      cancelled = true;
    };
  }, [location.pathname, t]);

  if (state === 'loading') {
    return (
      <div style={{ padding: 48, textAlign: 'center' }}>
        <Spin />
      </div>
    );
  }

  if (state === 'guest') {
    const redirect = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?redirect=${redirect}`} replace />;
  }

  if (state === 'forbidden') {
    return <Navigate to="/currencies" replace />;
  }

  return children;
};

export default RequireAdmin;
