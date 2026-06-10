import { useCallback, useEffect, useState } from 'react';

// Fetches data on mount and exposes a `reload` for mutations/retries. Centralises
// loading + error handling so no page leaks an unhandled rejection. The error is
// returned (not just toasted) so pages can render an inline retry state.
export function useFetch(fetcher, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await fetcher());
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
    // fetcher identity is controlled by the caller's deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, reload: load, setData };
}
