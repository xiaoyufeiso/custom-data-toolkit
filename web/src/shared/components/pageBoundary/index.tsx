import { Component, ReactNode, ErrorInfo } from 'react';
import { Button, Result } from 'tendata-ui';
import { useTranslate, type TranslateFn } from '@/shared/hooks';

interface PageBoundaryProps {
  children: ReactNode;
  /**
   * 自定义兜底 UI。收到 `reset` 回调，调用后会清空错误、重新渲染子树。
   * 不传则使用 antd `Result` 的默认错误态。
   */
  fallback?: (args: { error: Error; reset: () => void }) => ReactNode;
  /**
   * 发生错误时的副作用钩子，常用于上报（Sentry、埋点等）。
   */
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface InnerProps extends PageBoundaryProps {
  t: TranslateFn;
}

interface State {
  error: Error | null;
}

/**
 * 页面级错误边界。
 *
 * 放在 `pages/*` 路由壳里，承担"单页崩溃不炸整个 Layout"的职责：
 * - 子树抛错时展示兜底 UI，而不是白屏；
 * - 提供 reset，允许用户在不刷新整页的情况下重试渲染；
 * - 通过 onError 钩子把错误送到监控平台，不污染 `views/` 业务代码。
 *
 * 使用 class 组件实现是因为 `componentDidCatch` / `getDerivedStateFromError`
 * 是 React 目前唯一稳定的错误边界 API，函数组件暂无对等能力。
 */
class PageBoundaryInner extends Component<InnerProps, State> {
  constructor(props: InnerProps) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    const { onError } = this.props;
    onError?.(error, info);
    // 保留控制台堆栈，避免 onError 吞掉排查线索。
    // eslint-disable-next-line no-console
    console.error('[PageBoundary] caught error:', error, info);
  }

  reset = () => {
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    const { children, fallback, t } = this.props;

    if (!error) return children;

    if (fallback) return fallback({ error, reset: this.reset });

    return (
      <Result
        code="500"
        title={t('common.pageBoundary.title')}
        subTitle={error.message || t('common.pageBoundary.subTitle')}
        button={(
          <Button type="primary" onClick={this.reset}>
            {t('common.pageBoundary.retry')}
          </Button>
        )}
      />
    );
  }
}

/**
 * 函数式包装：把 `useTranslate` 注入给 class 组件。
 * 之所以不在 class 里直接用 hook —— class 组件不能调用 hook；
 * 之所以不把文案硬编码 —— 需要跟随语言切换动态更新。
 */
const PageBoundary = (props: PageBoundaryProps) => {
  const t = useTranslate();
  return <PageBoundaryInner {...props} t={t} />;
};

export default PageBoundary;
