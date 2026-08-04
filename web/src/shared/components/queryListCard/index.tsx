import {
  type ReactNode, useEffect, useState,
} from 'react';
import { createPortal } from 'react-dom';
import {
  Card, ConfigProvider, Space,
} from 'tendata-ui';
import { useTranslate } from '@/shared/hooks';
import styles from './index.module.less';

type QueryListCardProps = {
  title: ReactNode;
  actions?: ReactNode;
  selectionCount?: number;
  /** @deprecated 选中文案由组件按 selectionCount 渲染并强调数字 */
  selectionLabel?: ReactNode;
  selectionActions?: ReactNode;
  children: ReactNode;
};

/**
 * 排序列（如汇率日期）常驻 sortOrder 时，Ant 会给 column-sort 单独底色。
 * 将 sort 相关 token 与普通表头/单元格对齐，悬停/选中走同一套样式。
 */
const tableTheme = {
  components: {
    Table: {
      /* 与普通表头/单元格同色，避免 column-sort 单独发灰 */
      headerBg: '#ffffff',
      headerSortActiveBg: '#ffffff',
      fixedHeaderSortActiveBg: '#ffffff',
      bodySortBg: '#ffffff',
      /* 与 BizTable th:hover 一致 */
      headerSortHoverBg: '#e4eeff',
    },
  },
};

/**
 * 查询列表容器：标题行（左标题 + 右行级操作）+ 表格；
 * 选中后批量栏挂到 Layout Content 底部（content 内 footer），不超出该区域。
 */
const QueryListCard = ({
  title,
  actions,
  selectionCount = 0,
  selectionLabel,
  selectionActions,
  children,
}: QueryListCardProps) => {
  const t = useTranslate();
  const [contentRoot, setContentRoot] = useState<Element | null>(null);

  useEffect(() => {
    setContentRoot(document.querySelector('[data-admin-content]'));
  }, []);

  const leading = t('common.batchActions.selectedLeading');
  const trailing = t('common.batchActions.selectedTrailing');

  const defaultSelectionLabel = (
    <>
      {leading ? `${leading} ` : null}
      <strong className={styles.selectionCount}>{selectionCount}</strong>
      {trailing ? ` ${trailing}` : null}
    </>
  );

  const footer = selectionCount > 0 && selectionActions
    ? (
      <div className={styles.selectionFooter} role="region" aria-label="批量操作">
        <span className={styles.selectionLabel}>
          {selectionLabel ?? defaultSelectionLabel}
        </span>
        <Space wrap className={styles.selectionActions}>
          {selectionActions}
        </Space>
      </div>
    )
    : null;

  return (
    <>
      <Card className={styles.card}>
        <div className={styles.header}>
          <strong className={styles.title}>{title}</strong>
          {actions ? <div className={styles.actions}>{actions}</div> : null}
        </div>
        <div className={styles.body}>
          <ConfigProvider theme={tableTheme}>
            {children}
          </ConfigProvider>
        </div>
      </Card>
      {footer && contentRoot ? createPortal(footer, contentRoot) : footer}
    </>
  );
};

export default QueryListCard;
