import type { ComponentProps } from 'react';
import {
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
  Form,
  Input,
  Modal,
  Select,
  Space,
  Tag,
  Typography,
  message,
} from 'tendata-ui';
import {
  createCustomsDictMapping,
  disableCustomsDictMapping,
  enableCustomsDictMapping,
  listCustomsDictMappings,
  replayCustomsDictSync,
  resyncCustomsDictMapping,
  updateCustomsDictMapping,
  type CustomsDictMapping,
} from '@/services/customsDict';
import { useTranslate } from '@/shared/hooks';
import { getApiErrorMessage } from '@/shared/utils/apiError';
import styles from './index.module.less';

type ColumnsType = NonNullable<ComponentProps<typeof BizTable>['columns']>;

const DEFAULT_PAGE_SIZE = 20;

type FilterDraft = {
  dictType?: string;
  rawValue: string;
  standardValue: string;
  enabled?: boolean;
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
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editing, setEditing] = useState<CustomsDictMapping | null>(null);
  const [detail, setDetail] = useState<CustomsDictMapping | null>(null);
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
        enabled: applied.enabled,
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

  const openCreate = () => {
    setEditing(null);
    form.setFieldsValue(emptyForm);
    setFormOpen(true);
  };

  const openEdit = (row: CustomsDictMapping) => {
    setEditing(row);
    form.setFieldsValue({
      dictType: row.dictType,
      rawValue: row.rawValue,
      standardValue: row.standardValue,
    });
    setFormOpen(true);
  };

  const submitForm = async () => {
    const values = await form.validateFields();
    setSubmitting(true);
    try {
      if (editing) {
        await updateCustomsDictMapping(editing.id, {
          standardValue: values.standardValue.trim(),
        });
      } else {
        await createCustomsDictMapping({
          dictType: values.dictType,
          rawValue: values.rawValue.trim(),
          standardValue: values.standardValue.trim(),
        });
      }
      message.success(t('customsDict.message.saveSuccess'));
      setFormOpen(false);
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
      dataIndex: 'dictType',
      key: 'dictType',
      render: (value: string) => typeLabel(value),
    },
    {
      title: t('customsDict.column.rawValue'),
      dataIndex: 'rawValue',
      key: 'rawValue',
    },
    {
      title: t('customsDict.column.standardValue'),
      dataIndex: 'standardValue',
      key: 'standardValue',
    },
    {
      title: t('customsDict.column.enabled'),
      dataIndex: 'enabled',
      key: 'enabled',
      render: (enabled: boolean) => (
        <Tag color={enabled ? 'success' : 'default'}>
          {enabled
            ? t('customsDict.filter.enabled.true')
            : t('customsDict.filter.enabled.false')}
        </Tag>
      ),
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
    {
      title: t('customsDict.column.actions'),
      key: 'actions',
      render: (_: unknown, row: CustomsDictMapping) => (
        <Space size="small" wrap>
          <Button type="link" onClick={() => { setDetail(row); setDetailOpen(true); }}>
            {t('customsDict.modal.detailTitle')}
          </Button>
          <Button type="link" onClick={() => openEdit(row)}>
            {t('customsDict.action.edit')}
          </Button>
          {row.enabled ? (
            <Button
              type="link"
              onClick={() => {
                Modal.confirm({
                  title: t('customsDict.confirm.disable'),
                  onOk: async () => {
                    await disableCustomsDictMapping(row.id);
                    await load();
                  },
                });
              }}
            >
              {t('customsDict.action.disable')}
            </Button>
          ) : (
            <Button
              type="link"
              onClick={() => {
                Modal.confirm({
                  title: t('customsDict.confirm.enable'),
                  onOk: async () => {
                    await enableCustomsDictMapping(row.id);
                    await load();
                  },
                });
              }}
            >
              {t('customsDict.action.enable')}
            </Button>
          )}
          <Button
            type="link"
            onClick={async () => {
              try {
                await resyncCustomsDictMapping(row.id);
                message.success(t('customsDict.message.resyncSuccess'));
                await load();
              } catch (error) {
                message.error(getApiErrorMessage(error, t('customsDict.message.loadFailed')));
              }
            }}
          >
            {t('customsDict.action.resync')}
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.pageAction}>
        <Space>
          <Button
            onClick={() => {
              const dictType = applied.dictType ?? draft.dictType;
              if (!dictType) {
                message.warning(t('customsDict.message.dictTypeRequired'));
                return;
              }
              Modal.confirm({
                title: t('customsDict.confirm.replay'),
                onOk: async () => {
                  const result = await replayCustomsDictSync(dictType);
                  message.success(
                    t('customsDict.message.replaySuccess', {
                      synced: result.synced,
                      failed: result.failed,
                    }),
                  );
                  await load();
                },
              });
            }}
          >
            {t('customsDict.action.replaySync')}
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            {t('customsDict.action.create')}
          </Button>
        </Space>
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
          <Select
            allowClear
            placeholder={t('customsDict.filter.enabled')}
            style={{ width: 120 }}
            options={[
              { label: t('customsDict.filter.enabled.true'), value: true },
              { label: t('customsDict.filter.enabled.false'), value: false },
            ]}
            value={draft.enabled}
            onChange={(value) => setDraft((prev) => ({ ...prev, enabled: value }))}
          />
          <Button
            type="primary"
            onClick={() => {
              setPage(1);
              setApplied({ ...draft });
            }}
          >
            {t('customsDict.action.search')}
          </Button>
          <Button
            type="link"
            onClick={() => {
              const reset = { rawValue: '', standardValue: '' };
              setDraft(reset);
              setApplied(reset);
              setPage(1);
            }}
          >
            {t('customsDict.action.reset')}
          </Button>
          <Button icon={<ReloadOutlined />} onClick={() => load()}>
            {t('customsDict.action.refresh')}
          </Button>
        </Space>
      </div>

      <Card>
        <BizTable
          rowKey="id"
          columns={columns}
          dataSource={items}
          tdLoading={loading}
          locale={{ emptyText: t('customsDict.empty') }}
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

      <Modal
        open={formOpen}
        title={editing ? t('customsDict.modal.editTitle') : t('customsDict.modal.createTitle')}
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
            <Select options={typeOptions} disabled={Boolean(editing)} />
          </Form.Item>
          <Form.Item
            name="rawValue"
            label={t('customsDict.form.rawValue')}
            rules={[{ required: true, message: t('customsDict.message.rawRequired') }]}
            extra={editing ? t('customsDict.form.rawValueReadonly') : undefined}
          >
            <Input disabled={Boolean(editing)} />
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

      <Modal
        open={detailOpen}
        title={t('customsDict.modal.detailTitle')}
        footer={null}
        onCancel={() => setDetailOpen(false)}
        destroyOnClose
      >
        {detail && (
          <Space direction="vertical" size="small">
            <div>{`${t('customsDict.column.dictType')}: ${typeLabel(detail.dictType)}`}</div>
            <div>{`${t('customsDict.column.rawValue')}: ${detail.rawValue}`}</div>
            <div>{`${t('customsDict.column.standardValue')}: ${detail.standardValue}`}</div>
            <div>{`${t('customsDict.column.enabled')}: ${
              detail.enabled
                ? t('customsDict.filter.enabled.true')
                : t('customsDict.filter.enabled.false')
            }`}
            </div>
            <div>{`${t('customsDict.column.syncStatus')}: ${syncLabel(detail.syncStatus)}`}</div>
            <div>{`${t('customsDict.column.source')}: ${detail.source}`}</div>
            {detail.syncError ? <div className={styles.syncFailed}>{detail.syncError}</div> : null}
          </Space>
        )}
      </Modal>
    </div>
  );
};

export default CustomsDictMappingsView;
