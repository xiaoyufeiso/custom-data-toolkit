import React, { lazy, Suspense } from 'react';
import { IndexRouteObject, NonIndexRouteObject, Navigate } from 'react-router-dom';
import Loading from '@/shared/components/loading';
import RequireAdmin from '@/shared/components/requireAdmin';
import RequireAuth from '@/shared/components/requireAuth';
import type { MessageId } from '@/shared/hooks';
import type { AdminRole } from '@/services/auth';

export interface RouteMeta {
  titleKey?: MessageId;
  menu?: boolean;
  /** 分组 key，相同 group 的路由会合并为一个可折叠子菜单 */
  group?: string;
  /** 分组显示名称对应的 i18n key */
  groupTitleKey?: MessageId;
  /** 可见角色；缺省表示所有已登录用户 */
  roles?: AdminRole[];
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
const CustomsDictMappings = lazy(() => import('@/pages/customsDict/mappings'));
const CustomsDictMissing = lazy(() => import('@/pages/customsDict/missing'));
const CustomsDictTypes = lazy(() => import('@/pages/customsDict/types'));
const AdminUsers = lazy(() => import('@/pages/adminUsers'));
const AuditLogs = lazy(() => import('@/pages/auditLogs'));

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
  {
    path: '/customs-dict/types',
    element: <RequireAuth>{lazyLoad(CustomsDictTypes)}</RequireAuth>,
    meta: {
      titleKey: 'common.customsDictTypes',
      menu: true,
      group: 'customsDict',
      groupTitleKey: 'common.customsDict',
    },
  },
  {
    path: '/customs-dict/mappings',
    element: <RequireAuth>{lazyLoad(CustomsDictMappings)}</RequireAuth>,
    meta: {
      titleKey: 'common.customsDictMappings',
      menu: true,
      group: 'customsDict',
      groupTitleKey: 'common.customsDict',
    },
  },
  {
    path: '/customs-dict/missing',
    element: <RequireAuth>{lazyLoad(CustomsDictMissing)}</RequireAuth>,
    meta: {
      titleKey: 'common.customsDictMissing',
      menu: true,
      group: 'customsDict',
      groupTitleKey: 'common.customsDict',
    },
  },
  {
    path: '/admin-users',
    element: <RequireAdmin>{lazyLoad(AdminUsers)}</RequireAdmin>,
    meta: {
      titleKey: 'common.adminUsers',
      menu: true,
      group: 'system',
      groupTitleKey: 'common.system',
      roles: ['admin'],
    },
  },
  {
    path: '/audit-logs',
    element: <RequireAdmin>{lazyLoad(AuditLogs)}</RequireAdmin>,
    meta: {
      titleKey: 'common.auditLogs',
      menu: true,
      group: 'system',
      groupTitleKey: 'common.system',
      roles: ['admin'],
    },
  },
  { path: '*', element: <Navigate to="/currencies" replace /> },
];

export default routes;
