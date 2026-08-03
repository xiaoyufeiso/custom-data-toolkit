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
  Form,
  Input,
  Modal,
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
  const [handleOpen, setHandleOpen] = useState(false);
  const [current, setCurrent] = useState<CustomsDictMissingItem | null>(null);
  const [form] = Form.useForm<{ standardValue: string }>();

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

  const openHandle = (row: CustomsDictMissingItem) => {
    setCurrent(row);
    form.setFieldsValue({ standardValue: '' });
    setHandleOpen(true);
  };

  const submitHandle = async () => {
    if (!current) return;
    const values = await form.validateFields();
    setSubmitting(true);
    try {
      await handleCustomsDictMissing({
        dictType: current.dictType,
        rawValue: current.rawValue,
        standardValue: values.standardValue.trim(),
      });
      message.success(t('customsDict.message.handleSuccess'));
      setHandleOpen(false);
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
    },
    {
      title: t('customsDict.column.occurrenceCount'),
      dataIndex: 'occurrenceCount',
      key: 'occurrenceCount',
    },
    {
      title: t('customsDict.column.actions'),
      key: 'actions',
      render: (_: unknown, row: CustomsDictMissingItem) => (
        <Button type="link" onClick={() => openHandle(row)}>
          {t('customsDict.action.handle')}
        </Button>
      ),
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
            type="link"
            onClick={() => {
              const reset = { dictType: 'country', rawValue: '' };
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
          rowKey={(row: CustomsDictMissingItem) => `${row.dictType}:${row.rawValue}`}
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
        open={handleOpen}
        title={t('customsDict.modal.handleTitle')}
        onCancel={() => setHandleOpen(false)}
        onOk={submitHandle}
        confirmLoading={submitting}
        destroyOnClose
        maskClosable={false}
        okText={t('customsDict.action.save')}
        cancelText={t('customsDict.action.cancel')}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <div>{`${t('customsDict.column.dictType')}: ${current?.dictTypeLabel ?? ''}`}</div>
          <div>{`${t('customsDict.column.rawValue')}: ${current?.rawValue ?? ''}`}</div>
          <div>
            {`${t('customsDict.column.occurrenceCount')}: ${current?.occurrenceCount ?? ''}`}
          </div>
          <Form form={form} layout="vertical">
            <Form.Item
              name="standardValue"
              label={t('customsDict.form.standardValue')}
              rules={[{ required: true, message: t('customsDict.message.standardRequired') }]}
            >
              <Input />
            </Form.Item>
          </Form>
        </Space>
      </Modal>
    </div>
  );
};

export default CustomsDictMissingView;
