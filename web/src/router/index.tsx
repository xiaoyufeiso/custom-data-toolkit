import React, { lazy, Suspense } from 'react';
import { IndexRouteObject, NonIndexRouteObject, Navigate } from 'react-router-dom';
import Loading from '@/shared/components/loading';
import RequireAuth from '@/shared/components/requireAuth';
import type { MessageId } from '@/shared/hooks';

export interface RouteMeta {
  titleKey?: MessageId;
  menu?: boolean;
  /** 分组 key，相同 group 的路由会合并为一个可折叠子菜单 */
  group?: string;
  /** 分组显示名称对应的 i18n key */
  groupTitleKey?: MessageId;
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
const Rates = lazy(() => import('@/pages/rates'));

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
    meta: {
      titleKey: 'common.currencies', menu: true, group: 'rateData', groupTitleKey: 'common.rateData',
    },
  },
  {
    path: '/rates',
    element: <RequireAuth>{lazyLoad(Rates)}</RequireAuth>,
    meta: {
      titleKey: 'common.rates', menu: true, group: 'rateData', groupTitleKey: 'common.rateData',
    },
  },
  { path: '*', element: <Navigate to="/currencies" replace /> },
];

export default routes;
