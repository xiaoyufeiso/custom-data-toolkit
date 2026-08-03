import type { ComponentProps, Key } from 'react';
import {
  useCallback,
  useEffect,
  useState,
} from 'react';
import BizTable from '@tendata-biz-components/biz-table';
import { PlusOutlined, ReloadOutlined } from '@tendata-ui/icon';
import {
  Button,
  Drawer,
  Form,
  Input,
  Modal,
  Space,
  message,
} from 'tendata-ui';
import {
  createCustomsDictType,
  disableCustomsDictType,
  enableCustomsDictType,
  listCustomsDictTypes,
  updateCustomsDictType,
  type CustomsDictTypeItem,
} from '@/services/customsDict';
import QueryListCard from '@/shared/components/queryListCard';
import { useTranslate } from '@/shared/hooks';
import listStyles from '@/shared/styles/listPage.module.less';
import { getApiErrorCode, getApiErrorMessage } from '@/shared/utils/apiError';

type ColumnsType = NonNullable<ComponentProps<typeof BizTable>['columns']>;

const DEFAULT_PAGE_SIZE = 20;

type FormState = {
  code: string;
  name: string;
};

const CustomsDictTypesView = () => {
  const t = useTranslate();
  const [items, setItems] = useState<CustomsDictTypeItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [draftQ, setDraftQ] = useState('');
  const [appliedQ, setAppliedQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [batchDisableLoading, setBatchDisableLoading] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState<CustomsDictTypeItem | null>(null);
  const [form] = Form.useForm<FormState>();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listCustomsDictTypes({
        q: appliedQ || undefined,
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
  }, [appliedQ, page, pageSize, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditingId(null);
    form.setFieldsValue({ code: '', name: '' });
    setFormOpen(true);
  };

  const openEdit = () => {
    if (!detail) return;
    setEditingId(detail.id);
    form.setFieldsValue({ code: detail.code, name: detail.name });
    setFormOpen(true);
  };

  const openDetail = (row: CustomsDictTypeItem) => {
    setDetail(row);
    setDetailOpen(true);
  };

  const closeDetail = () => {
    setDetailOpen(false);
    setDetail(null);
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
        const updated = await updateCustomsDictType(editingId, {
          name: values.name.trim(),
        });
        setDetail(updated);
      } else {
        await createCustomsDictType({
          code: values.code,
          name: values.name,
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

  const onToggle = async (row: CustomsDictTypeItem) => {
    setSubmitting(true);
    try {
      const updated = row.enabled
        ? await disableCustomsDictType(row.id)
        : await enableCustomsDictType(row.id);
      setDetail(updated);
      message.success(t('customsDict.message.saveSuccess'));
      await load();
    } catch (error) {
      message.error(getApiErrorMessage(error, t('customsDict.message.loadFailed')));
    } finally {
      setSubmitting(false);
    }
  };

  const onBatchDisable = async () => {
    const ids = selectedRowKeys.map(Number);
    if (ids.length === 0) return;
    setBatchDisableLoading(true);
    let success = 0;
    const errors: string[] = [];
    try {
      for (const id of ids) {
        const row = items.find((item) => item.id === id);
        if (row && !row.enabled) continue;
        try {
          await disableCustomsDictType(id);
          success += 1;
        } catch (error) {
          errors.push(
            getApiErrorMessage(
              error,
              getApiErrorCode(error) === 'CustomsDictType.HasMappings'
                ? t('customsDict.batchDisable.hasMappings')
                : t('customsDict.batchDisable.failed'),
            ),
          );
        }
      }
      if (success > 0 && errors.length === 0) {
        message.success(t('customsDict.batchDisable.success', { count: success }));
      } else if (success > 0 && errors.length > 0) {
        message.warning(t('customsDict.batchDisable.partial', {
          success,
          failed: errors.length,
        }));
      } else if (errors.length > 0) {
        message.error(errors[0]);
      }
      setSelectedRowKeys([]);
      await load();
    } finally {
      setBatchDisableLoading(false);
    }
  };

  const columns: ColumnsType = [
    {
      title: t('customsDict.column.typeCode'),
      dataIndex: 'code',
      key: 'code',
      render: (value: string, row: CustomsDictTypeItem) => (
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
      title: t('customsDict.column.typeName'),
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: t('customsDict.column.mappingCount'),
      dataIndex: 'mappingCount',
      key: 'mappingCount',
    },
  ];

  return (
    <div className={listStyles.page}>
      <div className={listStyles.toolbar}>
        <strong className={listStyles.toolbarTitle}>
          {t('common.filters.title')}
        </strong>
        <Space wrap>
          <Input
            allowClear
            placeholder={t('customsDict.filter.typeKeyword')}
            value={draftQ}
            onChange={(event) => setDraftQ(event.target.value)}
            style={{ width: 200 }}
          />
          <Button
            type="primary"
            onClick={() => {
              setAppliedQ(draftQ.trim());
              setSelectedRowKeys([]);
              setPage(1);
            }}
          >
            {t('customsDict.action.search')}
          </Button>
          <Button
            onClick={() => {
              setDraftQ('');
              setAppliedQ('');
              setSelectedRowKeys([]);
              setPage(1);
            }}
          >
            {t('customsDict.action.reset')}
          </Button>
          <Button type="link" icon={<ReloadOutlined />} onClick={() => void load()}>
            {t('customsDict.action.refresh')}
          </Button>
        </Space>
      </div>

      <QueryListCard
        title={t('common.queryList')}
        actions={(
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            {t('customsDict.action.createType')}
          </Button>
        )}
        selectionCount={selectedRowKeys.length}
        selectionLabel={t('common.batchActions.selected', {
          count: selectedRowKeys.length,
        })}
        selectionActions={(
          <Button
            danger
            loading={batchDisableLoading}
            onClick={() => void onBatchDisable()}
          >
            {t('customsDict.batchDisable.button')}
          </Button>
        )}
      >
        <BizTable
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={items}
          rowClassName={() => listStyles.clickableRow}
          rowSelection={{
            columnWidth: 32,
            selectedRowKeys,
            onChange: setSelectedRowKeys,
            getCheckboxProps: () => ({
              onClick: (event: React.MouseEvent) => event.stopPropagation(),
            }),
          }}
          onRow={(row: CustomsDictTypeItem) => ({
            onClick: () => openDetail(row),
          })}
          page={{
            current: page,
            pageSize,
            total,
            showTotal: (count: number) => t('customsDict.total', { total: count }),
          }}
          onChange={(pagination) => {
            setSelectedRowKeys([]);
            setPage(pagination.current ?? 1);
            setPageSize(pagination.pageSize ?? DEFAULT_PAGE_SIZE);
          }}
        />
      </QueryListCard>

      <Modal
        open={formOpen}
        title={editingId != null
          ? t('customsDict.modal.editTypeTitle')
          : t('customsDict.modal.createTypeTitle')}
        okText={t('customsDict.action.save')}
        cancelText={t('customsDict.action.cancel')}
        onCancel={closeForm}
        onOk={() => void submitForm()}
        confirmLoading={submitting}
        destroyOnClose
        maskClosable={false}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="code"
            label={t('customsDict.form.typeCode')}
            rules={[{ required: true, message: t('customsDict.message.typeCodeRequired') }]}
          >
            <Input placeholder="country" disabled={editingId != null} />
          </Form.Item>
          <Form.Item
            name="name"
            label={t('customsDict.form.typeName')}
            rules={[{ required: true, message: t('customsDict.message.typeNameRequired') }]}
          >
            <Input />
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        open={detailOpen}
        title={t('customsDict.modal.typeDetailTitle')}
        width={480}
        destroyOnClose
        onClose={closeDetail}
      >
        {detail ? (
          <div className={listStyles.detailGrid}>
            <div className={listStyles.detailRow}>
              <span className={listStyles.detailLabel}>{t('customsDict.column.typeCode')}</span>
              <span className={listStyles.detailValue}>{detail.code}</span>
            </div>
            <div className={listStyles.detailRow}>
              <span className={listStyles.detailLabel}>{t('customsDict.column.typeName')}</span>
              <span className={listStyles.detailValue}>{detail.name}</span>
            </div>
            <div className={listStyles.detailRow}>
              <span className={listStyles.detailLabel}>{t('customsDict.column.enabled')}</span>
              <span className={listStyles.detailValue}>
                {detail.enabled
                  ? t('customsDict.filter.enabled.true')
                  : t('customsDict.filter.enabled.false')}
              </span>
            </div>
            <div className={listStyles.detailRow}>
              <span className={listStyles.detailLabel}>{t('customsDict.column.mappingCount')}</span>
              <span className={listStyles.detailValue}>{detail.mappingCount}</span>
            </div>
            <div className={listStyles.detailActions}>
              <Button type="primary" onClick={openEdit}>
                {t('customsDict.action.edit')}
              </Button>
              <Button loading={submitting} onClick={() => void onToggle(detail)}>
                {detail.enabled
                  ? t('customsDict.action.disable')
                  : t('customsDict.action.enable')}
              </Button>
            </div>
          </div>
        ) : null}
      </Drawer>
    </div>
  );
};

export default CustomsDictTypesView;
