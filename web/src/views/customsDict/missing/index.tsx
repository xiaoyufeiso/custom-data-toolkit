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
  AutoComplete,
  Button,
  Drawer,
  Form,
  Input,
  Modal,
  Select,
  Space,
  message,
} from 'tendata-ui';
import {
  exportCustomsDictMissing,
  handleCustomsDictMissing,
  listCustomsDictMissing,
  listCustomsDictMissingSuggestions,
  listCustomsDictTypeOptions,
  type CustomsDictMissingItem,
  type CustomsDictMissingSuggestion,
  type CustomsDictTypeOption,
} from '@/services/customsDict';
import QueryListCard from '@/shared/components/queryListCard';
import { useTranslate } from '@/shared/hooks';
import listStyles from '@/shared/styles/listPage.module.less';
import { getApiErrorMessage } from '@/shared/utils/apiError';

type ColumnsType = NonNullable<ComponentProps<typeof BizTable>['columns']>;

const DEFAULT_PAGE_SIZE = 20;
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

type FilterDraft = {
  dictType?: string;
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
    dictType: '',
    rawValue: '',
  });
  const [applied, setApplied] = useState<FilterDraft>({
    dictType: '',
    rawValue: '',
  });
  const [suggestions, setSuggestions] = useState<CustomsDictMissingSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [handleOpen, setHandleOpen] = useState(false);
  const [detail, setDetail] = useState<CustomsDictMissingItem | null>(null);
  const [typeOptionsRaw, setTypeOptionsRaw] = useState<CustomsDictTypeOption[]>([]);
  const [typesReady, setTypesReady] = useState(false);
  const [form] = Form.useForm<{
    dictType: string;
    rawValue: string;
    standardValue: string;
  }>();

  const typeOptions = useMemo(
    () => typeOptionsRaw.map((item) => ({ label: item.name, value: item.code })),
    [typeOptionsRaw],
  );

  useEffect(() => {
    void listCustomsDictTypeOptions()
      .then(setTypeOptionsRaw)
      .catch(() => {
        message.error(t('customsDict.message.loadFailed'));
      })
      .finally(() => setTypesReady(true));
  }, [t]);

  const load = useCallback(async () => {
    if (!typesReady) return;
    setLoading(true);
    try {
      const data = await listCustomsDictMissing({
        dictType: applied.dictType || undefined,
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
  }, [applied, page, pageSize, t, typesReady]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const prefix = draft.rawValue.trim();
    if (!prefix) {
      setSuggestions([]);
      return undefined;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const data = await listCustomsDictMissingSuggestions(
          {
            dictType: draft.dictType || undefined,
            prefix,
          },
          controller.signal,
        );
        setSuggestions(data);
      } catch {
        if (!controller.signal.aborted) setSuggestions([]);
      }
    }, 300);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [draft.rawValue, draft.dictType]);

  const closeDetail = () => {
    setDetailOpen(false);
    setDetail(null);
  };

  const openDetail = (row: CustomsDictMissingItem) => {
    setDetail(row);
    setDetailOpen(true);
  };

  const openHandle = () => {
    if (!detail) return;
    form.setFieldsValue({
      dictType: detail.dictType,
      rawValue: detail.rawValue,
      standardValue: '',
    });
    setHandleOpen(true);
  };

  const closeHandle = () => {
    setHandleOpen(false);
    form.resetFields();
  };

  const submitHandle = async () => {
    if (!detail) return;
    const values = await form.validateFields();
    const nextValue = values.standardValue.trim();
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
      closeHandle();
      closeDetail();
      await load();
    } catch (error) {
      message.error(getApiErrorMessage(error, t('customsDict.message.loadFailed')));
    } finally {
      setSubmitting(false);
    }
  };

  const commitFilters = (next: FilterDraft) => {
    const normalized: FilterDraft = {
      ...next,
      rawValue: next.rawValue.trim(),
    };
    setDraft(next);
    setSuggestions([]);
    setPage(1);
    setApplied(normalized);
  };

  const onExport = async () => {
    try {
      const blob = await exportCustomsDictMissing({
        dictType: applied.dictType || undefined,
        rawValue: applied.rawValue || undefined,
      });
      const filename = applied.dictType
        ? `customs-dict-missing-${applied.dictType}.xlsx`
        : 'customs-dict-missing-all.xlsx';
      downloadBlob(blob, filename);
      message.success(t('customsDict.message.exportSuccess'));
    } catch (error) {
      message.error(getApiErrorMessage(error, t('customsDict.message.loadFailed')));
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
          className={listStyles.rawValueLink}
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
    <div className={listStyles.page}>
      <div className={listStyles.toolbar}>
        <strong className={listStyles.toolbarTitle}>
          {t('common.filters.title')}
        </strong>
        <div className={listStyles.toolbarRow}>
          <Space wrap className={listStyles.toolbarFields}>
            <Select
              allowClear
              placeholder={t('customsDict.filter.dictType')}
              style={{ width: 120 }}
              options={typeOptions}
              value={draft.dictType || undefined}
              onChange={(value) => {
                commitFilters({ ...draft, dictType: value ?? '' });
              }}
            />
            <AutoComplete
              allowClear
              placeholder={t('customsDict.search.missingPlaceholder')}
              style={{ width: 160 }}
              value={draft.rawValue}
              options={suggestions.map((suggestion) => ({
                key: suggestion.rawValue,
                value: suggestion.rawValue,
                label: suggestion.rawValue,
              }))}
              filterOption={false}
              listHeight={240}
              onChange={(value) => {
                const nextRaw = String(value);
                setDraft((prev) => ({ ...prev, rawValue: nextRaw }));
                if (!nextRaw.trim()) {
                  commitFilters({ ...draft, rawValue: '' });
                }
              }}
              onSelect={(value) => {
                commitFilters({ ...draft, rawValue: String(value) });
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  commitFilters({ ...draft, rawValue: draft.rawValue.trim() });
                }
              }}
            />
          </Space>
          <Space wrap className={listStyles.toolbarActions}>
            <Button
              type="primary"
              onClick={() => {
                commitFilters({ ...draft, rawValue: draft.rawValue.trim() });
              }}
            >
              {t('common.action.query')}
            </Button>
            <Button
              onClick={() => {
                const reset: FilterDraft = { dictType: '', rawValue: '' };
                setDraft(reset);
                setApplied(reset);
                setSuggestions([]);
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
      </div>

      <QueryListCard
        title={t('common.queryList')}
        actions={(
          <Button icon={<DownloadOutlined />} onClick={() => void onExport()}>
            {t('customsDict.action.export')}
          </Button>
        )}
      >
        <BizTable
          rowKey={(row: CustomsDictMissingItem) => `${row.dictType}:${row.rawValue}`}
          columns={columns}
          dataSource={items}
          tdLoading={loading}
          noData={{ text: t('customsDict.empty') }}
          rowClassName={() => listStyles.clickableRow}
          onRow={(row: CustomsDictMissingItem) => ({
            onClick: () => openDetail(row),
          })}
          page={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            pageSizeOptions: PAGE_SIZE_OPTIONS,
            showTotal: (count: number) => t('customsDict.total', { total: count }),
          }}
          onChange={(pagination) => {
            const nextPageSize = pagination.pageSize ?? pageSize;
            setPageSize(nextPageSize);
            setPage(nextPageSize === pageSize ? pagination.current ?? 1 : 1);
          }}
        />
      </QueryListCard>

      <Modal
        open={handleOpen}
        title={t('customsDict.modal.handleTitle')}
        okText={t('customsDict.action.save')}
        cancelText={t('customsDict.action.cancel')}
        confirmLoading={submitting}
        destroyOnClose
        maskClosable={false}
        onOk={() => void submitHandle()}
        onCancel={closeHandle}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="dictType"
            label={t('customsDict.form.dictType')}
          >
            <Select options={typeOptions} disabled />
          </Form.Item>
          <Form.Item
            name="rawValue"
            label={t('customsDict.form.rawValue')}
          >
            <Input disabled />
          </Form.Item>
          <Form.Item
            name="standardValue"
            label={t('customsDict.form.standardValue')}
            rules={[{ required: true, message: t('customsDict.message.standardRequired') }]}
          >
            <Input />
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        open={detailOpen}
        title={t('customsDict.modal.missingDetailTitle')}
        width={480}
        destroyOnClose
        onClose={closeDetail}
      >
        {detail && (
          <div className={listStyles.detailGrid}>
            <div className={listStyles.detailRow}>
              <span className={listStyles.detailLabel}>{t('customsDict.column.dictType')}</span>
              <span className={listStyles.detailValue}>{detail.dictTypeLabel}</span>
            </div>
            <div className={listStyles.detailRow}>
              <span className={listStyles.detailLabel}>{t('customsDict.column.rawValue')}</span>
              <span className={listStyles.detailValue}>{detail.rawValue}</span>
            </div>
            <div className={listStyles.detailRow}>
              <span className={listStyles.detailLabel}>
                {t('customsDict.column.occurrenceCount')}
              </span>
              <span className={listStyles.detailValue}>{detail.occurrenceCount}</span>
            </div>
            <div className={listStyles.detailActions}>
              <Button type="primary" onClick={openHandle}>
                {t('customsDict.action.handle')}
              </Button>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default CustomsDictMissingView;
