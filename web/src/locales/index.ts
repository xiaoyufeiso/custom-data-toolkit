import en from './en';
import zhCN from './zh_CN';

export type Locale = 'zh_CN' | 'en';

const messages: Record<Locale, Record<string, string>> = {
  zh_CN: zhCN,
  en,
};

export const getMessages = (locale: Locale) => messages[locale];

export const DEFAULT_LOCALE: Locale = 'zh_CN';

export default messages;
