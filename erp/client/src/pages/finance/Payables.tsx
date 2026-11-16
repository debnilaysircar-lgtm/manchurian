import { useState, type FormEvent } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { api, fmtMoney, fmtQty, qs, todayIso, useApi } from '../../api';
import { useAuth } from '../../auth';
import { Card, Empty, ErrorBanner, Field, Loading, Modal, PageHeader, Status, SuccessBanner } from '../../components/ui';

export function InvoiceList() {
  const [params] = useSearchParams();
  const [status, setStatus] = useState('');
  const vendorId = params.get('vendor') ?? undefined;
  const { data, error, loading } = useApi<any[]>(`/invoices${qs({ status, vendorId })}`);
  const today = todayIso();
  return (
    <div>
      <PageHeader title="Vendor Invoices" subtitle="Posted from purchase orders (Purchasing → PO → Enter invoice)" />
      <ErrorBanner error={error} />
      <Card actions={
        <select className="input w-44" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option><option>OPEN</option><option>PARTIALLY_PAID</option><option>PAID</option>
        </select>
      } title={vendorId ? 'Filtered by vendor' : 'All invoices'}>
        {loading && !data ? <Loading /> : !data?.length ? <Empty /> : (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead><tr><th>Document</th><th>Vendor ref.</th><th>Vendor</th><th>PO</th><th>Invoice date</th><th>Due date</th><th className="num">Total</th><th className="num">Open</th><th>Status</th></tr></thead>
              <tbody>
                {data.map((i) => (
                  <tr key={i.id}>
                    <td><Link className="link font-mono" to={`/finance/invoices/${i.id}`}>{i.doc_no}</Link></td>
                    <td>{i.vendor_ref}</td>
                    <td>{i.vendor_name}</td>
                    <td>{i.po_id && <Link className="link font-mono" to={`/purchasing/orders/${i.po_id}`}>{i.po_doc_no}</Link>}</td>
                    <td>{i.invoice_date}</td>
                    <td className={i.status !== 'PAID' && i.due_date < today ? 'font-medium text-red-600' : ''}>{i.due_date}</td>
                    <td className="num">{fmtMoney(i.total)}</td>
                    <td className="num">{fmtMoney(i.open_amount)}</td>
                    <td><Status value={i.status} /></td>
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

export function InvoiceDetail() {
  const { id } = useParams();
  const { can } = useAuth();
  const { data: inv, error, reload } = useApi<any>(`/invoices/${id}`);
  const [paying, setPaying] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  if (error) return <ErrorBanner error={error} />;
  if (!inv) return <Loading />;
  return (
    <div>
      <PageHeader
        title={`Vendor Invoice ${inv.doc_no}`}
        subtitle={<>{inv.vendor_code} {inv.vendor_name} · ref. {inv.vendor_ref} · <Status value={inv.status} /></>}
        actions={can('finance') && inv.status !== 'PAID' && <button className="btn-primary" onClick={() => setPaying(true)}>Post payment</button>}
      />
      <SuccessBanner message={msg} onClose={() => setMsg(null)} />
      <Card className="mb-4">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 p-4 text-sm md:grid-cols-4">
          <div><dt className="label">Invoice date</dt><dd>{inv.invoice_date}</dd></div>
          <div><dt className="label">Due date</dt><dd>{inv.due_date}</dd></div>
          <div><dt className="label">Purchase order</dt><dd>{inv.po_id ? <Link className="link font-mono" to={`/purchasing/orders/${inv.po_id}`}>{inv.po_doc_no}</Link> : '—'}</dd></div>
          <div><dt className="label">FI document</dt><dd><Link className="link font-mono" to={`/finance/journals/${inv.journal_entry_id}`}>{inv.journal_doc_no}</Link></dd></div>
          <div><dt className="label">Total</dt><dd className="font-semibold">{fmtMoney(inv.total)}</dd></div>
          <div><dt className="label">Paid</dt><dd>{fmtMoney(inv.paid_amount)}</dd></div>
          <div><dt className="label">Open</dt><dd className="font-semibold">{fmtMoney(inv.open_amount)}</dd></div>
        </dl>
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Items">
          <table className="tbl">
            <thead><tr><th>Description</th><th className="num">Qty</th><th className="num">Price</th><th className="num">Amount</th></tr></thead>
            <tbody>{inv.lines.map((l: any, i: number) => <tr key={i}><td>{l.description}</td><td className="num">{fmtQty(l.qty)}</td><td className="num">{fmtMoney(l.unit_price)}</td><td className="num">{fmtMoney(l.amount)}</td></tr>)}</tbody>
          </table>
        </Card>
        <Card title="Payments">
          {!inv.payments.length ? <Empty>No payments yet</Empty> : (
            <table className="tbl">
              <thead><tr><th>Payment</th><th>Date</th><th>Reference</th><th>FI doc</th><th className="num">Amount</th></tr></thead>
              <tbody>{inv.payments.map((p: any) => (
                <tr key={p.doc_no}><td className="font-mono">{p.doc_no}</td><td>{p.payment_date}</td><td>{p.reference}</td>
                  <td><Link className="link font-mono" to={`/finance/journals/${p.journal_entry_id}`}>{p.journal_doc_no}</Link></td><td className="num">{fmtMoney(p.amount)}</td></tr>
              ))}</tbody>
            </table>
          )}
        </Card>
      </div>
      {paying && <PaymentModal invoice={inv} onClose={() => setPaying(false)} onDone={(m) => { setPaying(false); setMsg(m); reload(); }} />}
    </div>
  );
}

function PaymentModal({ invoice, onClose, onDone }: { invoice: any; onClose: () => void; onDone: (msg: string) => void }) {
  const { data: accounts } = useApi<any[]>('/accounts');
  const [f, setF] = useState({ amount: String(invoice.open_amount), paymentDate: todayIso(), bankAccountId: '', reference: '' });
  const [error, setError] = useState<string | null>(null);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const r = await api(`/invoices/${invoice.id}/pay`, {
        body: { amount: Number(f.amount), paymentDate: f.paymentDate, reference: f.reference || undefined, bankAccountId: f.bankAccountId ? Number(f.bankAccountId) : undefined },
      });
      onDone(`Payment ${r.docNo} posted (FI document ${r.journalDocNo})`);
    } catch (err) {
      setError((err as Error).message);
    }
  };
  return (
    <Modal title={`Pay invoice ${invoice.doc_no}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <ErrorBanner error={error} />
        <Field label={`Amount (open: ${fmtMoney(invoice.open_amount)})`}><input className="input" type="number" step="0.01" min="0.01" max={invoice.open_amount} value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} required /></Field>
        <Field label="Payment date"><input className="input" type="date" value={f.paymentDate} onChange={(e) => setF({ ...f, paymentDate: e.target.value })} required /></Field>
        <Field label="Pay from account">
          <select className="input" value={f.bankAccountId} onChange={(e) => setF({ ...f, bankAccountId: e.target.value })}>
            <option value="">Default bank account</option>
            {accounts?.filter((a) => a.type === 'ASSET').map((a) => <option key={a.id} value={a.id}>{a.code} {a.name}</option>)}
          </select>
        </Field>
        <Field label="Payment reference"><input className="input" value={f.reference} onChange={(e) => setF({ ...f, reference: e.target.value })} placeholder="e.g. wire number" /></Field>
        <div className="flex justify-end gap-2 pt-2"><button type="button" className="btn-secondary" onClick={onClose}>Cancel</button><button className="btn-primary">Post payment</button></div>
      </form>
    </Modal>
  );
}

export function PaymentList() {
  const { data, error, loading } = useApi<any[]>('/payments');
  return (
    <div>
      <PageHeader title="Outgoing Payments" subtitle="Payments are posted from an open vendor invoice" />
      <ErrorBanner error={error} />
      <Card>
        {loading && !data ? <Loading /> : !data?.length ? <Empty /> : (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead><tr><th>Payment</th><th>Date</th><th>Vendor</th><th>Invoice</th><th>Reference</th><th>Bank</th><th>FI doc</th><th className="num">Amount</th></tr></thead>
              <tbody>
                {data.map((p) => (
                  <tr key={p.id}>
                    <td className="font-mono">{p.doc_no}</td><td>{p.payment_date}</td><td>{p.vendor_name}</td>
                    <td><Link className="link font-mono" to={`/finance/invoices/${p.invoice_id}`}>{p.invoice_doc_no}</Link> <span className="text-slate-500">{p.vendor_ref}</span></td>
                    <td>{p.reference}</td><td className="font-mono">{p.bank_code}</td>
                    <td><Link className="link font-mono" to={`/finance/journals/${p.journal_entry_id}`}>{p.journal_doc_no}</Link></td>
                    <td className="num">{fmtMoney(p.amount)}</td>
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
