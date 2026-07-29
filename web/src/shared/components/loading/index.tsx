import { Spin } from 'tendata-ui';
import styles from './index.module.less';

const Loading = () => (
  <div className={styles.loading}>
    <Spin size="large" />
  </div>
);

export default Loading;
