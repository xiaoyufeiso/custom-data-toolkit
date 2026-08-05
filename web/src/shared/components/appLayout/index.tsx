import {
  useEffect, useMemo, useState,
} from 'react';
import {
  Link, useLocation, useNavigate, useRoutes,
} from 'react-router-dom';
import { AccountOutlined as IconUser } from '@tendata-ui/icon';
import {
  Breadcrumb,
  Dropdown,
  Layout,
  Menu,
  message,
} from 'tendata-ui';
import routes, { AppRouteObject } from '@/router';
import {
  logout, type AdminRole, type AdminUser,
} from '@/services/auth';
import { getSessionUser } from '@/shared/auth/sessionUser';
import { useSessionGuard } from '@/shared/auth/useSessionGuard';
import LanguageSwitcher from '@/shared/components/languageSwitcher';
import { useTranslate, type TranslateFn } from '@/shared/hooks';
import { getApiErrorMessage } from '@/shared/utils/apiError';
import styles from './index.module.less';

const { Sider, Header, Content } = Layout;

/** 下拉触发器用的实心小三角（非 DownOutlined 长箭头） */
const IconCaret = ({ className }: { className?: string }) => (
  <svg
    className={className}
    width="10"
    height="10"
    viewBox="0 0 1024 1024"
    aria-hidden
    focusable="false"
  >
    <path
      fill="currentColor"
      d="M840.4 300H183.6c-19.7 0-30.7 20.8-18.5 35l328.4 380.8c9.4 10.9 27.5 10.9 37 0L858.9 335c12.2-14.2 1.2-35-18.5-35z"
    />
  </svg>
);

/** tendata-ui Dropdown 类型未暴露 antd 透传 props，运行时可用 */
type UserDropdownProps = {
  trigger?: Array<'click' | 'hover' | 'contextMenu'>;
  placement?: 'topLeft' | 'top' | 'topRight' | 'bottomLeft' | 'bottom' | 'bottomRight';
  /** 相对触发器偏移；负 y 再向上，使浮窗落在分割线上方 */
  align?: { offset?: [number, number] };
  overlayClassName?: string;
  disabled?: boolean;
  menu?: {
    items: Array<{
      key: string;
      label: React.ReactNode;
      disabled?: boolean;
      onClick?: () => void;
    }>;
  };
  children?: React.ReactNode;
};

const UserDropdown = Dropdown as React.FC<UserDropdownProps>;

/**
 * 角色未知时：不展示带 roles 限制的菜单（避免 viewer 闪出「用户管理」）。
 * 角色已知时：按 roles 过滤。
 */
const routeVisibleToRole = (route: AppRouteObject, role: AdminRole | undefined) => {
  const roles = route.meta?.roles;
  if (!roles || roles.length === 0) return true;
  if (role == null) return false;
  return roles.includes(role);
};

/**
 * 从自描述路由表中派生出侧栏菜单可见项。
 */
const getMenuRoutes = (
  items: AppRouteObject[],
  role: AdminRole | undefined,
) => items.filter(
  (r) => (
    r.meta?.menu
    && !r.meta?.hidden
    && typeof r.path === 'string'
    && routeVisibleToRole(r, role)
  ),
);

type MenuItem = {
  key: string;
  label: React.ReactNode;
  children?: MenuItem[];
};

const buildMenuItems = (
  menuRoutes: AppRouteObject[],
  t: TranslateFn,
): MenuItem[] => {
  const groupMap = new Map<string, MenuItem>();
  return menuRoutes.reduce<MenuItem[]>((items, r) => {
    const path = r.path as string;
    const label = (
      <Link to={path}>
        {r.meta?.titleKey ? t(r.meta.titleKey) : path}
      </Link>
    );

    if (r.meta?.group) {
      const groupKey = r.meta.group;
      let groupItem = groupMap.get(groupKey);
      if (!groupItem) {
        groupItem = {
          key: groupKey,
          label: r.meta.groupTitleKey ? t(r.meta.groupTitleKey) : groupKey,
          children: [],
        };
        groupMap.set(groupKey, groupItem);
        items.push(groupItem);
      }
      groupItem.children?.push({ key: path, label });
    } else {
      items.push({ key: path, label });
    }
    return items;
  }, []);
};

const AppLayout = () => {
  const element = useRoutes(routes);
  const t = useTranslate();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  // 登录接口已写入 sessionStorage：首屏按缓存角色渲染，避免菜单闪烁
  const [user, setUser] = useState<AdminUser | null>(() => getSessionUser());
  const [loggingOut, setLoggingOut] = useState(false);

  const isPublicPage = useMemo(() => {
    const hit = routes.find((r) => typeof r.path === 'string' && r.path === pathname);
    return Boolean(hit?.meta?.public);
  }, [pathname]);

  useEffect(() => {
    if (isPublicPage) return;
    const cached = getSessionUser();
    if (cached) {
      setUser(cached);
    }
  }, [isPublicPage, pathname]);

  useSessionGuard({
    enabled: !isPublicPage,
    user,
    setUser,
    pathname,
  });

  const menuRoutes = useMemo(
    () => getMenuRoutes(routes, user?.role),
    [user?.role],
  );

  const menuItems = useMemo(
    () => buildMenuItems(menuRoutes, t),
    [menuRoutes, t],
  );

  /**
   * 受控的菜单选中项：
   * - 根据当前 pathname 做前缀匹配，兼容 /about/detail/xxx 这样的深层路由；
   * - 取最长匹配项，避免嵌套路由下命中更短的父级 key；
   * - 未匹配到时退回第一个菜单项，避免 '/' 根路径 Navigate 瞬间没有高亮。
   */
  const selectedKeys = useMemo(() => {
    const keys = menuRoutes.map((r) => r.path as string);
    const matched = keys
      .filter((key) => pathname === key || pathname.startsWith(`${key}/`))
      .sort((a, b) => b.length - a.length);

    return [matched[0] ?? keys[0]];
  }, [pathname, menuRoutes]);

  const activeRoute = useMemo(
    () => routes
      .filter((route) => {
        const path = route.path;
        return typeof path === 'string'
          && Boolean(route.meta?.titleKey)
          && (pathname === path || pathname.startsWith(`${path}/`));
      })
      .sort((a, b) => String(b.path).length - String(a.path).length)[0],
    [pathname],
  );

  const breadcrumbItems = useMemo(() => {
    const items: Array<{ title: React.ReactNode }> = [
      {
        title: <Link to="/currencies">{t('common.breadcrumb.home')}</Link>,
      },
    ];
    if (activeRoute?.meta?.groupTitleKey) {
      items.push({ title: t(activeRoute.meta.groupTitleKey) });
    }
    if (activeRoute?.meta?.titleKey) {
      items.push({ title: t(activeRoute.meta.titleKey) });
    }
    return items;
  }, [activeRoute, t]);

  const onLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      setUser(null);
      navigate('/login', { replace: true });
    } catch (error) {
      message.error(getApiErrorMessage(error, t('common.logoutFailed')));
    } finally {
      setLoggingOut(false);
    }
  };

  if (isPublicPage) {
    return element;
  }

  const openKeys = menuRoutes
    .filter((r) => r.meta?.group)
    .map((r) => r.meta!.group as string)
    .filter((v, i, a) => a.indexOf(v) === i);

  const userMenuItems: NonNullable<UserDropdownProps['menu']>['items'] = [
    {
      key: 'logout',
      label: t('common.action.logout'),
      disabled: loggingOut,
      onClick: () => {
        void onLogout();
      },
    },
  ];

  return (
    <Layout className={styles.appLayout}>
      <Header className={styles.header}>
        <div className={styles.headerBrand}>
          <span className={styles.brandMark} aria-hidden>CD</span>
          <span className={styles.brandText}>{t('common.appName')}</span>
        </div>
        <div className={styles.headerActions}>
          <LanguageSwitcher />
        </div>
      </Header>
      <Layout className={styles.main}>
        <Sider
          width={240}
          theme="light"
          className={styles.sider}
          breakpoint="lg"
          collapsedWidth={64}
        >
          <div className={styles.siderInner}>
            <Menu
              mode="inline"
              selectedKeys={selectedKeys}
              defaultOpenKeys={openKeys}
              items={menuItems}
              className={styles.sideMenu}
            />
            <div className={styles.siderUser}>
              <UserDropdown
                trigger={['click']}
                placement="topLeft"
                // siderUser padding-top 12px：把浮窗抬到 border-top 分割线上方
                align={{ offset: [0, -16] }}
                overlayClassName={styles.siderUserDropdown}
                disabled={loggingOut}
                menu={{ items: userMenuItems }}
              >
                <button
                  type="button"
                  className={styles.siderUserTrigger}
                  aria-label={user?.username ?? t('common.action.logout')}
                >
                  <IconUser className={styles.siderUserIcon} />
                  <span className={styles.siderUserName} title={user?.username}>
                    {user?.username ?? '—'}
                  </span>
                  <IconCaret className={styles.siderUserCaret} />
                </button>
              </UserDropdown>
            </div>
          </div>
        </Sider>
        <Content className={styles.content} data-admin-content>
          <div className={styles.contentBody}>
            <div className={styles.pageHeading}>
              <Breadcrumb className={styles.breadcrumb} items={breadcrumbItems} />
              {activeRoute?.meta?.titleKey ? (
                <h1 className={styles.pageTitle}>
                  {t(activeRoute.meta.titleKey)}
                </h1>
              ) : null}
            </div>
            {element}
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default AppLayout;
