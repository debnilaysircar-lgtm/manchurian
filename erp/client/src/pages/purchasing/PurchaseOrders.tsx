import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api, fmtMoney, fmtQty, qs, todayIso, useApi } from '../../api';
import { useAuth } from '../../auth';
import { useConfirm } from '../../components/confirm';
import { Card, Empty, ErrorBanner, Field, Loading, Modal, PageHeader, Status, SuccessBanner } from '../../components/ui';

const STATUSES = ['DRAFT', 'RELEASED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CLOSED', 'CANCELLED'];

export function POList() {
  const { can } = useAuth();
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const { data, error, loading } = useApi<any[]>(`/purchase-orders${qs({ status, search })}`);
  return (
    <div>
      <PageHeader title="Purchase Orders" subtitle="Create → release → receive goods → enter invoice → pay" actions={can('purchasing') && <Link className="btn-primary" to="/purchasing/orders/new">+ New purchase order</Link>} />
      <ErrorBanner error={error} />
      <Card
        title={`${data?.length ?? 0} orders`}
        actions={
          <div className="flex flex-wrap gap-2">
            <input className="input w-48" placeholder="PO number or vendor" value={search} onChange={(e) => setSearch(e.target.value)} />
            <select className="input w-44" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All statuses</option>
              {STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
        }
      >
        {loading && !data ? <Loading /> : !data?.length ? <Empty /> : (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead><tr><th>PO</th><th>Vendor</th><th>Order date</th><th>Delivery</th><th>Pur. group</th><th>Stor. loc.</th><th className="num">Net value</th><th className="num">Received</th><th className="num">Invoiced</th><th>Status</th></tr></thead>
              <tbody>
                {data.map((p) => (
                  <tr key={p.id}>
                    <td><Link className="link font-mono" to={`/purchasing/orders/${p.id}`}>{p.doc_no}</Link></td>
                    <td>{p.vendor_name}</td><td>{p.order_date}</td><td>{p.delivery_date}</td><td className="font-mono">{p.purchasing_group_code ?? ''}</td><td>{p.warehouse_code}</td>
                    <td className="num">{fmtMoney(p.total)}</td><td className="num">{p.received_pct}%</td><td className="num">{p.invoiced_pct}%</td>
                    <td><Status value={p.status} /></td>
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

type Line = { materialId: string; qty: string; unitPrice: string };

export function POEdit() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const { data: vendors } = useApi<any[]>('/vendors');
  const { data: warehouses } = useApi<any[]>('/warehouses');
  const { data: materials } = useApi<any[]>('/materials');
  const { data: existing } = useApi<any>(id ? `/purchase-orders/${id}` : null);
  const [head, setHead] = useState({ vendorId: '', warehouseId: '', orderDate: todayIso(), deliveryDate: '', notes: '', purchasingGroupId: '' });
  const { data: groups } = useApi<any[]>('/purchasing-groups');
  const [lines, setLines] = useState<Line[]>([{ materialId: params.get('material') ?? '', qty: '', unitPrice: '' }]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!existing) return;
    setHead({ vendorId: String(existing.vendor_id), warehouseId: String(existing.warehouse_id), orderDate: existing.order_date, deliveryDate: existing.delivery_date ?? '', notes: existing.notes ?? '', purchasingGroupId: existing.purchasing_group_id ? String(existing.purchasing_group_id) : '' });
    setLines(existing.lines.map((l: any) => ({ materialId: String(l.material_id), qty: String(l.qty), unitPrice: String(l.unit_price) })));
  }, [existing]);
  useEffect(() => {
    if (!head.warehouseId && warehouses?.length) setHead((h) => ({ ...h, warehouseId: String(warehouses[0].id) }));
  }, [warehouses, head.warehouseId]);

  const total = lines.reduce((s, l) => s + (Number(l.qty) || 0) * (Number(l.unitPrice) || 0), 0);
  const setLine = (i: number, p: Partial<Line>) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...p } : l)));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const body = {
        vendorId: Number(head.vendorId),
        warehouseId: Number(head.warehouseId),
        orderDate: head.orderDate,
        deliveryDate: head.deliveryDate || null,
        notes: head.notes || null,
        purchasingGroupId: head.purchasingGroupId || null,
        lines: lines.filter((l) => l.materialId).map((l) => ({ materialId: Number(l.materialId), qty: Number(l.qty), unitPrice: Number(l.unitPrice) })),
      };
      if (id) {
        await api(`/purchase-orders/${id}`, { method: 'PUT', body });
        nav(`/purchasing/orders/${id}`);
      } else {
        const r = await api<{ id: number }>('/purchase-orders', { body });
        nav(`/purchasing/orders/${r.id}`);
      }
    } catch (err) {
      setError((err as Error).message);
    }
  };

  if (id && !existing) return <Loading />;
  return (
    <form onSubmit={submit}>
      <PageHeader title={id ? `Change Purchase Order ${existing.doc_no}` : 'New Purchase Order'} subtitle="Saved as draft; release it to allow goods receipt" />
      <ErrorBanner error={error} onClose={() => setError(null)} />
      <Card className="mb-4">
        <div className="grid gap-3 p-4 md:grid-cols-4">
          <Field label="Vendor">
            <select className="input" required value={head.vendorId} onChange={(e) => setHead({ ...head, vendorId: e.target.value })}>
              <option value="">Select vendor…</option>
              {vendors?.filter((v) => v.is_active).map((v) => <option key={v.id} value={v.id}>{v.code} {v.name}</option>)}
            </select>
          </Field>
          <Field label="Deliver to storage location">
            <select className="input" required value={head.warehouseId} onChange={(e) => setHead({ ...head, warehouseId: e.target.value })}>
              {warehouses?.map((w) => <option key={w.id} value={w.id}>{w.plant_code}/{w.code} {w.name}</option>)}
            </select>
          </Field>
          <Field label="Order date"><input className="input" type="date" value={head.orderDate} onChange={(e) => setHead({ ...head, orderDate: e.target.value })} /></Field>
          <Field label="Delivery date"><input className="input" type="date" value={head.deliveryDate} onChange={(e) => setHead({ ...head, deliveryDate: e.target.value })} /></Field>
          <Field label="Purchasing group">
            <select className="input" value={head.purchasingGroupId} onChange={(e) => setHead({ ...head, purchasingGroupId: e.target.value })}>
              <option value="">None</option>
              {groups?.map((g) => <option key={g.id} value={g.id}>{g.code} {g.name}</option>)}
            </select>
          </Field>
          <Field label="Notes" className="md:col-span-3"><input className="input" value={head.notes} onChange={(e) => setHead({ ...head, notes: e.target.value })} /></Field>
        </div>
      </Card>
      <Card title="Items">
        <div className="overflow-x-auto">
          <table className="tbl">
            <thead><tr><th>Material</th><th className="w-32 num">Quantity</th><th className="w-36 num">Net price</th><th className="w-36 num">Net value</th><th /></tr></thead>
            <tbody>
              {lines.map((l, i) => {
                const m = materials?.find((x) => String(x.id) === l.materialId);
                return (
                  <tr key={i}>
                    <td>
                      <select className="input" value={l.materialId} onChange={(e) => setLine(i, { materialId: e.target.value })}>
                        <option value="">Select material…</option>
                        {materials?.filter((x) => x.is_active).map((x) => <option key={x.id} value={x.id}>{x.code} {x.name}</option>)}
                      </select>
                    </td>
                    <td><div className="flex items-center gap-1"><input className="input text-right" type="number" step="any" min="0" required={!!l.materialId} value={l.qty} onChange={(e) => setLine(i, { qty: e.target.value })} /><span className="w-8 text-xs text-slate-500">{m?.uom}</span></div></td>
                    <td><input className="input text-right" type="number" step="0.01" min="0" required={!!l.materialId} value={l.unitPrice} onChange={(e) => setLine(i, { unitPrice: e.target.value })} /></td>
                    <td className="num">{fmtMoney((Number(l.qty) || 0) * (Number(l.unitPrice) || 0))}</td>
                    <td>{lines.length > 1 && <button type="button" className="text-slate-400 hover:text-red-600" onClick={() => setLines(lines.filter((_, j) => j !== i))}>✕</button>}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot><tr className="font-semibold"><td><button type="button" className="link text-sm font-normal" onClick={() => setLines([...lines, { materialId: '', qty: '', unitPrice: '' }])}>+ Add item</button></td><td /><td className="px-3 text-right">Total</td><td className="num px-3">{fmtMoney(total)}</td><td /></tr></tfoot>
          </table>
        </div>
      </Card>
      <div className="mt-4 flex justify-end gap-2">
        <Link to={id ? `/purchasing/orders/${id}` : '/purchasing/orders'} className="btn-secondary">Cancel</Link>
        <button className="btn-primary">Save</button>
      </div>
    </form>
  );
}

export function PODetail() {
  const { id } = useParams();
  const { can } = useAuth();
  const { data: po, error, reload } = useApi<any>(`/purchase-orders/${id}`);
  const [modal, setModal] = useState<'gr' | 'inv' | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const ask = useConfirm();
  if (error) return <ErrorBanner error={error} />;
  if (!po) return <Loading />;

  const act = async (action: string, confirmText: string) => {
    if (!(await ask(confirmText))) return;
    try {
      const r = await api(`/purchase-orders/${po.id}/${action}`, { body: {} });
      if (r.idoc) setMsg(`Purchase order released. IDoc ${r.idoc} (ORDERS05) created for the vendor.`);
      reload();
    } catch (e) {
      setActionError((e as Error).message);
    }
  };
  const canReceive = ['RELEASED', 'PARTIALLY_RECEIVED'].includes(po.status);
  const canInvoice = !['DRAFT', 'CANCELLED', 'CLOSED'].includes(po.status) && po.lines.some((l: any) => l.received_qty > l.invoiced_qty);
  const done = (m: string) => { setModal(null); setMsg(m); reload(); };

  return (
    <div>
      <PageHeader
        title={`Purchase Order ${po.doc_no}`}
        subtitle={<>{po.vendor_code} {po.vendor_name} · <Status value={po.status} /></>}
        actions={<>
          {can('purchasing') && po.status === 'DRAFT' && <Link className="btn-secondary" to={`/purchasing/orders/${po.id}/edit`}>Edit</Link>}
          {can('purchasing') && po.status === 'DRAFT' && <button className="btn-primary" onClick={() => act('release', 'Release this purchase order to the vendor?')}>Release</button>}
          {can('warehouse', 'purchasing') && canReceive && <button className="btn-primary" onClick={() => setModal('gr')}>Post goods receipt</button>}
          {can('finance') && canInvoice && <button className="btn-primary" onClick={() => setModal('inv')}>Enter invoice</button>}
          {can('purchasing') && ['DRAFT', 'RELEASED'].includes(po.status) && <button className="btn-danger" onClick={() => act('cancel', 'Cancel this purchase order?')}>Cancel PO</button>}
          {can('purchasing') && ['RELEASED', 'PARTIALLY_RECEIVED', 'RECEIVED'].includes(po.status) && <button className="btn-secondary" onClick={() => act('close', 'Close this purchase order? No further receipts or invoices will be possible.')}>Close</button>}
        </>}
      />
      <SuccessBanner message={msg} onClose={() => setMsg(null)} />
      <ErrorBanner error={actionError} onClose={() => setActionError(null)} />
      <Card className="mb-4">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 p-4 text-sm md:grid-cols-5">
          <div><dt className="label">Order date</dt><dd>{po.order_date}</dd></div>
          <div><dt className="label">Delivery date</dt><dd>{po.delivery_date ?? '—'}</dd></div>
          <div><dt className="label">Plant / storage location</dt><dd>{po.plant_code}/{po.warehouse_code} {po.warehouse_name}</dd></div>
          <div><dt className="label">Purchasing group</dt><dd>{po.purchasing_group_code ? `${po.purchasing_group_code} ${po.purchasing_group_name}` : '—'}</dd></div>
          <div><dt className="label">Created by</dt><dd>{po.created_by_name}</dd></div>
          <div><dt className="label">Net value</dt><dd className="font-semibold">{fmtMoney(po.total)}</dd></div>
          {po.notes && <div className="col-span-full"><dt className="label">Notes</dt><dd>{po.notes}</dd></div>}
        </dl>
      </Card>
      <Card title="Items" className="mb-4">
        <div className="overflow-x-auto">
          <table className="tbl">
            <thead><tr><th>Item</th><th>Material</th><th className="num">Ordered</th><th className="num">Price</th><th className="num">Net value</th><th className="num">Received</th><th className="num">Invoiced</th></tr></thead>
            <tbody>
              {po.lines.map((l: any) => (
                <tr key={l.id}>
                  <td>{l.line_no}</td>
                  <td><span className="font-mono">{l.material_code}</span> {l.material_name}</td>
                  <td className="num">{fmtQty(l.qty)} {l.uom}</td>
                  <td className="num">{fmtMoney(l.unit_price)}</td>
                  <td className="num">{fmtMoney(l.net_value)}</td>
                  <td className="num">{fmtQty(l.received_qty)}</td>
                  <td className="num">{fmtQty(l.invoiced_qty)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <Card title="Purchase order history">
        {!po.history.length ? <Empty>No goods receipts or invoices yet</Empty> : (
          <table className="tbl">
            <thead><tr><th>Type</th><th>Document</th><th>Date</th><th>Material</th><th className="num">Qty</th><th className="num">Amount</th></tr></thead>
            <tbody>{po.history.map((h: any, i: number) => (
              <tr key={i}><td>{h.kind === 'GR' ? 'Goods receipt' : 'Invoice receipt'}</td><td className="font-mono">{h.doc_no}</td><td>{h.date}</td><td className="font-mono">{h.material_code}</td><td className="num">{fmtQty(h.qty)}</td><td className="num">{fmtMoney(h.amount)}</td></tr>
            ))}</tbody>
          </table>
        )}
      </Card>
      {modal === 'gr' && <GoodsReceiptModal po={po} onClose={() => setModal(null)} onDone={done} />}
      {modal === 'inv' && <InvoiceModal po={po} onClose={() => setModal(null)} onDone={done} />}
    </div>
  );
}

function GoodsReceiptModal({ po, onClose, onDone }: { po: any; onClose: () => void; onDone: (m: string) => void }) {
  const open = po.lines.filter((l: any) => l.qty > l.received_qty);
  const [qty, setQty] = useState<Record<number, string>>(Object.fromEntries(open.map((l: any) => [l.id, String(+(l.qty - l.received_qty).toFixed(3))])));
  const [postingDate, setPostingDate] = useState(todayIso());
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const r = await api(`/purchase-orders/${po.id}/goods-receipt`, {
        body: { postingDate, note: note || undefined, lines: open.map((l: any) => ({ poLineId: l.id, qty: Number(qty[l.id]) || 0 })) },
      });
      onDone(`Material document ${r.docNo} posted${r.journalDocNo ? `, FI document ${r.journalDocNo}` : ''}`);
    } catch (err) {
      setError((err as Error).message);
    }
  };
  return (
    <Modal title={`Goods receipt for ${po.doc_no} → ${po.warehouse_code}`} onClose={onClose} wide>
      <form onSubmit={submit}>
        <ErrorBanner error={error} />
        <div className="mb-3 grid gap-3 sm:grid-cols-2">
          <Field label="Posting date"><input className="input" type="date" value={postingDate} onChange={(e) => setPostingDate(e.target.value)} /></Field>
          <Field label="Delivery note"><input className="input" value={note} onChange={(e) => setNote(e.target.value)} /></Field>
        </div>
        <table className="tbl">
          <thead><tr><th>Item</th><th>Material</th><th className="num">Open qty</th><th className="w-36 num">Receive now</th></tr></thead>
          <tbody>{open.map((l: any) => (
            <tr key={l.id}><td>{l.line_no}</td><td>{l.material_code} {l.material_name}</td><td className="num">{fmtQty(l.qty - l.received_qty)} {l.uom}</td>
              <td><input className="input text-right" type="number" step="any" min="0" max={l.qty - l.received_qty} value={qty[l.id]} onChange={(e) => setQty({ ...qty, [l.id]: e.target.value })} /></td></tr>
          ))}</tbody>
        </table>
        <p className="mt-3 text-xs text-slate-500">Posts Dr Inventory / Cr GR/IR clearing at the PO price and updates the moving average price.</p>
        <div className="mt-4 flex justify-end gap-2"><button type="button" className="btn-secondary" onClick={onClose}>Cancel</button><button className="btn-primary">Post goods receipt</button></div>
      </form>
    </Modal>
  );
}

function InvoiceModal({ po, onClose, onDone }: { po: any; onClose: () => void; onDone: (m: string) => void }) {
  const open = po.lines.filter((l: any) => l.received_qty > l.invoiced_qty);
  const [vals, setVals] = useState<Record<number, { qty: string; price: string }>>(
    Object.fromEntries(open.map((l: any) => [l.id, { qty: String(+(l.received_qty - l.invoiced_qty).toFixed(3)), price: String(l.unit_price) }])),
  );
  const [head, setHead] = useState({ vendorRef: '', invoiceDate: todayIso(), dueDate: '' });
  const [error, setError] = useState<string | null>(null);
  const total = open.reduce((s: number, l: any) => s + (Number(vals[l.id].qty) || 0) * (Number(vals[l.id].price) || 0), 0);
  const { data: taxCodes } = useApi<any[]>('/tax-codes');
  const [taxCodeId, setTaxCodeId] = useState('');
  const rate = taxCodes?.find((t) => String(t.id) === taxCodeId)?.rate_pct ?? 0;
  const tax = Math.round(total * rate) / 100;
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const r = await api(`/purchase-orders/${po.id}/invoice`, {
        body: { ...head, dueDate: head.dueDate || undefined, taxCodeId: taxCodeId ? Number(taxCodeId) : 0, lines: open.map((l: any) => ({ poLineId: l.id, qty: Number(vals[l.id].qty) || 0, unitPrice: Number(vals[l.id].price) || 0 })) },
      });
      onDone(`Invoice ${r.docNo} posted (FI document ${r.journalDocNo})`);
    } catch (err) {
      setError((err as Error).message);
    }
  };
  return (
    <Modal title={`Enter vendor invoice for ${po.doc_no}`} onClose={onClose} wide>
      <form onSubmit={submit}>
        <ErrorBanner error={error} />
        <div className="mb-3 grid gap-3 sm:grid-cols-4">
          <Field label="Vendor invoice number"><input className="input" required value={head.vendorRef} onChange={(e) => setHead({ ...head, vendorRef: e.target.value })} /></Field>
          <Field label="Invoice date"><input className="input" type="date" value={head.invoiceDate} onChange={(e) => setHead({ ...head, invoiceDate: e.target.value })} /></Field>
          <Field label="Due date (default: payment terms)"><input className="input" type="date" value={head.dueDate} onChange={(e) => setHead({ ...head, dueDate: e.target.value })} /></Field>
          <Field label="Input tax code">
            <select className="input" value={taxCodeId} onChange={(e) => setTaxCodeId(e.target.value)}>
              <option value="">No tax</option>
              {taxCodes?.filter((t) => t.direction === 'INPUT').map((t) => <option key={t.id} value={t.id}>{t.code} {t.description}</option>)}
            </select>
          </Field>
        </div>
        <table className="tbl">
          <thead><tr><th>Item</th><th>Material</th><th className="num">Received, not invoiced</th><th className="w-28 num">Qty</th><th className="w-32 num">Unit price</th><th className="num">Amount</th></tr></thead>
          <tbody>{open.map((l: any) => {
            const v = vals[l.id];
            const variance = Number(v.price) !== l.unit_price;
            return (
              <tr key={l.id}>
                <td>{l.line_no}</td><td>{l.material_code}</td><td className="num">{fmtQty(l.received_qty - l.invoiced_qty)}</td>
                <td><input className="input text-right" type="number" step="any" min="0" value={v.qty} onChange={(e) => setVals({ ...vals, [l.id]: { ...v, qty: e.target.value } })} /></td>
                <td><input className={`input text-right ${variance ? 'border-amber-400 bg-amber-50' : ''}`} type="number" step="0.01" min="0" value={v.price} onChange={(e) => setVals({ ...vals, [l.id]: { ...v, price: e.target.value } })} title={`PO price ${l.unit_price}`} /></td>
                <td className="num">{fmtMoney((Number(v.qty) || 0) * (Number(v.price) || 0))}</td>
              </tr>
            );
          })}</tbody>
          <tfoot className={taxCodes ? '' : 'invisible'}>
            <tr><td colSpan={5} className="px-3 py-1 text-right text-slate-500">Net amount</td><td className="num px-3">{fmtMoney(total)}</td></tr>
            <tr><td colSpan={5} className="px-3 py-1 text-right text-slate-500">Input tax {rate ? `${rate}%` : ''}</td><td className="num px-3">{fmtMoney(tax)}</td></tr>
            <tr className="font-semibold"><td colSpan={5} className="px-3 py-2 text-right">Invoice total (gross)</td><td className="num px-3">{fmtMoney(total + tax)}</td></tr>
          </tfoot>
        </table>
        <p className="mt-3 text-xs text-slate-500">Three-way match: quantity is limited to what was received. Price deviations from the PO post to the price-difference account.</p>
        <div className="mt-4 flex justify-end gap-2"><button type="button" className="btn-secondary" onClick={onClose}>Cancel</button><button className="btn-primary">Post invoice</button></div>
      </form>
    </Modal>
  );
}
