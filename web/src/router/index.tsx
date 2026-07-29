import React, { lazy, Suspense } from 'react';
import { IndexRouteObject, NonIndexRouteObject, Navigate } from 'react-router-dom';
import Loading from '@/shared/components/loading';
import RequireAuth from '@/shared/components/requireAuth';
import type { MessageId } from '@/shared/hooks';

export interface RouteMeta {
  titleKey?: MessageId;
  menu?: boolean;
  icon?: React.ReactNode;
  hidden?: boolean;
  public?: boolean;
}

export type AppRouteObject =
  | (IndexRouteObject & { meta?: RouteMeta })
  | (Omit<NonIndexRouteObject, 'children'> & {
    meta?: RouteMeta;
    children?: AppRouteObject[];
  });

const Login = lazy(() => import('@/pages/login'));
const Currencies = lazy(() => import('@/pages/currencies'));

const lazyLoad = (Component: React.LazyExoticComponent<React.ComponentType>) => (
  <Suspense fallback={<Loading />}>
    <Component />
  </Suspense>
);

const routes: AppRouteObject[] = [
  {
    path: '/login',
    element: lazyLoad(Login),
    meta: { hidden: true, public: true },
  },
  {
    path: '/',
    element: <Navigate to="/currencies" replace />,
    meta: { hidden: true },
  },
  {
    path: '/currencies',
    element: <RequireAuth>{lazyLoad(Currencies)}</RequireAuth>,
    meta: { titleKey: 'common.currencies', menu: true },
  },
  { path: '*', element: <Navigate to="/currencies" replace /> },
];

export default routes;
