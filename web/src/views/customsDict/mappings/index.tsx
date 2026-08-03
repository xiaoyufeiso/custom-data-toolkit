import type { ComponentProps, Key } from 'react';
import {
  Children,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import BizTable from '@tendata-biz-components/biz-table';
import {
  DownloadOutlined,
  PlusOutlined,
  ReloadOutlined,
  UploadOutlined,
} from '@tendata-ui/icon';
import {
  AutoComplete,
  Button,
  Drawer,
  Dropdown,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Tag,
  message,
} from 'tendata-ui';
import {
  batchDisableCustomsDictMappings,
  batchResyncCustomsDictMappings,
  createCustomsDictMapping,
  downloadCustomsDictImportTemplate,
  exportCustomsDictMappings,
  importCustomsDictMappings,
  listCustomsDictMappingSuggestions,
  listCustomsDictMappings,
  listCustomsDictTypeOptions,
  updateCustomsDictMapping,
  type CustomsDictMapping,
  type CustomsDictMappingSuggestion,
  type CustomsDictTypeOption,
} from '@/services/customsDict';
import QueryListCard from '@/shared/components/queryListCard';
import { useTranslate } from '@/shared/hooks';
import listStyles from '@/shared/styles/listPage.module.less';
import { getApiErrorCode, getApiErrorMessage } from '@/shared/utils/apiError';

type ColumnsType = NonNullable<ComponentProps<typeof BizTable>['columns']>;

/** tendata-ui Dropdown 类型未透出 antd menu/trigger，运行时可用 */
type IoDropdownProps = {
  trigger?: Array<'click' | 'hover' | 'contextMenu'>;
  menu?: {
    items: Array<{
      key: string;
      icon?: React.ReactNode;
      label: React.ReactNode;
      disabled?: boolean;
      onClick?: () => void;
    }>;
  };
  children?: React.ReactNode;
};
const IoDropdown = Dropdown as unknown as React.FC<IoDropdownProps>;

const DEFAULT_PAGE_SIZE = 20;
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

type FilterDraft = {
  dictType?: string;
  q: string;
};

type FormState = {
  dictType: string;
  rawValue: string;
  standardValue: string;
};

const emptyForm: FormState = {
  dictType: 'country',
  rawValue: '',
  standardValue: '',
};

const CustomsDictMappingsView = () => {
  const t = useTranslate();
  const [items, setItems] = useState<CustomsDictMapping[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [draft, setDraft] = useState<FilterDraft>({
    q: '',
  });
  const [applied, setApplied] = useState<FilterDraft>({
    q: '',
  });
  const [suggestions, setSuggestions] = useState<CustomsDictMappingSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [batchDeleteLoading, setBatchDeleteLoading] = useState(false);
  const [batchResyncLoading, setBatchResyncLoading] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState<CustomsDictMapping | null>(null);
  const [importing, setImporting] = useState(false);
  const [typeOptionsRaw, setTypeOptionsRaw] = useState<CustomsDictTypeOption[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form] = Form.useForm<FormState>();

  const batchBusy = batchDeleteLoading || batchResyncLoading;

  const typeOptions = useMemo(
    () => typeOptionsRaw.map((item) => ({ label: item.name, value: item.code })),
    [typeOptionsRaw],
  );

  const typeLabelMap = useMemo(
    () => Object.fromEntries(typeOptionsRaw.map((item) => [item.code, item.name])),
    [typeOptionsRaw],
  );

  useEffect(() => {
    void listCustomsDictTypeOptions()
      .then(setTypeOptionsRaw)
      .catch(() => {
        message.error(t('customsDict.message.loadFailed'));
      });
  }, [t]);

  const load = useCallback(async (options?: { clearSelection?: boolean }) => {
    if (options?.clearSelection !== false) {
      setSelectedRowKeys([]);
    }
    setLoading(true);
    try {
      const data = await listCustomsDictMappings({
        dictType: applied.dictType,
        q: applied.q || undefined,
        // 软删（停用）记录不在前端展示，固定只拉启用数据
        enabled: true,
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

  useEffect(() => {
    const prefix = draft.q.trim();
    if (!prefix) {
      setSuggestions([]);
      return undefined;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const data = await listCustomsDictMappingSuggestions(
          prefix,
          draft.dictType,
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
  }, [draft.q, draft.dictType]);

  const syncLabel = (status: string) => {
    if (status === 'synced') return t('customsDict.sync.synced');
    if (status === 'pending') return t('customsDict.sync.pending');
    if (status === 'failed') return t('customsDict.sync.failed');
    return status;
  };

  const syncTagColor = (status: string) => {
    if (status === 'synced') return 'success';
    if (status === 'pending') return 'warning';
    if (status === 'failed') return 'error';
    return 'default';
  };

  const typeLabel = (dictType: string) => typeLabelMap[dictType] ?? dictType;

  const closeDetail = () => {
    setDetailOpen(false);
    setDetail(null);
  };

  const openDetail = (row: CustomsDictMapping) => {
    setDetail(row);
    setDetailOpen(true);
  };

  const openCreate = () => {
    setEditingId(null);
    form.setFieldsValue(emptyForm);
    setFormOpen(true);
  };

  const openEdit = () => {
    if (!detail) return;
    setEditingId(detail.id);
    form.setFieldsValue({
      dictType: detail.dictType,
      rawValue: detail.rawValue,
      standardValue: detail.standardValue,
    });
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingId(null);
    form.resetFields();
  };

  const submitForm = async () => {
    const values = await form.validateFields();
    setSubmitting(true);
    try {
      if (editingId != null) {
        const updated = await updateCustomsDictMapping(editingId, {
          standardValue: values.standardValue.trim(),
        });
        setDetail(updated);
      } else {
        await createCustomsDictMapping({
          dictType: values.dictType,
          rawValue: values.rawValue.trim(),
          standardValue: values.standardValue.trim(),
        });
      }
      message.success(t('customsDict.message.saveSuccess'));
      closeForm();
      await load();
    } catch (error) {
      message.error(getApiErrorMessage(error, t('customsDict.message.loadFailed')));
    } finally {
      setSubmitting(false);
    }
  };

  const onBatchDelete = async () => {
    const ids = selectedRowKeys.map(Number);
    if (ids.length === 0) return;
    setBatchDeleteLoading(true);
    try {
      const result = await batchDisableCustomsDictMappings(ids);
      message.success(t('customsDict.batchDelete.success', { count: result.disabled }));
      if (result.syncFailed > 0) {
        message.warning(t('customsDict.batchDelete.syncWarning', {
          disabled: result.disabled,
          syncFailed: result.syncFailed,
        }));
      }
      setSelectedRowKeys([]);
      await load();
    } catch (error) {
      message.error(getApiErrorMessage(error, t('customsDict.batchDelete.failed')));
      if (getApiErrorCode(error) === 'BatchDelete.StaleSelection') {
        await load();
      }
    } finally {
      setBatchDeleteLoading(false);
    }
  };

  const onBatchResync = async () => {
    const ids = selectedRowKeys.map(Number);
    if (ids.length === 0) return;
    setBatchResyncLoading(true);
    try {
      const result = await batchResyncCustomsDictMappings(ids);
      message.success(t('customsDict.batchResync.success', {
        synced: result.synced,
        failed: result.failed,
      }));
      const failedSet = new Set(result.failedIds ?? []);
      await load({ clearSelection: false });
      setSelectedRowKeys(ids.filter((id) => failedSet.has(id)));
    } catch (error) {
      message.error(getApiErrorMessage(error, t('customsDict.batchResync.failed')));
      if (getApiErrorCode(error) === 'BatchDelete.StaleSelection') {
        await load();
      }
    } finally {
      setBatchResyncLoading(false);
    }
  };

  const openBatchDeleteConfirm = () => {
    Modal.confirm({
      // tendata-ui 的静态 Modal 类型误将 children 声明为必填；实际内容由 content 提供。
      children: Children,
      centered: true,
      title: t('customsDict.batchDelete.confirmTitle', {
        count: selectedRowKeys.length,
      }),
      content: t('customsDict.batchDelete.confirmContent'),
      onOk: onBatchDelete,
    });
  };

  const openBatchResyncConfirm = () => {
    Modal.confirm({
      children: Children,
      centered: true,
      title: t('customsDict.batchResync.confirmTitle', {
        count: selectedRowKeys.length,
      }),
      content: t('customsDict.batchResync.confirmContent'),
      onOk: onBatchResync,
    });
  };

  const columns: ColumnsType = [
    {
      title: t('customsDict.column.dictType'),
      dataIndex: 'dictType',
      key: 'dictType',
      render: (value: string) => typeLabel(value),
    },
    {
      title: t('customsDict.column.rawValue'),
      dataIndex: 'rawValue',
      key: 'rawValue',
      render: (value: string, row: CustomsDictMapping) => (
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
      title: t('customsDict.column.standardValue'),
      dataIndex: 'standardValue',
      key: 'standardValue',
    },
    {
      title: t('customsDict.column.syncStatus'),
      dataIndex: 'syncStatus',
      key: 'syncStatus',
      render: (status: string) => (
        <Tag color={syncTagColor(status)}>{syncLabel(status)}</Tag>
      ),
    },
  ];

  const onExport = async () => {
    try {
      const blob = await exportCustomsDictMappings({
        dictType: applied.dictType,
        q: applied.q || undefined,
        enabled: true,
      });
      downloadBlob(blob, 'customs-dict-mappings.xlsx');
      message.success(t('customsDict.message.exportSuccess'));
    } catch (error) {
      message.error(getApiErrorMessage(error, t('customsDict.message.loadFailed')));
    }
  };

  const onSearch = () => {
    setPage(1);
    setSelectedRowKeys([]);
    setApplied({ ...draft, q: draft.q.trim() });
  };

  const onResetSearch = () => {
    const reset: FilterDraft = { q: '' };
    setDraft(reset);
    setApplied(reset);
    setSuggestions([]);
    setSelectedRowKeys([]);
    setPage(1);
  };

  const onDownloadTemplate = async () => {
    try {
      const blob = await downloadCustomsDictImportTemplate();
      downloadBlob(blob, 'customs-dict-import-template.xlsx');
      message.success(t('customsDict.message.exportSuccess'));
    } catch (error) {
      message.error(getApiErrorMessage(error, t('customsDict.message.loadFailed')));
    }
  };

  const onImportFile = async (file: File) => {
    setImporting(true);
    try {
      const result = await importCustomsDictMappings(file);
      message.success(t('customsDict.message.importSuccess', {
        created: result.created,
        updated: result.updated,
        failed: result.failed,
      }));
      if (result.failed > 0) {
        const preview = (result.errors ?? [])
          .slice(0, 3)
          .map((item) => t('customsDict.message.importErrorRow', {
            row: item.row,
            message: item.message,
          }))
          .join('；');
        message.warning(
          preview
            ? `${t('customsDict.message.importPartial')} ${preview}`
            : t('customsDict.message.importPartial'),
        );
      }
      await load();
    } catch (error) {
      message.error(getApiErrorMessage(error, t('customsDict.message.importFailed')));
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

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
              value={draft.dictType}
              onChange={(value) => {
                setDraft((prev) => ({ ...prev, dictType: value }));
                setSuggestions([]);
              }}
            />
            <AutoComplete
              allowClear
              placeholder={t('customsDict.search.mappingPlaceholder')}
              style={{ width: 160 }}
              value={draft.q}
              options={suggestions.map((suggestion) => ({
                key: `${suggestion.id}-${suggestion.matchField}`,
                value: suggestion.matchField === 'rawValue'
                  ? suggestion.rawValue
                  : suggestion.standardValue,
                label: `${suggestion.rawValue} (${suggestion.standardValue})`,
              }))}
              filterOption={false}
              listHeight={240}
              onChange={(value) => setDraft((prev) => ({
                ...prev,
                q: String(value),
              }))}
              onSelect={(value) => {
                setDraft((prev) => ({ ...prev, q: String(value) }));
                setSuggestions([]);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') onSearch();
              }}
            />
          </Space>
          <Space wrap className={listStyles.toolbarActions}>
            <Button type="primary" onClick={onSearch}>
              {t('common.action.query')}
            </Button>
            <Button onClick={onResetSearch}>
              {t('customsDict.action.reset')}
            </Button>
            <Button
              type="link"
              icon={<ReloadOutlined />}
              onClick={() => load()}
            >
              {t('customsDict.action.refresh')}
            </Button>
          </Space>
        </div>
      </div>

      <QueryListCard
        title={t('common.queryList')}
        actions={(
          <Space>
            <IoDropdown
              trigger={['click']}
              menu={{
                items: [
                  {
                    key: 'import',
                    icon: <UploadOutlined />,
                    label: t('customsDict.action.import'),
                    disabled: importing,
                    onClick: () => fileInputRef.current?.click(),
                  },
                  {
                    key: 'export',
                    icon: <DownloadOutlined />,
                    label: t('customsDict.action.export'),
                    onClick: () => {
                      void onExport();
                    },
                  },
                  {
                    key: 'template',
                    icon: <DownloadOutlined />,
                    label: t('customsDict.action.importTemplate'),
                    onClick: () => {
                      void onDownloadTemplate();
                    },
                  },
                ],
              }}
            >
              <Button loading={importing}>
                {t('customsDict.action.importExport')}
              </Button>
            </IoDropdown>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              style={{ display: 'none' }}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  void onImportFile(file);
                }
                event.target.value = '';
              }}
            />
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              {t('customsDict.action.create')}
            </Button>
          </Space>
        )}
        selectionCount={selectedRowKeys.length}
        selectionActions={(
          <>
            <Button
              danger
              loading={batchDeleteLoading}
              disabled={batchBusy}
              onClick={openBatchDeleteConfirm}
            >
              {t('customsDict.batchDelete.button')}
            </Button>
            <Button
              type="secondary"
              loading={batchResyncLoading}
              disabled={batchBusy}
              onClick={openBatchResyncConfirm}
            >
              {t('customsDict.batchResync.button')}
            </Button>
          </>
        )}
      >
        <BizTable
          rowKey="id"
          columns={columns}
          dataSource={items}
          tdLoading={loading}
          noData={{ text: t('customsDict.empty') }}
          rowClassName={() => listStyles.clickableRow}
          rowSelection={{
            columnWidth: 32,
            selectedRowKeys,
            onChange: setSelectedRowKeys,
            getCheckboxProps: () => ({
              onClick: (event: React.MouseEvent) => event.stopPropagation(),
            }),
          }}
          onRow={(row: CustomsDictMapping) => ({
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
            setSelectedRowKeys([]);
            const nextPageSize = pagination.pageSize ?? pageSize;
            setPageSize(nextPageSize);
            setPage(nextPageSize === pageSize ? pagination.current ?? 1 : 1);
          }}
        />
      </QueryListCard>

      <Modal
        open={formOpen}
        title={editingId != null
          ? t('customsDict.modal.editTitle')
          : t('customsDict.modal.createTitle')}
        onCancel={closeForm}
        onOk={() => void submitForm()}
        confirmLoading={submitting}
        destroyOnClose
        maskClosable={false}
        okText={t('customsDict.action.save')}
        cancelText={t('customsDict.action.cancel')}
      >
        <Form form={form} layout="vertical" initialValues={emptyForm}>
          <Form.Item
            name="dictType"
            label={t('customsDict.form.dictType')}
            rules={[{ required: true, message: t('customsDict.message.dictTypeRequired') }]}
          >
            <Select options={typeOptions} disabled={editingId != null} />
          </Form.Item>
          <Form.Item
            name="rawValue"
            label={t('customsDict.form.rawValue')}
            rules={[{ required: true, message: t('customsDict.message.rawRequired') }]}
          >
            <Input disabled={editingId != null} />
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
        title={t('customsDict.modal.detailTitle')}
        width={480}
        destroyOnClose
        onClose={closeDetail}
      >
        {detail && (
          <div className={listStyles.detailGrid}>
            <div className={listStyles.detailRow}>
              <span className={listStyles.detailLabel}>{t('customsDict.column.dictType')}</span>
              <span className={listStyles.detailValue}>{typeLabel(detail.dictType)}</span>
            </div>
            <div className={listStyles.detailRow}>
              <span className={listStyles.detailLabel}>{t('customsDict.column.rawValue')}</span>
              <span className={listStyles.detailValue}>{detail.rawValue}</span>
            </div>
            <div className={listStyles.detailRow}>
              <span className={listStyles.detailLabel}>{t('customsDict.column.standardValue')}</span>
              <span className={listStyles.detailValue}>{detail.standardValue}</span>
            </div>
            <div className={listStyles.detailRow}>
              <span className={listStyles.detailLabel}>{t('customsDict.column.syncStatus')}</span>
              <span className={listStyles.detailValue}>
                <Tag color={syncTagColor(detail.syncStatus)}>{syncLabel(detail.syncStatus)}</Tag>
                {detail.syncError ? (
                  <div className={listStyles.syncFailed}>{detail.syncError}</div>
                ) : null}
              </span>
            </div>
            <div className={listStyles.detailRow}>
              <span className={listStyles.detailLabel}>{t('customsDict.column.source')}</span>
              <span className={listStyles.detailValue}>
                <Tag>{detail.source}</Tag>
              </span>
            </div>
            <div className={listStyles.detailActions}>
              <Button type="primary" onClick={openEdit}>
                {t('customsDict.action.edit')}
              </Button>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default CustomsDictMappingsView;
