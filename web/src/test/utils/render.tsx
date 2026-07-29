import { ReactElement, ReactNode } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { MemoryRouter } from 'react-router-dom';
import { ConfigProvider, enUS, zhCN } from 'tendata-ui';
import { DEFAULT_LOCALE, getMessages, type Locale } from '@/locales';
import useLocaleStore from '@/store/useLocaleStore';

const antdLocaleMap = {
  zh_CN: zhCN,
  en: enUS,
};

interface ExtendedRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  route?: string;
  locale?: Locale;
}

interface TestProvidersProps {
  children: ReactNode;
  route: string;
  locale: Locale;
}

const TestProviders = ({ children, route, locale }: TestProvidersProps) => (
  <MemoryRouter
    initialEntries={[route]}
    future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
  >
    <IntlProvider
      locale={locale === 'zh_CN' ? 'zh' : 'en'}
      messages={getMessages(locale)}
    >
      <ConfigProvider locale={antdLocaleMap[locale]}>
        {children}
      </ConfigProvider>
    </IntlProvider>
  </MemoryRouter>
);

export const renderWithProviders = (
  ui: ReactElement,
  {
    route = '/',
    locale = DEFAULT_LOCALE,
    ...renderOptions
  }: ExtendedRenderOptions = {},
) => {
  localStorage.setItem('locale', locale);
  useLocaleStore.setState({ locale });
  window.history.replaceState({}, 'Test page', route);

  return render(ui, {
    wrapper: ({ children }) => (
      <TestProviders route={route} locale={locale}>
        {children}
      </TestProviders>
    ),
    ...renderOptions,
  });
};
