import { useMemo } from 'react';
import {
  Link, useLocation, useRoutes,
} from 'react-router-dom';
import { Layout, Menu } from 'tendata-ui';
import routes, { AppRouteObject } from '@/router';
import LanguageSwitcher from '@/shared/components/languageSwitcher';
import { useTranslate } from '@/shared/hooks';
import styles from './index.module.less';

const { Header, Content } = Layout;

/**
 * 从自描述路由表中派生出菜单可见项：
 * - 仅保留 `meta.menu === true` 且未被 `hidden` 的路由；
 * - 暂不处理嵌套菜单，如后续需要再基于 `children` 扩展为 SubMenu。
 */
const getMenuRoutes = (items: AppRouteObject[]) => items.filter(
  (r) => r.meta?.menu && !r.meta?.hidden && typeof r.path === 'string',
);

const AppLayout = () => {
  const element = useRoutes(routes);
  const t = useTranslate();
  const { pathname } = useLocation();

  const menuRoutes = useMemo(() => getMenuRoutes(routes), []);

  const menuItems = useMemo(
    () => menuRoutes.map((r) => ({
      key: r.path as string,
      label: (
        <Link to={r.path as string}>
          {r.meta?.titleKey ? t(r.meta.titleKey) : r.path}
        </Link>
      ),
    })),
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

  return (
    <Layout className={styles.appLayout}>
      <Header className={styles.header}>
        <div className={styles.brand}>
          {t('common.appName')}
        </div>
        <Menu
          theme="dark"
          mode="horizontal"
          selectedKeys={selectedKeys}
          items={menuItems}
          className={styles.menu}
        />
        <LanguageSwitcher />
      </Header>
      <Content>{element}</Content>
    </Layout>
  );
};

export default AppLayout;
