import { useCallback } from 'react';
import { useIntl, type PrimitiveType } from 'react-intl';
import about from '@/locales/en/about';
import common from '@/locales/en/common';
import currencies from '@/locales/en/currencies';
import customsDict from '@/locales/en/customsDict';
import home from '@/locales/en/home';
import rates from '@/locales/en/rates';

/**
 * 全量 message id 的字面量联合类型。
 *
 * 之所以从 `@/locales/en/*` 的各个子模块派生、而不是直接 `keyof typeof en`：
 * - `@/locales/en/index.ts` 把合并结果声明成了 `Record<string, string>`，类型被拓宽，
 *   拿不到字面量 key；
 * - 从子模块求并集可以在不改动 locales 结构的前提下拿到精确的 key 联合，
 *   让 IDE 能补全 / 拼写检查 / 重命名安全。
 * - 若新增 namespace（如 `./settings`），在此处补一条 `| keyof typeof settings` 即可。
 */
export type MessageId =
  | keyof typeof common
  | keyof typeof currencies
  | keyof typeof customsDict
  | keyof typeof home
  | keyof typeof about
  | keyof typeof rates;

/**
 * 插值字典。当前业务仅使用 string/number/boolean/Date 这类原始值；
 * 若后续出现富文本（values 里传 `(chunks) => <b>{chunks}</b>`），
 * 再追加一个 `tx()` / `useTranslateRich()` 返回 ReactNode，不污染本 API。
 */
export type TranslateValues = Record<string, PrimitiveType>;

export type TranslateFn = (id: MessageId, values?: TranslateValues) => string;

/**
 * 组件内使用的翻译入口，替代散落的 `intl.formatMessage({ id })` 写法。
 *
 * - 基于 `useIntl()`，在 `IntlProvider` 重渲染时自动跟随语言切换；
 * - 用 `useCallback` 锁定返回引用，便于下游 `useMemo / useEffect` 依赖；
 * - 需要 `formatDate / formatNumber` 等非 message 能力时，仍可直接用 `useIntl()`，
 *   本 hook 不做劫持。
 */
export const useTranslate = (): TranslateFn => {
  const intl = useIntl();

  return useCallback<TranslateFn>(
    (id, values) => intl.formatMessage({ id }, values),
    [intl],
  );
};
