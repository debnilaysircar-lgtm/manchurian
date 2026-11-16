import { useState, type FormEvent } from 'react';
import { useAuth } from '../auth';
import { ErrorBanner } from '../components/ui';
import { isDemo, resetData } from '@backend';

export default function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [note, setNote] = useState<string | null>(null);
  const signIn = async (u: string, p: string) => {
    setBusy(true);
    setError(null);
    try {
      await login(u, p);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const reset = async () => {
    setBusy(true);
    await resetData?.();
    setBusy(false);
    setNote('Demo data was reset.');
  };
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(username, password);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-shell p-4">
      <form onSubmit={submit} className="card w-full max-w-sm p-6">
        <div className="mb-5 flex items-center gap-2">
          <span className="rounded bg-brand-500 px-1.5 py-0.5 text-xs font-bold text-white">ERP</span>
          <h1 className="text-lg font-semibold text-slate-800">Manchurian ERP</h1>
        </div>
        <ErrorBanner error={error} />
        <label className="mb-3 block">
          <span className="label">Username</span>
          <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} autoFocus />
        </label>
        <label className="mb-4 block">
          <span className="label">Password</span>
          <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        <button className="btn-primary w-full justify-center" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
        {isDemo ? (
          <div className="mt-5 border-t border-slate-200 pt-4">
            <div className="label">Sign in as a demo user</div>
            <div className="grid grid-cols-2 gap-2">
              {[
                ['admin', 'admin123', 'Administrator'],
                ['fiona', 'demo123', 'Finance'],
                ['paul', 'demo123', 'Purchasing'],
                ['wendy', 'demo123', 'Warehouse'],
                ['sam', 'demo123', 'Sales'],
              ].map(([u, p, role]) => (
                <button key={u} type="button" className="btn-secondary justify-between" disabled={busy} onClick={() => signIn(u, p)}>
                  <span>{u}</span>
                  <span className="text-xs font-normal text-slate-500">{role}</span>
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs text-slate-500">
              This demo runs entirely in your browser. Your changes are kept in this browser only.{' '}
              <button type="button" className="link" disabled={busy} onClick={reset}>Reset demo data</button>
            </p>
            {note && <p className="mt-1 text-xs text-emerald-700">{note}</p>}
          </div>
        ) : (
          <p className="mt-4 text-xs text-slate-500">
            Demo users: <b>admin</b>/admin123, <b>fiona</b> (finance), <b>paul</b> (purchasing), <b>wendy</b> (warehouse), <b>sam</b> (sales). Password demo123
          </p>
        )}
      </form>
    </div>
  );
}
