import {
  type ReactNode, useEffect, useState,
} from 'react';
import { createPortal } from 'react-dom';
import { Card, Space } from 'tendata-ui';
import styles from './index.module.less';

type QueryListCardProps = {
  title: ReactNode;
  actions?: ReactNode;
  selectionCount?: number;
  selectionLabel?: ReactNode;
  selectionActions?: ReactNode;
  children: ReactNode;
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
  const [contentRoot, setContentRoot] = useState<Element | null>(null);

  useEffect(() => {
    setContentRoot(document.querySelector('[data-admin-content]'));
  }, []);

  const footer = selectionCount > 0 && selectionActions
    ? (
      <div className={styles.selectionFooter} role="region" aria-label="批量操作">
        <span className={styles.selectionLabel}>
          {selectionLabel}
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
        <div className={styles.body}>{children}</div>
      </Card>
      {footer && contentRoot ? createPortal(footer, contentRoot) : footer}
    </>
  );
};

export default QueryListCard;
