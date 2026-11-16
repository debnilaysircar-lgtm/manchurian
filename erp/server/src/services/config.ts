import type { DB } from '../db.ts';
import { badRequest, HttpError } from '../lib/errors.ts';

/**
 * Customizing (like SAP's IMG/SPRO). Every setting is stored in the settings table and read where it is enforced.
 * `area` decides who may change it: admins always; otherwise the role listed in AREA_ROLES.
 */
type Def =
  | { type: 'string'; default: string; pattern?: RegExp; patternHint?: string }
  | { type: 'date'; default: string }
  | { type: 'number'; default: number; min?: number; max?: number }
  | { type: 'boolean'; default: boolean }
  | { type: 'list'; default: string[]; options: string[] };

export interface ConfigDef {
  area: 'general' | 'finance' | 'purchasing' | 'sales' | 'inventory' | 'idoc';
  label: string;
  help: string;
  def: Def;
}

export const CONFIG: Record<string, ConfigDef> = {
  company_name: { area: 'general', label: 'Company name', help: 'Shown on the dashboard and printed on customer invoices.', def: { type: 'string', default: 'Demo Company Ltd.' } },
  currency: { area: 'general', label: 'Company currency', help: 'ISO code. All amounts are kept in this currency.', def: { type: 'string', default: 'USD', pattern: /^[A-Z]{3}$/, patternHint: 'three capital letters, e.g. EUR' } },
  logical_system: {
    area: 'general',
    label: 'Own logical system',
    help: 'Sender name in the control record of outbound IDocs.',
    def: { type: 'string', default: 'MANCLNT100', pattern: /^[A-Z0-9_]{3,10}$/, patternHint: '3-10 capital letters, digits or _' },
  },

  posting_period_from: { area: 'finance', label: 'Open posting period from', help: 'Earliest posting date accepted. Leave empty for no lower limit.', def: { type: 'date', default: '' } },
  posting_period_to: { area: 'finance', label: 'Open posting period to', help: 'Latest posting date accepted. Leave empty for no upper limit.', def: { type: 'date', default: '' } },

  invoice_price_tolerance_pct: {
    area: 'purchasing',
    label: 'Invoice price tolerance (%)',
    help: 'Vendor invoices whose unit price differs from the PO price by more than this are rejected. 0 turns the check off.',
    def: { type: 'number', default: 10, min: 0, max: 100 },
  },
  po_release_limit: {
    area: 'purchasing',
    label: 'PO release limit',
    help: 'Purchase orders above this net value can only be released by an administrator. 0 = no limit.',
    def: { type: 'number', default: 0, min: 0 },
  },

  credit_check_enabled: { area: 'sales', label: 'Credit check on confirmation', help: 'Block sales orders that would take a customer over its credit limit.', def: { type: 'boolean', default: true } },
  sales_price_override: { area: 'sales', label: 'Allow price changes on sales orders', help: 'When off, every order line uses the material list price.', def: { type: 'boolean', default: true } },

  movement_types_enabled: {
    area: 'inventory',
    label: 'Movement types allowed for manual posting',
    help: '101 and 601 are always posted from purchase and sales orders.',
    def: { type: 'list', default: ['201', '301', '561', '701', '702'], options: ['201', '301', '561', '701', '702'] },
  },
  movement_note_required: { area: 'inventory', label: 'Require a note for goods issues and inventory differences', help: 'Applies to movement types 201, 701 and 702.', def: { type: 'boolean', default: false } },

  idoc_enabled: { area: 'idoc', label: 'IDoc processing active', help: 'When off, no outbound IDocs are created and inbound IDocs are rejected.', def: { type: 'boolean', default: true } },
  inbound_order_warehouse: { area: 'idoc', label: 'Warehouse for inbound sales orders', help: 'Warehouse code used for sales orders created from ORDERS IDocs. Empty = first warehouse.', def: { type: 'string', default: '' } },
  inbound_order_auto_confirm: { area: 'idoc', label: 'Confirm inbound sales orders automatically', help: 'Runs the normal confirmation (including the credit check) after an ORDERS IDoc creates a sales order.', def: { type: 'boolean', default: false } },
};

export const AREA_ROLES: Record<ConfigDef['area'], string[]> = {
  general: [],
  finance: ['finance'],
  purchasing: ['purchasing'],
  sales: ['sales'],
  inventory: ['warehouse'],
  idoc: [],
};

const serialize = (d: Def, v: unknown) => (d.type === 'list' ? (v as string[]).join(',') : String(v));
function deserialize(d: Def, raw: string | undefined): unknown {
  if (raw === undefined) return d.default;
  switch (d.type) {
    case 'number':
      return Number(raw);
    case 'boolean':
      return raw === 'true';
    case 'list':
      return raw ? raw.split(',') : [];
    default:
      return raw;
  }
}

export function getConfig<T = unknown>(db: DB, key: string): T {
  const def = CONFIG[key];
  if (!def) throw new Error(`Unknown config key ${key}`);
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
  return deserialize(def.def, row?.value) as T;
}

export function allConfig(db: DB) {
  return Object.entries(CONFIG).map(([key, c]) => ({
    key,
    area: c.area,
    label: c.label,
    help: c.help,
    type: c.def.type,
    options: c.def.type === 'list' ? c.def.options : undefined,
    min: c.def.type === 'number' ? c.def.min : undefined,
    max: c.def.type === 'number' ? c.def.max : undefined,
    value: getConfig(db, key),
    editableBy: AREA_ROLES[c.area],
  }));
}

function validate(key: string, value: unknown): unknown {
  const c = CONFIG[key];
  if (!c) throw badRequest(`Unknown setting ${key}`);
  const d = c.def;
  switch (d.type) {
    case 'string': {
      if (typeof value !== 'string') throw badRequest(`${c.label} must be text`);
      const v = value.trim();
      if (d.pattern && v && !d.pattern.test(v)) throw badRequest(`${c.label}: use ${d.patternHint}`);
      if (d.pattern && !v && key !== 'inbound_order_warehouse') throw badRequest(`${c.label} is required`);
      return v;
    }
    case 'date':
      if (value !== '' && !(typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value))) throw badRequest(`${c.label}: use YYYY-MM-DD`);
      return value;
    case 'number': {
      const n = Number(value);
      if (!Number.isFinite(n)) throw badRequest(`${c.label} must be a number`);
      if (d.min !== undefined && n < d.min) throw badRequest(`${c.label} must be at least ${d.min}`);
      if (d.max !== undefined && n > d.max) throw badRequest(`${c.label} must be at most ${d.max}`);
      return n;
    }
    case 'boolean':
      if (typeof value !== 'boolean') throw badRequest(`${c.label} must be on or off`);
      return value;
    case 'list': {
      if (!Array.isArray(value) || value.some((v) => !d.options.includes(v))) throw badRequest(`${c.label}: invalid selection`);
      return d.options.filter((o) => value.includes(o));
    }
  }
}

/** Update several settings at once; all are validated before any is written. */
export function setConfig(db: DB, values: Record<string, unknown>, role: string) {
  const clean: [string, unknown][] = [];
  for (const [key, value] of Object.entries(values)) {
    const c = CONFIG[key];
    if (!c) throw badRequest(`Unknown setting ${key}`);
    if (role !== 'admin' && !AREA_ROLES[c.area].includes(role)) throw new HttpError(403, `You are not authorized to change "${c.label}"`);
    clean.push([key, validate(key, value)]);
  }
  const from = (values.posting_period_from ?? getConfig(db, 'posting_period_from')) as string;
  const to = (values.posting_period_to ?? getConfig(db, 'posting_period_to')) as string;
  if (from && to && from > to) throw badRequest('Posting period start must not be after its end');
  if ('inbound_order_warehouse' in values && values.inbound_order_warehouse) {
    if (!db.prepare('SELECT 1 FROM warehouses WHERE code = ?').get(String(values.inbound_order_warehouse).trim()))
      throw badRequest(`Warehouse ${values.inbound_order_warehouse} does not exist`);
  }
  const up = db.prepare('INSERT INTO settings(key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');
  db.transaction(() => clean.forEach(([k, v]) => up.run(k, serialize(CONFIG[k].def, v))))();
}

// ---------- Number ranges ----------

const NR_LABELS: Record<string, string> = {
  JE: 'Journal entries (FI documents)',
  PO: 'Purchase orders',
  MAT: 'Material documents',
  INV: 'Vendor invoices',
  PAY: 'Outgoing payments',
  SO: 'Sales orders',
  BIL: 'Customer invoices',
  RCP: 'Incoming payments',
  IDOC: 'IDocs',
};

export function listNumberRanges(db: DB) {
  return (db.prepare('SELECT object, next_no FROM number_ranges ORDER BY object').all() as { object: string; next_no: number }[]).map((r) => ({
    object: r.object,
    description: NR_LABELS[r.object] ?? r.object,
    nextNo: r.next_no,
  }));
}

/** Number ranges may only move forward, so already issued numbers are never reused. */
export function setNumberRange(db: DB, object: string, nextNo: number) {
  const row = db.prepare('SELECT next_no FROM number_ranges WHERE object = ?').get(object) as { next_no: number } | undefined;
  if (!row) throw badRequest(`Number range ${object} does not exist`);
  if (!Number.isInteger(nextNo) || nextNo < row.next_no) throw badRequest(`Next number must be a whole number of at least ${row.next_no}, so issued numbers are never reused`);
  db.prepare('UPDATE number_ranges SET next_no = ? WHERE object = ?').run(nextNo, object);
}
