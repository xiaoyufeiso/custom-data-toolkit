import { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Card,
  Input,
  Space,
  message,
} from 'tendata-ui';
import { listCurrencies, type Currency } from '@/services/currency';
import {
  createRate,
  deleteRate,
  listRates,
  updateRate,
  type Rate,
} from '@/services/rate';
import { getApiErrorMessage } from '@/shared/utils/apiError';
import styles from './index.module.less';

const DEFAULT_PAGE_SIZE = 20;
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

type DateMode = 'none' | 'single' | 'range';

type FilterDraft = {
  code: string;
  dateMode: DateMode;
  date: string;
  dateFrom: string;
  dateTo: string;
  checked: '' | 'true' | 'false';
  sortOrder: 'asc' | 'desc';
};

type AppliedFilter = {
  code?: string;
  date?: string;
  dateFrom?: string;
  dateTo?: string;
  checked?: boolean;
  sortOrder?: 'asc' | 'desc';
};

type CreateForm = {
  currencyId: string;
  date: string;
  data: string;
  checked: boolean;
};

type EditForm = {
  data: string;
  checked: boolean;
};

const emptyFilter: FilterDraft = {
  code: '',
  dateMode: 'none',
  date: '',
  dateFrom: '',
  dateTo: '',
  checked: '',
  sortOrder: 'desc',
};

type PageItem = number | 'ellipsis';

/** 经典 1..N 页码；页数较多时保留首尾并用省略号。 */
const getPageItems = (current: number, totalPages: number): PageItem[] => {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const set = new Set<number>([1, totalPages]);
  for (let i = current - 1; i <= current + 1; i += 1) {
    if (i >= 1 && i <= totalPages) set.add(i);
  }
  if (current <= 3) {
    for (let i = 1; i <= 5; i += 1) set.add(i);
  }
  if (current >= totalPages - 2) {
    for (let i = totalPages - 4; i <= totalPages; i += 1) set.add(i);
  }

  const sorted = [...set].sort((a, b) => a - b);
  const items: PageItem[] = [];
  let prev = 0;
  for (const p of sorted) {
    if (prev > 0 && p - prev > 1) items.push('ellipsis');
    items.push(p);
    prev = p;
  }
  return items;
};

const emptyCreate: CreateForm = {
  currencyId: '',
  date: '',
  data: '',
  checked: false,
};

const RatesView = () => {
  const [items, setItems] = useState<Rate[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [filterDraft, setFilterDraft] = useState<FilterDraft>(emptyFilter);
  const [applied, setApplied] = useState<AppliedFilter>({});
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Rate | null>(null);
  const [createForm, setCreateForm] = useState<CreateForm>(emptyCreate);
  const [editForm, setEditForm] = useState<EditForm>({ data: '', checked: false });

  useEffect(() => {
    void listCurrencies({ page: 1, pageSize: 100 })
      .then((data) => setCurrencies(data.items ?? []))
      .catch(() => {
        message.error('加载货币选项失败');
      });
  }, []);

  const load = useCallback(async () => {
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
      message.error(getApiErrorMessage(error, '加载汇率列表失败'));
    } finally {
      setLoading(false);
    }
  }, [applied, page, pageSize]);

  useEffect(() => {
    void load();
  }, [load]);

  const onSearch = () => {
    const code = filterDraft.code.trim();
    if (code && !/^[A-Za-z_]{1,10}$/.test(code)) {
      message.warning('筛选字母代码须为 1~10 位字母或下划线，如 CNY');
      return;
    }

    const next: AppliedFilter = {};
    if (code) next.code = code.toUpperCase();

    if (filterDraft.dateMode === 'single') {
      if (!filterDraft.date) {
        message.warning('请选择日期');
        return;
      }
      next.date = filterDraft.date;
    } else if (filterDraft.dateMode === 'range') {
      const { dateFrom, dateTo } = filterDraft;
      if (!dateFrom || !dateTo) {
        message.warning('请填写起始日期与结束日期');
        return;
      }
      if (dateFrom > dateTo) {
        message.warning('起始日期不能晚于结束日期');
        return;
      }
      next.dateFrom = dateFrom;
      next.dateTo = dateTo;
    }

    if (filterDraft.checked === 'true') next.checked = true;
    if (filterDraft.checked === 'false') next.checked = false;
    next.sortOrder = filterDraft.sortOrder;

    setPage(1);
    setApplied(next);
  };

  const openCreate = () => {
    setEditing(null);
    setCreateForm(emptyCreate);
    setFormOpen(true);
  };

  const openEdit = (row: Rate) => {
    setEditing(row);
    setEditForm({ data: row.data, checked: row.checked });
    setFormOpen(true);
  };

  const onSubmit = async () => {
    setSubmitting(true);
    try {
      if (editing) {
        const data = editForm.data.trim();
        if (!data) {
          message.warning('请填写汇率值');
          setSubmitting(false);
          return;
        }
        await updateRate(editing.id, { data, checked: editForm.checked });
        message.success('已更新');
      } else {
        const currencyId = Number(createForm.currencyId);
        if (!currencyId) {
          message.warning('请选择货币');
          setSubmitting(false);
          return;
        }
        if (!createForm.date) {
          message.warning('请选择日期');
          setSubmitting(false);
          return;
        }
        const data = createForm.data.trim();
        if (!data) {
          message.warning('请填写汇率值');
          setSubmitting(false);
          return;
        }
        await createRate({
          currencyId,
          date: createForm.date,
          data,
          checked: createForm.checked,
        });
        message.success('已创建');
      }
      setFormOpen(false);
      await load();
    } catch (error) {
      message.error(getApiErrorMessage(error, '保存失败'));
    } finally {
      setSubmitting(false);
    }
  };

  const onDelete = async (row: Rate) => {
    const label = `${row.currencyCode || row.currencyName} / ${row.date}`;
    const ok = window.confirm(`确认删除汇率「${label}」？`);
    if (!ok) return;
    try {
      await deleteRate(row.id);
      message.success('已删除');
      await load();
    } catch (error) {
      message.error(getApiErrorMessage(error, '删除失败'));
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pageItems = getPageItems(page, totalPages);
  const dateSortOrder = applied.sortOrder ?? filterDraft.sortOrder;

  const toggleDateSort = () => {
    const next = dateSortOrder === 'desc' ? 'asc' : 'desc';
    setFilterDraft((prev) => ({ ...prev, sortOrder: next }));
    setPage(1);
    setApplied((prev) => ({ ...prev, sortOrder: next }));
  };

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <Space wrap>
          <Input
            allowClear
            placeholder="字母代码（如 CNY）"
            value={filterDraft.code}
            onChange={(e) => setFilterDraft((prev) => ({ ...prev, code: e.target.value }))}
            onPressEnter={onSearch}
            style={{ width: 160 }}
            maxLength={10}
          />
          <select
            className={styles.select}
            value={filterDraft.dateMode}
            onChange={(e) => {
              const dateMode = e.target.value as DateMode;
              setFilterDraft((prev) => ({
                ...prev,
                dateMode,
                date: dateMode === 'single' ? prev.date : '',
                dateFrom: dateMode === 'range' ? prev.dateFrom : '',
                dateTo: dateMode === 'range' ? prev.dateTo : '',
              }));
            }}
            style={{ minWidth: 120 }}
          >
            <option value="none">不限日期</option>
            <option value="single">指定日期</option>
            <option value="range">日期范围</option>
          </select>
          {filterDraft.dateMode === 'single' ? (
            <input
              className={styles.dateInput}
              type="date"
              value={filterDraft.date}
              onChange={(e) => setFilterDraft((prev) => ({ ...prev, date: e.target.value }))}
              title="指定日期"
            />
          ) : null}
          {filterDraft.dateMode === 'range' ? (
            <>
              <input
                className={styles.dateInput}
                type="date"
                value={filterDraft.dateFrom}
                onChange={(e) => setFilterDraft((prev) => ({ ...prev, dateFrom: e.target.value }))}
                title="起始日期"
              />
              <span className={styles.dateSep}>至</span>
              <input
                className={styles.dateInput}
                type="date"
                value={filterDraft.dateTo}
                onChange={(e) => setFilterDraft((prev) => ({ ...prev, dateTo: e.target.value }))}
                title="结束日期"
              />
            </>
          ) : null}
          <select
            className={styles.select}
            value={filterDraft.checked}
            onChange={(e) => setFilterDraft((prev) => ({
              ...prev,
              checked: e.target.value as FilterDraft['checked'],
            }))}
            style={{ minWidth: 120 }}
          >
            <option value="">全部</option>
            <option value="true">已核对</option>
            <option value="false">未核对</option>
          </select>
          <Button onClick={onSearch}>筛选</Button>
        </Space>
      </div>

      {formOpen ? (
        <Card
          title={editing ? '编辑汇率' : '新建汇率'}
          className={styles.formCard}
          extra={(
            <Button type="link" onClick={() => setFormOpen(false)}>
              关闭
            </Button>
          )}
        >
          {editing ? (
            <div className={styles.form}>
              <div className={styles.label}>
                货币
                <span>
                  {editing.currencyName}
                  {editing.currencyCode ? `（${editing.currencyCode}）` : ''}
                </span>
              </div>
              <div className={styles.label}>
                日期
                <span>{editing.date}</span>
              </div>
              <label className={styles.label}>
                汇率值
                <Input
                  value={editForm.data}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, data: e.target.value }))}
                  maxLength={50}
                />
              </label>
              <label className={styles.label}>
                <span>
                  <input
                    type="checkbox"
                    checked={editForm.checked}
                    onChange={(e) => setEditForm((prev) => ({
                      ...prev,
                      checked: e.target.checked,
                    }))}
                  />
                  {' '}
                  已核对
                </span>
              </label>
            </div>
          ) : (
            <div className={styles.form}>
              <label className={styles.label}>
                货币
                <select
                  className={styles.select}
                  value={createForm.currencyId}
                  onChange={(e) => setCreateForm((prev) => ({
                    ...prev,
                    currencyId: e.target.value,
                  }))}
                >
                  <option value="">请选择</option>
                  {currencies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {c.code ? `（${c.code}）` : ''}
                    </option>
                  ))}
                </select>
              </label>
              <label className={styles.label}>
                日期
                <input
                  className={styles.dateInput}
                  type="date"
                  value={createForm.date}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, date: e.target.value }))}
                />
              </label>
              <label className={styles.label}>
                汇率值
                <Input
                  value={createForm.data}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, data: e.target.value }))}
                  maxLength={50}
                  placeholder="如 7.1200"
                />
              </label>
              <label className={styles.label}>
                <span>
                  <input
                    type="checkbox"
                    checked={createForm.checked}
                    onChange={(e) => setCreateForm((prev) => ({
                      ...prev,
                      checked: e.target.checked,
                    }))}
                  />
                  {' '}
                  已核对
                </span>
              </label>
            </div>
          )}
          <Space style={{ marginTop: 16 }}>
            <Button type="primary" loading={submitting} onClick={() => void onSubmit()}>
              保存
            </Button>
            <Button onClick={() => setFormOpen(false)}>取消</Button>
          </Space>
        </Card>
      ) : null}

      <Card
        title={(
          <div className={styles.cardTitleRow}>
            <span>
              汇率列表{loading ? '（加载中…）' : ''}
            </span>
            <Button type="primary" onClick={openCreate}>
              新建汇率
            </Button>
          </div>
        )}
      >
        <table className={styles.table}>
          <thead>
            <tr>
              <th>ID</th>
              <th>货币</th>
              <th>字母代码</th>
              <th>
                <button
                  type="button"
                  className={styles.sortHeader}
                  onClick={toggleDateSort}
                  title={dateSortOrder === 'desc' ? '当前按日期降序，点击升序' : '当前按日期升序，点击降序'}
                >
                  <span>日期</span>
                  <span className={styles.sortCarets} aria-hidden>
                    <span
                      className={`${styles.sortCaretUp} ${dateSortOrder === 'asc' ? styles.sortCaretActive : ''}`}
                    />
                    <span
                      className={`${styles.sortCaretDown} ${dateSortOrder === 'desc' ? styles.sortCaretActive : ''}`}
                    />
                  </span>
                </button>
              </th>
              <th>汇率值</th>
              <th>已核对</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={7} className={styles.empty}>
                  {loading ? '加载中…' : '暂无数据'}
                </td>
              </tr>
            ) : (
              items.map((row) => (
                <tr key={row.id}>
                  <td>{row.id}</td>
                  <td>{row.currencyName}</td>
                  <td>{row.currencyCode || '—'}</td>
                  <td>{row.date}</td>
                  <td>{row.data}</td>
                  <td>{row.checked ? '是' : '否'}</td>
                  <td>
                    <Space>
                      <Button type="link" onClick={() => openEdit(row)}>
                        编辑
                      </Button>
                      <Button type="link" danger onClick={() => void onDelete(row)}>
                        删除
                      </Button>
                    </Space>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <div className={styles.pager}>
          <span>
            共 {total} 条 · 第 {page}/{totalPages} 页
          </span>
          <Space>
            <select
              className={styles.select}
              value={String(pageSize)}
              onChange={(e) => {
                const next = Number(e.target.value);
                setPageSize(next);
                setPage(1);
              }}
              style={{ minWidth: 100 }}
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}/页
                </option>
              ))}
            </select>
            <Button disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)}>
              上一页
            </Button>
            {pageItems.map((item, index) => (
              item === 'ellipsis' ? (
                <span key={`ellipsis-${index}`} className={styles.pageEllipsis} aria-hidden>
                  …
                </span>
              ) : (
                <button
                  type="button"
                  key={item}
                  className={`${styles.pageBtn}${item === page ? ` ${styles.pageBtnActive}` : ''}`}
                  disabled={loading}
                  onClick={() => setPage(item)}
                >
                  {item}
                </button>
              )
            ))}
            <Button
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => p + 1)}
            >
              下一页
            </Button>
          </Space>
        </div>
      </Card>
    </div>
  );
};

export default RatesView;
