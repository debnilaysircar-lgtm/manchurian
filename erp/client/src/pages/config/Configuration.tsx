import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import { api, useApi } from '../../api';
import { useAuth } from '../../auth';
import { Card, ErrorBanner, Field, Loading, Modal, PageHeader, SuccessBanner } from '../../components/ui';
import { useConfirm } from '../../components/confirm';
import AccountDetermination from '../finance/AccountDetermination';

export const AREAS: Record<string, { title: string; subtitle: string }> = {
  general: { title: 'General & Numbering', subtitle: 'Company data, logical system name and document number ranges' },
  finance: { title: 'Finance', subtitle: 'Posting periods and automatic account determination' },
  purchasing: { title: 'Purchasing', subtitle: 'Invoice verification tolerance and purchase order release' },
  sales: { title: 'Sales', subtitle: 'Credit management and pricing on sales orders' },
  inventory: { title: 'Inventory', subtitle: 'Movement types and posting rules for goods movements' },
  idoc: { title: 'IDoc & Partners', subtitle: 'Ports, partner profiles and inbound processing rules' },
};

interface Setting {
  key: string;
  area: string;
  label: string;
  help: string;
  type: 'string' | 'date' | 'number' | 'boolean' | 'list';
  options?: string[];
  min?: number;
  max?: number;
  value: any;
  editableBy: string[];
}

const MOVEMENT_LABELS: Record<string, string> = {
  '201': '201 Goods issue to consumption',
  '301': '301 Transfer between warehouses',
  '561': '561 Initial stock entry',
  '701': '701 Physical inventory gain',
  '702': '702 Physical inventory loss',
};

export default function Configuration() {
  const { area = 'general' } = useParams();
  const meta = AREAS[area] ?? AREAS.general;
  return (
    <div>
      <PageHeader title={`Configuration: ${meta.title}`} subtitle={meta.subtitle} />
      <SettingsForm key={area} area={area} />
      {area === 'general' && <NumberRanges />}
      {area === 'finance' && (
        <div className="mt-6">
          <AccountDetermination />
        </div>
      )}
      {area === 'idoc' && (
        <>
          <Ports />
          <PartnerProfiles />
        </>
      )}
    </div>
  );
}

function SettingsForm({ area }: { area: string }) {
  const { user } = useAuth();
  const { data, error, reload } = useApi<Setting[]>('/config');
  const { data: warehouses } = useApi<any[]>('/warehouses');
  const settings = useMemo(() => (data ?? []).filter((s) => s.area === area), [data, area]);
  const [form, setForm] = useState<Record<string, any>>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => setForm(Object.fromEntries(settings.map((s) => [s.key, s.value]))), [settings]);

  if (error) return <ErrorBanner error={error} />;
  if (!data) return <Loading />;
  const canEdit = settings.length > 0 && (user?.role === 'admin' || settings[0].editableBy.includes(user?.role ?? ''));
  const dirty = settings.filter((s) => JSON.stringify(form[s.key]) !== JSON.stringify(s.value));

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    try {
      await api('/config', { method: 'PUT', body: Object.fromEntries(dirty.map((s) => [s.key, form[s.key]])) });
      setMsg(`Saved ${dirty.length} setting${dirty.length === 1 ? '' : 's'}`);
      reload();
    } catch (err) {
      setSaveError((err as Error).message);
    }
  };

  return (
    <form onSubmit={save}>
      <SuccessBanner message={msg} onClose={() => setMsg(null)} />
      <ErrorBanner error={saveError} onClose={() => setSaveError(null)} />
      <Card
        title="Settings"
        actions={
          canEdit ? (
            <button className="btn-primary" disabled={!dirty.length}>
              Save changes
            </button>
          ) : (
            <span className="text-xs text-slate-500">Read only for your role</span>
          )
        }
      >
        <div className="divide-y divide-slate-100">
          {settings.map((s) => {
            const set = (v: any) => setForm((f) => ({ ...f, [s.key]: v }));
            const v = form[s.key];
            const id = `cfg-${s.key}`;
            return (
              <div key={s.key} className="grid gap-2 px-4 py-3 md:grid-cols-[1fr_320px] md:items-center">
                <div>
                  <label htmlFor={id} className="text-sm font-medium text-slate-800">
                    {s.label}
                  </label>
                  <p className="text-xs text-slate-500">{s.help}</p>
                </div>
                <div>
                  {s.type === 'boolean' ? (
                    <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
                      <input id={id} type="checkbox" className="h-4 w-4" checked={!!v} disabled={!canEdit} onChange={(e) => set(e.target.checked)} />
                      {v ? 'On' : 'Off'}
                    </label>
                  ) : s.type === 'list' ? (
                    <div className="space-y-1">
                      {s.options!.map((o) => (
                        <label key={o} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            disabled={!canEdit}
                            checked={(v ?? []).includes(o)}
                            onChange={(e) => set(e.target.checked ? [...(v ?? []), o] : (v ?? []).filter((x: string) => x !== o))}
                          />
                          {MOVEMENT_LABELS[o] ?? o}
                        </label>
                      ))}
                    </div>
                  ) : s.key === 'inbound_order_warehouse' ? (
                    <select id={id} className="input" value={v ?? ''} disabled={!canEdit} onChange={(e) => set(e.target.value)}>
                      <option value="">First warehouse</option>
                      {warehouses?.map((w) => (
                        <option key={w.id} value={w.code}>
                          {w.code} {w.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      id={id}
                      className="input"
                      type={s.type === 'number' ? 'number' : s.type === 'date' ? 'date' : 'text'}
                      step="any"
                      min={s.min}
                      max={s.max}
                      value={v ?? ''}
                      disabled={!canEdit}
                      onChange={(e) => set(s.type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value)}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </form>
  );
}

function NumberRanges() {
  const { user } = useAuth();
  const { data, error, reload } = useApi<any[]>('/number-ranges');
  const [edit, setEdit] = useState<{ object: string; nextNo: string } | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const save = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await api(`/number-ranges/${edit!.object}`, { method: 'PUT', body: { nextNo: Number(edit!.nextNo) } });
      setEdit(null);
      reload();
    } catch (err) {
      setSaveError((err as Error).message);
    }
  };
  return (
    <Card title="Number ranges" className="mt-6">
      <ErrorBanner error={error} />
      {!data ? (
        <Loading />
      ) : (
        <table className="tbl">
          <thead>
            <tr>
              <th>Object</th>
              <th>Documents</th>
              <th className="num">Next number</th>
              {user?.role === 'admin' && <th />}
            </tr>
          </thead>
          <tbody>
            {data.map((r) => (
              <tr key={r.object}>
                <td className="font-mono">{r.object}</td>
                <td>{r.description}</td>
                <td className="num font-mono">{r.object === 'IDOC' ? String(r.nextNo).padStart(16, '0') : r.nextNo}</td>
                {user?.role === 'admin' && (
                  <td className="text-right">
                    <button className="link text-xs" onClick={() => { setSaveError(null); setEdit({ object: r.object, nextNo: String(r.nextNo) }); }}>
                      Change
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {edit && (
        <Modal title={`Number range ${edit.object}`} onClose={() => setEdit(null)}>
          <form onSubmit={save} className="space-y-3">
            <ErrorBanner error={saveError} />
            <Field label="Next number">
              <input className="input font-mono" type="number" value={edit.nextNo} onChange={(e) => setEdit({ ...edit, nextNo: e.target.value })} />
            </Field>
            <p className="text-xs text-slate-500">Numbers can only be moved forward, so documents never get a number that was already issued.</p>
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={() => setEdit(null)}>Cancel</button>
              <button className="btn-primary">Save</button>
            </div>
          </form>
        </Modal>
      )}
    </Card>
  );
}

function Ports() {
  const { user } = useAuth();
  const { data, error, reload } = useApi<any[]>('/idoc-ports');
  const [edit, setEdit] = useState<any | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const isAdmin = user?.role === 'admin';
  const save = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await api(edit.id ? `/idoc-ports/${edit.id}` : '/idoc-ports', { method: edit.id ? 'PUT' : 'POST', body: edit });
      setEdit(null);
      reload();
    } catch (err) {
      setSaveError((err as Error).message);
    }
  };
  return (
    <Card
      title="Ports"
      className="mt-6"
      actions={isAdmin && <button className="btn-secondary" onClick={() => { setSaveError(null); setEdit({ name: '', port_type: 'XML_HTTP', target: '', description: '' }); }}>+ Port</button>}
    >
      <ErrorBanner error={error} />
      {!data ? (
        <Loading />
      ) : !data.length ? (
        <p className="p-4 text-sm text-slate-500">No ports yet. A port is where outbound IDocs are passed to (simulated).</p>
      ) : (
        <table className="tbl">
          <thead><tr><th>Port</th><th>Type</th><th>Target</th><th>Description</th>{isAdmin && <th />}</tr></thead>
          <tbody>
            {data.map((p) => (
              <tr key={p.id}>
                <td className="font-mono">{p.name}</td>
                <td>{p.port_type === 'XML_HTTP' ? 'XML over HTTP' : 'XML file'}</td>
                <td className="font-mono text-xs">{p.target}</td>
                <td>{p.description}</td>
                {isAdmin && <td className="text-right"><button className="link text-xs" onClick={() => { setSaveError(null); setEdit({ ...p }); }}>Edit</button></td>}
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {edit && (
        <Modal title={edit.id ? `Port ${edit.name}` : 'New port'} onClose={() => setEdit(null)}>
          <form onSubmit={save} className="space-y-3">
            <ErrorBanner error={saveError} />
            <Field label="Port name"><input className="input font-mono uppercase" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value.toUpperCase() })} /></Field>
            <Field label="Type">
              <select className="input" value={edit.port_type} onChange={(e) => setEdit({ ...edit, port_type: e.target.value })}>
                <option value="XML_HTTP">XML over HTTP</option>
                <option value="FILE">XML file</option>
              </select>
            </Field>
            <Field label={edit.port_type === 'FILE' ? 'Directory' : 'URL'}><input className="input font-mono" value={edit.target} onChange={(e) => setEdit({ ...edit, target: e.target.value })} /></Field>
            <Field label="Description"><input className="input" value={edit.description ?? ''} onChange={(e) => setEdit({ ...edit, description: e.target.value })} /></Field>
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={() => setEdit(null)}>Cancel</button>
              <button className="btn-primary">Save</button>
            </div>
          </form>
        </Modal>
      )}
    </Card>
  );
}

const PARTNER_TYPES: Record<string, string> = { LS: 'Logical system', LI: 'Vendor', KU: 'Customer' };

function PartnerProfiles() {
  const { user } = useAuth();
  const ask = useConfirm();
  const { data, error, reload } = useApi<any[]>('/idoc-partners');
  const [edit, setEdit] = useState<any | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const isAdmin = user?.role === 'admin';
  const remove = async (p: any) => {
    if (!(await ask(`Delete the partner profile for ${p.partner_no}?`, 'Delete'))) return;
    try {
      await api(`/idoc-partners/${p.id}`, { method: 'DELETE' });
      reload();
    } catch (e) {
      setActionError((e as Error).message);
    }
  };
  return (
    <Card
      title="Partner profiles"
      className="mt-6"
      actions={isAdmin && <button className="btn-secondary" onClick={() => setEdit({ partner_type: 'KU', partner_no: '', name: '', port_id: '', is_active: true, messages: [] })}>+ Partner</button>}
    >
      <ErrorBanner error={error ?? actionError} onClose={() => setActionError(null)} />
      {!data ? (
        <Loading />
      ) : !data.length ? (
        <p className="p-4 text-sm text-slate-500">No partner profiles. Without a profile no IDocs are exchanged with a partner.</p>
      ) : (
        <table className="tbl">
          <thead><tr><th>Partner</th><th>Type</th><th>Port</th><th>Outbound</th><th>Inbound</th><th>Status</th>{isAdmin && <th />}</tr></thead>
          <tbody>
            {data.map((p) => (
              <tr key={p.id}>
                <td><span className="font-mono">{p.partner_no}</span> {p.name}</td>
                <td>{PARTNER_TYPES[p.partner_type]}</td>
                <td className="font-mono text-xs">{p.port_name ?? '—'}</td>
                <td className="text-xs">{p.messages.filter((m: any) => m.direction === 'OUT').map((m: any) => `${m.message_type}${m.output_mode === 'COLLECT' ? ' (collect)' : ''}`).join(', ') || '—'}</td>
                <td className="text-xs">{p.messages.filter((m: any) => m.direction === 'IN').map((m: any) => m.message_type).join(', ') || '—'}</td>
                <td>{p.is_active ? <span className="text-emerald-700">Active</span> : <span className="text-slate-500">Inactive</span>}</td>
                {isAdmin && (
                  <td className="whitespace-nowrap text-right">
                    <button className="link text-xs" onClick={() => setEdit({ ...p, port_id: p.port_id ?? '', is_active: !!p.is_active })}>Edit</button>
                    {p.idoc_count === 0 && <button className="ml-3 text-xs text-red-600 hover:underline" onClick={() => remove(p)}>Delete</button>}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {edit && <PartnerModal initial={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); reload(); }} />}
    </Card>
  );
}

function PartnerModal({ initial, onClose, onSaved }: { initial: any; onClose: () => void; onSaved: () => void }) {
  const [p, setP] = useState<any>(initial);
  const [error, setError] = useState<string | null>(null);
  const { data: meta } = useApi<any>('/idoc-meta');
  const { data: ports } = useApi<any[]>('/idoc-ports');
  const { data: customers } = useApi<any[]>('/customers');
  const { data: vendors } = useApi<any[]>('/vendors');
  const choices = p.partner_type === 'KU' ? customers : p.partner_type === 'LI' ? vendors : null;
  const available = (dir: 'OUT' | 'IN') =>
    Object.entries<any>(meta?.messageTypes ?? {})
      .filter(([, m]) => (dir === 'OUT' ? m.out : m.in)?.partners.includes(p.partner_type))
      .map(([k, m]) => ({ code: k, ...m, info: dir === 'OUT' ? m.out.trigger : m.in.action }));
  const has = (dir: string, mt: string) => p.messages.some((m: any) => m.direction === dir && m.message_type === mt);
  const toggle = (dir: string, mt: string, on: boolean) =>
    setP({ ...p, messages: on ? [...p.messages, { direction: dir, message_type: mt, output_mode: 'IMMEDIATE' }] : p.messages.filter((m: any) => !(m.direction === dir && m.message_type === mt)) });
  const setMode = (mt: string, mode: string) => setP({ ...p, messages: p.messages.map((m: any) => (m.direction === 'OUT' && m.message_type === mt ? { ...m, output_mode: mode } : m)) });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await api(p.id ? `/idoc-partners/${p.id}` : '/idoc-partners', {
        method: p.id ? 'PUT' : 'POST',
        body: { partner_type: p.partner_type, partner_no: p.partner_no, name: p.name, port_id: p.port_id ? Number(p.port_id) : null, is_active: p.is_active, messages: p.messages },
      });
      onSaved();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <Modal title={p.id ? `Partner profile ${p.partner_no}` : 'New partner profile'} onClose={onClose} wide>
      <form onSubmit={submit}>
        <ErrorBanner error={error} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Partner type">
            <select className="input" value={p.partner_type} onChange={(e) => setP({ ...p, partner_type: e.target.value, partner_no: '', name: '', messages: [] })}>
              {Object.entries(PARTNER_TYPES).map(([k, v]) => <option key={k} value={k}>{k} {v}</option>)}
            </select>
          </Field>
          <Field label="Partner number">
            {choices ? (
              <select
                className="input"
                value={p.partner_no}
                onChange={(e) => setP({ ...p, partner_no: e.target.value, name: choices.find((c) => c.code === e.target.value)?.name ?? p.name })}
              >
                <option value="">Select…</option>
                {choices.map((c) => <option key={c.id} value={c.code}>{c.code} {c.name}</option>)}
              </select>
            ) : (
              <input className="input font-mono uppercase" placeholder="e.g. MDMCLNT800" value={p.partner_no} onChange={(e) => setP({ ...p, partner_no: e.target.value.toUpperCase() })} />
            )}
          </Field>
          <Field label="Name"><input className="input" value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} /></Field>
          <Field label="Port for outbound IDocs">
            <select className="input" value={p.port_id} onChange={(e) => setP({ ...p, port_id: e.target.value })}>
              <option value="">No port</option>
              {ports?.map((pt) => <option key={pt.id} value={pt.id}>{pt.name}</option>)}
            </select>
          </Field>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" checked={p.is_active} onChange={(e) => setP({ ...p, is_active: e.target.checked })} /> Profile active
          </label>
        </div>
        {(['OUT', 'IN'] as const).map((dir) => (
          <div key={dir} className="mt-4">
            <div className="label">{dir === 'OUT' ? 'Outbound messages (we send)' : 'Inbound messages (we receive)'}</div>
            {available(dir).length === 0 ? (
              <p className="text-xs text-slate-500">None available for this partner type.</p>
            ) : (
              <div className="space-y-1.5">
                {available(dir).map((m) => (
                  <div key={m.code} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                    <label className="flex min-w-[220px] items-center gap-2">
                      <input type="checkbox" checked={has(dir, m.code)} onChange={(e) => toggle(dir, m.code, e.target.checked)} />
                      <span className="font-mono">{m.code}</span>
                      <span className="text-xs text-slate-500">{m.idocType}</span>
                    </label>
                    <span className="flex-1 text-xs text-slate-500">{m.info}</span>
                    {dir === 'OUT' && has('OUT', m.code) && (
                      <select className="input w-40 py-1 text-xs" value={p.messages.find((x: any) => x.direction === 'OUT' && x.message_type === m.code).output_mode} onChange={(e) => setMode(m.code, e.target.value)}>
                        <option value="IMMEDIATE">Send immediately</option>
                        <option value="COLLECT">Collect, send later</option>
                      </select>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary">Save</button>
        </div>
      </form>
    </Modal>
  );
}
