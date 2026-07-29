import { useEffect } from 'react';
import dayjs from 'dayjs';
// dayjs 中文 locale 必须作为副作用 import 注册，否则 dayjs.locale('zh-cn') 不生效。
// 英文是 dayjs 内置 locale，不需要额外 import。
import 'dayjs/locale/zh-cn';
import { IntlProvider } from 'react-intl';
import { ConfigProvider, enUS, zhCN } from 'tendata-ui';
import { getMessages } from '@/locales';
import AppLayout from '@/shared/components/appLayout';
import useLocaleStore from '@/store/useLocaleStore';

const antdLocaleMap = {
  zh_CN: zhCN,
  en: enUS,
};

/**
 * dayjs 使用的 locale code 与我们 store 里的 locale 标识不同：
 * - store 用 `zh_CN` / `en`（与 antd 对齐）
 * - dayjs 需要 `zh-cn` / `en`
 * 这里集中映射，避免散落到各处。
 */
const dayjsLocaleMap = {
  zh_CN: 'zh-cn',
  en: 'en',
};

const App = () => {
  const { locale } = useLocaleStore();

  /**
   * DatePicker 面板里的月份名、星期名来自 dayjs 自己的 locale；
   * antd 的 ConfigProvider 只管按钮/占位符文案。
   * 语言切换时必须同步 dayjs.locale，否则会出现"按钮中文、表头英文"的混合状态。
   */
  useEffect(() => {
    dayjs.locale(dayjsLocaleMap[locale]);
  }, [locale]);

  return (
    <IntlProvider
      locale={locale === 'zh_CN' ? 'zh' : 'en'}
      messages={getMessages(locale)}
    >
      <ConfigProvider
        locale={antdLocaleMap[locale]}
        theme={{
          token: {
            colorPrimary: '#1677ff',
            borderRadius: 6,
          },
        }}
      >
        <AppLayout />
      </ConfigProvider>
    </IntlProvider>
  );
};

export default App;
