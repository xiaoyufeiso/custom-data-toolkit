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
  CloseCircleFilled,
  PlusOutlined,
  ReloadOutlined,
  SuccessFilled,
  UploadOutlined,
  WarningTriangleOutlined,
} from '@tendata-ui/icon';
import {
  AutoComplete,
  Button,
  Drawer,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Tabs,
  Tag,
  message,
} from 'tendata-ui';
import {
  batchDisableCustomsDictMappings,
  batchResyncCustomsDictMappings,
  createCustomsDictMapping,
  downloadCustomsDictImportTemplate,
  importCustomsDictMappings,
  listCustomsDictMappingSuggestions,
  listCustomsDictMappings,
  listCustomsDictTypeOptions,
  updateCustomsDictMapping,
  type CustomsDictImportResult,
  type CustomsDictMapping,
  type CustomsDictMappingSuggestion,
  type CustomsDictTypeOption,
} from '@/services/customsDict';
import QueryListCard from '@/shared/components/queryListCard';
import { useTranslate } from '@/shared/hooks';
import listStyles from '@/shared/styles/listPage.module.less';
import { getApiErrorCode, getApiErrorMessage } from '@/shared/utils/apiError';
import {
  parseCustomsDictImportPreview,
  type ImportPreviewRow,
} from './parseImportPreview';

type ColumnsType = NonNullable<ComponentProps<typeof BizTable>['columns']>;

type CreateTabKey = 'single' | 'import';

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
  dictType: '',
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
  const [createTab, setCreateTab] = useState<CreateTabKey>('single');
  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState<CustomsDictMapping | null>(null);
  const [importing, setImporting] = useState(false);
  const [previewParsing, setPreviewParsing] = useState(false);
  const [pendingImportFile, setPendingImportFile] = useState<File | null>(null);
  const [importPreviewRows, setImportPreviewRows] = useState<ImportPreviewRow[]>([]);
  const [importPreviewError, setImportPreviewError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<CustomsDictImportResult | null>(null);
  const [typeOptionsRaw, setTypeOptionsRaw] = useState<CustomsDictTypeOption[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form] = Form.useForm<FormState>();

  const resetImportDraft = () => {
    setPendingImportFile(null);
    setImportPreviewRows([]);
    setImportPreviewError(null);
    setImportResult(null);
    setPreviewParsing(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

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
    setCreateTab('single');
    resetImportDraft();
    form.resetFields();
    setFormOpen(true);
    // destroyOnClose 下需等 Form 挂载后再写入，否则默认类型不显示
    window.setTimeout(() => {
      form.setFieldsValue({
        ...emptyForm,
        dictType: typeOptionsRaw[0]?.code ?? '',
      });
    }, 0);
  };

  const openEdit = () => {
    if (!detail) return;
    setEditingId(detail.id);
    setCreateTab('single');
    resetImportDraft();
    setFormOpen(true);
    window.setTimeout(() => {
      form.setFieldsValue({
        dictType: detail.dictType,
        rawValue: detail.rawValue,
        standardValue: detail.standardValue,
      });
    }, 0);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingId(null);
    setCreateTab('single');
    resetImportDraft();
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

  const onSearch = () => {
    setPage(1);
    setSelectedRowKeys([]);
    setApplied({ ...draft, q: draft.q.trim() });
  };

  const commitFilters = (next: FilterDraft) => {
    const normalized: FilterDraft = { ...next, q: next.q.trim() };
    setDraft({ ...next, q: next.q });
    setSuggestions([]);
    setPage(1);
    setSelectedRowKeys([]);
    setApplied(normalized);
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

  const onSelectImportFile = async (file: File) => {
    setImportResult(null);
    setPendingImportFile(file);
    setImportPreviewRows([]);
    setImportPreviewError(null);
    setPreviewParsing(true);
    try {
      const rows = await parseCustomsDictImportPreview(file);
      setImportPreviewRows(rows);
    } catch (error) {
      setPendingImportFile(null);
      setImportPreviewRows([]);
      setImportPreviewError(
        error instanceof Error
          ? error.message
          : t('customsDict.message.importFailed'),
      );
    } finally {
      setPreviewParsing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const onConfirmImport = async () => {
    if (!pendingImportFile || importPreviewRows.length === 0) return;
    setImporting(true);
    try {
      const result = await importCustomsDictMappings(pendingImportFile);
      setPendingImportFile(null);
      setImportPreviewRows([]);
      setImportPreviewError(null);
      setImportResult(result);
      await load();
    } catch (error) {
      message.error(getApiErrorMessage(error, t('customsDict.message.importFailed')));
    } finally {
      setImporting(false);
    }
  };

  const canConfirmImport = (
    pendingImportFile != null
    && importPreviewRows.length > 0
    && importPreviewError == null
    && !previewParsing
  );

  const showImportResult = importResult != null;

  const mappingForm = (
    <Form form={form} layout="vertical" initialValues={emptyForm}>
      <Form.Item
        name="dictType"
        label={t('customsDict.form.dictType')}
        rules={[{ required: true, message: t('customsDict.message.dictTypeRequired') }]}
      >
        <Select
          options={typeOptions}
          disabled={editingId != null}
          placeholder={t('customsDict.filter.dictType')}
        />
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
  );

  const importPanel = (
    <div>
      <p style={{ marginTop: 0, marginBottom: 12, color: 'rgba(0, 0, 0, 0.45)', fontSize: 13 }}>
        {t('customsDict.import.hintPrefix')}
        <a
          role="button"
          tabIndex={0}
          style={{ color: '#1677ff', cursor: 'pointer' }}
          onClick={(event) => {
            event.preventDefault();
            void onDownloadTemplate();
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              void onDownloadTemplate();
            }
          }}
        >
          {t('customsDict.action.importTemplate')}
        </a>
        {t('customsDict.import.hintSuffix')}
      </p>
      <Button
        icon={<UploadOutlined />}
        loading={previewParsing}
        onClick={() => fileInputRef.current?.click()}
      >
        {t('customsDict.action.import')}
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        style={{ display: 'none' }}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            void onSelectImportFile(file);
          }
        }}
      />
      {pendingImportFile ? (
        <div style={{ marginTop: 8, color: 'rgba(0, 0, 0, 0.65)', fontSize: 13 }}>
          {t('customsDict.import.fileName', { name: pendingImportFile.name })}
        </div>
      ) : null}
      {importPreviewError ? (
        <div style={{ marginTop: 12, color: '#ff4d4f' }}>{importPreviewError}</div>
      ) : null}
      {importPreviewRows.length > 0 ? (
        <div style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <strong>{t('customsDict.import.previewTitle')}</strong>
            <span style={{ color: 'rgba(0, 0, 0, 0.45)' }}>
              {t('customsDict.import.previewCount', { count: importPreviewRows.length })}
            </span>
          </div>
          <div style={{ maxHeight: 240, overflow: 'auto', border: '1px solid #f0f0f0' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#fafafa', position: 'sticky', top: 0 }}>
                  <th style={{ padding: '8px 12px', textAlign: 'left', whiteSpace: 'nowrap' }}>
                    {t('customsDict.import.column.dictType')}
                  </th>
                  <th style={{ padding: '8px 12px', textAlign: 'left', whiteSpace: 'nowrap' }}>
                    {t('customsDict.import.column.dictTypeName')}
                  </th>
                  <th style={{ padding: '8px 12px', textAlign: 'left', whiteSpace: 'nowrap' }}>
                    {t('customsDict.import.column.rawValue')}
                  </th>
                  <th style={{ padding: '8px 12px', textAlign: 'left', whiteSpace: 'nowrap' }}>
                    {t('customsDict.import.column.standardValue')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {importPreviewRows.map((row) => (
                  <tr key={row.excelRow} style={{ borderTop: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '8px 12px' }}>{row.dictType}</td>
                    <td style={{ padding: '8px 12px' }}>{row.dictTypeName}</td>
                    <td style={{ padding: '8px 12px' }}>{row.rawValue}</td>
                    <td style={{ padding: '8px 12px' }}>{row.standardValue}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );

  const importResultPanel = (() => {
    if (!importResult) return null;

    const succeeded = importResult.created + importResult.updated;
    const status = importResult.failed === 0
      ? 'success'
      : succeeded === 0
        ? 'failed'
        : 'partial';

    const statusTone = {
      success: {
        icon: <SuccessFilled style={{ fontSize: 56, color: '#52c41a' }} />,
        title: t('customsDict.import.status.success'),
        desc: t('customsDict.import.status.successDesc'),
        bannerBg: '#f6ffed',
        bannerBorder: '#b7eb8f',
        titleColor: '#389e0d',
      },
      partial: {
        icon: <WarningTriangleOutlined style={{ fontSize: 56, color: '#faad14' }} />,
        title: t('customsDict.import.status.partial'),
        desc: t('customsDict.import.status.partialDesc'),
        bannerBg: '#fffbe6',
        bannerBorder: '#ffe58f',
        titleColor: '#d48806',
      },
      failed: {
        icon: <CloseCircleFilled style={{ fontSize: 56, color: '#ff4d4f' }} />,
        title: t('customsDict.import.status.failed'),
        desc: t('customsDict.import.status.failedDesc'),
        bannerBg: '#fff2f0',
        bannerBorder: '#ffccc7',
        titleColor: '#cf1322',
      },
    }[status];

    const statCard = (
      label: string,
      value: number,
      color: string,
      bg: string,
    ) => (
      <div
        style={{
          flex: 1,
          minWidth: 0,
          textAlign: 'center',
          padding: '14px 8px',
          borderRadius: 8,
          background: bg,
        }}
      >
        <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.2, color }}>{value}</div>
        <div style={{ marginTop: 6, fontSize: 13, color: 'rgba(0, 0, 0, 0.55)' }}>{label}</div>
      </div>
    );

    return (
      <div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '20px 16px 16px',
            marginBottom: 16,
            borderRadius: 8,
            background: statusTone.bannerBg,
            border: `1px solid ${statusTone.bannerBorder}`,
          }}
        >
          {statusTone.icon}
          <div
            style={{
              marginTop: 12,
              fontSize: 20,
              fontWeight: 600,
              color: statusTone.titleColor,
            }}
          >
            {statusTone.title}
          </div>
          <div
            style={{
              marginTop: 6,
              fontSize: 13,
              color: 'rgba(0, 0, 0, 0.55)',
              textAlign: 'center',
            }}
          >
            {statusTone.desc}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          {statCard(
            t('customsDict.import.stat.created'),
            importResult.created,
            '#1677ff',
            '#e6f4ff',
          )}
          {statCard(
            t('customsDict.import.stat.updated'),
            importResult.updated,
            '#13c2c2',
            '#e6fffb',
          )}
          {statCard(
            t('customsDict.import.stat.failed'),
            importResult.failed,
            importResult.failed > 0 ? '#ff4d4f' : 'rgba(0, 0, 0, 0.45)',
            importResult.failed > 0 ? '#fff1f0' : '#fafafa',
          )}
        </div>

        <div
          style={{
            marginBottom: (importResult.errors?.length ?? 0) > 0 ? 12 : 0,
            color: 'rgba(0, 0, 0, 0.45)',
            fontSize: 13,
            textAlign: 'center',
          }}
        >
          {t('customsDict.import.resultSummary', {
            created: importResult.created,
            updated: importResult.updated,
            failed: importResult.failed,
          })}
        </div>

        {(importResult.errors?.length ?? 0) > 0 ? (
          <div>
            <div
              style={{
                marginBottom: 8,
                fontWeight: 600,
                color: '#cf1322',
              }}
            >
              {t('customsDict.import.errorTitle')}
            </div>
            <ul
              style={{
                margin: 0,
                paddingLeft: 20,
                maxHeight: 200,
                overflow: 'auto',
                border: '1px solid #ffccc7',
                borderRadius: 8,
                background: '#fff2f0',
                paddingTop: 10,
                paddingBottom: 10,
                paddingRight: 12,
              }}
            >
              {importResult.errors.slice(0, 50).map((item) => (
                <li key={`${item.row}-${item.message}`} style={{ marginBottom: 4 }}>
                  {t('customsDict.message.importErrorRow', {
                    row: item.row,
                    message: item.message,
                  })}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    );
  })();

  const showCreateSingleFooter = editingId != null || createTab === 'single';
  const importFooter = showImportResult ? (
    <Button type="primary" onClick={closeForm}>
      {t('customsDict.action.done')}
    </Button>
  ) : (
    <Space>
      <Button onClick={closeForm}>{t('customsDict.action.cancel')}</Button>
      <Button
        type="primary"
        loading={importing}
        disabled={!canConfirmImport}
        onClick={() => void onConfirmImport()}
      >
        {t('customsDict.action.confirmImport')}
      </Button>
    </Space>
  );

  const modalTitle = (() => {
    if (editingId != null) return t('customsDict.modal.editTitle');
    if (showImportResult) return t('customsDict.modal.importResultTitle');
    return t('customsDict.modal.createTitle');
  })();

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
                commitFilters({ ...draft, dictType: value || undefined });
              }}
            />
            <AutoComplete
              allowClear
              placeholder={t('customsDict.search.mappingPlaceholder')}
              style={{ width: 160 }}
              value={draft.q}
              options={suggestions.map((suggestion) => {
                const byStandard = suggestion.matchField === 'standardValue';
                const fillValue = byStandard
                  ? suggestion.standardValue
                  : suggestion.rawValue;
                return {
                  key: `${suggestion.id}-${suggestion.matchField}-${fillValue}`,
                  value: fillValue,
                  label: byStandard
                    ? `${suggestion.standardValue}（${suggestion.rawValue}）`
                    : `${suggestion.rawValue}（${suggestion.standardValue}）`,
                };
              })}
              filterOption={() => true}
              listHeight={240}
              onChange={(value) => {
                const nextQ = String(value);
                setDraft((prev) => ({ ...prev, q: nextQ }));
                if (!nextQ.trim()) {
                  commitFilters({ ...draft, q: '' });
                }
              }}
              onSelect={(value) => {
                commitFilters({ ...draft, q: String(value) });
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
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            {t('customsDict.action.create')}
          </Button>
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
        title={modalTitle}
        onCancel={closeForm}
        onOk={showCreateSingleFooter ? () => void submitForm() : undefined}
        confirmLoading={submitting}
        destroyOnClose
        maskClosable={false}
        okText={t('customsDict.action.save')}
        cancelText={t('customsDict.action.cancel')}
        footer={showCreateSingleFooter ? undefined : importFooter}
        width={editingId == null ? 720 : undefined}
      >
        {editingId != null ? mappingForm : null}
        {editingId == null && showImportResult ? importResultPanel : null}
        {editingId == null && !showImportResult ? (
          <Tabs
            activeKey={createTab}
            onChange={(key) => {
              const next = key as CreateTabKey;
              setCreateTab(next);
              if (next === 'single') {
                resetImportDraft();
              }
            }}
            items={[
              {
                key: 'single',
                label: t('customsDict.modal.createTab.single'),
                children: mappingForm,
              },
              {
                key: 'import',
                label: t('customsDict.modal.createTab.import'),
                children: importPanel,
              },
            ]}
          />
        ) : null}
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
