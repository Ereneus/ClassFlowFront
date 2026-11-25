import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { usePolling } from '../usePolling';

/** Deja correr las promesas pendientes (los fetchers de prueba resuelven en microtareas). */
const flush = async (): Promise<void> => {
  await act(async () => {
    await Promise.resolve();
  });
};

describe('usePolling', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('carga al montar y vuelve a pedir en cada intervalo', async () => {
    let value = 0;
    const fetcher = vi.fn(async () => ++value);

    const { result } = renderHook(() => usePolling(fetcher, 5000));
    await flush();

    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBe(1);
    expect(result.current.lastUpdated).toBeInstanceOf(Date);

    await act(async () => {
      vi.advanceTimersByTime(5000);
    });
    await flush();

    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(result.current.data).toBe(2);
  });

  it('conserva los últimos datos cuando un refresco falla', async () => {
    const fetcher = vi
      .fn<() => Promise<string>>()
      .mockResolvedValueOnce('ok')
      .mockRejectedValueOnce({ message: 'Network Error' });

    const { result } = renderHook(() => usePolling(fetcher, 1000));
    await flush();

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    await flush();

    expect(result.current.data).toBe('ok');
    expect(result.current.error).toBe('Network Error');
  });

  it('no encadena peticiones mientras una sigue en curso', async () => {
    const fetcher = vi.fn(() => new Promise<number>(() => undefined));

    renderHook(() => usePolling(fetcher, 1000));
    await act(async () => {
      vi.advanceTimersByTime(3000);
    });

    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('deja de consultar al desmontarse', async () => {
    const fetcher = vi.fn(async () => 1);

    const { unmount } = renderHook(() => usePolling(fetcher, 1000));
    await flush();
    unmount();

    await act(async () => {
      vi.advanceTimersByTime(5000);
    });

    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
