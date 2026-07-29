import dayjs from 'dayjs';
import {
  message, Button, Space, Typography, DatePicker,
} from 'tendata-ui';
import reactLogo from '@/assets/logo.svg';
import { useTranslate } from '@/shared/hooks';
import useCounterStore from '@/store/useCounterStore';
import styles from './index.module.less';

const { Title, Paragraph } = Typography;

const Home = () => {
  const t = useTranslate();
  const {
    count, increment, decrement, reset,
  } = useCounterStore();

  const handleDateChange = (_: unknown, dateString: string | string[]) => {
    message.info(`${dateString}`);
  };

  return (
    <div className={styles.home}>
      <img src={reactLogo} className={styles.logo} alt="React Logo" />
      <Title level={2}>
        {t('home.title')}
      </Title>
      <Paragraph type="secondary">
        {t('home.description')}
      </Paragraph>

      <div className={styles.card}>
        <Title level={4}>
          {t('home.zustandDemo')}
        </Title>
        <Paragraph>
          {t('home.currentCount')}
          :
          {' '}
          <strong>{count}</strong>
        </Paragraph>
        <Space>
          <Button type="primary" onClick={increment}>
            {t('home.increment')}
          </Button>
          <Button onClick={decrement}>
            {t('home.decrement')}
          </Button>
          <Button danger onClick={reset}>
            {t('home.reset')}
          </Button>
        </Space>
      </div>

      <div className={styles.card}>
        <Title level={4}>
          {t('home.datepickerDemo')}
        </Title>
        <DatePicker defaultValue={dayjs()} onChange={handleDateChange} />
      </div>

      <div className={styles.card}>
        <Title level={4}>
          {t('home.envDemo')}
        </Title>
        <Paragraph>
          VITE_PUBLIC_APIENV:
          {' '}
          <code>{import.meta.env.VITE_PUBLIC_APIENV}</code>
        </Paragraph>
      </div>
    </div>
  );
};

export default Home;
