import type { ComponentProps } from 'react';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import BizTable from '@tendata-biz-components/biz-table';
import { DownloadOutlined, ReloadOutlined } from '@tendata-ui/icon';
import {
  Button,
  Card,
  Drawer,
  Input,
  Select,
  Space,
  Typography,
  message,
} from 'tendata-ui';
import {
  exportCustomsDictMissing,
  handleCustomsDictMissing,
  listCustomsDictMissing,
  type CustomsDictMissingItem,
} from '@/services/customsDict';
import { useTranslate } from '@/shared/hooks';
import { getApiErrorMessage } from '@/shared/utils/apiError';
import styles from './index.module.less';

type ColumnsType = NonNullable<ComponentProps<typeof BizTable>['columns']>;

const DEFAULT_PAGE_SIZE = 20;

type FilterDraft = {
  dictType: string;
  rawValue: string;
};

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

const CustomsDictMissingView = () => {
  const t = useTranslate();
  const [items, setItems] = useState<CustomsDictMissingItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [draft, setDraft] = useState<FilterDraft>({
    dictType: 'country',
    rawValue: '',
  });
  const [applied, setApplied] = useState<FilterDraft>({
    dictType: 'country',
    rawValue: '',
  });
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailHandling, setDetailHandling] = useState(false);
  const [detail, setDetail] = useState<CustomsDictMissingItem | null>(null);
  const [standardValue, setStandardValue] = useState('');

  const typeOptions = useMemo(
    () => [
      { label: t('customsDict.type.country'), value: 'country' },
      { label: t('customsDict.type.continent'), value: 'continent' },
    ],
    [t],
  );

  const load = useCallback(async () => {
    if (!applied.dictType) {
      message.warning(t('customsDict.message.dictTypeRequired'));
      return;
    }
    setLoading(true);
    try {
      const data = await listCustomsDictMissing({
        dictType: applied.dictType,
        rawValue: applied.rawValue || undefined,
        page,
        pageSize,
      });
      setItems(data.items ?? []);
      setTotal(data.total ?? 0);
    } catch (error) {
      message.error(getApiErrorMessage(error, t('customsDict.message.loadFailed')));
    } finally {
      setLoading(false);
    }
  }, [applied, page, pageSize, t]);

  useEffect(() => {
    load();
  }, [load]);

  const closeDetail = () => {
    setDetailOpen(false);
    setDetailHandling(false);
    setStandardValue('');
    setDetail(null);
  };

  const openDetail = (row: CustomsDictMissingItem) => {
    setDetail(row);
    setDetailHandling(false);
    setStandardValue('');
    setDetailOpen(true);
  };

  const startHandle = () => {
    setStandardValue('');
    setDetailHandling(true);
  };

  const cancelHandle = () => {
    setStandardValue('');
    setDetailHandling(false);
  };

  const submitHandle = async () => {
    if (!detail) return;
    const nextValue = standardValue.trim();
    if (!nextValue) {
      message.warning(t('customsDict.message.standardRequired'));
      return;
    }
    setSubmitting(true);
    try {
      await handleCustomsDictMissing({
        dictType: detail.dictType,
        rawValue: detail.rawValue,
        standardValue: nextValue,
      });
      message.success(t('customsDict.message.handleSuccess'));
      closeDetail();
      await load();
    } catch (error) {
      message.error(getApiErrorMessage(error, t('customsDict.message.loadFailed')));
    } finally {
      setSubmitting(false);
    }
  };

  const columns: ColumnsType = [
    {
      title: t('customsDict.column.dictType'),
      dataIndex: 'dictTypeLabel',
      key: 'dictTypeLabel',
    },
    {
      title: t('customsDict.column.rawValue'),
      dataIndex: 'rawValue',
      key: 'rawValue',
      render: (value: string, row: CustomsDictMissingItem) => (
        <button
          type="button"
          className={styles.rawValueLink}
          onClick={(event) => {
            event.stopPropagation();
            openDetail(row);
          }}
        >
          {value}
        </button>
      ),
    },
    {
      title: t('customsDict.column.occurrenceCount'),
      dataIndex: 'occurrenceCount',
      key: 'occurrenceCount',
    },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.pageAction}>
        <Button
          icon={<DownloadOutlined />}
          onClick={async () => {
            if (!applied.dictType) {
              message.warning(t('customsDict.message.dictTypeRequired'));
              return;
            }
            try {
              const blob = await exportCustomsDictMissing({
                dictType: applied.dictType,
                rawValue: applied.rawValue || undefined,
              });
              downloadBlob(blob, `customs-dict-missing-${applied.dictType}.xlsx`);
              message.success(t('customsDict.message.exportSuccess'));
            } catch (error) {
              message.error(getApiErrorMessage(error, t('customsDict.message.loadFailed')));
            }
          }}
        >
          {t('customsDict.action.export')}
        </Button>
      </div>

      <div className={styles.toolbar}>
        <Typography.Text strong className={styles.toolbarTitle}>
          {t('customsDict.missing.title')}
        </Typography.Text>
        <Space wrap>
          <Select
            placeholder={t('customsDict.filter.dictType')}
            style={{ width: 140 }}
            options={typeOptions}
            value={draft.dictType}
            onChange={(value) => setDraft((prev) => ({ ...prev, dictType: value }))}
          />
          <Input
            allowClear
            placeholder={t('customsDict.filter.rawValue')}
            style={{ width: 200 }}
            value={draft.rawValue}
            onChange={(event) => setDraft((prev) => ({
              ...prev,
              rawValue: event.target.value,
            }))}
          />
          <Button
            type="primary"
            onClick={() => {
              if (!draft.dictType) {
                message.warning(t('customsDict.message.dictTypeRequired'));
                return;
              }
              setPage(1);
              setApplied({ ...draft });
            }}
          >
            {t('customsDict.action.search')}
          </Button>
          <Button
            onClick={() => {
              const reset = { dictType: 'country', rawValue: '' };
              setDraft(reset);
              setApplied(reset);
              setPage(1);
            }}
          >
            {t('customsDict.action.reset')}
          </Button>
          <Button type="link" icon={<ReloadOutlined />} onClick={() => load()}>
            {t('customsDict.action.refresh')}
          </Button>
        </Space>
      </div>

      <Card>
        <BizTable
          rowKey={(row: CustomsDictMissingItem) => `${row.dictType}:${row.rawValue}`}
          columns={columns}
          dataSource={items}
          tdLoading={loading}
          locale={{ emptyText: t('customsDict.empty') }}
          rowClassName={() => styles.clickableRow}
          onRow={(row: CustomsDictMissingItem) => ({
            onClick: () => openDetail(row),
          })}
          page={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            showTotal: (count: number) => t('customsDict.total', { total: count }),
          }}
          onChange={(pagination) => {
            setPage(pagination.current ?? 1);
            setPageSize(pagination.pageSize ?? DEFAULT_PAGE_SIZE);
          }}
        />
      </Card>

      <Drawer
        open={detailOpen}
        title={t('customsDict.modal.missingDetailTitle')}
        width={480}
        destroyOnClose
        maskClosable={!detailHandling}
        onClose={closeDetail}
        footer={(
          <div className={styles.detailFooter}>
            {detailHandling ? (
              <Space>
                <Button onClick={cancelHandle} disabled={submitting}>
                  {t('customsDict.action.cancel')}
                </Button>
                <Button type="primary" loading={submitting} onClick={submitHandle}>
                  {t('customsDict.action.save')}
                </Button>
              </Space>
            ) : (
              <Button type="primary" onClick={startHandle}>
                {t('customsDict.action.handle')}
              </Button>
            )}
          </div>
        )}
      >
        {detail && (
          <div className={styles.detailGrid}>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>{t('customsDict.column.dictType')}</span>
              <span className={styles.detailValue}>{detail.dictTypeLabel}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>{t('customsDict.column.rawValue')}</span>
              <span className={styles.detailValue}>{detail.rawValue}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>
                {t('customsDict.column.occurrenceCount')}
              </span>
              <span className={styles.detailValue}>{detail.occurrenceCount}</span>
            </div>
            {detailHandling ? (
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>
                  {t('customsDict.column.standardValue')}
                </span>
                <span className={styles.detailValue}>
                  <Input
                    value={standardValue}
                    onChange={(event) => setStandardValue(event.target.value)}
                    aria-label={t('customsDict.form.standardValue')}
                    placeholder={t('customsDict.form.standardValue')}
                  />
                </span>
              </div>
            ) : null}
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default CustomsDictMissingView;
