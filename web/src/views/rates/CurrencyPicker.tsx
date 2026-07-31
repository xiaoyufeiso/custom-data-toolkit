import {
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Button,
  Empty,
  List,
  Loading,
  Popover,
} from 'tendata-ui';
import type { Currency } from '@/services/currency';
import { useTranslate } from '@/shared/hooks';
import {
  formatCurrencyOptionLabel,
  groupCurrenciesByCodeInitial,
  indexLettersFromGroups,
  type InitialKey,
} from './currencyPickerUtils';
import styles from './index.module.less';

type CurrencyPickerProps = {
  currencies: Currency[];
  value?: string;
  onChange?: (currencyId: string) => void;
  loading?: boolean;
  disabled?: boolean;
};

const CurrencyPicker = ({
  currencies,
  value,
  onChange,
  loading = false,
  disabled = false,
}: CurrencyPickerProps) => {
  const t = useTranslate();
  const [open, setOpen] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const groups = useMemo(
    () => groupCurrenciesByCodeInitial(currencies),
    [currencies],
  );
  const indexLetters = useMemo(
    () => indexLettersFromGroups(groups),
    [groups],
  );

  const selected = currencies.find((c) => String(c.id) === value);
  const triggerLabel = selected
    ? formatCurrencyOptionLabel(selected)
    : t('rates.picker.placeholder');

  const scrollToInitial = (initial: InitialKey) => {
    const list = listRef.current;
    if (!list) return;
    const section = list.querySelector<HTMLElement>(
      `[data-initial="${initial}"]`,
    );
    if (!section) return;
    list.scrollTop = section.offsetTop;
  };

  const onSelect = (currencyId: number) => {
    onChange?.(String(currencyId));
    setOpen(false);
  };

  const renderListContent = () => {
    if (loading) {
      return <Loading title={t('rates.picker.loading')} />;
    }
    if (groups.length === 0) {
      return (
        <Empty
          image="data"
          description={t('rates.picker.empty')}
          className={styles.currencyPickerEmpty}
        />
      );
    }
    return (
      <List
        split={false}
        dataSource={groups}
        rowKey="initial"
        renderItem={(group) => (
          <List.Item className={styles.currencyPickerSection}>
            <div data-initial={group.initial}>
              <div className={styles.currencyPickerSectionTitle}>
                {group.initial}
              </div>
              {group.items.map((currency) => {
                const active = String(currency.id) === value;
                return (
                  <div
                    key={currency.id}
                    role="option"
                    aria-selected={active}
                  >
                    <Button
                      type={active ? 'primary' : 'link'}
                      classNames={styles.currencyPickerOption}
                      onClick={() => onSelect(currency.id)}
                    >
                      {formatCurrencyOptionLabel(currency)}
                    </Button>
                  </div>
                );
              })}
            </div>
          </List.Item>
        )}
      />
    );
  };

  const panel = (
    <div
      className={styles.currencyPickerPanel}
      role="listbox"
      aria-label={t('rates.picker.listLabel')}
    >
      <div className={styles.currencyPickerList} ref={listRef}>
        {renderListContent()}
      </div>
      {indexLetters.length > 0 && !loading ? (
        <div className={styles.currencyPickerIndex}>
          {indexLetters.map((letter) => (
            <Button
              type="link"
              size="minimum"
              key={letter}
              classNames={styles.currencyPickerIndexBtn}
              onClick={() => scrollToInitial(letter)}
            >
              {letter}
            </Button>
          ))}
        </div>
      ) : null}
    </div>
  );

  return (
    <div className={styles.currencyPicker}>
      <Popover
        content={panel}
        trigger="click"
        placement="bottomLeft"
        open={open}
        padding="0"
        maxWidth="none"
        onOpenChange={(nextOpen) => {
          setOpen(disabled || loading ? false : nextOpen);
        }}
      >
        <fieldset
          disabled={disabled || loading}
          className={styles.currencyPickerTriggerFieldset}
        >
          <Button
            type="default"
            loading={loading}
            disabled={disabled}
            classNames={styles.currencyPickerTrigger}
          >
            {loading ? t('rates.picker.loading') : triggerLabel}
          </Button>
        </fieldset>
      </Popover>
    </div>
  );
};

export default CurrencyPicker;
