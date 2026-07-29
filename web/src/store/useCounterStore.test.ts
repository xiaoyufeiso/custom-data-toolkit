import {
  beforeEach, describe, expect, it,
} from 'vitest';
import useCounterStore from '@/store/useCounterStore';

describe('useCounterStore', () => {
  beforeEach(() => {
    useCounterStore.getState().reset();
  });

  it('increments, decrements, and resets count', () => {
    const store = useCounterStore.getState();

    store.increment();
    store.increment();
    expect(useCounterStore.getState().count).toBe(2);

    useCounterStore.getState().decrement();
    expect(useCounterStore.getState().count).toBe(1);

    useCounterStore.getState().reset();
    expect(useCounterStore.getState().count).toBe(0);
  });
});
