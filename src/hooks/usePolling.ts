import { useCallback, useEffect, useRef, useState } from 'react';
import { getErrorMessage } from '@utils';

export interface UsePollingResult<T> {
  data: T | null;
  /** true solo en la primera carga; los refrescos siguientes no ocultan los datos. */
  loading: boolean;
  error: string | null;
  /** Momento de la última respuesta correcta. */
  lastUpdated: Date | null;
  /** Fuerza un refresco inmediato. */
  refresh: () => void;
}

/**
 * Pide `fetcher` al montar y luego cada `intervalMs`, para que la vista refleje sin
 * intervención manual el estado que el backend actualiza desde Kafka.
 *
 * - No encadena peticiones: si una sigue en curso, el siguiente tick se omite.
 * - Mientras la pestaña está oculta no consulta; al volver a mostrarse refresca de inmediato.
 * - Si un refresco falla, conserva los últimos datos y expone el error.
 */
export function usePolling<T>(fetcher: () => Promise<T>, intervalMs: number): UsePollingResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const inFlight = useRef(false);
  const mounted = useRef(true);

  const run = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const result = await fetcherRef.current();
      if (!mounted.current) return;
      setData(result);
      setError(null);
      setLastUpdated(new Date());
    } catch (err) {
      if (mounted.current) setError(getErrorMessage(err, 'No se pudo actualizar'));
    } finally {
      inFlight.current = false;
      if (mounted.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    void run();

    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') void run();
    }, intervalMs);

    const onVisibility = (): void => {
      if (document.visibilityState === 'visible') void run();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      mounted.current = false;
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [run, intervalMs]);

  const refresh = useCallback(() => {
    void run();
  }, [run]);

  return { data, loading, error, lastUpdated, refresh };
}
