import { useMemo } from 'react';
import {
  Link, useLocation, useRoutes,
} from 'react-router-dom';
import { Layout, Menu } from 'tendata-ui';
import routes, { AppRouteObject } from '@/router';
import { useTranslate } from '@/shared/hooks';
import styles from './index.module.less';

const { Sider, Content } = Layout;

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
  const { pathname } = useLocation();

  const isPublicPage = useMemo(() => {
    const hit = routes.find((r) => typeof r.path === 'string' && r.path === pathname);
    return Boolean(hit?.meta?.public);
  }, [pathname]);

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

  if (isPublicPage) {
    return element;
  }

  return (
    <Layout className={styles.appLayout}>
      <Sider
        width={240}
        theme="light"
        className={styles.sider}
        breakpoint="lg"
        collapsedWidth={64}
      >
        <div className={styles.brand}>
          <span className={styles.brandText}>{t('common.appName')}</span>
        </div>
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
      <Layout className={styles.body}>
        <Content className={styles.content} data-admin-content>
          <div className={styles.contentBody}>
            {activeRoute?.meta?.titleKey ? (
              <h1 className={styles.pageTitle}>
                {t(activeRoute.meta.titleKey)}
              </h1>
            ) : null}
            {element}
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default AppLayout;
