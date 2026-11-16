import { useState, type FormEvent } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { api, fmtMoney, fmtQty, qs, todayIso, useApi } from '../../api';
import { useAuth } from '../../auth';
import { Card, Empty, ErrorBanner, Field, Loading, Modal, PageHeader, Status, SuccessBanner } from '../../components/ui';

export function CustomerInvoiceList() {
  const [params] = useSearchParams();
  const [status, setStatus] = useState('');
  const customerId = params.get('customer') ?? undefined;
  const { data, error, loading } = useApi<any[]>(`/customer-invoices${qs({ status, customerId })}`);
  const today = todayIso();
  return (
    <div>
      <PageHeader title="Customer Invoices" subtitle="Billing documents created from sales orders" />
      <ErrorBanner error={error} />
      <Card
        title={customerId ? 'Filtered by customer' : 'All invoices'}
        actions={
          <select className="input w-44" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option><option>OPEN</option><option>PARTIALLY_PAID</option><option>PAID</option>
          </select>
        }
      >
        {loading && !data ? <Loading /> : !data?.length ? <Empty /> : (
          <table className="tbl">
            <thead><tr><th>Invoice</th><th>Customer</th><th>Sales order</th><th>Customer ref.</th><th>Invoice date</th><th>Due date</th><th className="num">Total</th><th className="num">Open</th><th>Status</th></tr></thead>
            <tbody>
              {data.map((i) => (
                <tr key={i.id}>
                  <td><Link className="link font-mono" to={`/sales/invoices/${i.id}`}>{i.doc_no}</Link></td>
                  <td>{i.customer_name}</td>
                  <td>{i.so_id && <Link className="link font-mono" to={`/sales/orders/${i.so_id}`}>{i.so_doc_no}</Link>}</td>
                  <td>{i.customer_ref}</td>
                  <td>{i.invoice_date}</td>
                  <td className={i.status !== 'PAID' && i.due_date < today ? 'font-medium text-red-600' : ''}>{i.due_date}</td>
                  <td className="num">{fmtMoney(i.total)}</td>
                  <td className="num">{fmtMoney(i.open_amount)}</td>
                  <td><Status value={i.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

export function CustomerInvoiceDetail() {
  const { id } = useParams();
  const { can } = useAuth();
  const { data: inv, error, reload } = useApi<any>(`/customer-invoices/${id}`);
  const { data: dash } = useApi<any>('/dashboard');
  const [receiving, setReceiving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  if (error) return <ErrorBanner error={error} />;
  if (!inv) return <Loading />;
  return (
    <div>
      <div className="print:hidden">
        <PageHeader
          title={`Customer Invoice ${inv.doc_no}`}
          subtitle={<>{inv.customer_code} {inv.customer_name} · <Status value={inv.status} /></>}
          actions={<>
            {!import.meta.env.VITE_DEMO && <button className="btn-secondary" onClick={() => window.print()}>Print</button>}
            {can('finance', 'sales') && inv.status !== 'PAID' && <button className="btn-primary" onClick={() => setReceiving(true)}>Record payment</button>}
          </>}
        />
        <SuccessBanner message={msg} onClose={() => setMsg(null)} />
      </div>

      {/* Printable invoice */}
      <div className="card mb-4 p-6 print:border-0 print:shadow-none">
        <div className="mb-6 flex flex-wrap justify-between gap-4">
          <div>
            <div className="text-lg font-semibold">{dash?.company ?? ''}</div>
            <div className="text-sm text-slate-500">INVOICE</div>
          </div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <dt className="text-slate-500">Invoice no.</dt><dd className="font-mono">{inv.doc_no}</dd>
            <dt className="text-slate-500">Invoice date</dt><dd>{inv.invoice_date}</dd>
            <dt className="text-slate-500">Due date</dt><dd>{inv.due_date}</dd>
            <dt className="text-slate-500">Your reference</dt><dd>{inv.customer_ref ?? '—'}</dd>
            <dt className="text-slate-500">Our order</dt><dd className="font-mono">{inv.so_id ? <Link className="link print:text-inherit" to={`/sales/orders/${inv.so_id}`}>{inv.so_doc_no}</Link> : '—'}</dd>
          </dl>
        </div>
        <div className="mb-6 text-sm">
          <div className="label">Bill to</div>
          <div className="font-medium">{inv.customer_name}</div>
          {inv.customer_address && <div className="whitespace-pre-line text-slate-600">{inv.customer_address}</div>}
          {inv.customer_tax_id && <div className="text-slate-600">Tax ID {inv.customer_tax_id}</div>}
        </div>
        <table className="tbl">
          <thead><tr><th>Description</th><th className="num">Qty</th><th className="num">Unit price</th><th className="num">Amount</th></tr></thead>
          <tbody>{inv.lines.map((l: any, i: number) => (
            <tr key={i}><td>{l.description}</td><td className="num">{fmtQty(l.qty)}</td><td className="num">{fmtMoney(l.unit_price)}</td><td className="num">{fmtMoney(l.amount)}</td></tr>
          ))}</tbody>
          <tfoot>
            <tr className="font-semibold"><td colSpan={3} className="px-3 py-2 text-right">Total {dash?.currency ?? ''}</td><td className="num px-3">{fmtMoney(inv.total)}</td></tr>
            {inv.paid_amount > 0 && <tr><td colSpan={3} className="px-3 py-1 text-right text-slate-500">Paid</td><td className="num px-3">{fmtMoney(inv.paid_amount)}</td></tr>}
            {inv.paid_amount > 0 && <tr className="font-semibold"><td colSpan={3} className="px-3 py-1 text-right">Balance due</td><td className="num px-3">{fmtMoney(inv.open_amount)}</td></tr>}
          </tfoot>
        </table>
      </div>

      <div className="print:hidden">
        <Card title="Payments received" actions={inv.journal_entry_id && <Link className="link text-xs" to={`/finance/journals/${inv.journal_entry_id}`}>FI document {inv.journal_doc_no}</Link>}>
          {!inv.receipts.length ? <Empty>No payments yet</Empty> : (
            <table className="tbl">
              <thead><tr><th>Receipt</th><th>Date</th><th>Reference</th><th>FI doc</th><th className="num">Amount</th></tr></thead>
              <tbody>{inv.receipts.map((r: any) => (
                <tr key={r.doc_no}><td className="font-mono">{r.doc_no}</td><td>{r.receipt_date}</td><td>{r.reference}</td>
                  <td><Link className="link font-mono" to={`/finance/journals/${r.journal_entry_id}`}>{r.journal_doc_no}</Link></td><td className="num">{fmtMoney(r.amount)}</td></tr>
              ))}</tbody>
            </table>
          )}
        </Card>
      </div>
      {receiving && <ReceiptModal invoice={inv} onClose={() => setReceiving(false)} onDone={(m) => { setReceiving(false); setMsg(m); reload(); }} />}
    </div>
  );
}

function ReceiptModal({ invoice, onClose, onDone }: { invoice: any; onClose: () => void; onDone: (msg: string) => void }) {
  const { data: accounts } = useApi<any[]>('/accounts');
  const [f, setF] = useState({ amount: String(invoice.open_amount), receiptDate: todayIso(), bankAccountId: '', reference: '' });
  const [error, setError] = useState<string | null>(null);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const r = await api(`/customer-invoices/${invoice.id}/receipt`, {
        body: { amount: Number(f.amount), receiptDate: f.receiptDate, reference: f.reference || undefined, bankAccountId: f.bankAccountId ? Number(f.bankAccountId) : undefined },
      });
      onDone(`Incoming payment ${r.docNo} posted (FI document ${r.journalDocNo})`);
    } catch (err) {
      setError((err as Error).message);
    }
  };
  return (
    <Modal title={`Record payment for ${invoice.doc_no}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <ErrorBanner error={error} />
        <Field label={`Amount received (open: ${fmtMoney(invoice.open_amount)})`}><input className="input" type="number" step="0.01" min="0.01" max={invoice.open_amount} value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} required /></Field>
        <Field label="Value date"><input className="input" type="date" value={f.receiptDate} onChange={(e) => setF({ ...f, receiptDate: e.target.value })} required /></Field>
        <Field label="Deposit to account">
          <select className="input" value={f.bankAccountId} onChange={(e) => setF({ ...f, bankAccountId: e.target.value })}>
            <option value="">Default bank account</option>
            {accounts?.filter((a) => a.type === 'ASSET').map((a) => <option key={a.id} value={a.id}>{a.code} {a.name}</option>)}
          </select>
        </Field>
        <Field label="Remittance reference"><input className="input" value={f.reference} onChange={(e) => setF({ ...f, reference: e.target.value })} /></Field>
        <div className="flex justify-end gap-2 pt-2"><button type="button" className="btn-secondary" onClick={onClose}>Cancel</button><button className="btn-primary">Post receipt</button></div>
      </form>
    </Modal>
  );
}

export function ReceiptList() {
  const { data, error, loading } = useApi<any[]>('/receipts');
  return (
    <div>
      <PageHeader title="Incoming Payments" subtitle="Customer payments are recorded from an open customer invoice" />
      <ErrorBanner error={error} />
      <Card>
        {loading && !data ? <Loading /> : !data?.length ? <Empty /> : (
          <table className="tbl">
            <thead><tr><th>Receipt</th><th>Date</th><th>Customer</th><th>Invoice</th><th>Reference</th><th>Bank</th><th>FI doc</th><th className="num">Amount</th></tr></thead>
            <tbody>
              {data.map((r) => (
                <tr key={r.id}>
                  <td className="font-mono">{r.doc_no}</td><td>{r.receipt_date}</td><td>{r.customer_name}</td>
                  <td><Link className="link font-mono" to={`/sales/invoices/${r.invoice_id}`}>{r.invoice_doc_no}</Link></td>
                  <td>{r.reference}</td><td className="font-mono">{r.bank_code}</td>
                  <td><Link className="link font-mono" to={`/finance/journals/${r.journal_entry_id}`}>{r.journal_doc_no}</Link></td>
                  <td className="num">{fmtMoney(r.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

export function ArAging() {
  const [asOf, setAsOf] = useState(todayIso());
  const { data, error } = useApi<any>(`/reports/ar-aging${qs({ asOf })}`);
  const cols = [['current', 'Not due'], ['d1_30', '1–30'], ['d31_60', '31–60'], ['d61_90', '61–90'], ['d90_plus', '90+'], ['total', 'Total']];
  const sum = (k: string) => data?.customers.reduce((s: number, c: any) => s + c[k], 0) ?? 0;
  return (
    <div>
      <PageHeader title="Accounts Receivable Aging" subtitle="Open customer invoices by days past due" />
      <ErrorBanner error={error} />
      <Card>
        <div className="border-b border-slate-200 p-3"><Field label="As of" className="w-48"><input className="input" type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} /></Field></div>
        {!data ? <Loading /> : !data.customers.length ? <Empty>No open receivables</Empty> : (
          <table className="tbl">
            <thead><tr><th>Customer</th>{cols.map(([k, l]) => <th key={k} className="num">{l}</th>)}</tr></thead>
            <tbody>
              {data.customers.map((c: any) => (
                <tr key={c.customerId}>
                  <td><Link className="link" to={`/sales/invoices?customer=${c.customerId}`}>{c.code} {c.name}</Link></td>
                  {cols.map(([k]) => <td key={k} className={`num ${k !== 'current' && k !== 'total' && c[k] ? 'text-red-600' : ''}`}>{c[k] ? fmtMoney(c[k]) : '—'}</td>)}
                </tr>
              ))}
            </tbody>
            <tfoot><tr className="font-semibold"><td className="px-3 py-2">Total</td>{cols.map(([k]) => <td key={k} className="num px-3">{fmtMoney(sum(k))}</td>)}</tr></tfoot>
          </table>
        )}
      </Card>
    </div>
  );
}
