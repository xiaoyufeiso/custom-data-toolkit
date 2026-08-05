import type { ComponentProps } from 'react';
import {
  useCallback,
  useEffect,
  useState,
} from 'react';
import BizTable from '@tendata-biz-components/biz-table';
import { ReloadOutlined } from '@tendata-ui/icon';
import {
  Button,
  Drawer,
  Input,
  Select,
  Space,
  message,
} from 'tendata-ui';
import {
  listAuditLogs,
  type AuditLogItem,
} from '@/services/auditLogs';
import QueryListCard from '@/shared/components/queryListCard';
import { useTranslate, type MessageId } from '@/shared/hooks';
import listStyles from '@/shared/styles/listPage.module.less';
import { getApiErrorMessage } from '@/shared/utils/apiError';
import { formatDateTime } from '@/shared/utils/formatDateTime';

type ColumnsType = NonNullable<ComponentProps<typeof BizTable>['columns']>;

const DEFAULT_PAGE_SIZE = 20;
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

const ACTION_OPTIONS = [
  'currency.create',
  'currency.update',
  'currency.delete',
  'currency.batch_delete',
  'rate.create',
  'rate.update',
  'rate.delete',
  'rate.batch_delete',
  'rate.batch_check',
  'customs_dict_type.create',
  'customs_dict_type.update',
  'customs_dict_type.enable',
  'customs_dict_type.disable',
  'customs_dict_mapping.create',
  'customs_dict_mapping.update',
  'customs_dict_mapping.enable',
  'customs_dict_mapping.disable',
  'customs_dict_mapping.resync',
  'customs_dict_mapping.batch_disable',
  'customs_dict_mapping.batch_resync',
  'customs_dict_mapping.import',
  'customs_dict_missing.handle',
  'admin_user.create',
  'admin_user.update',
  'admin_user.reset_password',
  'auth.change_password',
] as const;

const RESOURCE_TYPE_OPTIONS = [
  'currency',
  'rate',
  'customs_dict_type',
  'customs_dict_mapping',
  'customs_dict_missing',
  'admin_user',
] as const;

type ActionOption = (typeof ACTION_OPTIONS)[number];
type ResourceTypeOption = (typeof RESOURCE_TYPE_OPTIONS)[number];

/** 操作 → 资源类型（改密归用户信息） */
const resourceTypeOfAction = (action: string): ResourceTypeOption | undefined => {
  if (action === 'auth.change_password') return 'admin_user';
  return RESOURCE_TYPE_OPTIONS.find(
    (resourceType) => action === resourceType || action.startsWith(`${resourceType}.`),
  );
};

const actionsForResourceType = (resourceType: string | undefined): readonly ActionOption[] => {
  if (!resourceType) return ACTION_OPTIONS;
  return ACTION_OPTIONS.filter((action) => resourceTypeOfAction(action) === resourceType);
};

type TimeSortOrder = 'asc' | 'desc';

type FilterDraft = {
  actorUsername: string;
  action?: string;
  resourceType?: string;
  sortOrder?: TimeSortOrder;
};

const emptyFilter: FilterDraft = {
  actorUsername: '',
  action: undefined,
  resourceType: undefined,
  sortOrder: undefined,
};

/** 时间排序三态：默认 → 正序 → 倒序 → 默认 */
const cycleTimeSort = (current?: TimeSortOrder): TimeSortOrder | undefined => {
  if (current === undefined) return 'asc';
  if (current === 'asc') return 'desc';
  return undefined;
};

const actionMessageId = (action: string): MessageId => (
  `auditLogs.action.${action}` as MessageId
);

const resourceTypeMessageId = (resourceType: string): MessageId => (
  `auditLogs.resourceType.${resourceType}` as MessageId
);

const countFromRow = (row: AuditLogItem): number => {
  const summaryCount = row.summary?.count;
  if (typeof summaryCount === 'number') return summaryCount;
  if (!row.resourceIds.trim()) return 0;
  return row.resourceIds.split(',').filter(Boolean).length;
};

/** 从 summary 抽可读对象标签（非敏感） */
const objectLabelFromSummary = (summary: Record<string, unknown>): string | null => {
  const parts: string[] = [];
  if (typeof summary.code === 'string' && summary.code) parts.push(summary.code);
  if (typeof summary.name === 'string' && summary.name) parts.push(summary.name);
  if (typeof summary.rawValue === 'string' && summary.rawValue) parts.push(summary.rawValue);
  if (typeof summary.standardValue === 'string' && summary.standardValue) {
    parts.push(`→ ${summary.standardValue}`);
  }
  if (typeof summary.username === 'string' && summary.username) parts.push(summary.username);
  if (typeof summary.currencyCode === 'string' && summary.currencyCode) {
    parts.push(summary.currencyCode);
  }
  if (typeof summary.date === 'string' && summary.date) parts.push(summary.date);
  if (typeof summary.keyPrefix === 'string' && summary.keyPrefix) {
    parts.push(`${summary.keyPrefix}…`);
  }
  if (parts.length === 0) return null;
  return parts.join(' ');
};

const AuditLogsView = () => {
  const t = useTranslate();
  const [items, setItems] = useState<AuditLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [draft, setDraft] = useState<FilterDraft>(emptyFilter);
  const [applied, setApplied] = useState<FilterDraft>(emptyFilter);
  const [loading, setLoading] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState<AuditLogItem | null>(null);

  const commitFilters = (next: FilterDraft) => {
    setDraft(next);
    setApplied(next);
    setPage(1);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listAuditLogs({
        actorUsername: applied.actorUsername.trim() || undefined,
        action: applied.action,
        resourceType: applied.resourceType,
        sortOrder: applied.sortOrder,
        page,
        pageSize,
      });
      setItems(data.items ?? []);
      setTotal(data.total ?? 0);
    } catch (error) {
      message.error(getApiErrorMessage(error, t('auditLogs.loadFailed')));
    } finally {
      setLoading(false);
    }
  }, [applied, page, pageSize, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const applyTimeSort = (next?: TimeSortOrder) => {
    setDraft((prev) => ({ ...prev, sortOrder: next }));
    setPage(1);
    setApplied((prev) => {
      const { sortOrder: _prevSort, ...rest } = prev;
      return next ? { ...rest, sortOrder: next } : rest;
    });
  };

  const actionLabel = (action: string) => {
    const id = actionMessageId(action);
    const label = t(id);
    return label === id ? action : label;
  };

  const resourceTypeLabel = (resourceType: string) => {
    const id = resourceTypeMessageId(resourceType);
    const label = t(id);
    return label === id ? resourceType : label;
  };

  const openDetail = (row: AuditLogItem) => {
    setDetail(row);
    setDetailOpen(true);
  };

  const columns: ColumnsType = [
    {
      title: t('auditLogs.column.createdAt'),
      dataIndex: 'createdAt',
      key: 'createdAt',
      sorter: true,
      sortOrder: applied.sortOrder === 'asc'
        ? 'ascend'
        : applied.sortOrder === 'desc'
          ? 'descend'
          : undefined,
      render: (value: string) => formatDateTime(value),
    },
    {
      title: t('auditLogs.column.actor'),
      dataIndex: 'actorUsername',
      key: 'actorUsername',
    },
    {
      title: t('auditLogs.column.action'),
      dataIndex: 'action',
      key: 'action',
      render: (action: string, row: AuditLogItem) => (
        <button
          type="button"
          className={listStyles.rawValueLink}
          onClick={(event) => {
            event.stopPropagation();
            openDetail(row);
          }}
        >
          {actionLabel(action)}
        </button>
      ),
    },
  ];

  const detailCount = detail ? countFromRow(detail) : 0;
  const detailObject = detail ? objectLabelFromSummary(detail.summary ?? {}) : null;
  const showCount = detailCount > 1
    || (detail?.action.includes('batch_') ?? false)
    || (detail?.action.endsWith('.import') ?? false);

  return (
    <div className={listStyles.page}>
      <div className={listStyles.toolbar}>
        <strong className={listStyles.toolbarTitle}>
          {t('common.filters.title')}
        </strong>
        <div className={listStyles.toolbarRow}>
          <Space wrap className={listStyles.toolbarFields}>
            <Input
              allowClear
              placeholder={t('auditLogs.filter.actor')}
              style={{ width: 160 }}
              value={draft.actorUsername}
              onChange={(event) => {
                const next = event.target.value;
                setDraft((prev) => ({ ...prev, actorUsername: next }));
                if (!next.trim()) {
                  commitFilters({ ...draft, actorUsername: '' });
                }
              }}
              onPressEnter={() => commitFilters(draft)}
            />
            <Select
              allowClear
              placeholder={t('auditLogs.filter.action')}
              style={{ width: 200 }}
              value={draft.action}
              options={actionsForResourceType(draft.resourceType).map((value) => ({
                value,
                label: actionLabel(value),
              }))}
              onChange={(value?: string) => {
                if (!value) {
                  commitFilters({ ...draft, action: undefined });
                  return;
                }
                const lockedType = resourceTypeOfAction(value);
                commitFilters({
                  ...draft,
                  action: value,
                  resourceType: lockedType ?? draft.resourceType,
                });
              }}
            />
            <Select
              allowClear={!draft.action}
              disabled={Boolean(draft.action)}
              placeholder={t('auditLogs.filter.resourceType')}
              style={{ width: 160 }}
              value={draft.resourceType}
              options={RESOURCE_TYPE_OPTIONS.map((value) => ({
                value,
                label: resourceTypeLabel(value),
              }))}
              onChange={(value?: string) => {
                const nextType = value || undefined;
                const nextAction = (
                  draft.action && resourceTypeOfAction(draft.action) === nextType
                )
                  ? draft.action
                  : undefined;
                commitFilters({
                  ...draft,
                  resourceType: nextType,
                  action: nextAction,
                });
              }}
            />
          </Space>
          <Space wrap className={listStyles.toolbarActions}>
            <Button type="primary" onClick={() => commitFilters(draft)}>
              {t('common.action.query')}
            </Button>
            <Button
              onClick={() => {
                setDraft(emptyFilter);
                setApplied(emptyFilter);
                setPage(1);
              }}
            >
              {t('auditLogs.action.reset')}
            </Button>
            <Button type="link" icon={<ReloadOutlined />} onClick={() => void load()}>
              {t('auditLogs.action.refresh')}
            </Button>
          </Space>
        </div>
      </div>

      <QueryListCard title={t('common.queryList')}>
        <BizTable
          key={`audit-sort-${applied.sortOrder ?? 'none'}`}
          rowKey="id"
          columns={columns}
          dataSource={items}
          tdLoading={loading}
          noData={{ text: t('auditLogs.empty') }}
          page={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            pageSizeOptions: PAGE_SIZE_OPTIONS,
            showTotal: (count: number) => t('auditLogs.total', { total: count }),
          }}
          onSortChange={(orderKey) => {
            if (orderKey === 'createdAt') {
              applyTimeSort(cycleTimeSort(applied.sortOrder));
            }
          }}
          onChange={(pagination) => {
            const nextPageSize = pagination.pageSize ?? pageSize;
            setPageSize(nextPageSize);
            setPage(nextPageSize === pageSize ? pagination.current ?? 1 : 1);
          }}
        />
      </QueryListCard>

      <Drawer
        open={detailOpen}
        title={t('auditLogs.detail.title')}
        width={480}
        destroyOnClose
        onClose={() => setDetailOpen(false)}
      >
        {detail ? (
          <div className={listStyles.detailGrid}>
            <div className={listStyles.detailRow}>
              <span className={listStyles.detailLabel}>{t('auditLogs.column.createdAt')}</span>
              <span className={listStyles.detailValue}>{formatDateTime(detail.createdAt)}</span>
            </div>
            <div className={listStyles.detailRow}>
              <span className={listStyles.detailLabel}>{t('auditLogs.column.actor')}</span>
              <span className={listStyles.detailValue}>{detail.actorUsername}</span>
            </div>
            <div className={listStyles.detailRow}>
              <span className={listStyles.detailLabel}>{t('auditLogs.column.action')}</span>
              <span className={listStyles.detailValue}>{actionLabel(detail.action)}</span>
            </div>
            <div className={listStyles.detailRow}>
              <span className={listStyles.detailLabel}>{t('auditLogs.detail.resourceType')}</span>
              <span className={listStyles.detailValue}>
                {resourceTypeLabel(detail.resourceType)}
              </span>
            </div>
            {detailObject ? (
              <div className={listStyles.detailRow}>
                <span className={listStyles.detailLabel}>{t('auditLogs.detail.object')}</span>
                <span className={listStyles.detailValue}>{detailObject}</span>
              </div>
            ) : null}
            {showCount ? (
              <div className={listStyles.detailRow}>
                <span className={listStyles.detailLabel}>{t('auditLogs.detail.count')}</span>
                <span className={listStyles.detailValue}>{detailCount}</span>
              </div>
            ) : null}
            {detail.resourceIds ? (
              <div className={listStyles.detailRow}>
                <span className={listStyles.detailLabel}>{t('auditLogs.detail.resourceIds')}</span>
                <span className={listStyles.detailValue}>{detail.resourceIds}</span>
              </div>
            ) : null}
          </div>
        ) : null}
      </Drawer>
    </div>
  );
};

export default AuditLogsView;
