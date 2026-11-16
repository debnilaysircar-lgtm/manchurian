/**
 * IDoc / ALE simulation. IDocs are stored with an EDI_DC40-style control record and a segment tree,
 * and exchanged as SAP IDoc-XML. Outbound IDocs are created from business events according to partner
 * profiles; inbound IDocs are posted through the same services the UI uses.
 */
import type { DB } from '../db.ts';
import { nextNumber } from '../db.ts';
import { badRequest, HttpError, notFound } from '../lib/errors.ts';
import { fromCents, roundQty, today } from '../lib/money.ts';
import { escapeXml, parseXml, XmlError, type XNode } from '../lib/xml.ts';
import { getConfig } from './config.ts';
import { getPO, postGoodsReceipt, postInvoice } from './purchasing.ts';
import { createSO, getCustomerInvoice, getSO, setSOStatus } from './sales.ts';

export interface Segment {
  name: string;
  fields: Record<string, string>;
  children?: Segment[];
}
export interface IdocData {
  control: Record<string, string>;
  segments: Segment[];
}
type Direction = 'OUT' | 'IN';
type PartnerType = 'LS' | 'LI' | 'KU';

export const MESSAGE_TYPES: Record<string, { idocType: string; description: string; out?: { partners: PartnerType[]; trigger: string }; in?: { partners: PartnerType[]; action: string } }> = {
  ORDERS: {
    idocType: 'ORDERS05',
    description: 'Purchase order',
    out: { partners: ['LI'], trigger: 'Sent to the vendor when a purchase order is released' },
    in: { partners: ['KU'], action: "Customer's purchase order creates a sales order" },
  },
  DESADV: {
    idocType: 'DELVRY07',
    description: 'Shipping notification',
    out: { partners: ['KU'], trigger: 'Sent to the customer when a delivery is posted' },
    in: { partners: ['LI'], action: "Vendor's shipping notification posts the goods receipt" },
  },
  INVOIC: {
    idocType: 'INVOIC02',
    description: 'Invoice',
    out: { partners: ['KU'], trigger: 'Sent to the customer when a customer invoice is created' },
    in: { partners: ['LI'], action: "Vendor's invoice is posted against the purchase order" },
  },
  MATMAS: {
    idocType: 'MATMAS05',
    description: 'Material master',
    out: { partners: ['LS'], trigger: 'Sent on request from the IDoc exchange screen' },
    in: { partners: ['LS'], action: 'Creates or updates a material' },
  },
  DEBMAS: { idocType: 'DEBMAS07', description: 'Customer master', in: { partners: ['LS'], action: 'Creates or updates a customer' } },
  CREMAS: { idocType: 'CREMAS05', description: 'Vendor master', in: { partners: ['LS'], action: 'Creates or updates a vendor' } },
};

export const STATUS_TEXT: Record<string, string> = {
  '01': 'IDoc generated',
  '02': 'Error passing data to port',
  '03': 'Data passed to port OK',
  '30': 'IDoc ready for dispatch',
  '50': 'IDoc added',
  '51': 'Application document not posted',
  '53': 'Application document posted',
  '56': 'IDoc with errors added',
  '64': 'IDoc ready to be transferred to application',
  '68': 'Error, no further processing',
};

// ---------- helpers ----------

const pad = (n: number | string, len: number) => String(n).padStart(len, '0');
const d8 = (iso: string | null | undefined) => (iso ? iso.replace(/-/g, '').slice(0, 8) : '');
const fromD8 = (v: string | undefined, label: string) => {
  if (!v) return undefined;
  if (/^\d{8}$/.test(v)) return `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  throw badRequest(`${label}: "${v}" is not a date (use YYYYMMDD)`);
};
const qtyStr = (n: number) => String(roundQty(n));
const amt = (n: number) => n.toFixed(2);
const nowStamp = () => {
  const d = new Date();
  return { CREDAT: d.toISOString().slice(0, 10).replace(/-/g, ''), CRETIM: d.toISOString().slice(11, 19).replace(/:/g, '') };
};

function seg(name: string, fields: Record<string, string | number | null | undefined>, children?: Segment[]): Segment {
  const clean: Record<string, string> = {};
  for (const [k, v] of Object.entries(fields)) if (v !== null && v !== undefined && v !== '') clean[k] = String(v);
  return children?.length ? { name, fields: clean, children } : { name, fields: clean };
}

const findAll = (segs: Segment[] | undefined, name: string) => (segs ?? []).filter((s) => s.name === name);
const find = (segs: Segment[] | undefined, name: string) => (segs ?? []).find((s) => s.name === name);
/** Depth-first search so inbound IDocs work whether segments are nested or flat. */
function deepAll(segs: Segment[] | undefined, name: string): Segment[] {
  const out: Segment[] = [];
  for (const s of segs ?? []) {
    if (s.name === name) out.push(s);
    out.push(...deepAll(s.children, name));
  }
  return out;
}
const field = (s: Segment | undefined, f: string) => s?.fields[f]?.trim() || undefined;
function num(v: string | undefined, label: string): number {
  const n = Number(String(v ?? '').replace(',', '.'));
  if (v === undefined || v === '' || !Number.isFinite(n)) throw badRequest(`${label} is missing or not a number`);
  return n;
}
const toCents = (v: number) => Math.round(v * 100);

// ---------- XML ----------

export function toXml(data: IdocData): string {
  const lines: string[] = ['<?xml version="1.0" encoding="UTF-8"?>', `<${data.control.IDOCTYP}>`, '  <IDOC BEGIN="1">', '    <EDI_DC40 SEGMENT="1">'];
  for (const [k, v] of Object.entries(data.control)) lines.push(`      <${k}>${escapeXml(v)}</${k}>`);
  lines.push('    </EDI_DC40>');
  const write = (s: Segment, depth: number) => {
    const ind = '  '.repeat(depth);
    lines.push(`${ind}<${s.name} SEGMENT="1">`);
    for (const [k, v] of Object.entries(s.fields)) lines.push(`${ind}  <${k}>${escapeXml(v)}</${k}>`);
    s.children?.forEach((c) => write(c, depth + 1));
    lines.push(`${ind}</${s.name}>`);
  };
  data.segments.forEach((s) => write(s, 2));
  lines.push('  </IDOC>', `</${data.control.IDOCTYP}>`);
  return lines.join('\n');
}

export function fromXml(xml: string): IdocData {
  let root: XNode;
  try {
    root = parseXml(xml);
  } catch (e) {
    throw badRequest(`Invalid XML: ${(e as XmlError).message}`);
  }
  const idoc = root.name === 'IDOC' ? root : root.children.find((c) => c.name === 'IDOC');
  if (!idoc) throw badRequest('XML has no <IDOC> element');
  const dc = idoc.children.find((c) => c.name === 'EDI_DC40');
  if (!dc) throw badRequest('IDoc has no EDI_DC40 control record');
  const control: Record<string, string> = {};
  dc.children.forEach((c) => (control[c.name] = c.text.trim()));
  if (!control.IDOCTYP && root.name !== 'IDOC') control.IDOCTYP = root.name;
  const toSeg = (n: XNode): Segment => {
    const fields: Record<string, string> = {};
    const children: Segment[] = [];
    for (const c of n.children) {
      if (c.attrs.SEGMENT !== undefined || /^(E1|E2|Z1)/.test(c.name)) children.push(toSeg(c));
      else fields[c.name] = c.text.trim();
    }
    return children.length ? { name: n.name, fields, children } : { name: n.name, fields };
  };
  return { control, segments: idoc.children.filter((c) => c !== dc).map(toSeg) };
}

// ---------- partner profiles ----------

interface Profile {
  partnerId: number;
  partnerName: string;
  outputMode: 'IMMEDIATE' | 'COLLECT';
  port: { name: string; port_type: string; target: string } | null;
}

function findProfile(db: DB, partnerType: string, partnerNo: string, direction: Direction, messageType: string): Profile | null {
  const r = db
    .prepare(
      `SELECT p.id, p.name, m.output_mode, pt.name AS port_name, pt.port_type, pt.target
       FROM idoc_partners p JOIN idoc_partner_messages m ON m.partner_id = p.id
       LEFT JOIN idoc_ports pt ON pt.id = p.port_id
       WHERE p.partner_type = ? AND p.partner_no = ? AND p.is_active = 1 AND m.direction = ? AND m.message_type = ?`,
    )
    .get(partnerType, partnerNo, direction, messageType) as any;
  if (!r) return null;
  return {
    partnerId: r.id,
    partnerName: r.name,
    outputMode: r.output_mode,
    port: r.port_name ? { name: r.port_name, port_type: r.port_type, target: r.target } : null,
  };
}

function addStatus(db: DB, idocId: number, status: string, message?: string) {
  db.prepare('INSERT INTO idoc_status(idoc_id, status, message) VALUES (?, ?, ?)').run(idocId, status, message ?? STATUS_TEXT[status] ?? null);
  db.prepare("UPDATE idocs SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, idocId);
}

function insertIdoc(
  db: DB,
  i: { direction: Direction; data: IdocData; partnerType: string; partnerNo: string; partnerId: number | null; port: string | null; ref?: { type: string; id: number; docNo: string } },
  userId: number | null,
) {
  const { lastInsertRowid } = db
    .prepare(
      `INSERT INTO idocs(docnum, direction, message_type, idoc_type, partner_type, partner_no, partner_id, port, status, ref_type, ref_id, ref_doc_no, data, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, '', ?, ?, ?, ?, ?)`,
    )
    .run(
      i.data.control.DOCNUM,
      i.direction,
      i.data.control.MESTYP,
      i.data.control.IDOCTYP,
      i.partnerType,
      i.partnerNo,
      i.partnerId,
      i.port,
      i.ref?.type ?? null,
      i.ref?.id ?? null,
      i.ref?.docNo ?? null,
      JSON.stringify(i.data),
      userId,
    );
  return Number(lastInsertRowid);
}

// ---------- outbound ----------

function createOutbound(
  db: DB,
  o: { messageType: string; partnerType: PartnerType; partnerNo: string; ref: { type: string; id: number; docNo: string }; build: () => Segment[] },
  userId: number | null,
): string | null {
  if (!getConfig<boolean>(db, 'idoc_enabled')) return null;
  const profile = findProfile(db, o.partnerType, o.partnerNo, 'OUT', o.messageType);
  if (!profile) return null;
  return db.transaction(() => {
    const docnum = pad(nextNumber(db, 'IDOC'), 16);
    const control = {
      TABNAM: 'EDI_DC40',
      MANDT: '100',
      DOCNUM: docnum,
      DIRECT: '1',
      IDOCTYP: MESSAGE_TYPES[o.messageType].idocType,
      MESTYP: o.messageType,
      SNDPOR: `SAP${getConfig<string>(db, 'logical_system').slice(0, 7)}`,
      SNDPRT: 'LS',
      SNDPRN: getConfig<string>(db, 'logical_system'),
      RCVPOR: profile.port?.name ?? '',
      RCVPRT: o.partnerType,
      RCVPRN: o.partnerNo,
      ...nowStamp(),
    };
    const id = insertIdoc(db, { direction: 'OUT', data: { control, segments: o.build() }, partnerType: o.partnerType, partnerNo: o.partnerNo, partnerId: profile.partnerId, port: profile.port?.name ?? null, ref: o.ref }, userId);
    addStatus(db, id, '01', `IDoc generated for ${o.ref.type} ${o.ref.docNo}`);
    addStatus(db, id, '30', profile.outputMode === 'COLLECT' ? 'Ready for dispatch; partner profile collects IDocs for a later send' : undefined);
    if (profile.outputMode === 'IMMEDIATE') dispatch(db, id);
    return docnum;
  })();
}

/** Pass an outbound IDoc to its port (simulated). */
export function dispatch(db: DB, idocId: number) {
  const i = db.prepare('SELECT * FROM idocs WHERE id = ?').get(idocId) as any;
  if (!i) throw notFound('IDoc');
  if (i.direction !== 'OUT' || !['30', '02'].includes(i.status)) throw badRequest('Only outbound IDocs with status 30 or 02 can be sent');
  const port = db.prepare('SELECT pt.* FROM idoc_partners p JOIN idoc_ports pt ON pt.id = p.port_id WHERE p.id = ?').get(i.partner_id) as any;
  if (!port) addStatus(db, idocId, '02', 'No port is assigned to the partner profile');
  else {
    db.prepare('UPDATE idocs SET port = ? WHERE id = ?').run(port.name, idocId);
    addStatus(db, idocId, '03', `Data passed to port ${port.name} (${port.port_type === 'FILE' ? 'file ' : ''}${port.target})`);
  }
}

/** Never let IDoc output break the business transaction that triggered it. */
function safe(fn: () => string | null): string | null {
  try {
    return fn();
  } catch (e) {
    console.error('IDoc output failed:', (e as Error).message);
    return null;
  }
}

const currency = (db: DB) => getConfig<string>(db, 'currency');

export const onPOReleased = (db: DB, poId: number, userId: number | null) =>
  safe(() => {
    const po = getPO(db, poId);
    return createOutbound(
      db,
      {
        messageType: 'ORDERS',
        partnerType: 'LI',
        partnerNo: po.vendor_code,
        ref: { type: 'PO', id: po.id, docNo: po.doc_no },
        build: () => [
          seg('E1EDK01', { ACTION: '000', CURCY: currency(db), BSART: 'NB', BELNR: po.doc_no }),
          seg('E1EDK03', { IDDAT: '012', DATUM: d8(po.order_date) }),
          ...(po.delivery_date ? [seg('E1EDK03', { IDDAT: '002', DATUM: d8(po.delivery_date) })] : []),
          seg('E1EDKA1', { PARVW: 'LF', PARTN: po.vendor_code, NAME1: po.vendor_name }),
          seg('E1EDKA1', { PARVW: 'WE', PARTN: po.warehouse_code, NAME1: po.warehouse_name }),
          seg('E1EDK02', { QUALF: '001', BELNR: po.doc_no }),
          ...po.lines.map((l: any) =>
            seg('E1EDP01', { POSEX: pad(l.line_no, 6), MENGE: qtyStr(l.qty), MENEE: l.uom, VPREI: amt(l.unit_price), NETWR: amt(l.net_value) }, [
              seg('E1EDP19', { QUALF: '001', IDTNR: l.material_code, KTEXT: l.material_name }),
            ]),
          ),
          seg('E1EDS01', { SUMID: '002', SUMME: amt(po.total), SUNIT: currency(db) }),
        ],
      },
      userId,
    );
  });

export const onDelivery = (db: DB, soId: number, matDocNo: string, userId: number | null) =>
  safe(() => {
    const so = getSO(db, soId);
    const items = db
      .prepare(
        `SELECT sm.qty, sl.line_no, m.code, m.name, m.uom, sm.posting_date FROM stock_movements sm
         JOIN so_lines sl ON sl.id = sm.so_line_id JOIN materials m ON m.id = sm.material_id
         WHERE sm.doc_no = ? AND sl.so_id = ? ORDER BY sl.line_no`,
      )
      .all(matDocNo, soId) as any[];
    if (!items.length) return null;
    return createOutbound(
      db,
      {
        messageType: 'DESADV',
        partnerType: 'KU',
        partnerNo: so.customer_code,
        ref: { type: 'SO', id: so.id, docNo: so.doc_no },
        build: () => [
          seg('E1EDL20', { VBELN: matDocNo, VSTEL: so.warehouse_code }, [
            seg('E1ADRM1', { PARTNER_Q: 'WE', PARTNER_ID: so.customer_code, NAME1: so.customer_name }),
            seg('E1EDT13', { QUALF: '006', NTANF: d8(items[0].posting_date) }),
            ...(so.customer_ref ? [seg('E1EDL41', { QUALI: '001', BSTNR: so.customer_ref })] : []),
            ...items.map((it, i) =>
              seg('E1EDL24', { POSNR: pad((i + 1) * 10, 6), MATNR: it.code, ARKTX: it.name, LFIMG: qtyStr(it.qty), VRKME: it.uom, VGBEL: so.doc_no, VGPOS: pad(it.line_no, 6) }),
            ),
          ]),
        ],
      },
      userId,
    );
  });

export const onBilling = (db: DB, invoiceId: number, userId: number | null) =>
  safe(() => {
    const inv = getCustomerInvoice(db, invoiceId);
    const lines = db
      .prepare(
        `SELECT il.qty, il.unit_price, il.amount, m.code, m.name, m.uom, sl.line_no FROM customer_invoice_lines il
         LEFT JOIN so_lines sl ON sl.id = il.so_line_id LEFT JOIN materials m ON m.id = sl.material_id WHERE il.invoice_id = ? ORDER BY il.id`,
      )
      .all(invoiceId) as any[];
    return createOutbound(
      db,
      {
        messageType: 'INVOIC',
        partnerType: 'KU',
        partnerNo: inv.customer_code,
        ref: { type: 'BILLING', id: inv.id, docNo: inv.doc_no },
        build: () => [
          seg('E1EDK01', { CURCY: currency(db), BSART: 'INVO', BELNR: inv.doc_no }),
          seg('E1EDKA1', { PARVW: 'RE', PARTN: inv.customer_code, NAME1: inv.customer_name }),
          seg('E1EDKA1', { PARVW: 'RS', PARTN: getConfig<string>(db, 'logical_system'), NAME1: getConfig<string>(db, 'company_name') }),
          ...(inv.customer_ref ? [seg('E1EDK02', { QUALF: '001', BELNR: inv.customer_ref })] : []),
          seg('E1EDK02', { QUALF: '009', BELNR: inv.doc_no }),
          seg('E1EDK03', { IDDAT: '012', DATUM: d8(inv.invoice_date) }),
          seg('E1EDK03', { IDDAT: '028', DATUM: d8(inv.due_date) }),
          ...(inv.tax_amount > 0 ? [seg('E1EDK04', { MWSKZ: String(inv.tax_code ?? '').split(' ')[0], MWSBT: amt(inv.tax_amount) })] : []),
          ...lines.map((l, i) =>
            seg('E1EDP01', { POSEX: pad(l.line_no ?? (i + 1) * 10, 6), MENGE: qtyStr(l.qty), MENEE: l.uom, VPREI: amt(fromCents(l.unit_price)), NETWR: amt(fromCents(l.amount)) }, [
              seg('E1EDP19', { QUALF: '001', IDTNR: l.code, KTEXT: l.name }),
            ]),
          ),
          seg('E1EDS01', { SUMID: '010', SUMME: amt(inv.total), SUNIT: currency(db) }),
        ],
      },
      userId,
    );
  });

const MTART_OUT: Record<string, string> = { RAW: 'ROH', TRADING: 'HAWA', FINISHED: 'FERT', CONSUMABLE: 'HIBE' };
const MTART_IN: Record<string, string> = { ROH: 'RAW', HAWA: 'TRADING', FERT: 'FINISHED', HIBE: 'CONSUMABLE', RAW: 'RAW', TRADING: 'TRADING', FINISHED: 'FINISHED', CONSUMABLE: 'CONSUMABLE' };

/** Manual send of a material master (BD10-style). */
export function sendMaterial(db: DB, materialId: number, partnerId: number, userId: number | null) {
  const m = db.prepare('SELECT * FROM materials WHERE id = ?').get(materialId) as any;
  if (!m) throw notFound('Material');
  const p = db.prepare('SELECT * FROM idoc_partners WHERE id = ?').get(partnerId) as any;
  if (!p) throw notFound('Partner');
  if (!getConfig<boolean>(db, 'idoc_enabled')) throw badRequest('IDoc processing is switched off in configuration');
  const docnum = createOutbound(
    db,
    {
      messageType: 'MATMAS',
      partnerType: p.partner_type,
      partnerNo: p.partner_no,
      ref: { type: 'MATERIAL', id: m.id, docNo: m.code },
      build: () => [
        seg('E1MARAM', { MSGFN: '005', MATNR: m.code, MTART: MTART_OUT[m.material_type], MEINS: m.uom }, [
          seg('E1MAKTM', { MSGFN: '005', SPRAS: 'E', MAKTX: m.name }),
          seg('Z1MANPR', { SALES_PRICE: amt(fromCents(m.sales_price)), WAERS: currency(db) }),
        ]),
      ],
    },
    userId,
  );
  if (!docnum) throw badRequest(`Partner ${p.partner_no} has no active outbound profile for MATMAS`);
  return { docnum };
}

// ---------- inbound ----------

/** Receive an inbound IDoc (XML text or parsed data), store it and post it if a partner profile allows. */
export function receiveInbound(db: DB, input: { xml?: string; data?: IdocData }, userId: number | null) {
  if (!getConfig<boolean>(db, 'idoc_enabled')) throw badRequest('IDoc processing is switched off in configuration');
  const data = input.data ?? fromXml(input.xml ?? '');
  const c = data.control;
  const mestyp = c.MESTYP?.toUpperCase();
  if (!mestyp || !MESSAGE_TYPES[mestyp]?.in) throw badRequest(`Message type "${c.MESTYP ?? ''}" is not supported for inbound processing`);
  if (!c.SNDPRT || !c.SNDPRN) throw badRequest('Control record needs the sender partner (SNDPRT and SNDPRN)');
  const partnerType = c.SNDPRT.toUpperCase();
  const partnerNo = c.SNDPRN.trim();
  const docnum = pad(nextNumber(db, 'IDOC'), 16);
  const control: Record<string, string> = {
    ...c,
    TABNAM: 'EDI_DC40',
    MANDT: c.MANDT || '100',
    DOCNUM: docnum,
    DIRECT: '2',
    MESTYP: mestyp,
    IDOCTYP: c.IDOCTYP || MESSAGE_TYPES[mestyp].idocType,
    SNDPRT: partnerType,
    SNDPRN: partnerNo,
    RCVPRT: 'LS',
    RCVPRN: getConfig<string>(db, 'logical_system'),
    ...nowStamp(),
  };
  if (c.DOCNUM && c.DOCNUM !== docnum) control.REFINT = c.DOCNUM; // sender's own IDoc number
  const profile = findProfile(db, partnerType, partnerNo, 'IN', mestyp);
  const id = insertIdoc(db, { direction: 'IN', data: { control, segments: data.segments }, partnerType, partnerNo, partnerId: profile?.partnerId ?? null, port: c.SNDPOR || null }, userId);
  addStatus(db, id, '50', `IDoc added from ${partnerType} ${partnerNo}`);
  if (!profile) {
    addStatus(db, id, '56', `No inbound partner profile for ${partnerType} ${partnerNo} and message type ${mestyp}`);
    return getIdoc(db, id);
  }
  addStatus(db, id, '64');
  return processInbound(db, id, userId);
}

/** Post (or re-post, like BD87) an inbound IDoc to the application. */
export function processInbound(db: DB, idocId: number, userId: number | null) {
  const i = db.prepare('SELECT * FROM idocs WHERE id = ?').get(idocId) as any;
  if (!i) throw notFound('IDoc');
  if (i.direction !== 'IN' || !['64', '51', '56'].includes(i.status)) throw badRequest('Only inbound IDocs with status 64, 51 or 56 can be processed');
  const profile = findProfile(db, i.partner_type, i.partner_no, 'IN', i.message_type);
  if (!profile) {
    addStatus(db, idocId, '56', `No inbound partner profile for ${i.partner_type} ${i.partner_no} and message type ${i.message_type}`);
    return getIdoc(db, idocId);
  }
  if (i.status === '56') {
    db.prepare('UPDATE idocs SET partner_id = ? WHERE id = ?').run(profile.partnerId, idocId);
    addStatus(db, idocId, '64');
  }
  const data = JSON.parse(i.data) as IdocData;
  try {
    const result = db.transaction(() => HANDLERS[i.message_type](db, data, i, userId))();
    db.prepare('UPDATE idocs SET ref_type = ?, ref_id = ?, ref_doc_no = ? WHERE id = ?').run(result.refType, result.refId, result.refDocNo, idocId);
    addStatus(db, idocId, '53', result.message);
  } catch (e) {
    if (!(e instanceof HttpError) && !(e instanceof Error)) throw e;
    addStatus(db, idocId, '51', (e as Error).message);
  }
  return getIdoc(db, idocId);
}

/** Mark an erroneous inbound IDoc as not to be processed (status 68). */
export function closeIdoc(db: DB, idocId: number) {
  const i = db.prepare('SELECT direction, status FROM idocs WHERE id = ?').get(idocId) as any;
  if (!i) throw notFound('IDoc');
  if (!['51', '56', '02', '30', '64'].includes(i.status)) throw badRequest('Only IDocs waiting for processing or in error can be closed');
  addStatus(db, idocId, '68', 'Set to "no further processing" by user');
}

type HandlerResult = { refType: string; refId: number; refDocNo: string; message: string };
type Handler = (db: DB, data: IdocData, idoc: any, userId: number | null) => HandlerResult;

const HANDLERS: Record<string, Handler> = {
  ORDERS(db, data, idoc, userId) {
    const customer = db.prepare('SELECT * FROM customers WHERE code = ?').get(idoc.partner_no) as any;
    if (!customer) throw badRequest(`Customer ${idoc.partner_no} does not exist`);
    const k01 = find(data.segments, 'E1EDK01');
    const customerRef = field(k01, 'BELNR') ?? field(findAll(data.segments, 'E1EDK02').find((s) => field(s, 'QUALF') === '001'), 'BELNR');
    const requested = fromD8(field(findAll(data.segments, 'E1EDK03').find((s) => field(s, 'IDDAT') === '002'), 'DATUM'), 'Requested date');
    const items = deepAll(data.segments, 'E1EDP01');
    if (!items.length) throw badRequest('Order has no items (E1EDP01)');
    const lines = items.map((p, idx) => {
      const ids = deepAll(p.children, 'E1EDP19').map((s) => field(s, 'IDTNR')).filter(Boolean) as string[];
      const mat = ids.map((code) => db.prepare('SELECT id FROM materials WHERE code = ?').get(code) as { id: number } | undefined).find(Boolean);
      if (!mat) throw badRequest(`Item ${field(p, 'POSEX') ?? idx + 1}: material ${ids.join('/') || '(none)'} is unknown`);
      const price = field(p, 'VPREI');
      return { materialId: mat.id, qty: num(field(p, 'MENGE'), `Item ${idx + 1} quantity (MENGE)`), unitPrice: price ? toCents(num(price, 'Price')) : undefined };
    });
    const whCode = getConfig<string>(db, 'inbound_order_warehouse');
    const wh = (whCode ? db.prepare('SELECT id FROM warehouses WHERE code = ?').get(whCode) : db.prepare('SELECT id FROM warehouses ORDER BY id').get()) as { id: number } | undefined;
    if (!wh) throw badRequest('No warehouse is available for inbound sales orders');
    const so = createSO(db, { customerId: customer.id, warehouseId: wh.id, customerRef: customerRef ?? null, requestedDate: requested ?? null, notes: `Created from IDoc ${idoc.docnum}`, lines }, userId);
    let note = 'saved as draft';
    if (getConfig<boolean>(db, 'inbound_order_auto_confirm')) {
      try {
        db.transaction(() => setSOStatus(db, so.id, 'confirm'))();
        note = 'confirmed';
      } catch (e) {
        note = `saved as draft; confirmation failed: ${(e as Error).message}`;
      }
    }
    return { refType: 'SO', refId: so.id, refDocNo: so.docNo, message: `Sales order ${so.docNo} created and ${note}` };
  },

  DESADV(db, data, idoc, userId) {
    const items = deepAll(data.segments, 'E1EDL24');
    if (!items.length) throw badRequest('Shipping notification has no items (E1EDL24)');
    const asn = field(deepAll(data.segments, 'E1EDL20')[0], 'VBELN');
    const byPO = new Map<string, { poLine: number; qty: number }[]>();
    for (const it of items) {
      const po = field(it, 'VGBEL');
      if (!po) throw badRequest(`Item ${field(it, 'POSNR') ?? ''}: purchase order number (VGBEL) is missing`);
      byPO.set(po, [...(byPO.get(po) ?? []), { poLine: num(field(it, 'VGPOS'), 'PO item (VGPOS)'), qty: num(field(it, 'LFIMG'), 'Delivered quantity (LFIMG)') }]);
    }
    const docs: string[] = [];
    let first: { id: number; docNo: string } | null = null;
    for (const [poNo, its] of byPO) {
      const po = db.prepare('SELECT po.id, v.code AS vendor_code FROM purchase_orders po JOIN vendors v ON v.id = po.vendor_id WHERE po.doc_no = ?').get(poNo) as any;
      if (!po) throw badRequest(`Purchase order ${poNo} does not exist`);
      if (po.vendor_code !== idoc.partner_no) throw badRequest(`Purchase order ${poNo} belongs to vendor ${po.vendor_code}, not ${idoc.partner_no}`);
      const lines = its.map((it) => {
        const pl = db.prepare('SELECT id FROM po_lines WHERE po_id = ? AND line_no = ?').get(po.id, it.poLine) as { id: number } | undefined;
        if (!pl) throw badRequest(`Purchase order ${poNo} has no item ${it.poLine}`);
        return { poLineId: pl.id, qty: it.qty };
      });
      const gr = postGoodsReceipt(db, po.id, { note: `ASN ${asn ?? ''} via IDoc ${idoc.docnum}`.trim(), lines }, userId);
      docs.push(`${gr.docNo} for PO ${poNo}`);
      first ??= { id: po.id, docNo: poNo };
    }
    return { refType: 'PO', refId: first!.id, refDocNo: first!.docNo, message: `Goods receipt posted: material document ${docs.join(', ')}` };
  },

  INVOIC(db, data, idoc, userId) {
    const k01 = find(data.segments, 'E1EDK01');
    const vendorRef = field(k01, 'BELNR');
    if (!vendorRef) throw badRequest("Vendor's invoice number (E1EDK01-BELNR) is missing");
    const items = deepAll(data.segments, 'E1EDP01');
    const poNo =
      field(findAll(data.segments, 'E1EDK02').find((s) => field(s, 'QUALF') === '001'), 'BELNR') ??
      field(deepAll(items[0]?.children, 'E1EDP02').find((s) => field(s, 'QUALF') === '001'), 'BELNR');
    if (!poNo) throw badRequest('Purchase order reference (E1EDK02 with QUALF 001) is missing');
    const po = db.prepare('SELECT po.id, v.code AS vendor_code FROM purchase_orders po JOIN vendors v ON v.id = po.vendor_id WHERE po.doc_no = ?').get(poNo) as any;
    if (!po) throw badRequest(`Purchase order ${poNo} does not exist`);
    if (po.vendor_code !== idoc.partner_no) throw badRequest(`Purchase order ${poNo} belongs to vendor ${po.vendor_code}, not ${idoc.partner_no}`);
    if (!items.length) throw badRequest('Invoice has no items (E1EDP01)');
    const lines = items.map((p) => {
      const lineNo = num(field(p, 'POSEX'), 'PO item (POSEX)');
      const pl = db.prepare('SELECT id FROM po_lines WHERE po_id = ? AND line_no = ?').get(po.id, lineNo) as { id: number } | undefined;
      if (!pl) throw badRequest(`Purchase order ${poNo} has no item ${lineNo}`);
      return { poLineId: pl.id, qty: num(field(p, 'MENGE'), `Item ${lineNo} quantity (MENGE)`), unitPrice: toCents(num(field(p, 'VPREI'), `Item ${lineNo} price (VPREI)`)) };
    });
    const invoiceDate = fromD8(field(findAll(data.segments, 'E1EDK03').find((s) => field(s, 'IDDAT') === '012'), 'DATUM'), 'Invoice date');
    const mwskz = field(find(data.segments, 'E1EDK04'), 'MWSKZ');
    let taxCodeId: number | null = null;
    if (mwskz) {
      const tc = db.prepare("SELECT id FROM tax_codes WHERE code = ? AND direction = 'INPUT'").get(mwskz) as { id: number } | undefined;
      if (!tc) throw badRequest(`Tax code ${mwskz} (E1EDK04-MWSKZ) is not an input tax code in this system`);
      taxCodeId = tc.id;
    }
    const inv = postInvoice(db, po.id, { vendorRef, invoiceDate, taxCodeId, lines }, userId);
    return { refType: 'VENDOR_INVOICE', refId: inv.id, refDocNo: inv.docNo, message: `Vendor invoice ${inv.docNo} posted (FI document ${inv.journalDocNo})` };
  },

  MATMAS(db, data) {
    const mara = deepAll(data.segments, 'E1MARAM')[0];
    const code = field(mara, 'MATNR');
    if (!code) throw badRequest('Material number (E1MARAM-MATNR) is missing');
    const name = field(deepAll(mara?.children, 'E1MAKTM')[0], 'MAKTX');
    const mtart = field(mara, 'MTART');
    const type = mtart ? MTART_IN[mtart.toUpperCase()] : undefined;
    if (mtart && !type) throw badRequest(`Material type ${mtart} is not supported (use ROH, HAWA, FERT or HIBE)`);
    const priceRaw = field(deepAll(mara?.children, 'Z1MANPR')[0], 'SALES_PRICE');
    const price = priceRaw !== undefined ? toCents(num(priceRaw, 'Sales price')) : undefined;
    const meins = field(mara, 'MEINS')?.toUpperCase();
    if (meins && !db.prepare('SELECT 1 FROM units WHERE code = ?').get(meins)) throw badRequest(`Unit ${meins} (E1MARAM-MEINS) is not defined in this system`);
    const existing = db.prepare('SELECT * FROM materials WHERE code = ?').get(code) as any;
    if (existing) {
      db.prepare('UPDATE materials SET name = ?, uom = ?, material_type = ?, sales_price = ? WHERE id = ?').run(
        name ?? existing.name,
        field(mara, 'MEINS') ?? existing.uom,
        type ?? existing.material_type,
        price ?? existing.sales_price,
        existing.id,
      );
      return { refType: 'MATERIAL', refId: existing.id, refDocNo: code, message: `Material ${code} updated` };
    }
    if (!name) throw badRequest('Description (E1MAKTM-MAKTX) is required for a new material');
    const r = db.prepare('INSERT INTO materials(code, name, uom, material_type, sales_price) VALUES (?, ?, ?, ?, ?)').run(code, name, field(mara, 'MEINS') ?? 'EA', type ?? 'RAW', price ?? 0);
    return { refType: 'MATERIAL', refId: Number(r.lastInsertRowid), refDocNo: code, message: `Material ${code} created` };
  },

  DEBMAS(db, data) {
    const k = deepAll(data.segments, 'E1KNA1M')[0];
    const code = field(k, 'KUNNR');
    if (!code) throw badRequest('Customer number (E1KNA1M-KUNNR) is missing');
    const pt = terms(db, field(deepAll(k?.children, 'E1KNB1M')[0], 'ZTERM'));
    const limitRaw = field(deepAll(k?.children, 'E1KNKKM')[0], 'KLIMK');
    const limit = limitRaw !== undefined ? toCents(num(limitRaw, 'Credit limit (KLIMK)')) : undefined;
    const rec = partnerRecord(k);
    const existing = db.prepare('SELECT * FROM customers WHERE code = ?').get(code) as any;
    if (existing) {
      db.prepare('UPDATE customers SET name = ?, address = ?, tax_id = ?, phone = ?, payment_terms_days = ?, credit_limit = ?, payment_terms_id = COALESCE(?, payment_terms_id) WHERE id = ?').run(
        rec.name ?? existing.name,
        rec.address ?? existing.address,
        rec.taxId ?? existing.tax_id,
        rec.phone ?? existing.phone,
        pt?.days ?? existing.payment_terms_days,
        limit ?? existing.credit_limit,
        pt?.id ?? null,
        existing.id,
      );
      return { refType: 'CUSTOMER', refId: existing.id, refDocNo: code, message: `Customer ${code} updated` };
    }
    if (!rec.name) throw badRequest('Name (E1KNA1M-NAME1) is required for a new customer');
    const r = db
      .prepare('INSERT INTO customers(code, name, address, tax_id, phone, payment_terms_days, payment_terms_id, credit_limit) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(code, rec.name, rec.address ?? null, rec.taxId ?? null, rec.phone ?? null, pt?.days ?? 30, pt?.id ?? null, limit ?? 0);
    return { refType: 'CUSTOMER', refId: Number(r.lastInsertRowid), refDocNo: code, message: `Customer ${code} created` };
  },

  CREMAS(db, data) {
    const k = deepAll(data.segments, 'E1LFA1M')[0];
    const code = field(k, 'LIFNR');
    if (!code) throw badRequest('Vendor number (E1LFA1M-LIFNR) is missing');
    const pt = terms(db, field(deepAll(k?.children, 'E1LFB1M')[0], 'ZTERM'));
    const rec = partnerRecord(k);
    const existing = db.prepare('SELECT * FROM vendors WHERE code = ?').get(code) as any;
    if (existing) {
      db.prepare('UPDATE vendors SET name = ?, address = ?, tax_id = ?, phone = ?, payment_terms_days = ?, payment_terms_id = COALESCE(?, payment_terms_id) WHERE id = ?').run(
        rec.name ?? existing.name,
        rec.address ?? existing.address,
        rec.taxId ?? existing.tax_id,
        rec.phone ?? existing.phone,
        pt?.days ?? existing.payment_terms_days,
        pt?.id ?? null,
        existing.id,
      );
      return { refType: 'VENDOR', refId: existing.id, refDocNo: code, message: `Vendor ${code} updated` };
    }
    if (!rec.name) throw badRequest('Name (E1LFA1M-NAME1) is required for a new vendor');
    const r = db
      .prepare('INSERT INTO vendors(code, name, address, tax_id, phone, payment_terms_days, payment_terms_id) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(code, rec.name, rec.address ?? null, rec.taxId ?? null, rec.phone ?? null, pt?.days ?? 30, pt?.id ?? null);
    return { refType: 'VENDOR', refId: Number(r.lastInsertRowid), refDocNo: code, message: `Vendor ${code} created` };
  },
};

/** Resolves ZTERM to payment terms: an existing code, else NTnn style terms (created if missing). */
function terms(db: DB, zterm: string | undefined): { id: number; days: number } | undefined {
  if (!zterm) return undefined;
  const t = db.prepare('SELECT id, net_days FROM payment_terms WHERE code = ?').get(zterm.toUpperCase()) as { id: number; net_days: number } | undefined;
  if (t) return { id: t.id, days: t.net_days };
  const days = termsDays(zterm)!;
  const code = `NT${String(days).padStart(2, '0')}`;
  db.prepare('INSERT OR IGNORE INTO payment_terms(code, description, net_days) VALUES (?, ?, ?)').run(code, `Net ${days} days`, days);
  const c = db.prepare('SELECT id, net_days FROM payment_terms WHERE code = ?').get(code) as { id: number; net_days: number };
  return { id: c.id, days: c.net_days };
}

function termsDays(zterm: string | undefined) {
  if (!zterm) return undefined;
  const m = zterm.match(/(\d+)/);
  if (!m) throw badRequest(`Payment terms ${zterm} not understood (use e.g. NT30)`);
  return Number(m[1]);
}
function partnerRecord(k: Segment | undefined) {
  const street = field(k, 'STRAS');
  const city = [field(k, 'PSTLZ'), field(k, 'ORT01')].filter(Boolean).join(' ');
  return {
    name: field(k, 'NAME1'),
    address: [street, city, field(k, 'LAND1')].filter(Boolean).join('\n') || undefined,
    taxId: field(k, 'STCD1'),
    phone: field(k, 'TELF1'),
  };
}

// ---------- queries ----------

const REF_LINKS: Record<string, string> = {
  PO: '/purchasing/orders/',
  SO: '/sales/orders/',
  BILLING: '/sales/invoices/',
  VENDOR_INVOICE: '/finance/invoices/',
};

export function listIdocs(db: DB, q: { direction?: string; status?: string; messageType?: string; search?: string }) {
  return (
    db
      .prepare(
        `SELECT i.id, i.docnum, i.direction, i.message_type, i.idoc_type, i.partner_type, i.partner_no, p.name AS partner_name,
                i.port, i.status, i.ref_type, i.ref_id, i.ref_doc_no, i.created_at, i.updated_at,
                (SELECT message FROM idoc_status s WHERE s.idoc_id = i.id ORDER BY s.id DESC LIMIT 1) AS status_message
         FROM idocs i LEFT JOIN idoc_partners p ON p.id = i.partner_id
         WHERE (@dir IS NULL OR i.direction = @dir) AND (@status IS NULL OR i.status = @status)
           AND (@mt IS NULL OR i.message_type = @mt)
           AND (@search IS NULL OR i.docnum LIKE @search OR i.partner_no LIKE @search OR i.ref_doc_no LIKE @search OR p.name LIKE @search)
         ORDER BY i.id DESC LIMIT 500`,
      )
      .all({ dir: q.direction ?? null, status: q.status ?? null, mt: q.messageType ?? null, search: q.search ? `%${q.search}%` : null }) as any[]
  ).map((r) => ({ ...r, status_text: STATUS_TEXT[r.status] ?? r.status, ref_link: r.ref_type && REF_LINKS[r.ref_type] ? REF_LINKS[r.ref_type] + r.ref_id : null }));
}

export function getIdoc(db: DB, id: number) {
  const i = db
    .prepare('SELECT i.*, p.name AS partner_name, u.full_name AS created_by_name FROM idocs i LEFT JOIN idoc_partners p ON p.id = i.partner_id LEFT JOIN users u ON u.id = i.created_by WHERE i.id = ?')
    .get(id) as any;
  if (!i) throw notFound('IDoc');
  const data = JSON.parse(i.data) as IdocData;
  const statuses = (db.prepare('SELECT status, message, created_at FROM idoc_status WHERE idoc_id = ? ORDER BY id DESC').all(id) as any[]).map((s) => ({
    ...s,
    text: STATUS_TEXT[s.status] ?? s.status,
  }));
  const { data: _omit, ...rest } = i;
  return {
    ...rest,
    status_text: STATUS_TEXT[i.status] ?? i.status,
    ref_link: i.ref_type && REF_LINKS[i.ref_type] ? REF_LINKS[i.ref_type] + i.ref_id : null,
    control: data.control,
    segments: data.segments,
    xml: toXml(data),
    statuses,
  };
}

export function idocStats(db: DB) {
  return db.prepare('SELECT direction, status, COUNT(*) n FROM idocs GROUP BY direction, status').all();
}

// ---------- partner simulator templates ----------

const uniq = () => Date.now().toString().slice(-6);

function partnerControl(db: DB, mestyp: string, sndprt: string, sndprn: string) {
  return {
    TABNAM: 'EDI_DC40',
    MANDT: '800',
    DOCNUM: pad(uniq(), 16),
    DIRECT: '2',
    IDOCTYP: MESSAGE_TYPES[mestyp].idocType,
    MESTYP: mestyp,
    SNDPOR: 'PARTNERPORT',
    SNDPRT: sndprt,
    SNDPRN: sndprn,
    RCVPOR: `SAP${getConfig<string>(db, 'logical_system').slice(0, 7)}`,
    RCVPRT: 'LS',
    RCVPRN: getConfig<string>(db, 'logical_system'),
    ...nowStamp(),
  };
}

function inboundPartners(db: DB, partnerType: string, mestyp: string) {
  return db
    .prepare(
      `SELECT p.partner_no FROM idoc_partners p JOIN idoc_partner_messages m ON m.partner_id = p.id
       WHERE p.partner_type = ? AND m.direction = 'IN' AND m.message_type = ? AND p.is_active = 1 ORDER BY p.partner_no`,
    )
    .all(partnerType, mestyp) as { partner_no: string }[];
}

/** XML a partner system would send us, prefilled from real data so it posts successfully. */
export function inboundTemplate(db: DB, kind: string, params: { poId?: number; customerCode?: string }) {
  const cur = currency(db);
  const addDays = (n: number) => {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return d.toISOString().slice(0, 10);
  };
  switch (kind) {
    case 'ORDERS': {
      const code = params.customerCode ?? inboundPartners(db, 'KU', 'ORDERS')[0]?.partner_no ?? (db.prepare('SELECT code FROM customers ORDER BY id').get() as any)?.code;
      if (!code) throw badRequest('Create a customer first');
      const cust = db.prepare('SELECT * FROM customers WHERE code = ?').get(code) as any;
      const mats = db
        .prepare(
          `SELECT m.code, m.name, m.uom, m.sales_price FROM materials m
           LEFT JOIN material_types t ON t.code = m.material_type
           WHERE m.is_active = 1 AND m.sales_price > 0 AND COALESCE(t.sellable, 1) = 1 AND (SELECT COALESCE(SUM(qty), 0) FROM stock s WHERE s.material_id = m.id) > 0 ORDER BY m.code LIMIT 2`,
        )
        .all() as any[];
      if (!mats.length) throw badRequest('No material with a list price and stock is available to order');
      const ref = `${code}-PO-${uniq()}`;
      return {
        description: `Purchase order from customer ${code} ${cust?.name ?? ''}`.trim(),
        xml: toXml({
          control: partnerControl(db, 'ORDERS', 'KU', code),
          segments: [
            seg('E1EDK01', { CURCY: cur, BSART: 'NB', BELNR: ref }),
            seg('E1EDK03', { IDDAT: '012', DATUM: d8(today()) }),
            seg('E1EDK03', { IDDAT: '002', DATUM: d8(addDays(7)) }),
            seg('E1EDKA1', { PARVW: 'AG', PARTN: code, NAME1: cust?.name }),
            ...mats.map((m, i) =>
              seg('E1EDP01', { POSEX: pad((i + 1) * 10, 6), MENGE: '5', MENEE: m.uom, VPREI: amt(fromCents(m.sales_price)) }, [seg('E1EDP19', { QUALF: '002', IDTNR: m.code, KTEXT: m.name })]),
            ),
          ],
        }),
      };
    }
    case 'DESADV':
    case 'INVOIC': {
      const forDesadv = kind === 'DESADV';
      const vendors = inboundPartners(db, 'LI', kind).map((p) => p.partner_no);
      const po = (
        params.poId
          ? db.prepare('SELECT po.id FROM purchase_orders po WHERE po.id = ?').get(params.poId)
          : db
              .prepare(
                `SELECT po.id FROM purchase_orders po JOIN vendors v ON v.id = po.vendor_id JOIN po_lines pl ON pl.po_id = po.id
                 WHERE po.status IN ('RELEASED','PARTIALLY_RECEIVED','RECEIVED') AND v.code IN (${vendors.map(() => '?').join(',') || "''"})
                 GROUP BY po.id HAVING ${forDesadv ? 'SUM(pl.qty - pl.received_qty)' : 'SUM(pl.received_qty - pl.invoiced_qty)'} > 0 ORDER BY po.id DESC LIMIT 1`,
              )
              .get(...vendors)
      ) as { id: number } | undefined;
      if (!po)
        throw badRequest(
          forDesadv
            ? 'No released purchase order with open quantity for a vendor that has an inbound DESADV profile'
            : 'No purchase order with received, not yet invoiced quantity for a vendor that has an inbound INVOIC profile',
        );
      const p = getPO(db, po.id);
      const open = p.lines
        .map((l: any) => ({ ...l, open: roundQty(forDesadv ? l.qty - l.received_qty : l.received_qty - l.invoiced_qty) }))
        .filter((l: any) => l.open > 0);
      if (!open.length) throw badRequest(`Purchase order ${p.doc_no} has nothing open to ${forDesadv ? 'ship' : 'invoice'}`);
      const control = partnerControl(db, kind, 'LI', p.vendor_code);
      if (forDesadv)
        return {
          description: `Shipping notification from ${p.vendor_name} for PO ${p.doc_no}`,
          xml: toXml({
            control,
            segments: [
              seg('E1EDL20', { VBELN: `ASN-${uniq()}` }, [
                seg('E1EDT13', { QUALF: '006', NTANF: d8(today()) }),
                ...open.map((l: any, i: number) =>
                  seg('E1EDL24', { POSNR: pad((i + 1) * 10, 6), MATNR: l.material_code, ARKTX: l.material_name, LFIMG: qtyStr(l.open), VRKME: l.uom, VGBEL: p.doc_no, VGPOS: pad(l.line_no, 6) }),
                ),
              ]),
            ],
          }),
        };
      const total = open.reduce((s: number, l: any) => s + Math.round(l.open * l.unit_price * 100), 0);
      return {
        description: `Invoice from ${p.vendor_name} for PO ${p.doc_no}`,
        xml: toXml({
          control,
          segments: [
            seg('E1EDK01', { CURCY: cur, BSART: 'INVO', BELNR: `${p.vendor_code}-INV-${uniq()}` }),
            seg('E1EDK02', { QUALF: '001', BELNR: p.doc_no }),
            seg('E1EDK04', { MWSKZ: 'V0' }),
            seg('E1EDK03', { IDDAT: '012', DATUM: d8(today()) }),
            ...open.map((l: any) =>
              seg('E1EDP01', { POSEX: pad(l.line_no, 6), MENGE: qtyStr(l.open), MENEE: l.uom, VPREI: amt(l.unit_price), NETWR: amt(fromCents(Math.round(l.open * l.unit_price * 100))) }, [
                seg('E1EDP19', { QUALF: '001', IDTNR: l.material_code }),
              ]),
            ),
            seg('E1EDS01', { SUMID: '010', SUMME: amt(fromCents(total)), SUNIT: cur }),
          ],
        }),
      };
    }
    case 'MATMAS':
    case 'DEBMAS':
    case 'CREMAS': {
      const ls = inboundPartners(db, 'LS', kind)[0]?.partner_no ?? 'MDMCLNT800';
      const n = uniq().slice(-4);
      const control = partnerControl(db, kind, 'LS', ls);
      if (kind === 'MATMAS')
        return {
          description: `New material from master data system ${ls}`,
          xml: toXml({
            control,
            segments: [
              seg('E1MARAM', { MSGFN: '009', MATNR: `TG-${n}`, MTART: 'HAWA', MEINS: 'EA' }, [
                seg('E1MAKTM', { MSGFN: '009', SPRAS: 'E', MAKTX: 'Galvanized Wall Bracket' }),
                seg('Z1MANPR', { SALES_PRICE: '12.50', WAERS: cur }),
              ]),
            ],
          }),
        };
      if (kind === 'DEBMAS')
        return {
          description: `New customer from master data system ${ls}`,
          xml: toXml({
            control,
            segments: [
              seg('E1KNA1M', { MSGFN: '009', KUNNR: `C${n}`, NAME1: 'Lakeside Furnishings', STRAS: '41 Harbor Road', PSTLZ: '98101', ORT01: 'Seattle', LAND1: 'US', TELF1: '+1 555 0300' }, [
                seg('E1KNB1M', { BUKRS: '1000', ZTERM: 'NT30' }),
                seg('E1KNKKM', { KLIMK: '15000.00' }),
              ]),
            ],
          }),
        };
      return {
        description: `New vendor from master data system ${ls}`,
        xml: toXml({
          control,
          segments: [
            seg('E1LFA1M', { MSGFN: '009', LIFNR: `V${n}`, NAME1: 'Coastal Fasteners Inc.', STRAS: '7 Pier Street', PSTLZ: '02110', ORT01: 'Boston', LAND1: 'US', TELF1: '+1 555 0400' }, [
              seg('E1LFB1M', { BUKRS: '1000', ZTERM: 'NT45' }),
            ]),
          ],
        }),
      };
    }
    default:
      throw badRequest(`Unknown template ${kind}`);
  }
}

// ---------- partner profile maintenance ----------

export function listPartners(db: DB) {
  const partners = db
    .prepare(
      `SELECT p.*, pt.name AS port_name, (SELECT COUNT(*) FROM idocs i WHERE i.partner_id = p.id) AS idoc_count
       FROM idoc_partners p LEFT JOIN idoc_ports pt ON pt.id = p.port_id ORDER BY p.partner_type, p.partner_no`,
    )
    .all() as any[];
  const msgs = db.prepare('SELECT * FROM idoc_partner_messages ORDER BY direction DESC, message_type').all() as any[];
  return partners.map((p) => ({ ...p, messages: msgs.filter((m) => m.partner_id === p.id).map(({ direction, message_type, output_mode }) => ({ direction, message_type, output_mode })) }));
}

export interface PartnerInput {
  partner_type: PartnerType;
  partner_no: string;
  name: string;
  port_id: number | null;
  is_active: boolean;
  messages: { direction: Direction; message_type: string; output_mode: 'IMMEDIATE' | 'COLLECT' }[];
}

function validatePartner(db: DB, p: PartnerInput) {
  if (p.partner_type === 'KU' && !db.prepare('SELECT 1 FROM customers WHERE code = ?').get(p.partner_no)) throw badRequest(`Customer ${p.partner_no} does not exist`);
  if (p.partner_type === 'LI' && !db.prepare('SELECT 1 FROM vendors WHERE code = ?').get(p.partner_no)) throw badRequest(`Vendor ${p.partner_no} does not exist`);
  if (p.port_id && !db.prepare('SELECT 1 FROM idoc_ports WHERE id = ?').get(p.port_id)) throw badRequest('Port does not exist');
  const seen = new Set<string>();
  for (const m of p.messages) {
    const mt = MESSAGE_TYPES[m.message_type];
    const dirDef = mt && (m.direction === 'OUT' ? mt.out : mt.in);
    if (!dirDef) throw badRequest(`${m.message_type} is not available as ${m.direction === 'OUT' ? 'outbound' : 'inbound'} message`);
    if (!dirDef.partners.includes(p.partner_type))
      throw badRequest(`${m.direction === 'OUT' ? 'Outbound' : 'Inbound'} ${m.message_type} is only possible with partner type ${dirDef.partners.join('/')}`);
    const key = `${m.direction}-${m.message_type}`;
    if (seen.has(key)) throw badRequest(`${m.direction} ${m.message_type} is listed twice`);
    seen.add(key);
  }
}

export function savePartner(db: DB, id: number | null, p: PartnerInput) {
  validatePartner(db, p);
  return db.transaction(() => {
    let pid = id;
    if (pid) {
      const r = db.prepare('UPDATE idoc_partners SET partner_type = ?, partner_no = ?, name = ?, port_id = ?, is_active = ? WHERE id = ?').run(p.partner_type, p.partner_no, p.name, p.port_id, Number(p.is_active), pid);
      if (!r.changes) throw notFound('Partner profile');
      db.prepare('DELETE FROM idoc_partner_messages WHERE partner_id = ?').run(pid);
    } else {
      pid = Number(db.prepare('INSERT INTO idoc_partners(partner_type, partner_no, name, port_id, is_active) VALUES (?, ?, ?, ?, ?)').run(p.partner_type, p.partner_no, p.name, p.port_id, Number(p.is_active)).lastInsertRowid);
    }
    const ins = db.prepare('INSERT INTO idoc_partner_messages(partner_id, direction, message_type, output_mode) VALUES (?, ?, ?, ?)');
    p.messages.forEach((m) => ins.run(pid, m.direction, m.message_type, m.output_mode));
    return { id: pid };
  })();
}

export function deletePartner(db: DB, id: number) {
  const used = db.prepare('SELECT COUNT(*) n FROM idocs WHERE partner_id = ?').get(id) as { n: number };
  if (used.n > 0) throw badRequest('This partner has IDocs; deactivate the profile instead of deleting it');
  db.transaction(() => {
    db.prepare('DELETE FROM idoc_partner_messages WHERE partner_id = ?').run(id);
    if (!db.prepare('DELETE FROM idoc_partners WHERE id = ?').run(id).changes) throw notFound('Partner profile');
  })();
}

/** Demo setup: ports, partner profiles and a little traffic, run once on demo databases. */
export function seedIdocDemo(db: DB, ids: { admin: number }) {
  if ((db.prepare('SELECT COUNT(*) n FROM idoc_ports').get() as { n: number }).n > 0) return;
  if (!db.prepare("SELECT 1 FROM customers WHERE code = 'C1000'").get() || !db.prepare("SELECT 1 FROM vendors WHERE code = 'V1000'").get()) return;
  const port = db.prepare('INSERT INTO idoc_ports(name, port_type, target, description) VALUES (?, ?, ?, ?)');
  const http = Number(port.run('XMLHTTP_EDI', 'XML_HTTP', 'https://edi-gateway.example/idoc', 'EDI gateway for vendors and customers').lastInsertRowid);
  const file = Number(port.run('FILE_MDM', 'FILE', '/interfaces/mdm/outbound', 'Master data hub file drop').lastInsertRowid);
  const P = (type: PartnerType, no: string, name: string, portId: number, messages: PartnerInput['messages']) =>
    savePartner(db, null, { partner_type: type, partner_no: no, name, port_id: portId, is_active: true, messages });
  P('LI', 'V1000', 'Acme Steel Supply', http, [
    { direction: 'OUT', message_type: 'ORDERS', output_mode: 'IMMEDIATE' },
    { direction: 'IN', message_type: 'DESADV', output_mode: 'IMMEDIATE' },
    { direction: 'IN', message_type: 'INVOIC', output_mode: 'IMMEDIATE' },
  ]);
  P('LI', 'V1001', 'PackRight Packaging', http, [{ direction: 'OUT', message_type: 'ORDERS', output_mode: 'COLLECT' }]);
  P('KU', 'C1000', 'Northwind Retail', http, [
    { direction: 'IN', message_type: 'ORDERS', output_mode: 'IMMEDIATE' },
    { direction: 'OUT', message_type: 'DESADV', output_mode: 'IMMEDIATE' },
    { direction: 'OUT', message_type: 'INVOIC', output_mode: 'IMMEDIATE' },
  ]);
  P('KU', 'C1001', 'Contoso Builders', http, [{ direction: 'OUT', message_type: 'INVOIC', output_mode: 'IMMEDIATE' }]);
  P('LS', 'MDMCLNT800', 'Master data hub', file, [
    { direction: 'OUT', message_type: 'MATMAS', output_mode: 'IMMEDIATE' },
    { direction: 'IN', message_type: 'MATMAS', output_mode: 'IMMEDIATE' },
    { direction: 'IN', message_type: 'DEBMAS', output_mode: 'IMMEDIATE' },
    { direction: 'IN', message_type: 'CREMAS', output_mode: 'IMMEDIATE' },
  ]);

  // Some traffic so the monitor is not empty: outbound invoices for existing customer invoices,
  // one inbound customer order, a new material from the hub, and one vendor invoice that fails the three-way match.
  for (const inv of db.prepare('SELECT id FROM customer_invoices ORDER BY id').all() as { id: number }[]) onBilling(db, inv.id, ids.admin);
  const tpl = inboundTemplate(db, 'ORDERS', { customerCode: 'C1000' });
  receiveInbound(db, { xml: tpl.xml }, ids.admin);
  receiveInbound(db, { xml: inboundTemplate(db, 'MATMAS', {}).xml }, ids.admin);
  const po = db.prepare("SELECT po.id, po.doc_no FROM purchase_orders po JOIN vendors v ON v.id = po.vendor_id WHERE v.code = 'V1000' ORDER BY po.id LIMIT 1").get() as any;
  if (po) {
    const line = db.prepare('SELECT line_no, unit_price FROM po_lines WHERE po_id = ? ORDER BY line_no LIMIT 1').get(po.id) as any;
    receiveInbound(
      db,
      {
        data: {
          control: partnerControl(db, 'INVOIC', 'LI', 'V1000'),
          segments: [
            seg('E1EDK01', { CURCY: currency(db), BELNR: 'AS-90017' }),
            seg('E1EDK02', { QUALF: '001', BELNR: po.doc_no }),
            seg('E1EDP01', { POSEX: pad(line.line_no, 6), MENGE: '50', VPREI: amt(fromCents(line.unit_price)) }),
          ],
        },
      },
      ids.admin,
    );
  }
}
