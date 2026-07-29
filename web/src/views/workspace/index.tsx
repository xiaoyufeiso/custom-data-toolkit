import { Button } from 'tendata-ui';
import { useNavigate } from 'react-router-dom';
import { logout } from '@/services/auth';

const WorkspaceView = () => {
  const navigate = useNavigate();

  const onLogout = async () => {
    try {
      await logout();
    } finally {
      navigate('/login', { replace: true });
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <h1>工作台</h1>
      <p>认证切片已接通。货币 / 汇率管理将在后续切片实现。</p>
      <Button onClick={onLogout}>退出登录</Button>
    </div>
  );
};

export default WorkspaceView;
