import type { ComponentProps, Key } from 'react';
import {
  Children,
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
  Select,
  Space,
  Tag,
  message,
} from 'tendata-ui';
import {
  createAdminUser,
  listAdminUsers,
  resetAdminUserPassword,
  updateAdminUser,
  type AdminUserItem,
} from '@/services/adminUsers';
import { fetchMe, type AdminRole } from '@/services/auth';
import QueryListCard from '@/shared/components/queryListCard';
import { useTranslate } from '@/shared/hooks';
import listStyles from '@/shared/styles/listPage.module.less';
import { getApiErrorMessage } from '@/shared/utils/apiError';
import { formatDateTime } from '@/shared/utils/formatDateTime';

type ColumnsType = NonNullable<ComponentProps<typeof BizTable>['columns']>;

const DEFAULT_PAGE_SIZE = 20;
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

type FilterDraft = {
  q: string;
  role?: AdminRole;
  enabled?: 'true' | 'false';
};

const emptyFilter: FilterDraft = { q: '' };

const AdminUsersView = () => {
  const t = useTranslate();
  const [items, setItems] = useState<AdminUserItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [draft, setDraft] = useState<FilterDraft>(emptyFilter);
  const [applied, setApplied] = useState<FilterDraft>(emptyFilter);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [batchDisableLoading, setBatchDisableLoading] = useState(false);
  const [batchEnableLoading, setBatchEnableLoading] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([]);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const batchBusy = batchDisableLoading || batchEnableLoading;
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState<AdminUserItem | null>(null);
  const [createForm] = Form.useForm<{
    username: string;
    password: string;
    role: AdminRole;
  }>();
  const [editForm] = Form.useForm<{
    role: AdminRole;
    enabled: boolean;
  }>();
  const [resetForm] = Form.useForm<{ password: string }>();

  const commitFilters = (next: FilterDraft) => {
    const normalized = { ...next, q: next.q.trim() };
    setDraft(normalized);
    setSelectedRowKeys([]);
    setPage(1);
    setApplied(normalized);
  };

  const load = useCallback(async () => {
    setSelectedRowKeys([]);
    setLoading(true);
    try {
      const data = await listAdminUsers({
        q: applied.q || undefined,
        role: applied.role,
        enabled: applied.enabled === undefined
          ? undefined
          : applied.enabled === 'true',
        page,
        pageSize,
      });
      setItems(data.items ?? []);
      setTotal(data.total ?? 0);
    } catch (error) {
      message.error(getApiErrorMessage(error, t('adminUsers.message.loadFailed')));
    } finally {
      setLoading(false);
    }
  }, [applied, page, pageSize, t]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    fetchMe()
      .then((me) => {
        if (!cancelled) setCurrentUserId(me.id);
      })
      .catch(() => {
        if (!cancelled) setCurrentUserId(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const openCreate = () => {
    createForm.setFieldsValue({ username: '', password: '', role: 'viewer' });
    setCreateOpen(true);
  };

  const openDetail = (row: AdminUserItem) => {
    setDetail(row);
    setDetailOpen(true);
  };

  const openEdit = () => {
    if (!detail) return;
    editForm.setFieldsValue({ role: detail.role, enabled: detail.enabled });
    setEditOpen(true);
  };

  const openReset = () => {
    resetForm.setFieldsValue({ password: '' });
    setResetOpen(true);
  };

  const submitCreate = async () => {
    const values = await createForm.validateFields();
    const username = values.username.trim();
    if (!username) {
      message.warning(t('adminUsers.message.usernameRequired'));
      return;
    }
    if (!values.password || values.password.length < 8) {
      message.warning(t('adminUsers.message.passwordRequired'));
      return;
    }
    setSubmitting(true);
    try {
      await createAdminUser({
        username,
        password: values.password,
        role: values.role,
      });
      message.success(t('adminUsers.message.created'));
      setCreateOpen(false);
      await load();
    } catch (error) {
      message.error(getApiErrorMessage(error, t('adminUsers.message.loadFailed')));
    } finally {
      setSubmitting(false);
    }
  };

  const submitEdit = async () => {
    if (!detail) return;
    const values = await editForm.validateFields();
    setSubmitting(true);
    try {
      const updated = await updateAdminUser(detail.id, {
        role: values.role,
        enabled: values.enabled,
      });
      message.success(t('adminUsers.message.updated'));
      setDetail(updated);
      setEditOpen(false);
      await load();
    } catch (error) {
      message.error(getApiErrorMessage(error, t('adminUsers.message.loadFailed')));
    } finally {
      setSubmitting(false);
    }
  };

  const submitReset = async () => {
    if (!detail) return;
    const values = await resetForm.validateFields();
    if (!values.password || values.password.length < 8) {
      message.warning(t('adminUsers.message.passwordRequired'));
      return;
    }
    setSubmitting(true);
    try {
      await resetAdminUserPassword(detail.id, values.password);
      message.success(t('adminUsers.message.passwordReset'));
      setResetOpen(false);
    } catch (error) {
      message.error(getApiErrorMessage(error, t('adminUsers.message.loadFailed')));
    } finally {
      setSubmitting(false);
    }
  };

  const runBatchEnabledUpdate = async (
    enabled: boolean,
    keys: {
      failed: 'adminUsers.batchDisable.failed' | 'adminUsers.batchEnable.failed';
      success: 'adminUsers.batchDisable.success' | 'adminUsers.batchEnable.success';
      partial: 'adminUsers.batchDisable.partial' | 'adminUsers.batchEnable.partial';
    },
  ) => {
    const ids = selectedRowKeys.map(Number);
    if (ids.length === 0) return;
    let success = 0;
    const errors: string[] = [];
    for (const id of ids) {
      const row = items.find((item) => item.id === id);
      if (row && row.enabled === enabled) continue;
      try {
        await updateAdminUser(id, { enabled });
        success += 1;
      } catch (error) {
        errors.push(getApiErrorMessage(error, t(keys.failed)));
      }
    }
    if (success > 0 && errors.length === 0) {
      message.success(t(keys.success, { count: success }));
    } else if (success > 0 && errors.length > 0) {
      message.warning(t(keys.partial, {
        success,
        failed: errors.length,
      }));
    } else if (errors.length > 0) {
      message.error(errors[0]);
    } else {
      message.warning(t(keys.failed));
    }
    setSelectedRowKeys([]);
    await load();
  };

  const onBatchDisable = async () => {
    setBatchDisableLoading(true);
    try {
      await runBatchEnabledUpdate(false, {
        failed: 'adminUsers.batchDisable.failed',
        success: 'adminUsers.batchDisable.success',
        partial: 'adminUsers.batchDisable.partial',
      });
    } finally {
      setBatchDisableLoading(false);
    }
  };

  const onBatchEnable = async () => {
    setBatchEnableLoading(true);
    try {
      await runBatchEnabledUpdate(true, {
        failed: 'adminUsers.batchEnable.failed',
        success: 'adminUsers.batchEnable.success',
        partial: 'adminUsers.batchEnable.partial',
      });
    } finally {
      setBatchEnableLoading(false);
    }
  };

  const openBatchDisableConfirm = () => {
    Modal.confirm({
      children: Children,
      centered: true,
      title: t('adminUsers.batchDisable.confirmTitle', {
        count: selectedRowKeys.length,
      }),
      content: t('adminUsers.batchDisable.confirmContent'),
      onOk: onBatchDisable,
    });
  };

  const openBatchEnableConfirm = () => {
    Modal.confirm({
      children: Children,
      centered: true,
      title: t('adminUsers.batchEnable.confirmTitle', {
        count: selectedRowKeys.length,
      }),
      content: t('adminUsers.batchEnable.confirmContent'),
      onOk: onBatchEnable,
    });
  };

  const roleLabel = (role: string) => (
    role === 'admin'
      ? t('adminUsers.role.admin')
      : t('adminUsers.role.viewer')
  );

  const columns: ColumnsType = [
    {
      title: t('adminUsers.column.username'),
      dataIndex: 'username',
      key: 'username',
      render: (value: string, row: AdminUserItem) => (
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
      title: t('adminUsers.column.role'),
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => roleLabel(role),
    },
    {
      title: t('adminUsers.column.enabled'),
      dataIndex: 'enabled',
      key: 'enabled',
      render: (enabled: boolean) => (
        <Tag color={enabled ? 'success' : 'default'}>
          {enabled
            ? t('adminUsers.enabled.true')
            : t('adminUsers.enabled.false')}
        </Tag>
      ),
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
            <Input
              allowClear
              placeholder={t('adminUsers.search.placeholder')}
              style={{ width: 160 }}
              value={draft.q}
              onChange={(event) => {
                const next = event.target.value;
                setDraft((prev) => ({ ...prev, q: next }));
                // 点叉清空时立刻查询（与货币/字典文本搜索一致）
                if (!next.trim()) {
                  commitFilters({ ...draft, q: '' });
                }
              }}
              onPressEnter={() => commitFilters(draft)}
            />
            <Select
              allowClear
              placeholder={t('adminUsers.filter.role')}
              style={{ width: 120 }}
              value={draft.role}
              options={[
                { value: 'admin', label: t('adminUsers.role.admin') },
                { value: 'viewer', label: t('adminUsers.role.viewer') },
              ]}
              onChange={(value?: AdminRole) => {
                commitFilters({ ...draft, role: value });
              }}
            />
            <Select
              allowClear
              placeholder={t('adminUsers.filter.enabled')}
              style={{ width: 120 }}
              value={draft.enabled}
              options={[
                { value: 'true', label: t('adminUsers.enabled.true') },
                { value: 'false', label: t('adminUsers.enabled.false') },
              ]}
              onChange={(value?: FilterDraft['enabled']) => {
                commitFilters({ ...draft, enabled: value });
              }}
            />
          </Space>
          <Space wrap className={listStyles.toolbarActions}>
            <Button type="primary" onClick={() => commitFilters(draft)}>
              {t('common.action.query')}
            </Button>
            <Button
              onClick={() => {
                setDraft(emptyFilter);
                setApplied(emptyFilter);
                setSelectedRowKeys([]);
                setPage(1);
              }}
            >
              {t('adminUsers.action.reset')}
            </Button>
            <Button type="link" icon={<ReloadOutlined />} onClick={() => void load()}>
              {t('adminUsers.action.refresh')}
            </Button>
          </Space>
        </div>
      </div>

      <QueryListCard
        title={t('common.queryList')}
        actions={(
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            {t('adminUsers.action.create')}
          </Button>
        )}
        selectionCount={selectedRowKeys.length}
        selectionActions={(
          <>
            <Button
              danger
              loading={batchDisableLoading}
              disabled={batchBusy}
              onClick={openBatchDisableConfirm}
            >
              {t('adminUsers.batchDisable.button')}
            </Button>
            <Button
              type="secondary"
              loading={batchEnableLoading}
              disabled={batchBusy}
              onClick={openBatchEnableConfirm}
            >
              {t('adminUsers.batchEnable.button')}
            </Button>
          </>
        )}
      >
        <BizTable
          rowKey="id"
          columns={columns}
          dataSource={items}
          tdLoading={loading}
          noData={{ text: t('adminUsers.empty') }}
          rowClassName={() => listStyles.clickableRow}
          rowSelection={{
            columnWidth: 32,
            selectedRowKeys,
            onChange: setSelectedRowKeys,
            getCheckboxProps: (row: AdminUserItem) => ({
              // 禁止勾选自己（不可停用自己）；已停用账号可选以便批量启用
              disabled: row.id === currentUserId,
              onClick: (event: React.MouseEvent) => event.stopPropagation(),
            }),
          }}
          onRow={(row: AdminUserItem) => ({
            onClick: () => openDetail(row),
          })}
          page={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            pageSizeOptions: PAGE_SIZE_OPTIONS,
            showTotal: (count: number) => t('adminUsers.total', { total: count }),
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
        open={createOpen}
        title={t('adminUsers.modal.createTitle')}
        okText={t('adminUsers.action.save')}
        cancelText={t('adminUsers.action.cancel')}
        confirmLoading={submitting}
        destroyOnClose
        maskClosable={false}
        onOk={() => void submitCreate()}
        onCancel={() => setCreateOpen(false)}
      >
        <Form form={createForm} layout="vertical">
          <Form.Item
            name="username"
            label={t('adminUsers.form.username')}
            rules={[{ required: true, message: t('adminUsers.message.usernameRequired') }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="password"
            label={t('adminUsers.form.password')}
            rules={[{ required: true, message: t('adminUsers.message.passwordRequired') }]}
          >
            <Input type="password" autoComplete="new-password" />
          </Form.Item>
          <Form.Item
            name="role"
            label={t('adminUsers.form.role')}
            rules={[{ required: true, message: t('adminUsers.message.roleRequired') }]}
          >
            <Select
              options={[
                { value: 'admin', label: t('adminUsers.role.admin') },
                { value: 'viewer', label: t('adminUsers.role.viewer') },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={editOpen}
        title={t('adminUsers.modal.editTitle')}
        okText={t('adminUsers.action.save')}
        cancelText={t('adminUsers.action.cancel')}
        confirmLoading={submitting}
        destroyOnClose
        maskClosable={false}
        onOk={() => void submitEdit()}
        onCancel={() => setEditOpen(false)}
      >
        <Form form={editForm} layout="vertical">
          <Form.Item name="role" label={t('adminUsers.form.role')}>
            <Select
              options={[
                { value: 'admin', label: t('adminUsers.role.admin') },
                { value: 'viewer', label: t('adminUsers.role.viewer') },
              ]}
            />
          </Form.Item>
          <Form.Item name="enabled" label={t('adminUsers.form.enabled')}>
            <Select
              options={[
                { value: true, label: t('adminUsers.enabled.true') },
                { value: false, label: t('adminUsers.enabled.false') },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={resetOpen}
        title={t('adminUsers.modal.resetPasswordTitle')}
        okText={t('adminUsers.action.save')}
        cancelText={t('adminUsers.action.cancel')}
        confirmLoading={submitting}
        destroyOnClose
        maskClosable={false}
        onOk={() => void submitReset()}
        onCancel={() => setResetOpen(false)}
      >
        <Form form={resetForm} layout="vertical">
          <Form.Item
            name="password"
            label={t('adminUsers.form.newPassword')}
            rules={[{ required: true, message: t('adminUsers.message.passwordRequired') }]}
          >
            <Input type="password" autoComplete="new-password" />
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        open={detailOpen}
        title={t('adminUsers.modal.detailTitle')}
        width={480}
        destroyOnClose
        onClose={() => {
          setDetailOpen(false);
          setDetail(null);
        }}
      >
        {detail && (
          <div className={listStyles.detailGrid}>
            <div className={listStyles.detailRow}>
              <span className={listStyles.detailLabel}>{t('adminUsers.column.username')}</span>
              <span className={listStyles.detailValue}>{detail.username}</span>
            </div>
            <div className={listStyles.detailRow}>
              <span className={listStyles.detailLabel}>{t('adminUsers.column.role')}</span>
              <span className={listStyles.detailValue}>{roleLabel(detail.role)}</span>
            </div>
            <div className={listStyles.detailRow}>
              <span className={listStyles.detailLabel}>{t('adminUsers.column.enabled')}</span>
              <span className={listStyles.detailValue}>
                <Tag color={detail.enabled ? 'success' : 'default'}>
                  {detail.enabled
                    ? t('adminUsers.enabled.true')
                    : t('adminUsers.enabled.false')}
                </Tag>
              </span>
            </div>
            <div className={listStyles.detailRow}>
              <span className={listStyles.detailLabel}>{t('adminUsers.column.createdAt')}</span>
              <span className={listStyles.detailValue}>{formatDateTime(detail.createdAt)}</span>
            </div>
            <div className={listStyles.detailRow}>
              <span className={listStyles.detailLabel}>{t('adminUsers.column.updatedAt')}</span>
              <span className={listStyles.detailValue}>{formatDateTime(detail.updatedAt)}</span>
            </div>
            <div className={listStyles.detailActions}>
              <Button type="primary" onClick={openEdit}>
                {t('adminUsers.action.edit')}
              </Button>
              <Button onClick={openReset}>
                {t('adminUsers.action.resetPassword')}
              </Button>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default AdminUsersView;
