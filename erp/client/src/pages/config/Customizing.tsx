import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, fmtMoney, useApi } from '../../api';
import { useAuth } from '../../auth';
import { useConfirm } from '../../components/confirm';
import { Card, Empty, ErrorBanner, Field, Loading, Modal, PageHeader, SuccessBanner } from '../../components/ui';
import { AREAS } from './Configuration';

interface Col {
  name: string;
  label: string;
  type: 'code' | 'text' | 'number' | 'amount' | 'percent' | 'boolean' | 'select' | 'ref';
  required?: boolean;
  hint?: string;
  options?: string[];
  min?: number;
  max?: number;
  immutable?: boolean;
  help?: string;
}
interface Obj {
  key: string;
  title: string;
  group: string;
  description: string;
  enforcement: string;
  fixedRows: boolean;
  editable: boolean;
  cols: Col[];
}

/** SM30-style maintenance screen for any customizing table. */
export function CustomizingTable() {
  const { key = '' } = useParams();
  const { data: objects } = useApi<Obj[]>('/customizing');
  const { data, error, reload } = useApi<{ rows: any[]; options: Record<string, { value: number; label: string }[]> }>(`/customizing/${key}`);
  const [edit, setEdit] = useState<Record<string, any> | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const ask = useConfirm();
  const o = objects?.find((x) => x.key === key);
  if (error) return <ErrorBanner error={error} />;
  if (!o || !data) return <Loading />;

  const label = (c: Col, v: any) => {
    if (v === null || v === undefined || v === '') return <span className="text-slate-400">—</span>;
    if (c.type === 'boolean') return v ? 'Yes' : 'No';
    if (c.type === 'ref') return data.options[c.name]?.find((x) => x.value === v)?.label ?? v;
    if (c.type === 'amount') return fmtMoney(v);
    if (c.type === 'percent') return `${v}%`;
    return String(v);
  };
  const remove = async (row: any) => {
    const name = row.code ?? row.name;
    if (!(await ask(`Delete ${o.title.toLowerCase().replace(/s$/, '')} ${name}?`, 'Delete'))) return;
    setActionError(null);
    try {
      await api(`/customizing/${key}/${row.id}`, { method: 'DELETE' });
      setMsg(`Deleted ${name}`);
      reload();
    } catch (e) {
      setActionError((e as Error).message);
    }
  };
  const blank = Object.fromEntries(o.cols.map((c) => [c.name, c.type === 'boolean' ? true : '']));

  return (
    <div>
      <PageHeader
        title={o.title}
        subtitle={
          <>
            <Link className="link" to="/config">Implementation Guide</Link> › {o.group}
          </>
        }
        actions={o.editable && !o.fixedRows && <button className="btn-primary" onClick={() => setEdit(blank)}>+ New entry</button>}
      />
      <SuccessBanner message={msg} onClose={() => setMsg(null)} />
      <ErrorBanner error={actionError} onClose={() => setActionError(null)} />
      <div className="mb-4 grid gap-3 md:grid-cols-2">
        <div className="card p-3 text-sm text-slate-700">{o.description}</div>
        <div className="card p-3 text-sm text-slate-700">
          <span className="font-medium text-slate-800">Effect: </span>
          {o.enforcement}
        </div>
      </div>
      <Card title={`${data.rows.length} entr${data.rows.length === 1 ? 'y' : 'ies'}`} actions={!o.editable && <span className="text-xs text-slate-500">Read only for your role</span>}>
        {!data.rows.length ? (
          <Empty>No entries yet</Empty>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                {o.cols.map((c) => (
                  <th key={c.name} className={['number', 'amount', 'percent'].includes(c.type) ? 'num' : ''}>{c.label}</th>
                ))}
                {o.editable && <th />}
              </tr>
            </thead>
            <tbody>
              {data.rows.map((r) => (
                <tr key={r.id}>
                  {o.cols.map((c) => (
                    <td key={c.name} className={`${c.type === 'code' ? 'font-mono' : ''} ${['number', 'amount', 'percent'].includes(c.type) ? 'num' : ''}`}>{label(c, r[c.name])}</td>
                  ))}
                  {o.editable && (
                    <td className="whitespace-nowrap text-right">
                      <button className="link text-xs" onClick={() => setEdit({ ...r })}>Edit</button>
                      {!o.fixedRows && <button className="ml-3 text-xs text-red-600 hover:underline" onClick={() => remove(r)}>Delete</button>}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      {edit && (
        <EntryModal
          obj={o}
          options={data.options}
          initial={edit}
          onClose={() => setEdit(null)}
          onSaved={(m) => {
            setEdit(null);
            setMsg(m);
            reload();
          }}
        />
      )}
    </div>
  );
}

function EntryModal({ obj, options, initial, onClose, onSaved }: {
  obj: Obj;
  options: Record<string, { value: number; label: string }[]>;
  initial: Record<string, any>;
  onClose: () => void;
  onSaved: (msg: string) => void;
}) {
  const [form, setForm] = useState<Record<string, any>>(() => Object.fromEntries(obj.cols.map((c) => [c.name, c.type === 'boolean' ? !!initial[c.name] : (initial[c.name] ?? '')])));
  const [error, setError] = useState<string | null>(null);
  const isNew = !initial.id;
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await api(isNew ? `/customizing/${obj.key}` : `/customizing/${obj.key}/${initial.id}`, { method: isNew ? 'POST' : 'PUT', body: form });
      onSaved(isNew ? 'Entry created' : 'Entry saved');
    } catch (err) {
      setError((err as Error).message);
    }
  };
  return (
    <Modal title={`${isNew ? 'New' : 'Change'} ${obj.title.toLowerCase().replace(/s$/, '')}`} onClose={onClose}>
      <form onSubmit={submit}>
        <ErrorBanner error={error} />
        <div className="grid gap-3 sm:grid-cols-2">
          {obj.cols.map((c) => {
            const set = (v: any) => setForm((f) => ({ ...f, [c.name]: v }));
            const id = `cust-${c.name}`;
            const locked = c.immutable && !isNew;
            if (c.type === 'boolean')
              return (
                <label key={c.name} className="flex items-center gap-2 text-sm sm:col-span-2">
                  <input id={id} type="checkbox" checked={!!form[c.name]} onChange={(e) => set(e.target.checked)} /> {c.label}
                </label>
              );
            return (
              <Field key={c.name} label={`${c.label}${c.required ? '' : ' (optional)'}`}>
                {c.type === 'select' || c.type === 'ref' ? (
                  <select id={id} className="input" value={form[c.name]} disabled={locked} onChange={(e) => set(c.type === 'ref' && e.target.value ? Number(e.target.value) : e.target.value)}>
                    <option value="">{c.required ? 'Select…' : 'None'}</option>
                    {c.type === 'select'
                      ? c.options!.map((x) => <option key={x} value={x}>{x}</option>)
                      : options[c.name]?.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}
                  </select>
                ) : (
                  <input
                    id={id}
                    className={`input ${c.type === 'code' ? 'font-mono uppercase' : ''}`}
                    type={['number', 'amount', 'percent'].includes(c.type) ? 'number' : 'text'}
                    step="any"
                    min={c.min}
                    max={c.max}
                    value={form[c.name]}
                    disabled={locked}
                    placeholder={c.hint}
                    onChange={(e) => set(e.target.value)}
                  />
                )}
                {c.help && <span className="mt-1 block text-[11px] text-slate-500">{c.help}</span>}
              </Field>
            );
          })}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary">Save</button>
        </div>
      </form>
    </Modal>
  );
}

/** Implementation Guide: every configuration activity in one tree, like SAP's SPRO. */
export function ImplementationGuide() {
  const { data: objects } = useApi<Obj[]>('/customizing');
  const { user } = useAuth();
  const t = (key: string) => objects?.find((o) => o.key === key);
  const node = (to: string, title: string, desc: string) => ({ to, title, desc });
  const tbl = (key: string) => {
    const o = t(key);
    return node(`/config/table/${key}`, o?.title ?? key, o?.description ?? '');
  };
  const area = (k: string, title?: string) => node(`/config/${k}`, title ?? `${AREAS[k].title} settings`, AREAS[k].subtitle);
  const sections = [
    {
      title: 'Enterprise structure',
      items: [area('general', 'Company code & number ranges'), tbl('plants'), tbl('storage_locations'), tbl('purchasing_groups'), tbl('sales_areas')],
    },
    {
      title: 'Financial accounting',
      items: [
        node('/finance/accounts', 'Chart of accounts', 'G/L accounts and whether they are open for posting'),
        area('finance', 'Posting periods & account determination'),
        tbl('document_types'),
        tbl('tax_codes'),
        tbl('payment_terms'),
      ],
    },
    { title: 'Controlling', items: [tbl('cost_centers'), node('/finance/cost-centers', 'Cost center report', 'Actual costs per cost center and account')] },
    { title: 'Logistics general', items: [tbl('units'), tbl('material_types'), tbl('material_groups')] },
    { title: 'Materials management', items: [area('purchasing', 'Purchasing: tolerances & release'), area('inventory', 'Inventory management: movement types & rules')] },
    { title: 'Sales and distribution', items: [area('sales', 'Sales: credit check & pricing')] },
    { title: 'Integration (ALE / IDoc)', items: [area('idoc', 'Ports, partner profiles & inbound rules'), node('/idocs', 'IDoc monitor', 'Status of every IDoc sent or received')] },
    ...(user?.role === 'admin' ? [{ title: 'Administration', items: [node('/admin/users', 'Users & roles', 'Who can sign in and what each role may change')] }] : []),
  ];
  return (
    <div>
      <PageHeader title="Implementation Guide" subtitle="All configuration activities of this system, grouped by area" />
      <div className="grid gap-4 lg:grid-cols-2">
        {sections.map((s) => (
          <Card key={s.title} title={s.title}>
            <ul className="divide-y divide-slate-100">
              {s.items.map((i) => (
                <li key={i.to}>
                  <Link to={i.to} className="block px-4 py-2.5 hover:bg-brand-50">
                    <div className="text-sm font-medium text-brand-600">{i.title}</div>
                    <div className="text-xs text-slate-500">{i.desc}</div>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </div>
  );
}
