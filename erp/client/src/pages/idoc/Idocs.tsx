import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { api, qs, useApi } from '../../api';
import { Card, Empty, ErrorBanner, Field, Loading, PageHeader, SuccessBanner } from '../../components/ui';

const GOOD = ['03', '53'];
const BAD = ['02', '51', '56'];
const WAIT = ['01', '30', '50', '64'];

export function IdocStatus({ status, text }: { status: string; text?: string }) {
  const cls = GOOD.includes(status)
    ? 'bg-emerald-100 text-emerald-800'
    : BAD.includes(status)
      ? 'bg-red-100 text-red-700'
      : WAIT.includes(status)
        ? 'bg-amber-100 text-amber-800'
        : 'bg-slate-200 text-slate-700';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-xs font-medium ${cls}`}>
      <span className="font-mono">{status}</span>
      {text && <span className="hidden sm:inline">{text}</span>}
    </span>
  );
}

const Dir = ({ d }: { d: string }) => (
  <span className={`font-mono text-xs font-semibold ${d === 'OUT' ? 'text-brand-600' : 'text-violet-700'}`} title={d === 'OUT' ? 'Outbound' : 'Inbound'}>
    {d === 'OUT' ? 'OUT →' : '← IN'}
  </span>
);

async function copyText(text: string, done: (msg: string) => void) {
  try {
    await navigator.clipboard.writeText(text);
    done('XML copied to the clipboard');
  } catch {
    done('Copy is blocked here: select the XML text and copy it manually');
  }
}

export function IdocMonitor() {
  const [params] = useSearchParams();
  const [f, setF] = useState({ direction: params.get('direction') ?? '', messageType: '', status: params.get('status') ?? '', search: '' });
  const { data, error, loading } = useApi<any[]>(`/idocs${qs(f)}`);
  const { data: stats } = useApi<any[]>('/idocs/stats');
  const { data: meta } = useApi<any>('/idoc-meta');
  const count = (statuses: string[]) => stats?.filter((s) => statuses.includes(s.status)).reduce((n, s) => n + s.n, 0) ?? 0;
  const tiles: { label: string; statuses: string[]; tone: string }[] = [
    { label: 'Posted / passed to port', statuses: GOOD, tone: 'text-emerald-700' },
    { label: 'Waiting', statuses: WAIT, tone: 'text-amber-700' },
    { label: 'In error', statuses: BAD, tone: 'text-red-600' },
  ];
  return (
    <div>
      <PageHeader
        title="IDoc Monitor"
        subtitle="All IDocs exchanged with partners, with their processing status"
        actions={<Link className="btn-primary" to="/idocs/exchange">Open IDoc exchange</Link>}
      />
      <ErrorBanner error={error} />
      <div className="mb-4 grid grid-cols-3 gap-3">
        {tiles.map((t) => (
          <div key={t.label} className="card p-3">
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{t.label}</div>
            <div className={`mt-1 text-2xl font-semibold tabular-nums ${t.tone}`}>{count(t.statuses)}</div>
          </div>
        ))}
      </div>
      <Card>
        <div className="grid grid-cols-2 gap-3 border-b border-slate-200 p-3 md:grid-cols-4">
          <Field label="Direction">
            <select className="input" value={f.direction} onChange={(e) => setF({ ...f, direction: e.target.value })}>
              <option value="">Both</option>
              <option value="OUT">Outbound</option>
              <option value="IN">Inbound</option>
            </select>
          </Field>
          <Field label="Message type">
            <select className="input" value={f.messageType} onChange={(e) => setF({ ...f, messageType: e.target.value })}>
              <option value="">All</option>
              {Object.entries<any>(meta?.messageTypes ?? {}).map(([k, m]) => <option key={k} value={k}>{k} {m.description}</option>)}
            </select>
          </Field>
          <Field label="Status">
            <select className="input" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}>
              <option value="">All</option>
              {Object.entries<string>(meta?.statuses ?? {}).map(([k, t]) => <option key={k} value={k}>{k} {t}</option>)}
            </select>
          </Field>
          <Field label="Search"><input className="input" placeholder="IDoc no., partner, document" value={f.search} onChange={(e) => setF({ ...f, search: e.target.value })} /></Field>
        </div>
        {loading && !data ? <Loading /> : !data?.length ? <Empty>No IDocs match the filter</Empty> : (
          <table className="tbl">
            <thead><tr><th>IDoc number</th><th>Dir.</th><th>Message</th><th>Partner</th><th>Status</th><th>Last status message</th><th>Application document</th><th>Changed</th></tr></thead>
            <tbody>
              {data.map((i) => (
                <tr key={i.id}>
                  <td><Link className="link font-mono" to={`/idocs/${i.id}`}>{i.docnum}</Link></td>
                  <td><Dir d={i.direction} /></td>
                  <td><span className="font-mono">{i.message_type}</span> <span className="text-xs text-slate-500">{i.idoc_type}</span></td>
                  <td><span className="font-mono text-xs">{i.partner_type} {i.partner_no}</span> {i.partner_name && <span className="text-slate-500">{i.partner_name}</span>}</td>
                  <td><IdocStatus status={i.status} /></td>
                  <td className="max-w-xs truncate text-slate-600" title={i.status_message}>{i.status_message}</td>
                  <td>{i.ref_doc_no && (i.ref_link ? <Link className="link font-mono" to={i.ref_link}>{i.ref_doc_no}</Link> : <span className="font-mono">{i.ref_doc_no}</span>)}</td>
                  <td className="whitespace-nowrap text-xs text-slate-500">{i.updated_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

function SegmentTree({ segments, depth = 0 }: { segments: any[]; depth?: number }) {
  return (
    <ul className={depth ? 'ml-4 border-l border-slate-200 pl-3' : ''}>
      {segments.map((s, i) => (
        <li key={i} className="py-1">
          <details open={depth < 1}>
            <summary className="cursor-pointer select-none font-mono text-sm font-semibold text-slate-700">{s.name}</summary>
            <table className="my-1 text-xs">
              <tbody>
                {Object.entries<string>(s.fields).map(([k, v]) => (
                  <tr key={k}>
                    <td className="pr-4 font-mono text-slate-500">{k}</td>
                    <td className="font-mono">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {s.children && <SegmentTree segments={s.children} depth={depth + 1} />}
          </details>
        </li>
      ))}
    </ul>
  );
}

export function IdocDetail() {
  const { id } = useParams();
  const { data: i, error, reload } = useApi<any>(`/idocs/${id}`);
  const [tab, setTab] = useState<'tree' | 'xml'>('tree');
  const [msg, setMsg] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  if (error) return <ErrorBanner error={error} />;
  if (!i) return <Loading />;
  const act = async (action: string, done: string) => {
    setActionError(null);
    try {
      const r = await api(`/idocs/${i.id}/${action}`, { body: {} });
      setMsg(`${done}: status ${r.status} ${r.status_text}`);
      reload();
    } catch (e) {
      setActionError((e as Error).message);
    }
  };
  return (
    <div>
      <PageHeader
        title={`IDoc ${i.docnum}`}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <Dir d={i.direction} /> {i.message_type} · {i.idoc_type} · partner {i.partner_type} {i.partner_no} {i.partner_name ? `(${i.partner_name})` : ''}
            <IdocStatus status={i.status} text={i.status_text} />
          </span>
        }
        actions={
          <>
            {i.direction === 'IN' && ['64', '51', '56'].includes(i.status) && <button className="btn-primary" onClick={() => act('process', 'Processed')}>Process again</button>}
            {i.direction === 'OUT' && ['30', '02'].includes(i.status) && <button className="btn-primary" onClick={() => act('dispatch', 'Sent')}>Send to port</button>}
            {['51', '56', '02', '30', '64'].includes(i.status) && <button className="btn-secondary" onClick={() => act('close', 'Closed')}>Set to no further processing</button>}
            <Link className="btn-secondary" to="/idocs">Back to monitor</Link>
          </>
        }
      />
      <SuccessBanner message={msg} onClose={() => setMsg(null)} />
      <ErrorBanner error={actionError} onClose={() => setActionError(null)} />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <div className="space-y-4">
          <Card title="Application document">
            <div className="p-4 text-sm">
              {i.ref_doc_no ? (
                <>
                  {i.ref_type}{' '}
                  {i.ref_link ? <Link className="link font-mono" to={i.ref_link}>{i.ref_doc_no}</Link> : <span className="font-mono">{i.ref_doc_no}</span>}
                </>
              ) : (
                <span className="text-slate-500">None yet</span>
              )}
            </div>
          </Card>
          <Card title="Status records">
            <ol className="divide-y divide-slate-100">
              {i.statuses.map((s: any, n: number) => (
                <li key={n} className="flex gap-3 px-4 py-2.5">
                  <IdocStatus status={s.status} />
                  <div className="min-w-0 text-sm">
                    <div className="font-medium text-slate-700">{s.text}</div>
                    {s.message && s.message !== s.text && <div className="break-words text-slate-600">{s.message}</div>}
                    <div className="text-xs text-slate-400">{s.created_at}</div>
                  </div>
                </li>
              ))}
            </ol>
          </Card>
          <Card title="Control record (EDI_DC40)">
            <table className="tbl">
              <tbody>
                {Object.entries<string>(i.control).map(([k, v]) => (
                  <tr key={k}><td className="w-28 font-mono text-xs text-slate-500">{k}</td><td className="font-mono text-xs">{v}</td></tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
        <Card
          title="Data records"
          actions={
            <div className="flex gap-1">
              <button className={tab === 'tree' ? 'btn-primary py-1' : 'btn-secondary py-1'} onClick={() => setTab('tree')}>Segments</button>
              <button className={tab === 'xml' ? 'btn-primary py-1' : 'btn-secondary py-1'} onClick={() => setTab('xml')}>XML</button>
              {tab === 'xml' && <button className="btn-secondary py-1" onClick={() => copyText(i.xml, setMsg)}>Copy</button>}
            </div>
          }
        >
          {tab === 'tree' ? (
            <div className="p-4"><SegmentTree segments={i.segments} /></div>
          ) : (
            <pre className="max-h-[70vh] overflow-auto bg-slate-900 p-4 text-xs leading-relaxed text-slate-100">{i.xml}</pre>
          )}
        </Card>
      </div>
    </div>
  );
}

const TEMPLATES: { kind: string; label: string; who: string; needsPO?: boolean }[] = [
  { kind: 'ORDERS', label: 'Customer order', who: 'Customer → us · ORDERS05' },
  { kind: 'DESADV', label: 'Vendor shipping notification', who: 'Vendor → us · DELVRY07', needsPO: true },
  { kind: 'INVOIC', label: 'Vendor invoice', who: 'Vendor → us · INVOIC02', needsPO: true },
  { kind: 'MATMAS', label: 'Material master', who: 'Master data hub → us · MATMAS05' },
  { kind: 'DEBMAS', label: 'Customer master', who: 'Master data hub → us · DEBMAS07' },
  { kind: 'CREMAS', label: 'Vendor master', who: 'Master data hub → us · CREMAS05' },
];

export function IdocExchange() {
  const [xml, setXml] = useState('');
  const [desc, setDesc] = useState<string | null>(null);
  const [poId, setPoId] = useState('');
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { data: pos } = useApi<any[]>('/purchase-orders');
  const { data: outbound, reload: reloadOut } = useApi<any[]>('/idocs?direction=OUT');
  const [selected, setSelected] = useState<any | null>(null);

  const loadTemplate = async (kind: string, po?: string | number) => {
    setError(null);
    setResult(null);
    try {
      const t = await api(`/idocs/templates/${kind}${qs({ poId: po || undefined })}`);
      setXml(t.xml);
      setDesc(t.description);
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const send = async () => {
    setBusy(true);
    setError(null);
    try {
      setResult(await api('/idocs/inbound', { body: { xml } }));
    } catch (e) {
      setError((e as Error).message);
      setResult(null);
    } finally {
      setBusy(false);
    }
  };
  const openOutbound = async (id: number) => setSelected(await api(`/idocs/${id}`));
  const upload = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setXml(String(reader.result));
      setDesc(`Loaded from ${file.name}`);
      setResult(null);
    };
    reader.readAsText(file);
  };

  return (
    <div>
      <PageHeader
        title="IDoc Exchange"
        subtitle="Act as a trading partner: send IDocs into the ERP and read the IDocs the ERP sends out"
        actions={<Link className="btn-secondary" to="/idocs">IDoc monitor</Link>}
      />
      <SuccessBanner message={msg} onClose={() => setMsg(null)} />
      <div className="grid gap-4 xl:grid-cols-2">
        <Card title="Partner sends to ERP (inbound)">
          <div className="space-y-3 p-4">
            <div>
              <div className="label">1. Start from a template filled with real data, or paste/upload your own IDoc-XML</div>
              <div className="grid gap-2 sm:grid-cols-3">
                {TEMPLATES.map((t) => (
                  <button key={t.kind} className="rounded border border-slate-200 p-2 text-left hover:border-brand-500 hover:bg-brand-50" onClick={() => loadTemplate(t.kind, t.needsPO ? poId : undefined)}>
                    <div className="text-sm font-medium text-slate-800">{t.label}</div>
                    <div className="text-[11px] text-slate-500">{t.who}</div>
                  </button>
                ))}
              </div>
              <div className="mt-2 flex flex-wrap items-end gap-3">
                <Field label="Purchase order for vendor templates" className="w-72">
                  <select className="input" value={poId} onChange={(e) => setPoId(e.target.value)}>
                    <option value="">Latest suitable PO</option>
                    {pos?.filter((p) => ['RELEASED', 'PARTIALLY_RECEIVED', 'RECEIVED'].includes(p.status)).map((p) => (
                      <option key={p.id} value={p.id}>{p.doc_no} {p.vendor_name} ({p.status.replace(/_/g, ' ').toLowerCase()})</option>
                    ))}
                  </select>
                </Field>
                <label className="btn-secondary cursor-pointer">
                  Upload XML file
                  <input type="file" accept=".xml,text/xml" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
                </label>
              </div>
            </div>
            <div>
              <div className="label">2. Review or edit the IDoc {desc && <span className="font-normal text-slate-500">· {desc}</span>}</div>
              <textarea
                id="idoc-xml"
                className="input h-80 font-mono text-xs leading-relaxed"
                spellCheck={false}
                placeholder="<ORDERS05><IDOC BEGIN=&quot;1&quot;><EDI_DC40 SEGMENT=&quot;1&quot;>…"
                value={xml}
                onChange={(e) => setXml(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-3">
              <button className="btn-primary" disabled={!xml.trim() || busy} onClick={send}>3. Send to ERP</button>
              <span className="text-xs text-slate-500">The ERP checks the partner profile, then posts the document.</span>
            </div>
            <ErrorBanner error={error} onClose={() => setError(null)} />
            {result && (
              <div className={`rounded border p-3 text-sm ${result.status === '53' ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}`}>
                <div className="flex flex-wrap items-center gap-2">
                  IDoc <Link className="link font-mono" to={`/idocs/${result.id}`}>{result.docnum}</Link> received:
                  <IdocStatus status={result.status} text={result.status_text} />
                </div>
                <div className="mt-1 text-slate-700">{result.statuses[0]?.message}</div>
                {result.ref_link && <Link className="link mt-1 inline-block" to={result.ref_link}>Open {result.ref_doc_no}</Link>}
                {result.status !== '53' && <div className="mt-1 text-xs text-slate-500">Fix the cause (e.g. post the goods receipt or add a partner profile), then use "Process again" on the IDoc.</div>}
              </div>
            )}
          </div>
        </Card>

        <div className="space-y-4">
          <Card title="ERP sends to partners (outbound)" actions={<button className="link text-xs" onClick={reloadOut}>Refresh</button>}>
            {!outbound ? <Loading /> : !outbound.length ? (
              <Empty>No outbound IDocs yet. Release a purchase order, post a delivery or create a customer invoice for a partner with an outbound profile.</Empty>
            ) : (
              <table className="tbl">
                <thead><tr><th>IDoc</th><th>Message</th><th>To partner</th><th>Status</th><th>Document</th><th /></tr></thead>
                <tbody>
                  {outbound.slice(0, 12).map((o) => (
                    <tr key={o.id} className={selected?.id === o.id ? 'bg-brand-50' : ''}>
                      <td className="font-mono text-xs">{o.docnum.replace(/^0+/, '')}</td>
                      <td className="font-mono">{o.message_type}</td>
                      <td>{o.partner_name ?? o.partner_no}</td>
                      <td><IdocStatus status={o.status} /></td>
                      <td className="font-mono text-xs">{o.ref_doc_no}</td>
                      <td className="text-right"><button className="link text-xs" onClick={() => openOutbound(o.id)}>View</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
          {selected && (
            <Card
              title={`IDoc ${selected.docnum.replace(/^0+/, '')} · ${selected.message_type} to ${selected.partner_name ?? selected.partner_no}`}
              actions={<button className="btn-secondary py-1" onClick={() => copyText(selected.xml, setMsg)}>Copy XML</button>}
            >
              {selected.message_type === 'ORDERS' && selected.ref_type === 'PO' && (
                <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 p-3 text-sm">
                  <span className="text-slate-600">Reply as the vendor:</span>
                  <button className="btn-secondary py-1" onClick={() => { setPoId(String(selected.ref_id)); loadTemplate('DESADV', selected.ref_id); }}>Shipping notification</button>
                  <button className="btn-secondary py-1" onClick={() => { setPoId(String(selected.ref_id)); loadTemplate('INVOIC', selected.ref_id); }}>Invoice</button>
                </div>
              )}
              <pre className="max-h-96 overflow-auto bg-slate-900 p-4 text-xs leading-relaxed text-slate-100">{selected.xml}</pre>
            </Card>
          )}
          <SendMaterial onSent={(m) => { setMsg(m); reloadOut(); }} />
        </div>
      </div>
    </div>
  );
}

function SendMaterial({ onSent }: { onSent: (msg: string) => void }) {
  const { data: materials } = useApi<any[]>('/materials');
  const { data: partners } = useApi<any[]>('/idoc-partners');
  const targets = partners?.filter((p) => p.messages.some((m: any) => m.direction === 'OUT' && m.message_type === 'MATMAS')) ?? [];
  const [materialId, setMaterialId] = useState('');
  const [partnerId, setPartnerId] = useState('');
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!partnerId && targets.length) setPartnerId(String(targets[0].id));
  }, [targets, partnerId]);
  const send = async () => {
    setError(null);
    try {
      const r = await api('/idocs/outbound/matmas', { body: { materialId: Number(materialId), partnerId: Number(partnerId) } });
      onSent(`Material master sent as IDoc ${r.docnum}`);
    } catch (e) {
      setError((e as Error).message);
    }
  };
  return (
    <Card title="Send material master (MATMAS)">
      <div className="space-y-3 p-4">
        <ErrorBanner error={error} onClose={() => setError(null)} />
        {targets.length === 0 ? (
          <p className="text-sm text-slate-500">No partner has an outbound MATMAS profile. Add one under Configuration → IDoc & Partners.</p>
        ) : (
          <div className="flex flex-wrap items-end gap-3">
            <Field label="Material" className="min-w-[200px] flex-1">
              <select className="input" value={materialId} onChange={(e) => setMaterialId(e.target.value)}>
                <option value="">Select…</option>
                {materials?.map((m) => <option key={m.id} value={m.id}>{m.code} {m.name}</option>)}
              </select>
            </Field>
            <Field label="To partner" className="min-w-[180px]">
              <select className="input" value={partnerId} onChange={(e) => setPartnerId(e.target.value)}>
                {targets.map((p) => <option key={p.id} value={p.id}>{p.partner_no} {p.name}</option>)}
              </select>
            </Field>
            <button className="btn-primary" disabled={!materialId} onClick={send}>Send</button>
          </div>
        )}
      </div>
    </Card>
  );
}
