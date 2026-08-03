import type { ComponentProps } from 'react';
import {
  useCallback,
  useEffect,
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
import { useTranslate } from '@/shared/hooks';
import { getApiErrorMessage } from '@/shared/utils/apiError';
import styles from './index.module.less';

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
  const [draftEnabled, setDraftEnabled] = useState<string>('');
  const [appliedQ, setAppliedQ] = useState('');
  const [appliedEnabled, setAppliedEnabled] = useState<boolean | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CustomsDictTypeItem | null>(null);
  const [form] = Form.useForm<FormState>();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listCustomsDictTypes({
        q: appliedQ || undefined,
        enabled: appliedEnabled,
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
  }, [appliedEnabled, appliedQ, page, pageSize, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    form.setFieldsValue({ code: '', name: '' });
    setFormOpen(true);
  };

  const openEdit = (row: CustomsDictTypeItem) => {
    setEditing(row);
    form.setFieldsValue({ code: row.code, name: row.name });
    setFormOpen(true);
  };

  const submitForm = async () => {
    const values = await form.validateFields();
    setSubmitting(true);
    try {
      if (editing) {
        await updateCustomsDictType(editing.id, { name: values.name });
      } else {
        await createCustomsDictType({
          code: values.code,
          name: values.name,
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

  const onToggle = async (row: CustomsDictTypeItem) => {
    setSubmitting(true);
    try {
      if (row.enabled) {
        await disableCustomsDictType(row.id);
      } else {
        await enableCustomsDictType(row.id);
      }
      message.success(t('customsDict.message.saveSuccess'));
      await load();
    } catch (error) {
      message.error(getApiErrorMessage(error, t('customsDict.message.loadFailed')));
    } finally {
      setSubmitting(false);
    }
  };

  const columns: ColumnsType = [
    {
      title: t('customsDict.column.typeCode'),
      dataIndex: 'code',
      key: 'code',
    },
    {
      title: t('customsDict.column.typeName'),
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: t('customsDict.column.enabled'),
      dataIndex: 'enabled',
      key: 'enabled',
      render: (value: boolean) => (
        value ? t('customsDict.filter.enabled.true') : t('customsDict.filter.enabled.false')
      ),
    },
    {
      title: t('customsDict.column.mappingCount'),
      dataIndex: 'mappingCount',
      key: 'mappingCount',
    },
    {
      title: t('customsDict.column.actions'),
      key: 'actions',
      render: (_: unknown, row: CustomsDictTypeItem) => (
        <Space>
          <Button type="link" onClick={() => openEdit(row)}>
            {t('customsDict.action.edit')}
          </Button>
          <Button type="link" loading={submitting} onClick={() => void onToggle(row)}>
            {row.enabled
              ? t('customsDict.action.disable')
              : t('customsDict.action.enable')}
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.pageAction}>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          {t('customsDict.action.createType')}
        </Button>
      </div>

      <div className={styles.toolbar}>
        <Space wrap>
          <Input
            allowClear
            placeholder={t('customsDict.filter.typeKeyword')}
            value={draftQ}
            onChange={(event) => setDraftQ(event.target.value)}
            style={{ width: 200 }}
          />
          <Select
            allowClear
            placeholder={t('customsDict.filter.enabled')}
            options={[
              { label: t('customsDict.filter.enabled.true'), value: 'true' },
              { label: t('customsDict.filter.enabled.false'), value: 'false' },
            ]}
            value={draftEnabled || undefined}
            onChange={(value) => setDraftEnabled(value ?? '')}
            style={{ width: 140 }}
          />
          <Button
            type="primary"
            onClick={() => {
              setAppliedQ(draftQ.trim());
              setAppliedEnabled(
                draftEnabled === 'true' ? true : draftEnabled === 'false' ? false : undefined,
              );
              setPage(1);
            }}
          >
            {t('customsDict.action.search')}
          </Button>
          <Button
            onClick={() => {
              setDraftQ('');
              setDraftEnabled('');
              setAppliedQ('');
              setAppliedEnabled(undefined);
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

      <Card>
        <BizTable
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={items}
          page={{
            current: page,
            pageSize,
            total,
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
        title={editing
          ? t('customsDict.modal.editTypeTitle')
          : t('customsDict.modal.createTypeTitle')}
        onCancel={() => setFormOpen(false)}
        onOk={() => void submitForm()}
        confirmLoading={submitting}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="code"
            label={t('customsDict.form.typeCode')}
            rules={[{ required: true, message: t('customsDict.message.typeCodeRequired') }]}
          >
            <Input disabled={Boolean(editing)} placeholder="country" />
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
    </div>
  );
};

export default CustomsDictTypesView;
