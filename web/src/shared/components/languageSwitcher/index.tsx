import { Select } from 'tendata-ui';
import { type Locale } from '@/locales';
import useLocaleStore from '@/store/useLocaleStore';

const options = [
  { value: 'zh_CN', label: '中文' },
  { value: 'en', label: 'English' },
];

const LanguageSwitcher = () => {
  const { locale, setLocale } = useLocaleStore();

  return (
    <Select
      value={locale}
      onChange={(val: Locale) => setLocale(val)}
      options={options}
      style={{ width: 100 }}
      size="small"
    />
  );
};

export default LanguageSwitcher;
