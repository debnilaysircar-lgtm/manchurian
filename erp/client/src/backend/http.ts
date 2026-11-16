/** Normal transport: the Express API on the same origin (proxied by Vite in development). */
export async function send(method: string, path: string, body: unknown, token: string | null): Promise<{ status: number; data: any }> {
  const res = await fetch(`/api${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, data: await res.json().catch(() => ({})) };
}

/** Only the in-browser demo can reset its data. */
export const resetData: (() => Promise<void>) | undefined = undefined;
export const isDemo = false;
