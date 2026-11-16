import { useState, type FormEvent, type ReactNode } from 'react';
import { api, fmtMoney, fmtQty, useApi } from '../api';
import { useAuth, type Role } from '../auth';
import { Card, Empty, ErrorBanner, Field, Loading, Modal, PageHeader } from '../components/ui';

type FieldDef = {
  name: string;
  label: string;
  type?: 'text' | 'number' | 'email' | 'password' | 'select' | 'checkbox' | 'textarea';
  options?: string[];
  default?: unknown;
  /** Field locked once the record exists (keys). */
  immutable?: boolean;
  formOnly?: boolean;
};

type Column = { label: string; render: (row: any) => ReactNode; num?: boolean };

interface Props {
  title: string;
  subtitle: string;
  endpoint: string;
  fields: FieldDef[];
  columns: Column[];
  writers: Role[];
  search: (row: any) => string;
}

function MasterDataPage({ title, subtitle, endpoint, fields, columns, writers, search }: Props) {
  const { can } = useAuth();
  const { data, error, loading, reload } = useApi<any[]>(endpoint);
  const [editing, setEditing] = useState<Record<string, any> | null>(null);
  const [filter, setFilter] = useState('');
  const canWrite = can(...writers);
  const rows = (data ?? []).filter((r) => !filter || search(r).toLowerCase().includes(filter.toLowerCase()));

  const blank = Object.fromEntries(fields.map((f) => [f.name, f.default ?? (f.type === 'checkbox' ? true : '')]));

  return (
    <div>
      <PageHeader
        title={title}
        subtitle={subtitle}
        actions={canWrite && <button className="btn-primary" onClick={() => setEditing(blank)}>+ Create</button>}
      />
      <ErrorBanner error={error} />
      <Card
        title={`${rows.length} record${rows.length === 1 ? '' : 's'}`}
        actions={<input className="input w-56" placeholder="Search…" value={filter} onChange={(e) => setFilter(e.target.value)} />}
      >
        {loading && !data ? (
          <Loading />
        ) : rows.length === 0 ? (
          <Empty />
        ) : (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead>
                <tr>
                  {columns.map((c) => (
                    <th key={c.label} className={c.num ? 'num' : ''}>
                      {c.label}
                    </th>
                  ))}
                  {canWrite && <th />}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    {columns.map((c) => (
                      <td key={c.label} className={c.num ? 'num' : ''}>
                        {c.render(r)}
                      </td>
                    ))}
                    {canWrite && (
                      <td className="text-right">
                        <button className="link text-xs" onClick={() => setEditing({ ...r, password: '' })}>
                          Edit
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {editing && (
        <EditModal
          title={`${editing.id ? 'Edit' : 'Create'} ${title.replace(/s$/, '').replace(/ie$/, 'y')}`}
          endpoint={endpoint}
          fields={fields}
          initial={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            reload();
          }}
        />
      )}
    </div>
  );
}

function EditModal({ title, endpoint, fields, initial, onClose, onSaved }: {
  title: string;
  endpoint: string;
  fields: FieldDef[];
  initial: Record<string, any>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<Record<string, any>>(() =>
    Object.fromEntries(fields.map((f) => [f.name, f.type === 'checkbox' ? !!initial[f.name] : (initial[f.name] ?? '')])),
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const isNew = !initial.id;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const body = { ...form };
      if (body.password === '') delete body.password;
      await api(isNew ? endpoint : `${endpoint}/${initial.id}`, { method: isNew ? 'POST' : 'PUT', body });
      onSaved();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={submit}>
        <ErrorBanner error={error} />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {fields.map((f) => {
            const set = (v: unknown) => setForm((s) => ({ ...s, [f.name]: v }));
            const disabled = f.immutable && !isNew;
            const label = f.type === 'password' && !isNew ? `${f.label} (leave blank to keep)` : f.label;
            if (f.type === 'checkbox')
              return (
                <label key={f.name} className="flex items-center gap-2 text-sm sm:col-span-2">
                  <input type="checkbox" checked={!!form[f.name]} onChange={(e) => set(e.target.checked)} /> {f.label}
                </label>
              );
            return (
              <Field key={f.name} label={label} className={f.type === 'textarea' ? 'sm:col-span-2' : ''}>
                {f.type === 'select' ? (
                  <select className="input" value={form[f.name]} disabled={disabled} onChange={(e) => set(e.target.value)}>
                    {f.options!.map((o) => (
                      <option key={o}>{o}</option>
                    ))}
                  </select>
                ) : f.type === 'textarea' ? (
                  <textarea className="input" rows={2} value={form[f.name]} onChange={(e) => set(e.target.value)} />
                ) : (
                  <input
                    className="input"
                    type={f.type ?? 'text'}
                    step="any"
                    value={form[f.name]}
                    disabled={disabled}
                    onChange={(e) => set(e.target.value)}
                  />
                )}
              </Field>
            );
          })}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" disabled={busy}>
            Save
          </button>
        </div>
      </form>
    </Modal>
  );
}

const active = (r: any) => (r.is_active ? <span className="text-emerald-700">Active</span> : <span className="text-red-600">Blocked</span>);

export const Vendors = () => (
  <MasterDataPage
    title="Vendors"
    subtitle="Supplier master data (business partners)"
    endpoint="/vendors"
    writers={['purchasing', 'finance']}
    search={(r) => `${r.code} ${r.name} ${r.email ?? ''}`}
    fields={[
      { name: 'code', label: 'Vendor number', immutable: true },
      { name: 'name', label: 'Name' },
      { name: 'email', label: 'Email', type: 'email' },
      { name: 'phone', label: 'Phone' },
      { name: 'tax_id', label: 'Tax ID' },
      { name: 'payment_terms_days', label: 'Payment terms (days)', type: 'number', default: 30 },
      { name: 'address', label: 'Address', type: 'textarea' },
      { name: 'is_active', label: 'Active (unblocked for purchasing)', type: 'checkbox' },
    ]}
    columns={[
      { label: 'Vendor', render: (r) => <span className="font-mono">{r.code}</span> },
      { label: 'Name', render: (r) => r.name },
      { label: 'Email', render: (r) => r.email },
      { label: 'Terms', render: (r) => `Net ${r.payment_terms_days}` },
      { label: 'Open payables', render: (r) => fmtMoney(r.open_balance), num: true },
      { label: 'Status', render: active },
    ]}
  />
);

export const Materials = () => (
  <MasterDataPage
    title="Materials"
    subtitle="Material master with moving-average valuation"
    endpoint="/materials"
    writers={['purchasing', 'warehouse']}
    search={(r) => `${r.code} ${r.name}`}
    fields={[
      { name: 'code', label: 'Material number', immutable: true },
      { name: 'name', label: 'Description' },
      { name: 'uom', label: 'Base unit of measure', default: 'EA' },
      { name: 'material_type', label: 'Material type', type: 'select', options: ['RAW', 'TRADING', 'FINISHED', 'CONSUMABLE'], default: 'RAW' },
      { name: 'reorder_level', label: 'Reorder level', type: 'number', default: 0 },
      { name: 'is_active', label: 'Active', type: 'checkbox' },
    ]}
    columns={[
      { label: 'Material', render: (r) => <span className="font-mono">{r.code}</span> },
      { label: 'Description', render: (r) => r.name },
      { label: 'Type', render: (r) => r.material_type },
      { label: 'Stock', render: (r) => `${fmtQty(r.total_qty)} ${r.uom}`, num: true },
      { label: 'Reorder at', render: (r) => fmtQty(r.reorder_level), num: true },
      { label: 'Stock value', render: (r) => fmtMoney(r.stock_value), num: true },
      { label: 'Status', render: active },
    ]}
  />
);

export const Warehouses = () => (
  <MasterDataPage
    title="Warehouses"
    subtitle="Storage locations"
    endpoint="/warehouses"
    writers={['warehouse']}
    search={(r) => `${r.code} ${r.name}`}
    fields={[
      { name: 'code', label: 'Code', immutable: true },
      { name: 'name', label: 'Name' },
      { name: 'address', label: 'Address', type: 'textarea' },
    ]}
    columns={[
      { label: 'Code', render: (r) => <span className="font-mono">{r.code}</span> },
      { label: 'Name', render: (r) => r.name },
      { label: 'Address', render: (r) => r.address },
    ]}
  />
);

export const Accounts = () => (
  <MasterDataPage
    title="Chart of Accounts"
    subtitle="General ledger accounts"
    endpoint="/accounts"
    writers={['finance']}
    search={(r) => `${r.code} ${r.name} ${r.type}`}
    fields={[
      { name: 'code', label: 'Account number', immutable: true },
      { name: 'name', label: 'Name' },
      { name: 'type', label: 'Type', type: 'select', options: ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'], default: 'EXPENSE', immutable: true },
      { name: 'is_active', label: 'Open for posting', type: 'checkbox' },
    ]}
    columns={[
      { label: 'Account', render: (r) => <span className="font-mono">{r.code}</span> },
      { label: 'Name', render: (r) => r.name },
      { label: 'Type', render: (r) => r.type },
      { label: 'Status', render: active },
    ]}
  />
);

export const Users = () => (
  <MasterDataPage
    title="Users"
    subtitle="Roles: admin (everything), finance, purchasing, warehouse"
    endpoint="/users"
    writers={[]}
    search={(r) => `${r.username} ${r.full_name} ${r.role}`}
    fields={[
      { name: 'username', label: 'Username' },
      { name: 'full_name', label: 'Full name' },
      { name: 'role', label: 'Role', type: 'select', options: ['admin', 'finance', 'purchasing', 'warehouse'], default: 'finance' },
      { name: 'password', label: 'Password', type: 'password' },
      { name: 'is_active', label: 'Active', type: 'checkbox' },
    ]}
    columns={[
      { label: 'Username', render: (r) => r.username },
      { label: 'Name', render: (r) => r.full_name },
      { label: 'Role', render: (r) => r.role },
      { label: 'Status', render: active },
    ]}
  />
);
