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
import dayjs, { type Dayjs } from 'dayjs';
import {
  AutoComplete,
  Button,
  Checkbox,
  DatePicker,
  Drawer,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Tag,
  message,
} from 'tendata-ui';
import {
  listCurrencies,
  listCurrencySuggestions,
  type Currency,
  type CurrencySuggestion,
} from '@/services/currency';
import {
  batchCheckRates,
  batchDeleteRates,
  createRate,
  listRates,
  updateRate,
  type Rate,
} from '@/services/rate';
import QueryListCard from '@/shared/components/queryListCard';
import { useTranslate } from '@/shared/hooks';
import listStyles from '@/shared/styles/listPage.module.less';
import { getApiErrorCode, getApiErrorMessage } from '@/shared/utils/apiError';
import CurrencyPicker from './CurrencyPicker';
import { fetchAllCurrencies } from './currencyPickerUtils';

const DEFAULT_PAGE_SIZE = 20;
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

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

type DateMode = 'single' | 'range';

type DateSortOrder = 'asc' | 'desc';

type FilterDraft = {
  code: string;
  dateMode?: DateMode;
  date: string;
  dateFrom: string;
  dateTo: string;
  checked?: 'true' | 'false';
  /** undefined = 未激活（箭头灰色）；后端未传时默认按日期倒序 */
  sortOrder?: DateSortOrder;
};

type AppliedFilter = {
  code?: string;
  date?: string;
  dateFrom?: string;
  dateTo?: string;
  checked?: boolean;
  sortOrder?: DateSortOrder;
};

/** 日期排序三态：未激活 → 正序 → 倒序 → 未激活 */
const cycleDateSort = (current?: DateSortOrder): DateSortOrder | undefined => {
  if (current === undefined) return 'asc';
  if (current === 'asc') return 'desc';
  return undefined;
};

type RateForm = {
  currencyId: string;
  date: Dayjs | null;
  data: string;
  checked: boolean;
};

const emptyFilter: FilterDraft = {
  code: '',
  dateMode: undefined,
  date: '',
  dateFrom: '',
  dateTo: '',
  checked: undefined,
  sortOrder: undefined,
};

const emptyForm: RateForm = {
  currencyId: '',
  date: null,
  data: '',
  checked: false,
};

const RatesView = () => {
  const t = useTranslate();
  const [items, setItems] = useState<Rate[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [filterDraft, setFilterDraft] = useState<FilterDraft>(emptyFilter);
  const [applied, setApplied] = useState<AppliedFilter>({});
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [codeSuggestions, setCodeSuggestions] = useState<CurrencySuggestion[]>([]);
  const [currenciesLoading, setCurrenciesLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [checking, setChecking] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState<Rate | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([]);
  const [form] = Form.useForm<RateForm>();

  useEffect(() => {
    let cancelled = false;
    const loadCurrencies = async () => {
      setCurrenciesLoading(true);
      try {
        const all = await fetchAllCurrencies(async (pageNum, size) => {
          const data = await listCurrencies({ page: pageNum, pageSize: size });
          return {
            items: data.items ?? [],
            total: data.total ?? 0,
          };
        });
        if (!cancelled) {
          setCurrencies(all as Currency[]);
        }
      } catch (error) {
        if (!cancelled) {
          setCurrencies([]);
          message.error(getApiErrorMessage(error, t('rates.message.loadCurrenciesFailed')));
        }
      } finally {
        if (!cancelled) {
          setCurrenciesLoading(false);
        }
      }
    };
    loadCurrencies();
    return () => {
      cancelled = true;
    };
  }, [t]);

  useEffect(() => {
    const prefix = filterDraft.code.trim();
    if (!prefix) {
      setCodeSuggestions([]);
      return undefined;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const data = await listCurrencySuggestions(prefix, 'code', controller.signal);
        setCodeSuggestions(data);
      } catch {
        if (!controller.signal.aborted) setCodeSuggestions([]);
      }
    }, 300);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [filterDraft.code]);

  const load = useCallback(async () => {
    setSelectedRowKeys([]);
    setLoading(true);
    try {
      const data = await listRates({
        ...applied,
        page,
        pageSize,
      });
      setItems(data.items ?? []);
      setTotal(data.total ?? 0);
    } catch (error) {
      message.error(getApiErrorMessage(error, t('rates.message.loadFailed')));
    } finally {
      setLoading(false);
    }
  }, [applied, page, pageSize, t]);

  useEffect(() => {
    load();
  }, [load]);

  const onSearch = () => {
    const code = filterDraft.code.trim();
    if (code && !/^[A-Za-z_]{1,10}$/.test(code)) {
      message.warning(t('rates.message.codeInvalid'));
      return;
    }

    const next: AppliedFilter = {};
    if (code) next.code = code.toUpperCase();

    if (filterDraft.dateMode === 'single') {
      if (!filterDraft.date) {
        message.warning(t('rates.message.dateRequired'));
        return;
      }
      next.date = filterDraft.date;
    } else if (filterDraft.dateMode === 'range') {
      const { dateFrom, dateTo } = filterDraft;
      if (!dateFrom || !dateTo) {
        message.warning(t('rates.message.rangeRequired'));
        return;
      }
      if (dateFrom > dateTo) {
        message.warning(t('rates.message.rangeInvalid'));
        return;
      }
      next.dateFrom = dateFrom;
      next.dateTo = dateTo;
    }

    if (filterDraft.checked === 'true') next.checked = true;
    if (filterDraft.checked === 'false') next.checked = false;
    if (filterDraft.sortOrder) next.sortOrder = filterDraft.sortOrder;

    setSelectedRowKeys([]);
    setPage(1);
    setApplied(next);
  };

  const onResetFilters = () => {
    setFilterDraft({ ...emptyFilter });
    setCodeSuggestions([]);
    setSelectedRowKeys([]);
    setPage(1);
    setApplied({});
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
      currencyId: String(detail.currencyId),
      date: dayjs(detail.date),
      data: detail.data,
      checked: detail.checked,
    });
    setFormOpen(true);
  };

  const openDetail = (row: Rate) => {
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

  const onSubmit = async (values: RateForm) => {
    const data = values.data.trim();
    if (!data) {
      message.warning(t('rates.message.valueRequired'));
      return;
    }
    setSubmitting(true);
    try {
      if (editingId != null) {
        const updated = await updateRate(editingId, {
          data,
          checked: values.checked,
        });
        message.success(t('rates.message.updated'));
        setDetail(updated);
      } else {
        await createRate({
          currencyId: Number(values.currencyId),
          date: values.date!.format('YYYY-MM-DD'),
          data,
          checked: values.checked,
        });
        message.success(t('rates.message.created'));
      }
      closeForm();
      await load();
    } catch (error) {
      message.error(getApiErrorMessage(error, t('rates.message.savedFailed')));
    } finally {
      setSubmitting(false);
    }
  };

  const onBatchDelete = async () => {
    const ids = selectedRowKeys.map(Number);
    if (ids.length === 0) return;
    setDeleting(true);
    try {
      await batchDeleteRates(ids);
      message.success(t('rates.batchDelete.success', { count: ids.length }));
      setSelectedRowKeys([]);
      if (ids.length === items.length && page > 1) {
        setPage((current) => current - 1);
      } else {
        await load();
      }
    } catch (error) {
      message.error(getApiErrorMessage(error, t('rates.batchDelete.failed')));
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
      title: t('rates.batchDelete.confirmTitle', {
        count: selectedRowKeys.length,
      }),
      content: t('rates.batchDelete.confirmContent'),
      onOk: onBatchDelete,
    });
  };

  const onBatchCheck = async () => {
    const ids = selectedRowKeys.map(Number);
    if (ids.length === 0) return;
    setChecking(true);
    try {
      await batchCheckRates(ids);
      message.success(t('rates.batchCheck.success', { count: ids.length }));
      await load();
    } catch (error) {
      message.error(getApiErrorMessage(error, t('rates.batchCheck.failed')));
      if (getApiErrorCode(error) === 'BatchCheck.StaleSelection') {
        await load();
      }
    } finally {
      setChecking(false);
    }
  };

  const openBatchCheckConfirm = () => {
    Modal.confirm({
      // tendata-ui 的静态 Modal 类型误将 children 声明为必填；实际内容由 content 提供。
      children: Children,
      centered: true,
      title: t('rates.batchCheck.confirmTitle', {
        count: selectedRowKeys.length,
      }),
      content: t('rates.batchCheck.confirmContent'),
      onOk: onBatchCheck,
    });
  };

  const applyDateSort = (next?: DateSortOrder) => {
    setSelectedRowKeys([]);
    setFilterDraft((prev) => ({ ...prev, sortOrder: next }));
    setPage(1);
    setApplied((prev) => {
      const { sortOrder: _prevSort, ...rest } = prev;
      return next ? { ...rest, sortOrder: next } : rest;
    });
  };

  const columns: ColumnsType = [
    {
      title: t('rates.column.currency'),
      dataIndex: 'currencyName',
      key: 'currencyName',
      width: 120,
      render: (value: string, row: Rate) => (
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
      title: t('rates.column.code'),
      dataIndex: 'currencyCode',
      key: 'currencyCode',
      width: 100,
      render: (code: string | null) => code || '—',
    },
    {
      title: t('rates.column.date'),
      dataIndex: 'date',
      key: 'date',
      width: 110,
      sorter: true,
      sortOrder: applied.sortOrder === 'asc'
        ? 'ascend'
        : applied.sortOrder === 'desc'
          ? 'descend'
          : undefined,
    },
    {
      title: t('rates.column.value'),
      dataIndex: 'data',
      key: 'data',
      width: 120,
    },
    {
      title: t('rates.column.checked'),
      dataIndex: 'checked',
      key: 'checked',
      width: 80,
      render: (checked: boolean) => (
        <Tag color={checked ? 'success' : 'default'}>
          {checked ? t('rates.value.yes') : t('rates.value.no')}
        </Tag>
      ),
    },
  ];

  return (
    <div className={listStyles.page}>
      <div className={listStyles.toolbar}>
        <strong className={listStyles.toolbarTitle}>{t('common.filters.title')}</strong>
        <div className={listStyles.toolbarRow}>
          <Space wrap className={listStyles.toolbarFields}>
            <AutoComplete
              allowClear
              placeholder={t('rates.search.codePlaceholder')}
              value={filterDraft.code}
              options={codeSuggestions.map((suggestion) => ({
                key: suggestion.id,
                value: suggestion.code ?? '',
                label: suggestion.code
                  ? `${suggestion.code} (${suggestion.name})`
                  : suggestion.name,
              }))}
              filterOption={false}
              listHeight={240}
              onChange={(value) => setFilterDraft((prev) => ({
                ...prev,
                code: String(value),
              }))}
              onSelect={(value) => {
                setFilterDraft((prev) => ({ ...prev, code: String(value) }));
                setCodeSuggestions([]);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') onSearch();
              }}
              style={{ width: 160 }}
              maxLength={10}
            />
            <Select
              allowClear
              placeholder={t('rates.dateMode.all')}
              value={filterDraft.dateMode}
              options={[
                { value: 'single', label: t('rates.dateMode.single') },
                { value: 'range', label: t('rates.dateMode.range') },
              ]}
              onChange={(dateMode?: DateMode) => {
                setFilterDraft((prev) => ({
                  ...prev,
                  dateMode,
                  date: dateMode === 'single' ? prev.date : '',
                  dateFrom: dateMode === 'range' ? prev.dateFrom : '',
                  dateTo: dateMode === 'range' ? prev.dateTo : '',
                }));
              }}
              style={{ width: 120 }}
            />
            {filterDraft.dateMode === 'single' ? (
              <DatePicker
                value={filterDraft.date ? dayjs(filterDraft.date) : null}
                onChange={(_date, dateString) => setFilterDraft((prev) => ({
                  ...prev,
                  date: dateString as string,
                }))}
              />
            ) : null}
            {filterDraft.dateMode === 'range' ? (
              <DatePicker.RangePicker
                value={[
                  filterDraft.dateFrom ? dayjs(filterDraft.dateFrom) : null,
                  filterDraft.dateTo ? dayjs(filterDraft.dateTo) : null,
                ]}
                onChange={(_dates, dateStrings) => setFilterDraft((prev) => ({
                  ...prev,
                  dateFrom: dateStrings[0],
                  dateTo: dateStrings[1],
                }))}
              />
            ) : null}
            <Select
              allowClear
              placeholder={t('rates.checked.all')}
              value={filterDraft.checked}
              options={[
                { value: 'true', label: t('rates.checked.true') },
                { value: 'false', label: t('rates.checked.false') },
              ]}
              onChange={(checked?: FilterDraft['checked']) => setFilterDraft((prev) => ({
                ...prev,
                checked,
              }))}
              style={{ width: 120 }}
            />
          </Space>
          <Space wrap className={listStyles.toolbarActions}>
            <Button type="primary" onClick={onSearch}>
              {t('rates.action.filter')}
            </Button>
            <Button onClick={onResetFilters}>
              {t('rates.action.reset')}
            </Button>
            <Button type="link" icon={<ReloadOutlined />} onClick={() => void load()}>
              {t('rates.action.refresh')}
            </Button>
          </Space>
        </div>
      </div>

      <QueryListCard
        title={t('common.queryList')}
        actions={(
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            {t('rates.action.create')}
          </Button>
        )}
        selectionCount={selectedRowKeys.length}
        selectionActions={(
          <>
            <Button
              type="secondary"
              loading={checking}
              disabled={deleting}
              onClick={openBatchCheckConfirm}
            >
              {t('rates.batchCheck.button')}
            </Button>
            <Button
              danger
              loading={deleting}
              disabled={checking}
              onClick={openBatchDeleteConfirm}
            >
              {t('rates.batchDelete.button')}
            </Button>
          </>
        )}
      >
        <BizTable
          /* remount 以清空 BizTable 内部 currentSort，保证三态循环可靠 */
          key={`rates-sort-${applied.sortOrder ?? 'none'}`}
          rowKey="id"
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
          onRow={(row: Rate) => ({
            onClick: () => openDetail(row),
          })}
          tdLoading={loading}
          noData={{ text: t('rates.empty') }}
          page={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            pageSizeOptions: PAGE_SIZE_OPTIONS,
            showTotal: (count) => t('rates.total', { total: count }),
          }}
          onSortChange={(orderKey) => {
            if (orderKey === 'date') {
              applyDateSort(cycleDateSort(applied.sortOrder));
            }
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
          ? t('rates.modal.editTitle')
          : t('rates.modal.createTitle')}
        open={formOpen}
        okText={t('rates.action.save')}
        cancelText={t('rates.action.cancel')}
        confirmLoading={submitting}
        destroyOnClose
        maskClosable={false}
        onOk={() => form.submit()}
        onCancel={closeForm}
      >
        <Form<RateForm>
          form={form}
          layout="vertical"
          initialValues={emptyForm}
          onFinish={onSubmit}
        >
          <Form.Item
            label={t('rates.form.currency')}
            name="currencyId"
            rules={[{
              required: true,
              message: t('rates.message.currencyRequired'),
            }]}
          >
            <CurrencyPicker
              currencies={currencies}
              loading={currenciesLoading}
              disabled={editingId != null}
            />
          </Form.Item>
          <Form.Item
            label={t('rates.form.date')}
            name="date"
            rules={[{
              required: true,
              message: t('rates.message.dateRequired'),
            }]}
          >
            <DatePicker disabled={editingId != null} />
          </Form.Item>
          <Form.Item
            label={t('rates.form.value')}
            name="data"
            rules={[{
              required: true,
              whitespace: true,
              message: t('rates.message.valueRequired'),
            }]}
          >
            <Input
              maxLength={50}
              placeholder={t('rates.form.valuePlaceholder')}
            />
          </Form.Item>
          <Form.Item name="checked" valuePropName="checked">
            <TendataCheckbox>{t('rates.form.checked')}</TendataCheckbox>
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        open={detailOpen}
        title={t('rates.modal.detailTitle')}
        width={480}
        destroyOnClose
        onClose={closeDetail}
      >
        {detail ? (
          <div className={listStyles.detailGrid}>
            <div className={listStyles.detailRow}>
              <span className={listStyles.detailLabel}>{t('rates.column.id')}</span>
              <span className={listStyles.detailValue}>{detail.id}</span>
            </div>
            <div className={listStyles.detailRow}>
              <span className={listStyles.detailLabel}>{t('rates.form.currency')}</span>
              <span className={listStyles.detailValue}>
                {detail.currencyName}
                {detail.currencyCode ? ` (${detail.currencyCode})` : ''}
              </span>
            </div>
            <div className={listStyles.detailRow}>
              <span className={listStyles.detailLabel}>{t('rates.form.date')}</span>
              <span className={listStyles.detailValue}>{detail.date}</span>
            </div>
            <div className={listStyles.detailRow}>
              <span className={listStyles.detailLabel}>{t('rates.form.value')}</span>
              <span className={listStyles.detailValue}>{detail.data}</span>
            </div>
            <div className={listStyles.detailRow}>
              <span className={listStyles.detailLabel}>{t('rates.form.checked')}</span>
              <span className={listStyles.detailValue}>
                <Tag color={detail.checked ? 'success' : 'default'}>
                  {detail.checked ? t('rates.value.yes') : t('rates.value.no')}
                </Tag>
              </span>
            </div>
            <div className={listStyles.detailActions}>
              <Button type="primary" onClick={openEdit}>
                {t('rates.action.edit')}
              </Button>
            </div>
          </div>
        ) : null}
      </Drawer>
    </div>
  );
};

export default RatesView;
