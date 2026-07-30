import { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Card,
  Input,
  Space,
  message,
} from 'tendata-ui';
import {
  createCurrency,
  deleteCurrency,
  listCurrencies,
  updateCurrency,
  type Currency,
} from '@/services/currency';
import { getApiErrorMessage } from '@/shared/utils/apiError';
import styles from './index.module.less';

const DEFAULT_PAGE_SIZE = 20;
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

const getPageNumbers = (current: number, totalPages: number) => {
  const pages: number[] = [];
  const start = Math.max(1, current - 2);
  const end = Math.min(totalPages, current + 2);
  for (let i = start; i <= end; i += 1) pages.push(i);
  return pages;
};

type FormState = {
  name: string;
  code: string;
};

const emptyForm: FormState = { name: '', code: '' };

const CurrenciesView = () => {
  const [items, setItems] = useState<Currency[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [q, setQ] = useState('');
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Currency | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const load = useCallback(async () => {
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
    void load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormOpen(true);
  };

  const openEdit = (row: Currency) => {
    setEditing(row);
    setForm({ name: row.name, code: row.code ?? '' });
    setFormOpen(true);
  };

  const onSearch = () => {
    setPage(1);
    setKeyword(q.trim());
  };

  const onSubmit = async () => {
    const name = form.name.trim();
    if (!name) {
      message.warning('请填写货币名称');
      return;
    }
    const code = form.code.trim();
    if (code && !/^[A-Za-z_]{1,10}$/.test(code)) {
      message.warning('货币 code 须为 1~10 位字母或下划线，如 CNY');
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
      setFormOpen(false);
      await load();
    } catch (error) {
      message.error(getApiErrorMessage(error, '保存失败'));
    } finally {
      setSubmitting(false);
    }
  };

  const onDelete = async (row: Currency) => {
    const ok = window.confirm(
      `确认删除货币「${row.name}」？\n若仍有关联汇率将无法删除。`,
    );
    if (!ok) return;
    try {
      await deleteCurrency(row.id);
      message.success('已删除');
      await load();
    } catch (error) {
      message.error(getApiErrorMessage(error, '删除失败'));
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const pageNumbers = getPageNumbers(page, totalPages);

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <Space wrap>
          <Input
            allowClear
            placeholder="搜索名称或 code"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onPressEnter={onSearch}
            style={{ width: 240 }}
          />
          <Button onClick={onSearch}>搜索</Button>
        </Space>
      </div>

      {formOpen ? (
        <Card
          title={editing ? '编辑货币' : '新建货币'}
          className={styles.formCard}
          extra={(
            <Button type="link" onClick={() => setFormOpen(false)}>
              关闭
            </Button>
          )}
        >
          <div className={styles.form}>
            <label className={styles.label}>
              名称
              <Input
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                maxLength={100}
              />
            </label>
            <label className={styles.label}>
              Code（可选）
              <Input
                value={form.code}
                onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))}
                maxLength={10}
                placeholder="如 CNY、MYR_IM"
              />
            </label>
            <Space>
              <Button type="primary" loading={submitting} onClick={() => void onSubmit()}>
                保存
              </Button>
              <Button onClick={() => setFormOpen(false)}>取消</Button>
            </Space>
          </div>
        </Card>
      ) : null}

      <Card
        title={(
          <div className={styles.cardTitleRow}>
            <span>
              货币列表{loading ? '（加载中…）' : ''}
            </span>
            <Button type="primary" onClick={openCreate}>
              新建货币
            </Button>
          </div>
        )}
      >
        <table className={styles.table}>
          <thead>
            <tr>
              <th>ID</th>
              <th>名称</th>
              <th>Code</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={4} className={styles.empty}>
                  {loading ? '加载中…' : '暂无数据'}
                </td>
              </tr>
            ) : (
              items.map((row) => (
                <tr key={row.id}>
                  <td>{row.id}</td>
                  <td>{row.name}</td>
                  <td>{row.code || '—'}</td>
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
            {pageNumbers.map((p) => (
              <Button
                key={p}
                type={p === page ? 'primary' : 'default'}
                disabled={loading}
                onClick={() => setPage(p)}
              >
                {p}
              </Button>
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

export default CurrenciesView;
