import { useCallback, useEffect, useRef, useState } from 'react';
import { errorMessage } from '../services/api';

interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/** Small data-fetching hook with cancellation and manual reload. */
export function useFetch<T>(fetcher: () => Promise<T>, deps: unknown[] = []) {
  const [state, setState] = useState<FetchState<T>>({ data: null, loading: true, error: null });
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));
    fetcherRef
      .current()
      .then((data) => {
        if (!cancelled) setState({ data, loading: false, error: null });
      })
      .catch((error) => {
        if (!cancelled) setState((s) => ({ data: s.data, loading: false, error: errorMessage(error) }));
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, version]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  const setData = useCallback((updater: T | ((prev: T | null) => T | null)) => {
    setState((s) => ({ ...s, data: typeof updater === 'function' ? (updater as (prev: T | null) => T | null)(s.data) : updater }));
  }, []);

  return { ...state, reload, setData };
}
