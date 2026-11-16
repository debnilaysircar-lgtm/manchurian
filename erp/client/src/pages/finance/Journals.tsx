import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, fmtMoney, qs, todayIso, useApi } from '../../api';
import { useAuth } from '../../auth';
import { useConfirm } from '../../components/confirm';
import { Card, Empty, ErrorBanner, Field, Loading, PageHeader, Status } from '../../components/ui';

const SOURCES = ['MANUAL', 'GR', 'GI', 'INITIAL', 'ADJUST', 'INVOICE', 'PAYMENT', 'DELIVERY', 'BILLING', 'RECEIPT', 'REVERSAL'];

export function JournalList() {
  const { can } = useAuth();
  const [f, setF] = useState({ from: '', to: '', source: '', search: '' });
  const { data, error, loading } = useApi<any[]>(`/journals${qs(f)}`);
  return (
    <div>
      <PageHeader
        title="Journal Entries"
        subtitle="All postings to the general ledger"
        actions={can('finance') && <Link className="btn-primary" to="/finance/journals/new">+ New journal entry</Link>}
      />
      <ErrorBanner error={error} />
      <Card>
        <div className="grid grid-cols-2 gap-3 border-b border-slate-200 p-3 md:grid-cols-4">
          <Field label="From"><input className="input" type="date" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} /></Field>
          <Field label="To"><input className="input" type="date" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} /></Field>
          <Field label="Source">
            <select className="input" value={f.source} onChange={(e) => setF({ ...f, source: e.target.value })}>
              <option value="">All</option>
              {SOURCES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Search"><input className="input" placeholder="Doc no, reference, text" value={f.search} onChange={(e) => setF({ ...f, search: e.target.value })} /></Field>
        </div>
        {loading && !data ? <Loading /> : !data?.length ? <Empty /> : (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead><tr><th>Document</th><th>Posting date</th><th>Source</th><th>Reference</th><th>Description</th><th className="num">Amount</th><th>Status</th><th>Posted by</th></tr></thead>
              <tbody>
                {data.map((j) => (
                  <tr key={j.id}>
                    <td><Link className="link font-mono" to={`/finance/journals/${j.id}`}>{j.doc_no}</Link></td>
                    <td>{j.posting_date}</td>
                    <td>{j.source}</td>
                    <td>{j.reference}</td>
                    <td>{j.description}</td>
                    <td className="num">{fmtMoney(j.amount)}</td>
                    <td><Status value={j.status} /></td>
                    <td className="text-slate-500">{j.created_by_name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

type Line = { accountId: string; debit: string; credit: string; memo: string; vendorId: string };
const emptyLine = (): Line => ({ accountId: '', debit: '', credit: '', memo: '', vendorId: '' });

export function JournalNew() {
  const nav = useNavigate();
  const { data: accounts } = useApi<any[]>('/accounts');
  const { data: vendors } = useApi<any[]>('/vendors');
  const [head, setHead] = useState({ postingDate: todayIso(), reference: '', description: '' });
  const [lines, setLines] = useState<Line[]>([emptyLine(), emptyLine()]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const dr = lines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
  const cr = lines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
  const balanced = Math.round(dr * 100) === Math.round(cr * 100) && dr > 0;
  const setLine = (i: number, patch: Partial<Line>) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const body = {
        ...head,
        lines: lines
          .filter((l) => l.accountId && (Number(l.debit) || Number(l.credit)))
          .map((l) => ({ accountId: Number(l.accountId), debit: Number(l.debit) || 0, credit: Number(l.credit) || 0, memo: l.memo || null, vendorId: l.vendorId ? Number(l.vendorId) : null })),
      };
      const r = await api<{ id: number }>('/journals', { body });
      nav(`/finance/journals/${r.id}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit}>
      <PageHeader title="New Journal Entry" subtitle="Manual G/L posting — debits must equal credits" />
      <ErrorBanner error={error} onClose={() => setError(null)} />
      <Card className="mb-4">
        <div className="grid gap-3 p-4 md:grid-cols-3">
          <Field label="Posting date"><input className="input" type="date" required value={head.postingDate} onChange={(e) => setHead({ ...head, postingDate: e.target.value })} /></Field>
          <Field label="Reference"><input className="input" value={head.reference} onChange={(e) => setHead({ ...head, reference: e.target.value })} /></Field>
          <Field label="Header text"><input className="input" value={head.description} onChange={(e) => setHead({ ...head, description: e.target.value })} /></Field>
        </div>
      </Card>
      <Card title="Line items">
        <div className="overflow-x-auto">
          <table className="tbl">
            <thead><tr><th className="w-72">G/L account</th><th className="w-32 num">Debit</th><th className="w-32 num">Credit</th><th>Text</th><th className="w-48">Vendor (optional)</th><th /></tr></thead>
            <tbody>
              {lines.map((l, i) => (
                <tr key={i}>
                  <td>
                    <select className="input" value={l.accountId} onChange={(e) => setLine(i, { accountId: e.target.value })}>
                      <option value="">Select account…</option>
                      {accounts?.filter((a) => a.is_active).map((a) => <option key={a.id} value={a.id}>{a.code} {a.name}</option>)}
                    </select>
                  </td>
                  <td><input className="input text-right" type="number" step="0.01" min="0" value={l.debit} onChange={(e) => setLine(i, { debit: e.target.value, credit: e.target.value ? '' : l.credit })} /></td>
                  <td><input className="input text-right" type="number" step="0.01" min="0" value={l.credit} onChange={(e) => setLine(i, { credit: e.target.value, debit: e.target.value ? '' : l.debit })} /></td>
                  <td><input className="input" value={l.memo} onChange={(e) => setLine(i, { memo: e.target.value })} /></td>
                  <td>
                    <select className="input" value={l.vendorId} onChange={(e) => setLine(i, { vendorId: e.target.value })}>
                      <option value="" />
                      {vendors?.map((v) => <option key={v.id} value={v.id}>{v.code} {v.name}</option>)}
                    </select>
                  </td>
                  <td>{lines.length > 2 && <button type="button" className="text-slate-400 hover:text-red-600" onClick={() => setLines(lines.filter((_, j) => j !== i))}>✕</button>}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-semibold">
                <td><button type="button" className="link text-sm font-normal" onClick={() => setLines([...lines, emptyLine()])}>+ Add line</button></td>
                <td className="num px-3">{fmtMoney(dr)}</td>
                <td className="num px-3">{fmtMoney(cr)}</td>
                <td colSpan={3} className={`px-3 ${balanced ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {balanced ? '✓ Balanced' : `Difference ${fmtMoney(Math.abs(dr - cr))}`}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
      <div className="mt-4 flex justify-end gap-2">
        <Link to="/finance/journals" className="btn-secondary">Cancel</Link>
        <button className="btn-primary" disabled={!balanced || busy}>Post</button>
      </div>
    </form>
  );
}

export function JournalDetail() {
  const { id } = useParams();
  const { can } = useAuth();
  const nav = useNavigate();
  const { data: j, error, reload } = useApi<any>(`/journals/${id}`);
  const [actionError, setActionError] = useState<string | null>(null);
  const ask = useConfirm();
  if (error) return <ErrorBanner error={error} />;
  if (!j) return <Loading />;

  const reverse = async () => {
    if (!(await ask(`Reverse document ${j.doc_no}? A mirror entry will be posted today.`, 'Reverse'))) return;
    try {
      const r = await api<{ id: number }>(`/journals/${j.id}/reverse`, { body: {} });
      reload();
      nav(`/finance/journals/${r.id}`);
    } catch (e) {
      setActionError((e as Error).message);
    }
  };
  const dr = j.lines.reduce((s: number, l: any) => s + l.debit, 0);
  const cr = j.lines.reduce((s: number, l: any) => s + l.credit, 0);

  return (
    <div>
      <PageHeader
        title={`Journal Entry ${j.doc_no}`}
        subtitle={<>{j.description} · <Status value={j.status} /></>}
        actions={can('finance') && j.source === 'MANUAL' && j.status === 'POSTED' && <button className="btn-danger" onClick={reverse}>Reverse</button>}
      />
      <ErrorBanner error={actionError} onClose={() => setActionError(null)} />
      <Card className="mb-4">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 p-4 text-sm md:grid-cols-4">
          <div><dt className="label">Posting date</dt><dd>{j.posting_date}</dd></div>
          <div><dt className="label">Source</dt><dd>{j.source} {j.source_doc && <span className="font-mono text-slate-500">({j.source_doc})</span>}</dd></div>
          <div><dt className="label">Reference</dt><dd>{j.reference || '—'}</dd></div>
          <div><dt className="label">Posted by</dt><dd>{j.created_by_name} · {j.created_at}</dd></div>
          {j.reversed_by && <div><dt className="label">Reversed by</dt><dd><Link className="link font-mono" to={`/finance/journals/${j.reversed_by}`}>{j.reversed_by_doc}</Link></dd></div>}
          {j.reversal_of && <div><dt className="label">Reversal of</dt><dd><Link className="link font-mono" to={`/finance/journals/${j.reversal_of}`}>{j.reversal_of_doc}</Link></dd></div>}
        </dl>
      </Card>
      <Card title="Line items">
        <div className="overflow-x-auto">
          <table className="tbl">
            <thead><tr><th>#</th><th>Account</th><th>Text</th><th>Business partner</th><th>Material</th><th className="num">Debit</th><th className="num">Credit</th></tr></thead>
            <tbody>
              {j.lines.map((l: any) => (
                <tr key={l.line_no}>
                  <td>{l.line_no}</td>
                  <td><Link className="link" to={`/finance/ledger?account=${l.account_id}`}><span className="font-mono">{l.account_code}</span> {l.account_name}</Link></td>
                  <td>{l.memo}</td>
                  <td>{l.vendor_name ?? l.customer_name}</td>
                  <td className="font-mono">{l.material_code}</td>
                  <td className="num">{l.debit ? fmtMoney(l.debit) : ''}</td>
                  <td className="num">{l.credit ? fmtMoney(l.credit) : ''}</td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr className="font-semibold"><td colSpan={5} className="px-3 py-2">Total</td><td className="num px-3">{fmtMoney(dr)}</td><td className="num px-3">{fmtMoney(cr)}</td></tr></tfoot>
          </table>
        </div>
      </Card>
    </div>
  );
}
