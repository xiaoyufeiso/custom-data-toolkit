import axios from 'axios';
import { ReactNode, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Spin } from 'tendata-ui';
import { fetchMe } from '@/services/auth';
import { isStaleSessionUnauthorized } from '@/shared/api/http';
import { loginPathWithRedirect } from '@/shared/auth/loginRedirect';

type Props = {
  children: ReactNode;
};

const RequireAuth = ({ children }: Props) => {
  const location = useLocation();
  const [state, setState] = useState<'loading' | 'ok' | 'guest'>('loading');

  useEffect(() => {
    const controller = new AbortController();
    setState('loading');

    const verify = () => {
      fetchMe(controller.signal)
        .then(() => {
          if (!controller.signal.aborted) setState('ok');
        })
        .catch((error: unknown) => {
          if (controller.signal.aborted || axios.isCancel(error)) return;
          if (isStaleSessionUnauthorized(error)) {
            verify();
            return;
          }
          if (!controller.signal.aborted) setState('guest');
        });
    };

    verify();
    return () => {
      controller.abort();
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
    return (
      <Navigate
        to={loginPathWithRedirect(location.pathname, location.search)}
        replace
      />
    );
  }

  return children;
};

export default RequireAuth;
