import { useMemo } from 'react';
import {
  Link, useLocation, useRoutes,
} from 'react-router-dom';
import { Layout, Menu } from 'tendata-ui';
import routes, { AppRouteObject } from '@/router';
import { useTranslate } from '@/shared/hooks';
import styles from './index.module.less';

const { Header, Sider, Content } = Layout;

/**
 * 从自描述路由表中派生出菜单可见项。
 */
const getMenuRoutes = (items: AppRouteObject[]) => items.filter(
  (r) => r.meta?.menu && !r.meta?.hidden && typeof r.path === 'string',
);

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
    const items: Array<{
      key: string;
      label: React.ReactNode;
      children?: Array<{ key: string; label: React.ReactNode }>;
    }> = [];
    const groupMap = new Map<string, typeof items>();

    for (const r of menuRoutes) {
      const path = r.path as string;
      const label = (
        <Link to={path}>
          {r.meta?.titleKey ? t(r.meta.titleKey) : path}
        </Link>
      );

      if (r.meta?.group) {
        const groupKey = r.meta.group;
        if (!groupMap.has(groupKey)) {
          const groupItem = {
            key: groupKey,
            label: r.meta.groupTitleKey ? t(r.meta.groupTitleKey) : groupKey,
            children: [] as Array<{ key: string; label: React.ReactNode }>,
          };
          groupMap.set(groupKey, [groupItem] as any);
          items.push(groupItem);
        }
        const group = items.find((item) => item.key === groupKey);
        group?.children?.push({ key: path, label });
      } else {
        items.push({ key: path, label });
      }
    }

    return items;
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

  return (
    <Layout className={styles.appLayout}>
      <Header className={styles.header}>
        <div className={styles.brand}>
          {t('common.appName')}
        </div>
        <div className={styles.headerRight}>
          {/* 预留：登录用户名 / 改密 / 退出等 */}
          <div className={styles.userSlot} aria-hidden={isPublicPage} />
        </div>
      </Header>
      <Layout className={styles.body}>
        {!isPublicPage ? (
          <Sider
            width={220}
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
        ) : null}
        <Content className={styles.content}>{element}</Content>
      </Layout>
    </Layout>
  );
};

export default AppLayout;
