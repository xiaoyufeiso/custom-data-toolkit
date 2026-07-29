import { FormEvent, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Card, Input, message } from 'tendata-ui';
import { login } from '@/services/auth';
import styles from './index.module.less';

const LoginView = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      await login(username.trim(), password);
      message.success('登录成功');
      const target = params.get('redirect') || '/currencies';
      navigate(target, { replace: true });
    } catch {
      message.error('登录失败：用户名或密码错误');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.wrap}>
      <Card title="Custom Data Toolkit" className={styles.card}>
        <form onSubmit={onSubmit} className={styles.form}>
          <label className={styles.label}>
            用户名
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
            />
          </label>
          <label className={styles.label}>
            密码
                          <Input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoComplete="current-password"
                          />
          </label>
          <Button type="primary" htmlType="submit" loading={loading} block>
            登录
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default LoginView;
