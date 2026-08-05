import type {
  ComponentProps,
  Key,
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
  Drawer,
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
import QueryListCard from '@/shared/components/queryListCard';
import { useCanWrite, useTranslate } from '@/shared/hooks';
import listStyles from '@/shared/styles/listPage.module.less';
import { getApiErrorCode, getApiErrorMessage } from '@/shared/utils/apiError';

type ColumnsType = NonNullable<ComponentProps<typeof BizTable>['columns']>;

const DEFAULT_PAGE_SIZE = 20;
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

type FormState = {
  name: string;
  code: string;
};

const emptyForm: FormState = { name: '', code: '' };

const CurrenciesView = () => {
  const t = useTranslate();
  const canWrite = useCanWrite();
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
  const [editingId, setEditingId] = useState<number | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState<Currency | null>(null);
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
      message.error(getApiErrorMessage(error, t('currencies.message.loadFailed')));
    } finally {
      setLoading(false);
    }
  }, [keyword, page, pageSize, t]);

  useEffect(() => {
    void load();
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
    setEditingId(null);
    form.setFieldsValue(emptyForm);
    setFormOpen(true);
  };

  const openEdit = () => {
    if (!detail) return;
    setEditingId(detail.id);
    form.setFieldsValue({
      name: detail.name,
      code: detail.code ?? '',
    });
    setFormOpen(true);
  };

  const openDetail = (row: Currency) => {
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

  const commitKeyword = (nextQ: string) => {
    const trimmed = nextQ.trim();
    setQ(nextQ);
    setSuggestions([]);
    setSelectedRowKeys([]);
    setPage(1);
    setKeyword(trimmed);
  };

  const onSearch = () => {
    commitKeyword(q);
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
      message.warning(t('currencies.message.nameRequired'));
      return;
    }
    const code = values.code.trim();
    if (code && !/^[A-Za-z_]{1,10}$/.test(code)) {
      message.warning(t('currencies.message.codeInvalid'));
      return;
    }
    const payload = { name, code: code ? code.toUpperCase() : null };
    setSubmitting(true);
    try {
      if (editingId != null) {
        const updated = await updateCurrency(editingId, payload);
        message.success(t('currencies.message.updated'));
        setDetail(updated);
      } else {
        await createCurrency(payload);
        message.success(t('currencies.message.created'));
      }
      closeForm();
      await load();
    } catch (error) {
      message.error(getApiErrorMessage(error, t('currencies.message.saveFailed')));
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
      title: t('currencies.column.name'),
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (value: string, row: Currency) => (
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
      title: t('currencies.column.code'),
      dataIndex: 'code',
      key: 'code',
      width: 120,
      render: (code: string | null) => code || '—',
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
            <AutoComplete
              allowClear
              placeholder={t('currencies.search.placeholder')}
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
              onChange={(value) => {
                const next = String(value);
                setQ(next);
                if (!next.trim()) {
                  commitKeyword('');
                }
              }}
              onSelect={(value) => {
                commitKeyword(String(value));
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') commitKeyword(q);
              }}
              style={{ width: 160 }}
            />
          </Space>
          <Space wrap className={listStyles.toolbarActions}>
            <Button type="primary" onClick={onSearch}>
              {t('common.action.query')}
            </Button>
            <Button onClick={onResetSearch}>
              {t('currencies.action.reset')}
            </Button>
            <Button type="link" icon={<ReloadOutlined />} onClick={() => void load()}>
              {t('currencies.action.refresh')}
            </Button>
          </Space>
        </div>
      </div>

      <QueryListCard
        title={t('common.queryList')}
        actions={canWrite ? (
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            {t('currencies.action.create')}
          </Button>
        ) : undefined}
        selectionCount={canWrite ? selectedRowKeys.length : 0}
        selectionActions={canWrite ? (
          <Button
            danger
            loading={deleting}
            onClick={openBatchDeleteConfirm}
          >
            {t('currencies.batchDelete.button')}
          </Button>
        ) : undefined}
      >
        <BizTable
          rowKey="id"
          columns={columns}
          dataSource={items}
          rowClassName={() => listStyles.clickableRow}
          rowSelection={canWrite ? {
            columnWidth: 32,
            selectedRowKeys,
            onChange: setSelectedRowKeys,
            getCheckboxProps: () => ({
              onClick: (event: React.MouseEvent) => event.stopPropagation(),
            }),
          } : undefined}
          onRow={(row: Currency) => ({
            onClick: () => openDetail(row),
          })}
          tdLoading={loading}
          noData={{ text: t('currencies.empty') }}
          page={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            pageSizeOptions: PAGE_SIZE_OPTIONS,
            showTotal: (count) => t('currencies.total', { total: count }),
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
        title={editingId != null
          ? t('currencies.modal.editTitle')
          : t('currencies.modal.createTitle')}
        open={formOpen}
        okText={t('currencies.action.save')}
        cancelText={t('currencies.action.cancel')}
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
            label={t('currencies.form.name')}
            name="name"
            rules={[{ required: true, message: t('currencies.message.nameRequired') }]}
          >
            <Input maxLength={100} />
          </Form.Item>
          <Form.Item
            label={t('currencies.form.code')}
            name="code"
            rules={[{
              pattern: /^[A-Za-z_]{1,10}$/,
              message: t('currencies.message.codePattern'),
            }]}
          >
            <Input maxLength={10} placeholder={t('currencies.form.codePlaceholder')} />
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        open={detailOpen}
        title={t('currencies.modal.detailTitle')}
        width={480}
        destroyOnClose
        onClose={closeDetail}
      >
        {detail ? (
          <div className={listStyles.detailGrid}>
            <div className={listStyles.detailRow}>
              <span className={listStyles.detailLabel}>{t('currencies.column.id')}</span>
              <span className={listStyles.detailValue}>{detail.id}</span>
            </div>
            <div className={listStyles.detailRow}>
              <span className={listStyles.detailLabel}>{t('currencies.column.name')}</span>
              <span className={listStyles.detailValue}>{detail.name}</span>
            </div>
            <div className={listStyles.detailRow}>
              <span className={listStyles.detailLabel}>{t('currencies.column.code')}</span>
              <span className={listStyles.detailValue}>{detail.code || '—'}</span>
            </div>
            <div className={listStyles.detailActions}>
              {canWrite ? (
                <Button type="primary" onClick={openEdit}>
                  {t('currencies.action.edit')}
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}
      </Drawer>
    </div>
  );
};

export default CurrenciesView;
