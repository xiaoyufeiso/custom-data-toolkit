import { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Card,
  Input,
  Space,
  message,
} from 'tendata-ui';
import {
  createApiKey,
  deleteApiKey,
  listApiKeys,
  updateApiKey,
  type ApiKey,
} from '@/services/apiKey';
import { getApiErrorMessage } from '@/shared/utils/apiError';
import styles from './index.module.less';

const formatTime = (value: string) => {
  if (!value) return '—';
  return value.replace('T', ' ').slice(0, 19);
};

const DEFAULT_PAGE_SIZE = 20;
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

const getPageNumbers = (current: number, totalPages: number) => {
  const pages: number[] = [];
  const start = Math.max(1, current - 2);
  const end = Math.min(totalPages, current + 2);
  for (let i = start; i <= end; i += 1) pages.push(i);
  return pages;
};

const ApiKeysView = () => {
  const [items, setItems] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [submitting, setSubmitting] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [createdPlainKey, setCreatedPlainKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listApiKeys();
      setItems(data ?? []);
    } catch (error) {
      message.error(getApiErrorMessage(error, '加载 API Key 列表失败'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setName('');
    setCreatedPlainKey(null);
    setCreateOpen(true);
  };

  const closeCreate = () => {
    setCreateOpen(false);
    setName('');
    setCreatedPlainKey(null);
  };

  const onCreate = async () => {
    const cleaned = name.trim();
    if (!cleaned) {
      message.warning('请填写名称');
      return;
    }
    setSubmitting(true);
    try {
      const created = await createApiKey({ name: cleaned });
      setCreatedPlainKey(created.key);
      message.success('已创建，请立即复制明文 Key');
      await load();
    } catch (error) {
      message.error(getApiErrorMessage(error, '创建失败'));
    } finally {
      setSubmitting(false);
    }
  };

  const onCopy = async () => {
    if (!createdPlainKey) return;
    try {
      await navigator.clipboard.writeText(createdPlainKey);
      message.success('已复制到剪贴板');
    } catch {
      message.warning('复制失败，请手动选中复制');
    }
  };

  const onToggleEnabled = async (row: ApiKey) => {
    const next = !row.enabled;
    const action = next ? '启用' : '停用';
    const ok = window.confirm(`确认${action}「${row.name}」？`);
    if (!ok) return;
    try {
      await updateApiKey(row.id, { enabled: next });
      message.success(`已${action}`);
      await load();
    } catch (error) {
      message.error(getApiErrorMessage(error, `${action}失败`));
    }
  };

  const onDelete = async (row: ApiKey) => {
    const ok = window.confirm(
      `确认删除「${row.name}」？\n删除后使用该 Key 的调用将立即失效，且不可恢复。`,
    );
    if (!ok) return;
    try {
      await deleteApiKey(row.id);
      message.success('已删除');
      await load();
    } catch (error) {
      message.error(getApiErrorMessage(error, '删除失败'));
    }
  };

  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageNumbers = getPageNumbers(currentPage, totalPages);
  const pageStart = (currentPage - 1) * pageSize;
  const pagedItems = items.slice(pageStart, pageStart + pageSize);

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <Space wrap>
          <Button onClick={() => void load()} loading={loading}>
            刷新
          </Button>
        </Space>
      </div>

      {createOpen ? (
        <Card
          title={createdPlainKey ? '请保存明文 Key' : '新建接口密钥'}
          className={styles.formCard}
          extra={(
            <Button type="link" onClick={closeCreate}>
              关闭
            </Button>
          )}
        >
          {createdPlainKey ? (
            <div className={styles.form}>
              <p className={styles.hint}>
                明文 Key 仅此时可见，关闭后无法再次查看。请立即复制并妥善保存。
              </p>
              <div className={styles.secretBox}>{createdPlainKey}</div>
              <Space>
                <Button type="primary" onClick={() => void onCopy()}>
                  复制
                </Button>
                <Button onClick={closeCreate}>我已保存</Button>
              </Space>
            </div>
          ) : (
            <div className={styles.form}>
              <label className={styles.label}>
                名称
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={100}
                  placeholder="如 etl-service"
                />
              </label>
              <Space>
                <Button type="primary" loading={submitting} onClick={() => void onCreate()}>
                  创建
                </Button>
                <Button onClick={closeCreate}>取消</Button>
              </Space>
            </div>
          )}
        </Card>
      ) : null}

      <Card
        title={(
          <div className={styles.cardTitleRow}>
            <span>
              接口密钥列表{loading ? '（加载中…）' : ''}
            </span>
            <Button type="primary" onClick={openCreate}>
              新建接口密钥
            </Button>
          </div>
        )}
      >
        <table className={styles.table}>
          <thead>
            <tr>
              <th>ID</th>
              <th>名称</th>
              <th>前缀</th>
              <th>状态</th>
              <th>创建时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} className={styles.empty}>
                  {loading ? '加载中…' : '暂无数据'}
                </td>
              </tr>
            ) : (
              pagedItems.map((row) => (
                <tr key={row.id}>
                  <td>{row.id}</td>
                  <td>{row.name}</td>
                  <td>{row.keyPrefix}</td>
                  <td>{row.enabled ? '启用' : '停用'}</td>
                  <td>{formatTime(row.createdAt)}</td>
                  <td>
                    <Space>
                      <Button type="link" onClick={() => void onToggleEnabled(row)}>
                        {row.enabled ? '停用' : '启用'}
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
      </Card>
      <div className={styles.pager}>
        <span>
          共 {total} 条 · 第 {currentPage}/{totalPages} 页
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
          <Button disabled={currentPage <= 1 || loading} onClick={() => setPage((p) => p - 1)}>
            上一页
          </Button>
          {pageNumbers.map((p) => (
            <Button
              key={p}
              type={p === currentPage ? 'primary' : 'default'}
              disabled={loading}
              onClick={() => setPage(p)}
            >
              {p}
            </Button>
          ))}
          <Button
            disabled={currentPage >= totalPages || loading}
            onClick={() => setPage((p) => p + 1)}
          >
            下一页
          </Button>
        </Space>
      </div>
    </div>
  );
};

export default ApiKeysView;
