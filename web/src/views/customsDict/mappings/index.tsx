import type { ComponentProps, Key } from 'react';
import {
  Children,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import BizTable from '@tendata-biz-components/biz-table';
import { PlusOutlined, ReloadOutlined } from '@tendata-ui/icon';
import {
  Button,
  Card,
  Checkbox,
  Drawer,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Typography,
  message,
} from 'tendata-ui';
import {
  batchDisableCustomsDictMappings,
  batchResyncCustomsDictMappings,
  createCustomsDictMapping,
  listCustomsDictMappings,
  updateCustomsDictMapping,
  type CustomsDictMapping,
} from '@/services/customsDict';
import { useTranslate } from '@/shared/hooks';
import { getApiErrorCode, getApiErrorMessage } from '@/shared/utils/apiError';
import styles from './index.module.less';

type ColumnsType = NonNullable<ComponentProps<typeof BizTable>['columns']>;

const DEFAULT_PAGE_SIZE = 20;

type CheckboxProps = {
  checked?: boolean;
  children?: React.ReactNode;
  onChange?: (event: { target: { checked: boolean } }) => void;
};

const TendataCheckbox = Checkbox as unknown as (
  props: CheckboxProps,
) => React.ReactElement;

type FilterDraft = {
  dictType?: string;
  rawValue: string;
  standardValue: string;
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
    rawValue: '',
    standardValue: '',
  });
  const [applied, setApplied] = useState<FilterDraft>({
    rawValue: '',
    standardValue: '',
  });
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailEditing, setDetailEditing] = useState(false);
  const [detail, setDetail] = useState<CustomsDictMapping | null>(null);
  const [editStandardValue, setEditStandardValue] = useState('');
  const [form] = Form.useForm<FormState>();

  const typeOptions = useMemo(
    () => [
      { label: t('customsDict.type.country'), value: 'country' },
      { label: t('customsDict.type.continent'), value: 'continent' },
    ],
    [t],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listCustomsDictMappings({
        dictType: applied.dictType,
        rawValue: applied.rawValue || undefined,
        standardValue: applied.standardValue || undefined,
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

  const syncLabel = (status: string) => {
    if (status === 'synced') return t('customsDict.sync.synced');
    if (status === 'pending') return t('customsDict.sync.pending');
    if (status === 'failed') return t('customsDict.sync.failed');
    return status;
  };

  const typeLabel = (dictType: string) => {
    if (dictType === 'country') return t('customsDict.type.country');
    if (dictType === 'continent') return t('customsDict.type.continent');
    return dictType;
  };

  const closeDetail = () => {
    setDetailOpen(false);
    setDetailEditing(false);
    setEditStandardValue('');
  };

  const openDetail = (row: CustomsDictMapping) => {
    setDetail(row);
    setDetailEditing(false);
    setEditStandardValue(row.standardValue);
    setDetailOpen(true);
  };

  const startDetailEdit = () => {
    if (!detail) return;
    setEditStandardValue(detail.standardValue);
    setDetailEditing(true);
  };

  const cancelDetailEdit = () => {
    if (detail) {
      setEditStandardValue(detail.standardValue);
    }
    setDetailEditing(false);
  };

  const saveDetailEdit = async () => {
    if (!detail) return;
    const nextValue = editStandardValue.trim();
    if (!nextValue) {
      message.warning(t('customsDict.message.standardRequired'));
      return;
    }
    setSubmitting(true);
    try {
      const updated = await updateCustomsDictMapping(detail.id, {
        standardValue: nextValue,
      });
      setDetail(updated);
      setEditStandardValue(updated.standardValue);
      setDetailEditing(false);
      message.success(t('customsDict.message.saveSuccess'));
      await load();
    } catch (error) {
      message.error(getApiErrorMessage(error, t('customsDict.message.loadFailed')));
    } finally {
      setSubmitting(false);
    }
  };

  const openCreate = () => {
    form.setFieldsValue(emptyForm);
    setFormOpen(true);
  };

  const submitForm = async () => {
    const values = await form.validateFields();
    setSubmitting(true);
    try {
      await createCustomsDictMapping({
        dictType: values.dictType,
        rawValue: values.rawValue.trim(),
        standardValue: values.standardValue.trim(),
      });
      message.success(t('customsDict.message.saveSuccess'));
      setFormOpen(false);
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
    setBatchLoading(true);
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
      setBatchLoading(false);
    }
  };

  const onBatchResync = async () => {
    const ids = selectedRowKeys.map(Number);
    if (ids.length === 0) return;
    setBatchLoading(true);
    try {
      const result = await batchResyncCustomsDictMappings(ids);
      message.success(t('customsDict.batchResync.success', {
        synced: result.synced,
        failed: result.failed,
      }));
      const failedSet = new Set(result.failedIds ?? []);
      setSelectedRowKeys(ids.filter((id) => failedSet.has(id)));
      await load();
    } catch (error) {
      message.error(getApiErrorMessage(error, t('customsDict.batchResync.failed')));
      if (getApiErrorCode(error) === 'BatchDelete.StaleSelection') {
        await load();
      }
    } finally {
      setBatchLoading(false);
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
      title: t('customsDict.column.standardValue'),
      dataIndex: 'standardValue',
      key: 'standardValue',
    },
    {
      title: t('customsDict.column.syncStatus'),
      dataIndex: 'syncStatus',
      key: 'syncStatus',
      render: (status: string) => (
        <span className={status === 'failed' ? styles.syncFailed : undefined}>
          {syncLabel(status)}
        </span>
      ),
    },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.pageAction}>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          {t('customsDict.action.create')}
        </Button>
      </div>

      <div className={styles.toolbar}>
        <Typography.Text strong className={styles.toolbarTitle}>
          {t('customsDict.mappings.title')}
        </Typography.Text>
        <Space wrap>
          <Select
            allowClear
            placeholder={t('customsDict.filter.dictType')}
            style={{ width: 140 }}
            options={typeOptions}
            value={draft.dictType}
            onChange={(value) => setDraft((prev) => ({ ...prev, dictType: value }))}
          />
          <Input
            allowClear
            placeholder={t('customsDict.filter.rawValue')}
            style={{ width: 180 }}
            value={draft.rawValue}
            onChange={(event) => setDraft((prev) => ({
              ...prev,
              rawValue: event.target.value,
            }))}
          />
          <Input
            allowClear
            placeholder={t('customsDict.filter.standardValue')}
            style={{ width: 180 }}
            value={draft.standardValue}
            onChange={(event) => setDraft((prev) => ({
              ...prev,
              standardValue: event.target.value,
            }))}
          />
          <Button
            type="primary"
            onClick={() => {
              setPage(1);
              setSelectedRowKeys([]);
              setApplied({ ...draft });
            }}
          >
            {t('customsDict.action.search')}
          </Button>
          <Button
            onClick={() => {
              const reset = { rawValue: '', standardValue: '' };
              setDraft(reset);
              setApplied(reset);
              setSelectedRowKeys([]);
              setPage(1);
            }}
          >
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
        <div className={styles.batchToolbar}>
          <strong>{t('customsDict.batchActions.title')}</strong>
          <div className={styles.batchToolbarActions}>
            <Space wrap>
              <TendataCheckbox
                checked={
                  items.length > 0
                  && items.every((item) => selectedRowKeys.includes(item.id))
                }
                onChange={({ target }) => {
                  setSelectedRowKeys(target.checked ? items.map((item) => item.id) : []);
                }}
              >
                {t('customsDict.batchActions.selectPage')}
              </TendataCheckbox>
              <span>
                {t('customsDict.batchActions.selected', {
                  count: selectedRowKeys.length,
                })}
              </span>
              <fieldset
                disabled={selectedRowKeys.length === 0 || batchLoading}
                className={styles.batchDeleteFieldset}
              >
                <Space>
                  <Button
                    danger
                    loading={batchLoading}
                    disabled={selectedRowKeys.length === 0}
                    onClick={openBatchDeleteConfirm}
                  >
                    {t('customsDict.batchDelete.button')}
                  </Button>
                  <Button
                    loading={batchLoading}
                    disabled={selectedRowKeys.length === 0}
                    onClick={openBatchResyncConfirm}
                  >
                    {t('customsDict.batchResync.button')}
                  </Button>
                </Space>
              </fieldset>
            </Space>
          </div>
        </div>
      </div>

      <Card>
        <BizTable
          rowKey="id"
          columns={columns}
          dataSource={items}
          tdLoading={loading}
          locale={{ emptyText: t('customsDict.empty') }}
          rowClassName={() => styles.clickableRow}
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
            showTotal: (count: number) => t('customsDict.total', { total: count }),
          }}
          onChange={(pagination) => {
            setSelectedRowKeys([]);
            setPage(pagination.current ?? 1);
            setPageSize(pagination.pageSize ?? DEFAULT_PAGE_SIZE);
          }}
        />
      </Card>

      <Modal
        open={formOpen}
        title={t('customsDict.modal.createTitle')}
        onCancel={() => setFormOpen(false)}
        onOk={submitForm}
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
            <Select options={typeOptions} />
          </Form.Item>
          <Form.Item
            name="rawValue"
            label={t('customsDict.form.rawValue')}
            rules={[{ required: true, message: t('customsDict.message.rawRequired') }]}
          >
            <Input />
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
        maskClosable={!detailEditing}
        onClose={closeDetail}
        footer={(
          <div className={styles.detailFooter}>
            {detailEditing ? (
              <Space>
                <Button onClick={cancelDetailEdit} disabled={submitting}>
                  {t('customsDict.action.cancel')}
                </Button>
                <Button type="primary" loading={submitting} onClick={saveDetailEdit}>
                  {t('customsDict.action.save')}
                </Button>
              </Space>
            ) : (
              <Button type="primary" onClick={startDetailEdit}>
                {t('customsDict.action.edit')}
              </Button>
            )}
          </div>
        )}
      >
        {detail && (
          <div className={styles.detailGrid}>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>{t('customsDict.column.dictType')}</span>
              <span className={styles.detailValue}>{typeLabel(detail.dictType)}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>{t('customsDict.column.rawValue')}</span>
              <span className={styles.detailValue}>{detail.rawValue}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>{t('customsDict.column.standardValue')}</span>
              <span className={styles.detailValue}>
                {detailEditing ? (
                  <Input
                    value={editStandardValue}
                    onChange={(event) => setEditStandardValue(event.target.value)}
                    aria-label={t('customsDict.form.standardValue')}
                  />
                ) : (
                  detail.standardValue
                )}
              </span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>{t('customsDict.column.syncStatus')}</span>
              <span className={styles.detailValue}>
                {syncLabel(detail.syncStatus)}
                {detail.syncError ? (
                  <div className={styles.syncFailed}>{detail.syncError}</div>
                ) : null}
              </span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>{t('customsDict.column.source')}</span>
              <span className={styles.detailValue}>{detail.source}</span>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default CustomsDictMappingsView;
