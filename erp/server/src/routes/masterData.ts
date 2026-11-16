import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import type { DB } from '../db.ts';
import { requireRole } from '../auth.ts';
import { handle, notFound, parse, badRequest } from '../lib/errors.ts';
import { toCents } from '../lib/money.ts';

const id = (v: string) => {
  const n = Number(v);
  if (!Number.isInteger(n)) throw badRequest('Invalid id');
  return n;
};

/** Optional foreign key from a form select: '' or null means "not set". */
const optRef = z.preprocess((v) => (v === '' || v === undefined ? null : v), z.coerce.number().int().positive().nullable());

const vendorSchema = z.object({
  code: z.string().trim().min(1).max(20),
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().or(z.literal('')).nullish(),
  phone: z.string().trim().max(40).nullish(),
  address: z.string().trim().max(300).nullish(),
  tax_id: z.string().trim().max(40).nullish(),
  payment_terms_days: z.coerce.number().int().min(0).max(365).default(30),
  payment_terms_id: optRef,
  is_active: z.coerce.boolean().default(true),
});

const materialSchema = z.object({
  code: z.string().trim().min(1).max(30),
  name: z.string().trim().min(1).max(120),
  uom: z.string().trim().min(1).max(10).default('EA'),
  material_type: z.enum(['RAW', 'TRADING', 'FINISHED', 'CONSUMABLE']).default('RAW'),
  reorder_level: z.coerce.number().min(0).default(0),
  sales_price: z.coerce.number().min(0).default(0).transform(toCents),
  material_group_id: optRef,
  is_active: z.coerce.boolean().default(true),
});

const customerSchema = z.object({
  code: z.string().trim().min(1).max(20),
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().or(z.literal('')).nullish(),
  phone: z.string().trim().max(40).nullish(),
  address: z.string().trim().max(300).nullish(),
  tax_id: z.string().trim().max(40).nullish(),
  payment_terms_days: z.coerce.number().int().min(0).max(365).default(30),
  payment_terms_id: optRef,
  tax_code_id: optRef,
  credit_limit: z.coerce.number().min(0).default(0).transform(toCents),
  is_active: z.coerce.boolean().default(true),
});

const accountSchema = z.object({
  code: z.string().trim().regex(/^\d{4,10}$/, 'Account code must be 4-10 digits'),
  name: z.string().trim().min(1).max(120),
  type: z.enum(['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE']),
  is_active: z.coerce.boolean().default(true),
});

const userSchema = z.object({
  username: z.string().trim().min(3).max(40),
  full_name: z.string().trim().min(1).max(120),
  role: z.enum(['admin', 'finance', 'purchasing', 'warehouse', 'sales']),
  password: z.string().min(6).optional(),
  is_active: z.coerce.boolean().default(true),
});

/** Generic CRUD for simple master data tables. */
function crud(
  r: Router,
  db: DB,
  path: string,
  table: string,
  schema: z.ZodObject<any>,
  writers: Parameters<typeof requireRole>,
  listSql: string,
  /** Cross-checks against configuration; may adjust the row before it is saved. */
  prepare: (d: Record<string, any>) => Record<string, any> = (d) => d,
) {
  const cols = Object.keys(schema.shape);
  const toRow = (d: Record<string, unknown>) => cols.map((c) => (typeof d[c] === 'boolean' ? Number(d[c]) : (d[c] ?? null)));
  r.get(path, handle(() => db.prepare(listSql).all()));
  r.get(`${path}/:id`, handle((req) => db.prepare(`SELECT * FROM (${listSql}) WHERE id = ?`).get(id(req.params.id)) ?? (() => { throw notFound(table); })()));
  r.post(
    path,
    requireRole(...writers),
    handle((req) => {
      const d = prepare(parse(schema, req.body));
      const info = db.prepare(`INSERT INTO ${table}(${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`).run(...toRow(d));
      return { id: Number(info.lastInsertRowid) };
    }),
  );
  r.put(
    `${path}/:id`,
    requireRole(...writers),
    handle((req) => {
      const d = prepare(parse(schema, req.body));
      const info = db.prepare(`UPDATE ${table} SET ${cols.map((c) => `${c} = ?`).join(',')} WHERE id = ?`).run(...toRow(d), id(req.params.id));
      if (!info.changes) throw notFound(table);
    }),
  );
}

export function masterDataRoutes(db: DB) {
  const r = Router();

  /** Payment terms decide the due-date days; the day count is kept on the partner for due-date calculation. */
  const withTerms = (d: Record<string, any>) => {
    if (d.payment_terms_id) {
      const t = db.prepare('SELECT net_days FROM payment_terms WHERE id = ?').get(d.payment_terms_id) as { net_days: number } | undefined;
      if (!t) throw badRequest('Payment terms do not exist');
      d.payment_terms_days = t.net_days;
    }
    return d;
  };

  crud(r, db, '/vendors', 'vendors', vendorSchema, ['purchasing', 'finance'], `
    SELECT v.*, pt.code AS payment_terms_code,
           COALESCE((SELECT SUM(total - paid_amount) FROM vendor_invoices vi WHERE vi.vendor_id = v.id), 0) / 100.0 AS open_balance
    FROM vendors v LEFT JOIN payment_terms pt ON pt.id = v.payment_terms_id ORDER BY v.code`, withTerms);
  crud(r, db, '/customers', 'customers', customerSchema, ['sales', 'finance'], `
    SELECT c.id, c.code, c.name, c.email, c.phone, c.address, c.tax_id, c.payment_terms_days, c.payment_terms_id, c.tax_code_id, c.is_active,
           pt.code AS payment_terms_code, tc.code AS tax_code, c.credit_limit / 100.0 AS credit_limit,
           COALESCE((SELECT SUM(total - paid_amount) FROM customer_invoices ci WHERE ci.customer_id = c.id), 0) / 100.0 AS open_balance
    FROM customers c LEFT JOIN payment_terms pt ON pt.id = c.payment_terms_id LEFT JOIN tax_codes tc ON tc.id = c.tax_code_id
    ORDER BY c.code`, (d) => {
    if (d.tax_code_id) {
      const tc = db.prepare('SELECT code, direction FROM tax_codes WHERE id = ?').get(d.tax_code_id) as { code: string; direction: string } | undefined;
      if (!tc) throw badRequest('Tax code does not exist');
      if (tc.direction !== 'OUTPUT') throw badRequest(`Tax code ${tc.code} is an input tax code; customers need an output tax code`);
    }
    return withTerms(d);
  });
  crud(r, db, '/materials', 'materials', materialSchema, ['purchasing', 'warehouse', 'sales'], `
    SELECT m.id, m.code, m.name, m.uom, m.material_type, m.reorder_level, m.is_active, m.sales_price / 100.0 AS sales_price,
           m.material_group_id, mg.code AS material_group,
           COALESCE((SELECT SUM(qty) FROM stock s WHERE s.material_id = m.id), 0) AS total_qty,
           m.stock_value / 100.0 AS stock_value
    FROM materials m LEFT JOIN material_groups mg ON mg.id = m.material_group_id ORDER BY m.code`, (d) => {
    d.uom = String(d.uom).toUpperCase();
    if (!db.prepare('SELECT 1 FROM units WHERE code = ?').get(d.uom)) throw badRequest(`Unit ${d.uom} is not defined (see Configuration > Units of measure)`);
    if (d.material_group_id && !db.prepare('SELECT 1 FROM material_groups WHERE id = ?').get(d.material_group_id)) throw badRequest('Material group does not exist');
    return d;
  });
  // Storage locations are maintained under Configuration; this list serves the order and movement screens.
  r.get('/warehouses', handle(() =>
    db.prepare(`SELECT w.*, p.code AS plant_code, p.name AS plant_name FROM warehouses w LEFT JOIN plants p ON p.id = w.plant_id ORDER BY w.code`).all()));
  r.get('/plants', handle(() => db.prepare('SELECT * FROM plants ORDER BY code').all()));
  r.get('/payment-terms', handle(() => db.prepare('SELECT * FROM payment_terms ORDER BY net_days, code').all()));
  r.get('/units', handle(() => db.prepare('SELECT * FROM units ORDER BY dimension, code').all()));
  r.get('/material-groups', handle(() => db.prepare('SELECT * FROM material_groups ORDER BY code').all()));
  r.get('/purchasing-groups', handle(() => db.prepare('SELECT id, code, name FROM purchasing_groups ORDER BY code').all()));
  r.get('/sales-areas', handle(() => db.prepare('SELECT * FROM sales_areas ORDER BY sales_org, distr_channel, division').all()));
  crud(r, db, '/accounts', 'accounts', accountSchema, ['finance'], 'SELECT * FROM accounts ORDER BY code');

  // Account determination
  r.get('/account-determination', handle(() =>
    db.prepare(
      `SELECT ad.key, ad.description, ad.account_id, a.code AS account_code, a.name AS account_name
       FROM account_determination ad JOIN accounts a ON a.id = ad.account_id ORDER BY ad.key`).all()));
  r.put('/account-determination/:key', requireRole('finance'), handle((req) => {
    const { account_id } = parse(z.object({ account_id: z.coerce.number().int() }), req.body);
    if (!db.prepare('SELECT 1 FROM accounts WHERE id = ?').get(account_id)) throw notFound('GL account');
    const info = db.prepare('UPDATE account_determination SET account_id = ? WHERE key = ?').run(account_id, req.params.key);
    if (!info.changes) throw notFound('Account determination key');
  }));

  // Users (admin only)
  r.get('/users', requireRole(), handle(() => db.prepare('SELECT id, username, full_name, role, is_active, created_at FROM users ORDER BY username').all()));
  r.post('/users', requireRole(), handle((req) => {
    const d = parse(userSchema, req.body);
    if (!d.password) throw badRequest('Password is required for a new user');
    const info = db.prepare('INSERT INTO users(username, password_hash, full_name, role, is_active) VALUES (?, ?, ?, ?, ?)')
      .run(d.username, bcrypt.hashSync(d.password, 10), d.full_name, d.role, Number(d.is_active));
    return { id: Number(info.lastInsertRowid) };
  }));
  r.put('/users/:id', requireRole(), handle((req) => {
    const d = parse(userSchema, req.body);
    const uid = id(req.params.id);
    if (uid === req.user!.id && (!d.is_active || d.role !== 'admin')) throw badRequest('You cannot deactivate or demote yourself');
    const info = db.prepare('UPDATE users SET username = ?, full_name = ?, role = ?, is_active = ? WHERE id = ?')
      .run(d.username, d.full_name, d.role, Number(d.is_active), uid);
    if (!info.changes) throw notFound('User');
    if (d.password) db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(bcrypt.hashSync(d.password, 10), uid);
  }));

  return r;
}
