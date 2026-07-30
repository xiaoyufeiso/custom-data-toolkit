import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { Currency } from '@/services/currency';
import {
  formatCurrencyOptionLabel,
  groupCurrenciesByCodeInitial,
  indexLettersFromGroups,
  type InitialKey,
} from './currencyPickerUtils';
import styles from './index.module.less';

type CurrencyPickerProps = {
  currencies: Currency[];
  value: string;
  onChange: (currencyId: string) => void;
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
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
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
    : '请选择';

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event: MouseEvent) => {
      const root = rootRef.current;
      if (!root) return;
      if (event.target instanceof Node && !root.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
    };
  }, [open]);

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
    onChange(String(currencyId));
    setOpen(false);
  };

  return (
    <div className={styles.currencyPicker} ref={rootRef}>
      <button
        type="button"
        className={styles.currencyPickerTrigger}
        disabled={disabled || loading}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => {
          if (disabled || loading) return;
          setOpen((prev) => !prev);
        }}
      >
        {loading ? '货币加载中…' : triggerLabel}
      </button>
      {open ? (
        <div className={styles.currencyPickerPanel} role="listbox">
          <div className={styles.currencyPickerList} ref={listRef}>
            {groups.length === 0 ? (
              <div className={styles.currencyPickerEmpty}>暂无货币</div>
            ) : (
              groups.map((group) => (
                <div
                  key={group.initial}
                  className={styles.currencyPickerSection}
                  data-initial={group.initial}
                >
                  <div className={styles.currencyPickerSectionTitle}>
                    {group.initial}
                  </div>
                  {group.items.map((currency) => {
                    const active = String(currency.id) === value;
                    return (
                      <button
                        type="button"
                        key={currency.id}
                        role="option"
                        aria-selected={active}
                        className={`${styles.currencyPickerOption}${
                          active ? ` ${styles.currencyPickerOptionActive}` : ''
                        }`}
                        onClick={() => onSelect(currency.id)}
                      >
                        {formatCurrencyOptionLabel(currency)}
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>
          {indexLetters.length > 0 ? (
            <div className={styles.currencyPickerIndex} aria-hidden>
              {indexLetters.map((letter) => (
                <button
                  type="button"
                  key={letter}
                  className={styles.currencyPickerIndexBtn}
                  onClick={() => scrollToInitial(letter)}
                >
                  {letter}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

export default CurrencyPicker;
