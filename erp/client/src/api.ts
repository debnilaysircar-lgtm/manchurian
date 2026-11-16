import { send } from '@backend';
import { useCallback, useEffect, useState } from 'react';

const TOKEN_KEY = 'erp_token';

export const getToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};
export const setToken = (t: string | null) => {
  try {
    if (t) localStorage.setItem(TOKEN_KEY, t);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage unavailable */
  }
};

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function api<T = any>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  const method = opts.method ?? (opts.body !== undefined ? 'POST' : 'GET');
  const { status, data } = await send(method, path, opts.body, getToken());
  if (status === 401 && path !== '/auth/login') {
    setToken(null);
    window.dispatchEvent(new Event('erp:logout'));
  }
  if (status >= 400) throw new ApiError(status, data?.error ?? `Request failed (${status})`);
  return data as T;
}

/** Load data from a GET endpoint; re-runs when the path changes. */
export function useApi<T = any>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const load = useCallback(() => {
    if (!path) return;
    setLoading(true);
    api<T>(path)
      .then((d) => {
        setData(d);
        setError(null);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [path]);
  useEffect(load, [load]);
  return { data, error, loading, reload: load };
}

export const qs = (params: Record<string, string | number | undefined | null>) => {
  const p = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '');
  return p.length ? '?' + new URLSearchParams(p.map(([k, v]) => [k, String(v)])).toString() : '';
};

const money = new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const fmtMoney = (n: number | null | undefined) => (n == null ? '' : money.format(n));
export const fmtQty = (n: number | null | undefined) => (n == null ? '' : new Intl.NumberFormat(undefined, { maximumFractionDigits: 3 }).format(n));
export const todayIso = () => new Date().toISOString().slice(0, 10);
