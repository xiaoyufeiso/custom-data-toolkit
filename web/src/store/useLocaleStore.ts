import { create } from 'zustand';
import { type Locale, DEFAULT_LOCALE } from '@/locales';

interface LocaleState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

const useLocaleStore = create<LocaleState>((set) => ({
  locale: (localStorage.getItem('locale') as Locale) || DEFAULT_LOCALE,
  setLocale: (locale: Locale) => {
    localStorage.setItem('locale', locale);
    set({ locale });
  },
}));

export default useLocaleStore;
