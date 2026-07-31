import type {
  ComponentProps,
  Key,
  ReactElement,
  ReactNode,
} from 'react';
import {
  Children,
  useCallback,
  useEffect,
  useState,
} from 'react';
import BizTable from '@tendata-biz-components/biz-table';
import { PlusOutlined, ReloadOutlined } from '@tendata-ui/icon';
import {
  AutoComplete,
  Button,
  Card,
  Checkbox,
  Form,
  Input,
  Modal,
  Space,
  message,
} from 'tendata-ui';
import {
  batchDeleteCurrencies,
  createCurrency,
  listCurrencies,
  listCurrencySuggestions,
  updateCurrency,
  type Currency,
  type CurrencySuggestion,
} from '@/services/currency';
import { useTranslate } from '@/shared/hooks';
import { getApiErrorCode, getApiErrorMessage } from '@/shared/utils/apiError';
import styles from './index.module.less';

type ColumnsType = NonNullable<ComponentProps<typeof BizTable>['columns']>;
type CheckboxProps = {
  children?: ReactNode;
  checked?: boolean;
  onChange?: (event: { target: { checked: boolean } }) => void;
};

// tendata-ui 3.0.0 的声明文件遗漏了 Checkbox 本身的函数签名。
const TendataCheckbox = Checkbox as unknown as (
  props: CheckboxProps,
) => ReactElement;

const DEFAULT_PAGE_SIZE = 20;
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

type FormState = {
  name: string;
  code: string;
};

const emptyForm: FormState = { name: '', code: '' };

const CurrenciesView = () => {
  const t = useTranslate();
  const [items, setItems] = useState<Currency[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [q, setQ] = useState('');
  const [keyword, setKeyword] = useState('');
  const [suggestions, setSuggestions] = useState<CurrencySuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Currency | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([]);
  const [form] = Form.useForm<FormState>();

  const load = useCallback(async () => {
    setSelectedRowKeys([]);
    setLoading(true);
    try {
      const data = await listCurrencies({
        q: keyword || undefined,
        page,
        pageSize,
      });
      setItems(data.items ?? []);
      setTotal(data.total ?? 0);
    } catch (error) {
      message.error(getApiErrorMessage(error, '加载货币列表失败'));
    } finally {
      setLoading(false);
    }
  }, [keyword, page, pageSize]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const prefix = q.trim();
    if (!prefix) {
      setSuggestions([]);
      return undefined;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const data = await listCurrencySuggestions(
          prefix,
          'nameOrCode',
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
  }, [q]);

  const openCreate = () => {
    setEditing(null);
    form.setFieldsValue(emptyForm);
    setFormOpen(true);
  };

  const openEdit = (row: Currency) => {
    setEditing(row);
    form.setFieldsValue({ name: row.name, code: row.code ?? '' });
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
    form.resetFields();
  };

  const onSearch = () => {
    setSelectedRowKeys([]);
    setPage(1);
    setKeyword(q.trim());
  };

  const onResetSearch = () => {
    setQ('');
    setKeyword('');
    setSuggestions([]);
    setSelectedRowKeys([]);
    setPage(1);
  };

  const onSubmit = async (values: FormState) => {
    const name = values.name.trim();
    if (!name) {
      message.warning('请填写货币名称');
      return;
    }
    const code = values.code.trim();
    if (code && !/^[A-Za-z_]{1,10}$/.test(code)) {
      message.warning('货币字母代码须为 1~10 位字母或下划线，如 CNY');
      return;
    }
    setSubmitting(true);
    try {
      if (editing) {
        await updateCurrency(editing.id, { name, code: code ? code.toUpperCase() : null });
        message.success('已更新');
      } else {
        await createCurrency({ name, code: code ? code.toUpperCase() : null });
        message.success('已创建');
      }
      closeForm();
      await load();
    } catch (error) {
      message.error(getApiErrorMessage(error, '保存失败'));
    } finally {
      setSubmitting(false);
    }
  };

  const onBatchDelete = async () => {
    const ids = selectedRowKeys.map(Number);
    if (ids.length === 0) return;
    setDeleting(true);
    try {
      await batchDeleteCurrencies(ids);
      message.success(t('currencies.batchDelete.success', { count: ids.length }));
      setSelectedRowKeys([]);
      if (ids.length === items.length && page > 1) {
        setPage((current) => current - 1);
      } else {
        await load();
      }
    } catch (error) {
      message.error(getApiErrorMessage(error, t('currencies.batchDelete.failed')));
      if (getApiErrorCode(error) === 'BatchDelete.StaleSelection') {
        await load();
      }
    } finally {
      setDeleting(false);
    }
  };

  const openBatchDeleteConfirm = () => {
    Modal.confirm({
      // tendata-ui 的静态 Modal 类型误将 children 声明为必填；实际内容由 content 提供。
      children: Children,
      centered: true,
      title: t('currencies.batchDelete.confirmTitle', {
        count: selectedRowKeys.length,
      }),
      content: t('currencies.batchDelete.confirmContent'),
      onOk: onBatchDelete,
    });
  };

  const columns: ColumnsType = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 70,
    },
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
    },
    {
      title: '字母代码',
      dataIndex: 'code',
      key: 'code',
      width: 120,
      render: (code: string | null) => code || '—',
    },
    {
      title: '操作',
      key: 'actions',
      width: 100,
      render: (_value: unknown, row: Currency) => (
        <Button type="link" onClick={() => openEdit(row)}>
          编辑
        </Button>
      ),
    },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.pageAction}>
        <Button
          type="primary"
          icon={<PlusOutlined width={16} height={16} />}
          iconPosition="start"
          onClick={openCreate}
        >
          新建货币
        </Button>
      </div>
      <div className={styles.toolbar}>
        <strong className={styles.toolbarTitle}>
          {t('currencies.filters.title')}
        </strong>
        <Space wrap>
          <AutoComplete
            allowClear
            placeholder="搜索名称或字母代码"
            value={q}
            options={suggestions.map((suggestion) => ({
              key: `${suggestion.id}-${suggestion.matchField}`,
              value: suggestion.matchField === 'code'
                ? suggestion.code ?? suggestion.name
                : suggestion.name,
              label: suggestion.code
                ? `${suggestion.code} (${suggestion.name})`
                : suggestion.name,
            }))}
            filterOption={false}
            listHeight={240}
            onChange={(value) => setQ(String(value))}
            onSelect={(value) => {
              setQ(String(value));
              setSuggestions([]);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') onSearch();
            }}
            style={{ width: 240 }}
          />
          <Button
            type="link"
            icon={<ReloadOutlined width={16} height={16} />}
            iconPosition="start"
            onClick={onResetSearch}
          >
            {t('currencies.action.reset')}
          </Button>
          <Button type="primary" onClick={onSearch}>
            {t('currencies.action.search')}
          </Button>
        </Space>
        <div className={styles.batchToolbar}>
          <strong>{t('currencies.batchActions.title')}</strong>
          <div className={styles.batchToolbarActions}>
            <Space>
              <TendataCheckbox
                checked={
                  items.length > 0
                  && items.every((item) => selectedRowKeys.includes(item.id))
                }
                onChange={({ target }) => {
                  setSelectedRowKeys(target.checked ? items.map((item) => item.id) : []);
                }}
              >
                {t('currencies.batchActions.selectPage')}
              </TendataCheckbox>
              <span>
                {t('currencies.batchActions.selected', {
                  count: selectedRowKeys.length,
                })}
              </span>
              <fieldset
                disabled={selectedRowKeys.length === 0 || deleting}
                className={styles.batchDeleteFieldset}
              >
                <Button
                  danger
                  loading={deleting}
                  disabled={selectedRowKeys.length === 0}
                  onClick={openBatchDeleteConfirm}
                >
                  {t('currencies.batchDelete.button')}
                </Button>
              </fieldset>
            </Space>
          </div>
        </div>
      </div>

      <Modal
        title={editing ? '编辑货币' : '新建货币'}
        open={formOpen}
        okText="保存"
        cancelText="取消"
        confirmLoading={submitting}
        destroyOnClose
        maskClosable={false}
        onOk={() => form.submit()}
        onCancel={closeForm}
      >
        <Form<FormState>
          form={form}
          layout="vertical"
          initialValues={emptyForm}
          onFinish={onSubmit}
        >
          <Form.Item
            label="名称"
            name="name"
            rules={[{ required: true, message: '请填写货币名称' }]}
          >
            <Input maxLength={100} />
          </Form.Item>
          <Form.Item
            label="字母代码（可选）"
            name="code"
            rules={[{
              pattern: /^[A-Za-z_]{1,10}$/,
              message: '须为 1~10 位字母或下划线，如 CNY',
            }]}
          >
            <Input maxLength={10} placeholder="如 CNY、MYR_IM" />
          </Form.Item>
        </Form>
      </Modal>

      <Card>
        <BizTable
          rowKey="id"
          size="small"
          columns={columns}
          dataSource={items}
          rowSelection={{
            columnWidth: 32,
            selectedRowKeys,
            onChange: setSelectedRowKeys,
          }}
          tdLoading={loading}
          noData={{ text: '暂无数据' }}
          page={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            pageSizeOptions: PAGE_SIZE_OPTIONS,
            showTotal: (count) => `共 ${count} 条`,
          }}
          onChange={(pagination) => {
            setSelectedRowKeys([]);
            const nextPageSize = pagination.pageSize ?? pageSize;
            if (nextPageSize && nextPageSize !== pageSize) {
              setPageSize(nextPageSize);
              setPage(1);
              return;
            }
            setPage(pagination.current ?? 1);
          }}
        />
      </Card>
    </div>
  );
};

export default CurrenciesView;
