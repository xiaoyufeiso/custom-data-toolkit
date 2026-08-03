import {
  useEffect, useMemo, useState,
} from 'react';
import {
  Link, useLocation, useNavigate, useRoutes,
} from 'react-router-dom';
import {
  Breadcrumb,
  Button,
  Layout,
  Menu,
  message,
} from 'tendata-ui';
import routes, { AppRouteObject } from '@/router';
import {
  fetchMe, logout, type AdminUser,
} from '@/services/auth';
import LanguageSwitcher from '@/shared/components/languageSwitcher';
import { useTranslate } from '@/shared/hooks';
import { getApiErrorMessage } from '@/shared/utils/apiError';
import styles from './index.module.less';

const { Sider, Header, Content } = Layout;

/**
 * 从自描述路由表中派生出菜单可见项。
 */
const getMenuRoutes = (items: AppRouteObject[]) => items.filter(
  (r) => r.meta?.menu && !r.meta?.hidden && typeof r.path === 'string',
);

type MenuItem = {
  key: string;
  label: React.ReactNode;
  children?: MenuItem[];
};

const AppLayout = () => {
  const element = useRoutes(routes);
  const t = useTranslate();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  const isPublicPage = useMemo(() => {
    const hit = routes.find((r) => typeof r.path === 'string' && r.path === pathname);
    return Boolean(hit?.meta?.public);
  }, [pathname]);

  useEffect(() => {
    if (isPublicPage) return undefined;
    let cancelled = false;
    fetchMe()
      .then((me) => {
        if (!cancelled) setUser(me);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      });
    return () => {
      cancelled = true;
    };
  }, [isPublicPage, pathname]);

  const menuRoutes = useMemo(() => getMenuRoutes(routes), []);

  const menuItems = useMemo(() => {
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
  }, [menuRoutes, t]);

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
    () => menuRoutes
      .filter((route) => {
        const path = route.path as string;
        return pathname === path || pathname.startsWith(`${path}/`);
      })
      .sort((a, b) => String(b.path).length - String(a.path).length)[0],
    [pathname, menuRoutes],
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

  return (
    <Layout className={styles.appLayout}>
      <Header className={styles.header}>
        <div className={styles.headerBrand}>
          <span className={styles.brandMark} aria-hidden>CD</span>
          <span className={styles.brandText}>{t('common.appName')}</span>
        </div>
        <div className={styles.headerActions}>
          <LanguageSwitcher />
          <span className={styles.userName} title={user?.username}>
            {user?.username ?? '—'}
          </span>
          <Button
            type="link"
            loading={loggingOut}
            onClick={() => void onLogout()}
          >
            {t('common.action.logout')}
          </Button>
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
          <Menu
            mode="inline"
            selectedKeys={selectedKeys}
            defaultOpenKeys={menuRoutes
              .filter((r) => r.meta?.group)
              .map((r) => r.meta!.group as string)
              .filter((v, i, a) => a.indexOf(v) === i)}
            items={menuItems}
            className={styles.sideMenu}
          />
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
