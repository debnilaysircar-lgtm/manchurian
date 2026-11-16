/**
 * Generic maintenance for customizing tables (SAP's SM30-style "maintain table view").
 * Each object declares its columns, validation, who may change it and where it is used,
 * so one set of endpoints and one screen serve all of them.
 */
import type { DB } from '../db.ts';
import { badRequest, HttpError, notFound } from '../lib/errors.ts';

type ColType = 'code' | 'text' | 'number' | 'amount' | 'percent' | 'boolean' | 'select' | 'ref';
export interface Col {
  name: string;
  label: string;
  type: ColType;
  required?: boolean;
  pattern?: RegExp;
  hint?: string;
  options?: string[];
  /** ref: SQL returning (value, label) rows. */
  ref?: string;
  min?: number;
  max?: number;
  immutable?: boolean;
  help?: string;
}
interface Usage {
  table: string;
  column: string;
  label: string;
  /** Column on this object the usage points at (default id). */
  by?: 'id' | 'code';
  /** Extra condition, e.g. only non-zero stock counts as use. */
  where?: string;
}
export interface CustomizingObject {
  title: string;
  group: string;
  description: string;
  table: string;
  roles: string[]; // besides admin
  cols: Col[];
  order: string;
  usedBy: Usage[];
  fixedRows?: boolean;
  enforcement: string;
  afterSave?: (db: DB, id: number) => void;
  /** Removes dependent rows that do not count as use (runs just before delete). */
  beforeDelete?: (db: DB, id: number) => void;
  validate?: (db: DB, row: Record<string, unknown>, id: number | null) => void;
}

const code = (len: string, hint: string): Pick<Col, 'type' | 'pattern' | 'hint' | 'required' | 'immutable'> => ({
  type: 'code',
  pattern: new RegExp(`^[A-Z0-9]{${len}}$`),
  hint,
  required: true,
  immutable: true,
});

export const OBJECTS: Record<string, CustomizingObject> = {
  plants: {
    title: 'Plants',
    group: 'Enterprise structure',
    description: 'Locations where stock is kept. Each storage location belongs to one plant.',
    enforcement: 'Stock overview can be filtered by plant; storage locations must be assigned to a plant.',
    table: 'plants',
    roles: [],
    cols: [
      { name: 'code', label: 'Plant', ...code('4', '4 characters, e.g. 1000') },
      { name: 'name', label: 'Name', type: 'text', required: true },
      { name: 'country', label: 'Country', type: 'code', pattern: /^[A-Z]{2}$/, hint: 'ISO country code, e.g. US' },
      { name: 'address', label: 'Address', type: 'text' },
    ],
    order: 'code',
    usedBy: [{ table: 'warehouses', column: 'plant_id', label: 'storage locations' }],
  },
  storage_locations: {
    title: 'Storage locations',
    group: 'Enterprise structure',
    description: 'Places inside a plant where stock is held. Goods movements, purchase and sales orders use them.',
    enforcement: 'Every stock quantity, goods movement, purchase order and sales order refers to a storage location.',
    table: 'warehouses',
    roles: ['warehouse'],
    cols: [
      { name: 'code', label: 'Storage location', ...code('1,10', '1-10 characters, e.g. WH01') },
      { name: 'name', label: 'Name', type: 'text', required: true },
      { name: 'plant_id', label: 'Plant', type: 'ref', ref: "SELECT id AS value, code || ' ' || name AS label FROM plants ORDER BY code", required: true },
      { name: 'address', label: 'Address', type: 'text' },
    ],
    order: 'code',
    usedBy: [
      { table: 'stock', column: 'warehouse_id', label: 'materials with stock', where: 'qty <> 0' },
      { table: 'stock_movements', column: 'warehouse_id', label: 'goods movements' },
      { table: 'stock_movements', column: 'to_warehouse_id', label: 'goods movements (transfers in)' },
      { table: 'purchase_orders', column: 'warehouse_id', label: 'purchase orders' },
      { table: 'sales_orders', column: 'warehouse_id', label: 'sales orders' },
      { table: 'sales_areas', column: 'default_warehouse_id', label: 'sales areas' },
    ],
    beforeDelete: (db, id) => db.prepare('DELETE FROM stock WHERE warehouse_id = ? AND qty = 0').run(id),
  },
  purchasing_groups: {
    title: 'Purchasing groups',
    group: 'Enterprise structure',
    description: 'Buyers or buying teams responsible for purchase orders.',
    enforcement: 'A purchasing group with a release limit overrides the global PO release limit for its orders.',
    table: 'purchasing_groups',
    roles: ['purchasing'],
    cols: [
      { name: 'code', label: 'Purchasing group', ...code('3', '3 characters, e.g. 001') },
      { name: 'name', label: 'Description', type: 'text', required: true },
      { name: 'buyer', label: 'Buyer', type: 'text' },
      { name: 'email', label: 'Email', type: 'text' },
      { name: 'release_limit', label: 'Release limit', type: 'amount', min: 0, help: 'Leave empty to use the global limit from Purchasing settings' },
    ],
    order: 'code',
    usedBy: [{ table: 'purchase_orders', column: 'purchasing_group_id', label: 'purchase orders' }],
  },
  sales_areas: {
    title: 'Sales areas',
    group: 'Enterprise structure',
    description: 'Combination of sales organization, distribution channel and division every sales order belongs to.',
    enforcement: 'Every sales order has a sales area; its default storage location is proposed on new orders.',
    table: 'sales_areas',
    roles: ['sales'],
    cols: [
      { name: 'sales_org', label: 'Sales organization', ...code('4', '4 characters, e.g. 1000') },
      { name: 'distr_channel', label: 'Distribution channel', ...code('2', '2 characters, e.g. 10') },
      { name: 'division', label: 'Division', ...code('2', '2 characters, e.g. 00') },
      { name: 'name', label: 'Description', type: 'text', required: true },
      { name: 'default_warehouse_id', label: 'Default storage location', type: 'ref', ref: "SELECT id AS value, code || ' ' || name AS label FROM warehouses ORDER BY code" },
    ],
    order: 'sales_org, distr_channel, division',
    usedBy: [{ table: 'sales_orders', column: 'sales_area_id', label: 'sales orders' }],
  },
  document_types: {
    title: 'FI document types',
    group: 'Financial accounting',
    description: 'Classifies journal entries. System postings use fixed types (WE, RE, RV, ...).',
    enforcement: 'Manual journal entries may only use types marked "manual posting allowed".',
    table: 'fi_document_types',
    roles: ['finance'],
    cols: [
      { name: 'code', label: 'Type', ...code('2', '2 characters, e.g. SA') },
      { name: 'description', label: 'Description', type: 'text', required: true },
      { name: 'manual_allowed', label: 'Manual posting allowed', type: 'boolean' },
    ],
    order: 'code',
    usedBy: [{ table: 'journal_entries', column: 'doc_type', label: 'journal entries', by: 'code' }],
  },
  tax_codes: {
    title: 'Tax codes',
    group: 'Financial accounting',
    description: 'Input tax on vendor invoices and output tax on customer invoices, each posted to its own G/L account.',
    enforcement: 'Vendor invoices post input tax; customer invoices post output tax from the customer\'s tax code.',
    table: 'tax_codes',
    roles: ['finance'],
    cols: [
      { name: 'code', label: 'Tax code', ...code('2', '2 characters, e.g. V1') },
      { name: 'description', label: 'Description', type: 'text', required: true },
      { name: 'direction', label: 'Tax type', type: 'select', options: ['INPUT', 'OUTPUT'], required: true },
      { name: 'rate_pct', label: 'Rate (%)', type: 'percent', min: 0, max: 100, required: true },
      { name: 'account_id', label: 'Tax account', type: 'ref', ref: "SELECT id AS value, code || ' ' || name AS label FROM accounts WHERE type IN ('ASSET','LIABILITY') ORDER BY code", required: true },
    ],
    order: 'code',
    usedBy: [
      { table: 'vendor_invoices', column: 'tax_code_id', label: 'vendor invoices' },
      { table: 'customer_invoices', column: 'tax_code_id', label: 'customer invoices' },
      { table: 'customers', column: 'tax_code_id', label: 'customers' },
    ],
    validate(db, row, id) {
      if (id) {
        const used = db.prepare('SELECT (SELECT COUNT(*) FROM vendor_invoices WHERE tax_code_id = @id) + (SELECT COUNT(*) FROM customer_invoices WHERE tax_code_id = @id) n').get({ id }) as { n: number };
        const old = db.prepare('SELECT rate_pct, direction FROM tax_codes WHERE id = ?').get(id) as any;
        if (used.n > 0 && (old.rate_pct !== Number(row.rate_pct) || old.direction !== row.direction))
          throw badRequest('This tax code is used on posted invoices; create a new code instead of changing its rate or type');
      }
    },
  },
  payment_terms: {
    title: 'Payment terms',
    group: 'Financial accounting',
    description: 'Terms of payment assigned to vendors and customers.',
    enforcement: 'Invoice due dates are calculated from the partner\'s payment terms; changing net days updates all partners using them.',
    table: 'payment_terms',
    roles: ['finance'],
    cols: [
      { name: 'code', label: 'Terms', ...code('2,4', '2-4 characters, e.g. NT30') },
      { name: 'description', label: 'Description', type: 'text', required: true },
      { name: 'net_days', label: 'Net days', type: 'number', min: 0, max: 365, required: true },
    ],
    order: 'net_days, code',
    usedBy: [
      { table: 'vendors', column: 'payment_terms_id', label: 'vendors' },
      { table: 'customers', column: 'payment_terms_id', label: 'customers' },
    ],
    afterSave(db, id) {
      const t = db.prepare('SELECT net_days FROM payment_terms WHERE id = ?').get(id) as { net_days: number };
      db.prepare('UPDATE vendors SET payment_terms_days = ? WHERE payment_terms_id = ?').run(t.net_days, id);
      db.prepare('UPDATE customers SET payment_terms_days = ? WHERE payment_terms_id = ?').run(t.net_days, id);
    },
  },
  cost_centers: {
    title: 'Cost centers',
    group: 'Controlling',
    description: 'Organizational units that collect costs, e.g. production or administration.',
    enforcement: 'Goods issues and expense lines of journal entries can carry a cost center; the cost center report totals them.',
    table: 'cost_centers',
    roles: ['finance'],
    cols: [
      { name: 'code', label: 'Cost center', ...code('1,10', '1-10 characters, e.g. CC1000') },
      { name: 'name', label: 'Name', type: 'text', required: true },
      { name: 'responsible', label: 'Person responsible', type: 'text' },
      { name: 'is_active', label: 'Open for postings', type: 'boolean' },
    ],
    order: 'code',
    usedBy: [{ table: 'journal_lines', column: 'cost_center_id', label: 'journal lines' }],
  },
  units: {
    title: 'Units of measure',
    group: 'Logistics general',
    description: 'Units materials can be managed in.',
    enforcement: "A material's base unit must be one of these.",
    table: 'units',
    roles: ['purchasing', 'warehouse'],
    cols: [
      { name: 'code', label: 'Unit', ...code('1,3', '1-3 characters, e.g. KG') },
      { name: 'description', label: 'Description', type: 'text', required: true },
      { name: 'dimension', label: 'Dimension', type: 'select', options: ['QUANTITY', 'MASS', 'LENGTH', 'AREA', 'VOLUME', 'TIME'], required: true },
    ],
    order: 'dimension, code',
    usedBy: [{ table: 'materials', column: 'uom', label: 'materials', by: 'code' }],
  },
  material_types: {
    title: 'Material types',
    group: 'Logistics general',
    description: 'Controls what can be done with a material. The four types are fixed; their behaviour is configurable.',
    enforcement: 'Purchase orders accept only purchasable types; sales orders only sellable types.',
    table: 'material_types',
    roles: ['purchasing', 'warehouse'],
    fixedRows: true,
    cols: [
      { name: 'code', label: 'Type', type: 'code', immutable: true, required: true },
      { name: 'description', label: 'Description', type: 'text', required: true },
      { name: 'purchasable', label: 'Can be purchased', type: 'boolean' },
      { name: 'sellable', label: 'Can be sold', type: 'boolean' },
    ],
    order: 'code',
    usedBy: [],
  },
  material_groups: {
    title: 'Material groups',
    group: 'Logistics general',
    description: 'Groups materials with similar characteristics for reporting.',
    enforcement: 'Assigned on the material master; the stock overview can be filtered by material group.',
    table: 'material_groups',
    roles: ['purchasing', 'warehouse'],
    cols: [
      { name: 'code', label: 'Material group', ...code('1,9', '1-9 characters, e.g. STEEL') },
      { name: 'description', label: 'Description', type: 'text', required: true },
    ],
    order: 'code',
    usedBy: [{ table: 'materials', column: 'material_group_id', label: 'materials' }],
  },
};

function obj(key: string) {
  const o = OBJECTS[key];
  if (!o) throw notFound(`Customizing object ${key}`);
  return o;
}

const canEdit = (o: CustomizingObject, role: string) => role === 'admin' || o.roles.includes(role);

export function listObjects(role: string) {
  return Object.entries(OBJECTS).map(([key, o]) => ({
    key,
    title: o.title,
    group: o.group,
    description: o.description,
    enforcement: o.enforcement,
    fixedRows: !!o.fixedRows,
    editable: canEdit(o, role),
    cols: o.cols.map(({ pattern: _p, ref: _r, ...c }) => c),
  }));
}

export function getObject(db: DB, key: string) {
  const o = obj(key);
  const rows = (db.prepare(`SELECT * FROM ${o.table} ORDER BY ${o.order}`).all() as any[]).map((r) => {
    const out = { ...r };
    for (const c of o.cols) if (c.type === 'amount' && r[c.name] != null) out[c.name] = r[c.name] / 100;
    return out;
  });
  const options: Record<string, { value: number; label: string }[]> = {};
  for (const c of o.cols) if (c.type === 'ref') options[c.name] = db.prepare(c.ref!).all() as any[];
  return { rows, options };
}

function clean(db: DB, o: CustomizingObject, input: Record<string, unknown>, existing: any | null) {
  const row: Record<string, unknown> = {};
  for (const c of o.cols) {
    if (existing && c.immutable) {
      row[c.name] = existing[c.name];
      continue;
    }
    let v = input[c.name];
    if (typeof v === 'string') v = v.trim();
    const empty = v === undefined || v === null || v === '';
    if (c.type === 'boolean') {
      row[c.name] = v === true || v === 1 || v === 'true' ? 1 : 0;
      continue;
    }
    if (empty) {
      if (c.required) throw badRequest(`${c.label} is required`);
      row[c.name] = null;
      continue;
    }
    switch (c.type) {
      case 'code': {
        const s = String(v).toUpperCase();
        if (c.pattern && !c.pattern.test(s)) throw badRequest(`${c.label}: use ${c.hint}`);
        row[c.name] = s;
        break;
      }
      case 'number':
      case 'percent':
      case 'amount': {
        const n = Number(v);
        if (!Number.isFinite(n)) throw badRequest(`${c.label} must be a number`);
        if (c.min !== undefined && n < c.min) throw badRequest(`${c.label} must be at least ${c.min}`);
        if (c.max !== undefined && n > c.max) throw badRequest(`${c.label} must be at most ${c.max}`);
        if (c.type === 'number' && !Number.isInteger(n)) throw badRequest(`${c.label} must be a whole number`);
        row[c.name] = c.type === 'amount' ? Math.round(n * 100) : n;
        break;
      }
      case 'select':
        if (!c.options!.includes(String(v))) throw badRequest(`${c.label}: choose one of ${c.options!.join(', ')}`);
        row[c.name] = String(v);
        break;
      case 'ref': {
        const id = Number(v);
        if (!(db.prepare(c.ref!).all() as { value: number }[]).some((r) => r.value === id)) throw badRequest(`${c.label}: invalid selection`);
        row[c.name] = id;
        break;
      }
      default:
        row[c.name] = String(v);
    }
  }
  return row;
}

export function saveRow(db: DB, key: string, id: number | null, input: Record<string, unknown>, role: string) {
  const o = obj(key);
  if (!canEdit(o, role)) throw new HttpError(403, `You are not authorized to change ${o.title.toLowerCase()}`);
  if (o.fixedRows && !id) throw badRequest(`${o.title} are fixed; you can change their settings but not add new ones`);
  const existing = id ? db.prepare(`SELECT * FROM ${o.table} WHERE id = ?`).get(id) : null;
  if (id && !existing) throw notFound(o.title);
  const row = clean(db, o, input, existing);
  o.validate?.(db, row, id);
  const cols = Object.keys(row);
  return db.transaction(() => {
    let rid = id;
    if (rid) db.prepare(`UPDATE ${o.table} SET ${cols.map((c) => `${c} = @${c}`).join(', ')} WHERE id = @id`).run({ ...row, id: rid });
    else rid = Number(db.prepare(`INSERT INTO ${o.table}(${cols.join(', ')}) VALUES (${cols.map((c) => `@${c}`).join(', ')})`).run(row).lastInsertRowid);
    o.afterSave?.(db, rid);
    return { id: rid };
  })();
}

export function deleteRow(db: DB, key: string, id: number, role: string) {
  const o = obj(key);
  if (!canEdit(o, role)) throw new HttpError(403, `You are not authorized to change ${o.title.toLowerCase()}`);
  if (o.fixedRows) throw badRequest(`${o.title} cannot be deleted`);
  const row = db.prepare(`SELECT * FROM ${o.table} WHERE id = ?`).get(id) as any;
  if (!row) throw notFound(o.title);
  for (const u of o.usedBy) {
    const val = u.by === 'code' ? row.code : id;
    const n = (db.prepare(`SELECT COUNT(*) n FROM ${u.table} WHERE ${u.column} = ?${u.where ? ` AND ${u.where}` : ''}`).get(val) as { n: number }).n;
    if (n > 0) throw badRequest(`Cannot delete: used by ${n} ${u.label}`);
  }
  try {
    db.transaction(() => {
      o.beforeDelete?.(db, id);
      db.prepare(`DELETE FROM ${o.table} WHERE id = ?`).run(id);
    })();
  } catch (e) {
    if (/FOREIGN KEY/.test((e as Error).message)) throw badRequest(`Cannot delete: this ${o.title.toLowerCase().replace(/s$/, '')} is still referenced by other records`);
    throw e;
  }
}
