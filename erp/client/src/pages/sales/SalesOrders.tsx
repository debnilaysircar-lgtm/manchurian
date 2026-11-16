import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, fmtMoney, fmtQty, qs, todayIso, useApi } from '../../api';
import { useAuth } from '../../auth';
import { Card, Empty, ErrorBanner, Field, Loading, Modal, PageHeader, Status, SuccessBanner } from '../../components/ui';

const STATUSES = ['DRAFT', 'CONFIRMED', 'PARTIALLY_DELIVERED', 'DELIVERED', 'CLOSED', 'CANCELLED'];

export function SOList() {
  const { can } = useAuth();
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const { data, error, loading } = useApi<any[]>(`/sales-orders${qs({ status, search })}`);
  return (
    <div>
      <PageHeader
        title="Sales Orders"
        subtitle="Create → confirm (credit check) → deliver → invoice → receive payment"
        actions={can('sales') && <Link className="btn-primary" to="/sales/orders/new">+ New sales order</Link>}
      />
      <ErrorBanner error={error} />
      <Card
        title={`${data?.length ?? 0} orders`}
        actions={
          <div className="flex gap-2">
            <input className="input w-48" placeholder="SO, customer or ref." value={search} onChange={(e) => setSearch(e.target.value)} />
            <select className="input w-44" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All statuses</option>
              {STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
        }
      >
        {loading && !data ? <Loading /> : !data?.length ? <Empty /> : (
          <table className="tbl">
            <thead><tr><th>Sales order</th><th>Customer</th><th>Customer ref.</th><th>Order date</th><th>Requested</th><th>Warehouse</th><th className="num">Net value</th><th className="num">Delivered</th><th className="num">Billed</th><th>Status</th></tr></thead>
            <tbody>
              {data.map((s) => (
                <tr key={s.id}>
                  <td><Link className="link font-mono" to={`/sales/orders/${s.id}`}>{s.doc_no}</Link></td>
                  <td>{s.customer_name}</td><td>{s.customer_ref}</td><td>{s.order_date}</td><td>{s.requested_date}</td><td>{s.warehouse_code}</td>
                  <td className="num">{fmtMoney(s.total)}</td><td className="num">{s.delivered_pct}%</td><td className="num">{s.billed_pct}%</td>
                  <td><Status value={s.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

type Line = { materialId: string; qty: string; unitPrice: string };

export function SOEdit() {
  const { id } = useParams();
  const nav = useNavigate();
  const { data: customers } = useApi<any[]>('/customers');
  const { data: warehouses } = useApi<any[]>('/warehouses');
  const { data: materials } = useApi<any[]>('/materials');
  const { data: stock } = useApi<any[]>('/stock');
  const { data: existing } = useApi<any>(id ? `/sales-orders/${id}` : null);
  const [head, setHead] = useState({ customerId: '', warehouseId: '', orderDate: todayIso(), requestedDate: '', customerRef: '', notes: '' });
  const [lines, setLines] = useState<Line[]>([{ materialId: '', qty: '', unitPrice: '' }]);
  const [error, setError] = useState<string | null>(null);
  const { data: credit } = useApi<any>(head.customerId ? `/customers/${head.customerId}/credit` : null);

  useEffect(() => {
    if (!existing) return;
    setHead({
      customerId: String(existing.customer_id),
      warehouseId: String(existing.warehouse_id),
      orderDate: existing.order_date,
      requestedDate: existing.requested_date ?? '',
      customerRef: existing.customer_ref ?? '',
      notes: existing.notes ?? '',
    });
    setLines(existing.lines.map((l: any) => ({ materialId: String(l.material_id), qty: String(l.qty), unitPrice: String(l.unit_price) })));
  }, [existing]);
  useEffect(() => {
    if (!head.warehouseId && warehouses?.length) setHead((h) => ({ ...h, warehouseId: String(warehouses[0].id) }));
  }, [warehouses, head.warehouseId]);

  const total = lines.reduce((s, l) => s + (Number(l.qty) || 0) * (Number(l.unitPrice) || 0), 0);
  const setLine = (i: number, p: Partial<Line>) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...p } : l)));
  const available = (materialId: string) =>
    stock?.find((s) => String(s.id) === materialId)?.warehouses.find((w: any) => String(w.warehouseId) === head.warehouseId)?.qty ?? 0;
  const overLimit = credit && credit.creditLimit > 0 && credit.exposure + total > credit.creditLimit;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const body = {
        customerId: Number(head.customerId),
        warehouseId: Number(head.warehouseId),
        orderDate: head.orderDate,
        requestedDate: head.requestedDate || null,
        customerRef: head.customerRef || null,
        notes: head.notes || null,
        lines: lines.filter((l) => l.materialId).map((l) => ({ materialId: Number(l.materialId), qty: Number(l.qty), unitPrice: Number(l.unitPrice) })),
      };
      if (id) {
        await api(`/sales-orders/${id}`, { method: 'PUT', body });
        nav(`/sales/orders/${id}`);
      } else {
        const r = await api<{ id: number }>('/sales-orders', { body });
        nav(`/sales/orders/${r.id}`);
      }
    } catch (err) {
      setError((err as Error).message);
    }
  };

  if (id && !existing) return <Loading />;
  return (
    <form onSubmit={submit}>
      <PageHeader title={id ? `Change Sales Order ${existing.doc_no}` : 'New Sales Order'} subtitle="Saved as draft; confirm it to run the credit check and allow delivery" />
      <ErrorBanner error={error} onClose={() => setError(null)} />
      <Card className="mb-4">
        <div className="grid gap-3 p-4 md:grid-cols-3">
          <Field label="Customer">
            <select className="input" required value={head.customerId} onChange={(e) => setHead({ ...head, customerId: e.target.value })}>
              <option value="">Select customer…</option>
              {customers?.filter((c) => c.is_active).map((c) => <option key={c.id} value={c.id}>{c.code} {c.name}</option>)}
            </select>
          </Field>
          <Field label="Ship from warehouse">
            <select className="input" required value={head.warehouseId} onChange={(e) => setHead({ ...head, warehouseId: e.target.value })}>
              {warehouses?.map((w) => <option key={w.id} value={w.id}>{w.code} {w.name}</option>)}
            </select>
          </Field>
          <Field label="Customer reference (their PO no.)"><input className="input" value={head.customerRef} onChange={(e) => setHead({ ...head, customerRef: e.target.value })} /></Field>
          <Field label="Order date"><input className="input" type="date" value={head.orderDate} onChange={(e) => setHead({ ...head, orderDate: e.target.value })} /></Field>
          <Field label="Requested delivery date"><input className="input" type="date" value={head.requestedDate} onChange={(e) => setHead({ ...head, requestedDate: e.target.value })} /></Field>
          <Field label="Notes"><input className="input" value={head.notes} onChange={(e) => setHead({ ...head, notes: e.target.value })} /></Field>
          {credit && (
            <p className={`text-xs md:col-span-3 ${overLimit ? 'font-medium text-amber-700' : 'text-slate-500'}`}>
              {credit.creditLimit > 0
                ? `Credit limit ${fmtMoney(credit.creditLimit)} · current exposure ${fmtMoney(credit.exposure)} · available ${fmtMoney(credit.creditLimit - credit.exposure)}${overLimit ? ' — this order will be blocked at confirmation' : ''}`
                : 'No credit limit set for this customer.'}
            </p>
          )}
        </div>
      </Card>
      <Card title="Items">
        <table className="tbl">
          <thead><tr><th>Material</th><th className="num">Available</th><th className="w-32 num">Quantity</th><th className="w-36 num">Unit price</th><th className="w-36 num">Net value</th><th /></tr></thead>
          <tbody>
            {lines.map((l, i) => {
              const m = materials?.find((x) => String(x.id) === l.materialId);
              const avail = l.materialId ? available(l.materialId) : null;
              return (
                <tr key={i}>
                  <td>
                    <select
                      className="input"
                      value={l.materialId}
                      onChange={(e) => {
                        const mat = materials?.find((x) => String(x.id) === e.target.value);
                        setLine(i, { materialId: e.target.value, unitPrice: mat ? String(mat.sales_price) : '' });
                      }}
                    >
                      <option value="">Select material…</option>
                      {materials?.filter((x) => x.is_active).map((x) => <option key={x.id} value={x.id}>{x.code} {x.name}</option>)}
                    </select>
                  </td>
                  <td className={`num ${avail != null && Number(l.qty) > avail ? 'text-amber-700' : 'text-slate-500'}`}>{avail != null ? `${fmtQty(avail)} ${m?.uom ?? ''}` : ''}</td>
                  <td><input className="input text-right" type="number" step="any" min="0" required={!!l.materialId} value={l.qty} onChange={(e) => setLine(i, { qty: e.target.value })} /></td>
                  <td><input className="input text-right" type="number" step="0.01" min="0" required={!!l.materialId} value={l.unitPrice} onChange={(e) => setLine(i, { unitPrice: e.target.value })} /></td>
                  <td className="num">{fmtMoney((Number(l.qty) || 0) * (Number(l.unitPrice) || 0))}</td>
                  <td>{lines.length > 1 && <button type="button" className="text-slate-400 hover:text-red-600" onClick={() => setLines(lines.filter((_, j) => j !== i))}>✕</button>}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot><tr className="font-semibold"><td><button type="button" className="link text-sm font-normal" onClick={() => setLines([...lines, { materialId: '', qty: '', unitPrice: '' }])}>+ Add item</button></td><td /><td /><td className="px-3 text-right">Total</td><td className="num px-3">{fmtMoney(total)}</td><td /></tr></tfoot>
        </table>
      </Card>
      <div className="mt-4 flex justify-end gap-2">
        <Link to={id ? `/sales/orders/${id}` : '/sales/orders'} className="btn-secondary">Cancel</Link>
        <button className="btn-primary">Save</button>
      </div>
    </form>
  );
}

export function SODetail() {
  const { id } = useParams();
  const { can } = useAuth();
  const { data: so, error, reload } = useApi<any>(`/sales-orders/${id}`);
  const [modal, setModal] = useState<'dlv' | 'bil' | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  if (error) return <ErrorBanner error={error} />;
  if (!so) return <Loading />;

  const act = async (action: string, confirmText: string) => {
    if (!confirm(confirmText)) return;
    try {
      await api(`/sales-orders/${so.id}/${action}`, { body: {} });
      reload();
    } catch (e) {
      setActionError((e as Error).message);
    }
  };
  const canDeliver = ['CONFIRMED', 'PARTIALLY_DELIVERED'].includes(so.status);
  const canBill = !['DRAFT', 'CANCELLED', 'CLOSED'].includes(so.status) && so.lines.some((l: any) => l.delivered_qty > l.billed_qty);
  const done = (m: string) => {
    setModal(null);
    setMsg(m);
    reload();
  };

  return (
    <div>
      <PageHeader
        title={`Sales Order ${so.doc_no}`}
        subtitle={<>{so.customer_code} {so.customer_name}{so.customer_ref && ` · ref. ${so.customer_ref}`} · <Status value={so.status} /></>}
        actions={<>
          {can('sales') && so.status === 'DRAFT' && <Link className="btn-secondary" to={`/sales/orders/${so.id}/edit`}>Edit</Link>}
          {can('sales') && so.status === 'DRAFT' && <button className="btn-primary" onClick={() => act('confirm', 'Confirm this sales order? The customer credit limit will be checked.')}>Confirm</button>}
          {can('warehouse', 'sales') && canDeliver && <button className="btn-primary" onClick={() => setModal('dlv')}>Post delivery</button>}
          {can('sales', 'finance') && canBill && <button className="btn-primary" onClick={() => setModal('bil')}>Create invoice</button>}
          {can('sales') && ['DRAFT', 'CONFIRMED'].includes(so.status) && <button className="btn-danger" onClick={() => act('cancel', 'Cancel this sales order?')}>Cancel SO</button>}
          {can('sales') && ['CONFIRMED', 'PARTIALLY_DELIVERED', 'DELIVERED'].includes(so.status) && <button className="btn-secondary" onClick={() => act('close', 'Close this sales order? No further deliveries or invoices will be possible.')}>Close</button>}
        </>}
      />
      <SuccessBanner message={msg} onClose={() => setMsg(null)} />
      <ErrorBanner error={actionError} onClose={() => setActionError(null)} />
      <Card className="mb-4">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 p-4 text-sm md:grid-cols-5">
          <div><dt className="label">Order date</dt><dd>{so.order_date}</dd></div>
          <div><dt className="label">Requested delivery</dt><dd>{so.requested_date ?? '—'}</dd></div>
          <div><dt className="label">Ship from</dt><dd>{so.warehouse_code} {so.warehouse_name}</dd></div>
          <div><dt className="label">Created by</dt><dd>{so.created_by_name}</dd></div>
          <div><dt className="label">Net value</dt><dd className="font-semibold">{fmtMoney(so.total)}</dd></div>
          {so.notes && <div className="col-span-full"><dt className="label">Notes</dt><dd>{so.notes}</dd></div>}
        </dl>
      </Card>
      <Card title="Items" className="mb-4">
        <table className="tbl">
          <thead><tr><th>Item</th><th>Material</th><th className="num">Ordered</th><th className="num">Price</th><th className="num">Net value</th><th className="num">In stock</th><th className="num">Delivered</th><th className="num">Billed</th></tr></thead>
          <tbody>
            {so.lines.map((l: any) => {
              const short = l.qty - l.delivered_qty > l.available_qty && canDeliver;
              return (
                <tr key={l.id}>
                  <td>{l.line_no}</td>
                  <td><span className="font-mono">{l.material_code}</span> {l.material_name}</td>
                  <td className="num">{fmtQty(l.qty)} {l.uom}</td>
                  <td className="num">{fmtMoney(l.unit_price)}</td>
                  <td className="num">{fmtMoney(l.net_value)}</td>
                  <td className={`num ${short ? 'font-medium text-amber-700' : 'text-slate-500'}`} title={short ? 'Not enough stock for the open quantity' : ''}>{fmtQty(l.available_qty)}</td>
                  <td className="num">{fmtQty(l.delivered_qty)}</td>
                  <td className="num">{fmtQty(l.billed_qty)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
      <Card title="Document flow">
        {!so.history.length ? <Empty>No deliveries or invoices yet</Empty> : (
          <table className="tbl">
            <thead><tr><th>Type</th><th>Document</th><th>Date</th><th>Material</th><th className="num">Qty</th><th className="num">Amount</th><th>FI doc</th></tr></thead>
            <tbody>{so.history.map((h: any, i: number) => (
              <tr key={i}>
                <td>{h.kind === 'DELIVERY' ? 'Delivery (goods issue)' : 'Customer invoice'}</td>
                <td className="font-mono">{h.invoice_id ? <Link className="link" to={`/sales/invoices/${h.invoice_id}`}>{h.doc_no}</Link> : h.doc_no}</td>
                <td>{h.date}</td><td className="font-mono">{h.material_code}</td><td className="num">{fmtQty(h.qty)}</td>
                <td className="num" title={h.kind === 'DELIVERY' ? 'Cost of goods sold' : 'Revenue'}>{fmtMoney(h.amount)}</td>
                <td>{h.journal_entry_id && <Link className="link text-xs" to={`/finance/journals/${h.journal_entry_id}`}>view</Link>}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </Card>
      {modal === 'dlv' && <DeliveryModal so={so} onClose={() => setModal(null)} onDone={done} />}
      {modal === 'bil' && <BillingModal so={so} onClose={() => setModal(null)} onDone={done} />}
    </div>
  );
}

function DeliveryModal({ so, onClose, onDone }: { so: any; onClose: () => void; onDone: (m: string) => void }) {
  const open = so.lines.filter((l: any) => l.qty > l.delivered_qty);
  const [qty, setQty] = useState<Record<number, string>>(
    Object.fromEntries(open.map((l: any) => [l.id, String(+Math.max(0, Math.min(l.qty - l.delivered_qty, l.available_qty)).toFixed(3))])),
  );
  const [postingDate, setPostingDate] = useState(todayIso());
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const r = await api(`/sales-orders/${so.id}/delivery`, {
        body: { postingDate, note: note || undefined, lines: open.map((l: any) => ({ soLineId: l.id, qty: Number(qty[l.id]) || 0 })) },
      });
      onDone(`Delivery ${r.docNo} posted${r.journalDocNo ? `, FI document ${r.journalDocNo}` : ''}`);
    } catch (err) {
      setError((err as Error).message);
    }
  };
  return (
    <Modal title={`Delivery for ${so.doc_no} from ${so.warehouse_code}`} onClose={onClose} wide>
      <form onSubmit={submit}>
        <ErrorBanner error={error} />
        <div className="mb-3 grid gap-3 sm:grid-cols-2">
          <Field label="Goods issue date"><input className="input" type="date" value={postingDate} onChange={(e) => setPostingDate(e.target.value)} /></Field>
          <Field label="Shipping note / carrier"><input className="input" value={note} onChange={(e) => setNote(e.target.value)} /></Field>
        </div>
        <table className="tbl">
          <thead><tr><th>Item</th><th>Material</th><th className="num">Open qty</th><th className="num">In stock</th><th className="w-36 num">Deliver now</th></tr></thead>
          <tbody>{open.map((l: any) => (
            <tr key={l.id}>
              <td>{l.line_no}</td><td>{l.material_code} {l.material_name}</td><td className="num">{fmtQty(l.qty - l.delivered_qty)} {l.uom}</td>
              <td className="num text-slate-500">{fmtQty(l.available_qty)}</td>
              <td><input className="input text-right" type="number" step="any" min="0" max={l.qty - l.delivered_qty} value={qty[l.id]} onChange={(e) => setQty({ ...qty, [l.id]: e.target.value })} /></td>
            </tr>
          ))}</tbody>
        </table>
        <p className="mt-3 text-xs text-slate-500">Movement type 601. Stock leaves at moving average price: Dr Cost of goods sold / Cr Inventory.</p>
        <div className="mt-4 flex justify-end gap-2"><button type="button" className="btn-secondary" onClick={onClose}>Cancel</button><button className="btn-primary">Post delivery</button></div>
      </form>
    </Modal>
  );
}

function BillingModal({ so, onClose, onDone }: { so: any; onClose: () => void; onDone: (m: string) => void }) {
  const open = so.lines.filter((l: any) => l.delivered_qty > l.billed_qty);
  const [qty, setQty] = useState<Record<number, string>>(Object.fromEntries(open.map((l: any) => [l.id, String(+(l.delivered_qty - l.billed_qty).toFixed(3))])));
  const [head, setHead] = useState({ invoiceDate: todayIso(), dueDate: '' });
  const [error, setError] = useState<string | null>(null);
  const total = open.reduce((s: number, l: any) => s + (Number(qty[l.id]) || 0) * l.unit_price, 0);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const r = await api(`/sales-orders/${so.id}/billing`, {
        body: { invoiceDate: head.invoiceDate, dueDate: head.dueDate || undefined, lines: open.map((l: any) => ({ soLineId: l.id, qty: Number(qty[l.id]) || 0 })) },
      });
      onDone(`Customer invoice ${r.docNo} posted (FI document ${r.journalDocNo})`);
    } catch (err) {
      setError((err as Error).message);
    }
  };
  return (
    <Modal title={`Create customer invoice for ${so.doc_no}`} onClose={onClose} wide>
      <form onSubmit={submit}>
        <ErrorBanner error={error} />
        <div className="mb-3 grid gap-3 sm:grid-cols-2">
          <Field label="Invoice date"><input className="input" type="date" value={head.invoiceDate} onChange={(e) => setHead({ ...head, invoiceDate: e.target.value })} /></Field>
          <Field label="Due date (default: payment terms)"><input className="input" type="date" value={head.dueDate} onChange={(e) => setHead({ ...head, dueDate: e.target.value })} /></Field>
        </div>
        <table className="tbl">
          <thead><tr><th>Item</th><th>Material</th><th className="num">Delivered, not billed</th><th className="w-28 num">Bill qty</th><th className="num">Price</th><th className="num">Amount</th></tr></thead>
          <tbody>{open.map((l: any) => (
            <tr key={l.id}>
              <td>{l.line_no}</td><td>{l.material_code}</td><td className="num">{fmtQty(l.delivered_qty - l.billed_qty)}</td>
              <td><input className="input text-right" type="number" step="any" min="0" value={qty[l.id]} onChange={(e) => setQty({ ...qty, [l.id]: e.target.value })} /></td>
              <td className="num">{fmtMoney(l.unit_price)}</td>
              <td className="num">{fmtMoney((Number(qty[l.id]) || 0) * l.unit_price)}</td>
            </tr>
          ))}</tbody>
          <tfoot><tr className="font-semibold"><td colSpan={5} className="px-3 py-2 text-right">Invoice total</td><td className="num px-3">{fmtMoney(total)}</td></tr></tfoot>
        </table>
        <p className="mt-3 text-xs text-slate-500">Delivery-based billing at the order price: Dr Accounts receivable / Cr Sales revenue.</p>
        <div className="mt-4 flex justify-end gap-2"><button type="button" className="btn-secondary" onClick={onClose}>Cancel</button><button className="btn-primary">Post invoice</button></div>
      </form>
    </Modal>
  );
}
