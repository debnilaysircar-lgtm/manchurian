import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, fmtMoney, fmtQty, qs, todayIso, useApi } from '../../api';
import { useAuth } from '../../auth';
import { Card, Empty, ErrorBanner, Field, Loading, PageHeader } from '../../components/ui';

export function StockOverview() {
  const [warehouseId, setWarehouseId] = useState('');
  const { data: warehouses } = useApi<any[]>('/warehouses');
  const { data, error } = useApi<any[]>(`/stock${qs({ warehouseId })}`);
  const total = data?.reduce((s, m) => s + m.value, 0) ?? 0;
  return (
    <div>
      <PageHeader title="Stock Overview" subtitle="Quantities per warehouse, valuated at moving average price" />
      <ErrorBanner error={error} />
      <Card
        title={`Total stock value ${fmtMoney(total)}`}
        actions={
          <select className="input w-56" value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}>
            <option value="">All warehouses</option>
            {warehouses?.map((w) => <option key={w.id} value={w.id}>{w.code} {w.name}</option>)}
          </select>
        }
      >
        {!data ? <Loading /> : !data.length ? <Empty /> : (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead><tr><th>Material</th><th>Description</th><th>Type</th><th>By warehouse</th><th className="num">Quantity</th><th className="num">Moving avg. price</th><th className="num">Value</th><th /></tr></thead>
              <tbody>
                {data.map((m) => (
                  <tr key={m.id}>
                    <td className="font-mono">{m.code}</td>
                    <td>{m.name}</td>
                    <td className="text-slate-500">{m.materialType}</td>
                    <td className="text-xs text-slate-500">{m.warehouses.map((w: any) => `${w.warehouseCode}: ${fmtQty(w.qty)}`).join(' · ')}</td>
                    <td className={`num ${m.belowReorder ? 'font-semibold text-amber-700' : ''}`} title={m.belowReorder ? `Below reorder level ${m.reorderLevel}` : ''}>
                      {fmtQty(m.qty)} {m.uom} {m.belowReorder && '⚠'}
                    </td>
                    <td className="num">{fmtMoney(m.movingAveragePrice)}</td>
                    <td className="num">{fmtMoney(m.value)}</td>
                    <td className="text-right"><Link className="link text-xs" to={`/inventory/movements?material=${m.id}`}>Movements</Link></td>
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

export function MovementList() {
  const { can } = useAuth();
  const [params] = useSearchParams();
  const initialMaterial = params.get('material') ?? '';
  const [f, setF] = useState({ materialId: initialMaterial, warehouseId: '', type: '', from: '', to: '' });
  const { data: materials } = useApi<any[]>('/materials');
  const { data: warehouses } = useApi<any[]>('/warehouses');
  const { data: types } = useApi<any[]>('/movement-types');
  const { data, error, loading } = useApi<any[]>(`/movements${qs(f)}`);
  return (
    <div>
      <PageHeader title="Goods Movements" subtitle="Material documents" actions={can('warehouse') && <Link className="btn-primary" to="/inventory/movements/new">+ Post goods movement</Link>} />
      <ErrorBanner error={error} />
      <Card>
        <div className="grid grid-cols-2 gap-3 border-b border-slate-200 p-3 md:grid-cols-5">
          <Field label="Material"><select className="input" value={f.materialId} onChange={(e) => setF({ ...f, materialId: e.target.value })}><option value="">All</option>{materials?.map((m) => <option key={m.id} value={m.id}>{m.code}</option>)}</select></Field>
          <Field label="Warehouse"><select className="input" value={f.warehouseId} onChange={(e) => setF({ ...f, warehouseId: e.target.value })}><option value="">All</option>{warehouses?.map((w) => <option key={w.id} value={w.id}>{w.code}</option>)}</select></Field>
          <Field label="Movement type"><select className="input" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}><option value="">All</option>{types?.map((t) => <option key={t.code} value={t.code}>{t.code} {t.name}</option>)}</select></Field>
          <Field label="From"><input className="input" type="date" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} /></Field>
          <Field label="To"><input className="input" type="date" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} /></Field>
        </div>
        {loading && !data ? <Loading /> : !data?.length ? <Empty /> : (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead><tr><th>Mat. doc</th><th>Date</th><th>Type</th><th>Material</th><th>Warehouse</th><th className="num">Qty</th><th className="num">Amount</th><th>PO / SO</th><th>FI doc</th><th>Note</th></tr></thead>
              <tbody>
                {data.map((m) => {
                  const out = ['201', '601', '702'].includes(m.movement_type);
                  return (
                    <tr key={m.id}>
                      <td className="font-mono">{m.doc_no}</td>
                      <td>{m.posting_date}</td>
                      <td title={types?.find((t) => t.code === m.movement_type)?.name}>{m.movement_type}</td>
                      <td><span className="font-mono">{m.material_code}</span> {m.material_name}</td>
                      <td>{m.warehouse_code}{m.to_warehouse_code && ` → ${m.to_warehouse_code}`}</td>
                      <td className={`num ${out ? 'text-red-600' : ''}`}>{out ? '-' : ''}{fmtQty(m.qty)} {m.uom}</td>
                      <td className="num">{fmtMoney(m.amount)}</td>
                      <td className="font-mono">{m.po_doc_no ?? m.so_doc_no}</td>
                      <td>{m.journal_entry_id && <Link className="link font-mono" to={`/finance/journals/${m.journal_entry_id}`}>{m.journal_doc_no}</Link>}</td>
                      <td className="text-slate-500">{m.note}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

const TYPE_HELP: Record<string, string> = {
  '201': 'Removes stock at moving average price. Dr Material consumption (or chosen expense account) / Cr Inventory.',
  '301': 'Moves quantity between warehouses. No accounting impact.',
  '561': 'Loads opening stock (e.g. data migration). Enter the total value per item. Dr Inventory / Cr Opening balance offset.',
  '701': 'Physical count found more than the system. Valued at moving average. Dr Inventory / Cr Inventory differences.',
  '702': 'Physical count found less than the system. Dr Inventory differences / Cr Inventory.',
};

export function MovementNew() {
  const nav = useNavigate();
  const { data: materials } = useApi<any[]>('/materials');
  const { data: warehouses } = useApi<any[]>('/warehouses');
  const { data: accounts } = useApi<any[]>('/accounts');
  const { data: stock } = useApi<any[]>('/stock');
  const [head, setHead] = useState({ movementType: '201', warehouseId: '', toWarehouseId: '', postingDate: todayIso(), note: '', offsetAccountId: '' });
  const [items, setItems] = useState([{ materialId: '', qty: '', amount: '' }]);
  const [error, setError] = useState<string | null>(null);
  const t = head.movementType;
  const setItem = (i: number, p: Partial<(typeof items)[0]>) => setItems((its) => its.map((it, j) => (j === i ? { ...it, ...p } : it)));
  const available = (materialId: string) =>
    stock?.find((s) => String(s.id) === materialId)?.warehouses.find((w: any) => String(w.warehouseId) === head.warehouseId)?.qty ?? 0;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await api('/movements', {
        body: {
          movementType: t,
          warehouseId: Number(head.warehouseId),
          toWarehouseId: t === '301' ? Number(head.toWarehouseId) : undefined,
          postingDate: head.postingDate,
          note: head.note || undefined,
          offsetAccountId: t === '201' && head.offsetAccountId ? Number(head.offsetAccountId) : undefined,
          items: items.filter((i) => i.materialId).map((i) => ({ materialId: Number(i.materialId), qty: Number(i.qty), amount: t === '561' ? Number(i.amount) : undefined })),
        },
      });
      nav('/inventory/movements');
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <form onSubmit={submit}>
      <PageHeader title="Post Goods Movement" subtitle="Goods receipts are posted from the purchase order, deliveries from the sales order" />
      <ErrorBanner error={error} onClose={() => setError(null)} />
      <Card className="mb-4">
        <div className="grid gap-3 p-4 md:grid-cols-3">
          <Field label="Movement type">
            <select className="input" value={t} onChange={(e) => setHead({ ...head, movementType: e.target.value })}>
              <option value="201">201 – Goods issue to consumption</option>
              <option value="301">301 – Transfer between warehouses</option>
              <option value="561">561 – Initial stock entry</option>
              <option value="701">701 – Physical inventory gain</option>
              <option value="702">702 – Physical inventory loss</option>
            </select>
          </Field>
          <Field label={t === '301' ? 'From warehouse' : 'Warehouse'}>
            <select className="input" required value={head.warehouseId} onChange={(e) => setHead({ ...head, warehouseId: e.target.value })}>
              <option value="">Select…</option>
              {warehouses?.map((w) => <option key={w.id} value={w.id}>{w.code} {w.name}</option>)}
            </select>
          </Field>
          {t === '301' && (
            <Field label="To warehouse">
              <select className="input" required value={head.toWarehouseId} onChange={(e) => setHead({ ...head, toWarehouseId: e.target.value })}>
                <option value="">Select…</option>
                {warehouses?.filter((w) => String(w.id) !== head.warehouseId).map((w) => <option key={w.id} value={w.id}>{w.code} {w.name}</option>)}
              </select>
            </Field>
          )}
          {t === '201' && (
            <Field label="Expense account (optional)">
              <select className="input" value={head.offsetAccountId} onChange={(e) => setHead({ ...head, offsetAccountId: e.target.value })}>
                <option value="">Default: material consumption</option>
                {accounts?.filter((a) => a.type === 'EXPENSE').map((a) => <option key={a.id} value={a.id}>{a.code} {a.name}</option>)}
              </select>
            </Field>
          )}
          <Field label="Posting date"><input className="input" type="date" value={head.postingDate} onChange={(e) => setHead({ ...head, postingDate: e.target.value })} /></Field>
          <Field label="Note / reference" className="md:col-span-2"><input className="input" value={head.note} onChange={(e) => setHead({ ...head, note: e.target.value })} /></Field>
          <p className="text-xs text-slate-500 md:col-span-3">{TYPE_HELP[t]}</p>
        </div>
      </Card>
      <Card title="Items">
        <table className="tbl">
          <thead><tr><th>Material</th>{head.warehouseId && t !== '561' && <th className="num">Available</th>}<th className="w-36 num">Quantity</th>{t === '561' && <th className="w-40 num">Total value</th>}<th /></tr></thead>
          <tbody>
            {items.map((it, i) => (
              <tr key={i}>
                <td>
                  <select className="input" value={it.materialId} onChange={(e) => setItem(i, { materialId: e.target.value })}>
                    <option value="">Select material…</option>
                    {materials?.filter((m) => m.is_active).map((m) => <option key={m.id} value={m.id}>{m.code} {m.name}</option>)}
                  </select>
                </td>
                {head.warehouseId && t !== '561' && <td className="num text-slate-500">{it.materialId ? fmtQty(available(it.materialId)) : ''}</td>}
                <td><input className="input text-right" type="number" step="any" min="0" required={!!it.materialId} value={it.qty} onChange={(e) => setItem(i, { qty: e.target.value })} /></td>
                {t === '561' && <td><input className="input text-right" type="number" step="0.01" min="0" required={!!it.materialId} value={it.amount} onChange={(e) => setItem(i, { amount: e.target.value })} /></td>}
                <td>{items.length > 1 && <button type="button" className="text-slate-400 hover:text-red-600" onClick={() => setItems(items.filter((_, j) => j !== i))}>✕</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="p-3"><button type="button" className="link text-sm" onClick={() => setItems([...items, { materialId: '', qty: '', amount: '' }])}>+ Add item</button></div>
      </Card>
      <div className="mt-4 flex justify-end gap-2">
        <Link to="/inventory/movements" className="btn-secondary">Cancel</Link>
        <button className="btn-primary">Post</button>
      </div>
    </form>
  );
}
