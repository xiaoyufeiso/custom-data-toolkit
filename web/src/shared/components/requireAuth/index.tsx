import { ReactNode, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Spin } from 'tendata-ui';
import { fetchMe } from '@/services/auth';

type Props = {
  children: ReactNode;
};

const RequireAuth = ({ children }: Props) => {
  const location = useLocation();
  const [state, setState] = useState<'loading' | 'ok' | 'guest'>('loading');

  useEffect(() => {
    let cancelled = false;
    fetchMe()
      .then(() => {
        if (!cancelled) setState('ok');
      })
      .catch(() => {
        if (!cancelled) setState('guest');
      });
    return () => {
      cancelled = true;
    };
  }, [location.pathname]);

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

  return children;
};

export default RequireAuth;
