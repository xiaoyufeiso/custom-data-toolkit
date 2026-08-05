import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Button,
  Card,
  Form,
  Input,
  message,
} from 'tendata-ui';
import { login } from '@/services/auth';
import { useTranslate } from '@/shared/hooks';
import styles from './index.module.less';

type LoginFormValues = {
  username: string;
  password: string;
};

const LoginView = () => {
  const t = useTranslate();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [form] = Form.useForm<LoginFormValues>();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: LoginFormValues) => {
    setLoading(true);
    try {
      await login(values.username.trim(), values.password);
      message.success(t('auth.message.success'));
      const target = params.get('redirect') || '/currencies';
      navigate(target, { replace: true });
    } catch {
      message.error(t('auth.message.failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.wrap}>
      <Card title={t('common.appName')} className={styles.card}>
        <Form
          form={form}
          layout="vertical"
          className={styles.form}
          initialValues={{ username: 'admin', password: '' }}
          onFinish={onFinish}
        >
          <Form.Item
            name="username"
            label={t('auth.form.username')}
            rules={[{ required: true, message: t('auth.message.usernameRequired') }]}
          >
            <Input autoComplete="username" />
          </Form.Item>
          <Form.Item
            name="password"
            label={t('auth.form.password')}
            rules={[{ required: true, message: t('auth.message.passwordRequired') }]}
          >
            <Input type="password" autoComplete="current-password" />
          </Form.Item>
          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              classNames={styles.submitButton}
            >
              {t('auth.action.login')}
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default LoginView;
