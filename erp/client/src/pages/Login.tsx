import { useState, type FormEvent } from 'react';
import { useAuth } from '../auth';
import { ErrorBanner } from '../components/ui';

export default function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
        <p className="mt-4 text-xs text-slate-500">
          Demo users: <b>admin</b>/admin123, <b>fiona</b> (finance), <b>paul</b> (purchasing), <b>wendy</b> (warehouse) — password demo123
        </p>
      </form>
    </div>
  );
}
