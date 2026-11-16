import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import type { DB } from '../db.ts';
import { requireRole } from '../auth.ts';
import { handle, notFound, parse, badRequest } from '../lib/errors.ts';

const id = (v: string) => {
  const n = Number(v);
  if (!Number.isInteger(n)) throw badRequest('Invalid id');
  return n;
};

const vendorSchema = z.object({
  code: z.string().trim().min(1).max(20),
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().or(z.literal('')).nullish(),
  phone: z.string().trim().max(40).nullish(),
  address: z.string().trim().max(300).nullish(),
  tax_id: z.string().trim().max(40).nullish(),
  payment_terms_days: z.coerce.number().int().min(0).max(365).default(30),
  is_active: z.coerce.boolean().default(true),
});

const materialSchema = z.object({
  code: z.string().trim().min(1).max(30),
  name: z.string().trim().min(1).max(120),
  uom: z.string().trim().min(1).max(10).default('EA'),
  material_type: z.enum(['RAW', 'TRADING', 'FINISHED', 'CONSUMABLE']).default('RAW'),
  reorder_level: z.coerce.number().min(0).default(0),
  is_active: z.coerce.boolean().default(true),
});

const warehouseSchema = z.object({
  code: z.string().trim().min(1).max(10),
  name: z.string().trim().min(1).max(120),
  address: z.string().trim().max(300).nullish(),
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
  role: z.enum(['admin', 'finance', 'purchasing', 'warehouse']),
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
) {
  const cols = Object.keys(schema.shape);
  const toRow = (d: Record<string, unknown>) => cols.map((c) => (typeof d[c] === 'boolean' ? Number(d[c]) : (d[c] ?? null)));
  r.get(path, handle(() => db.prepare(listSql).all()));
  r.get(`${path}/:id`, handle((req) => db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id(req.params.id)) ?? (() => { throw notFound(table); })()));
  r.post(
    path,
    requireRole(...writers),
    handle((req) => {
      const d = parse(schema, req.body);
      const info = db.prepare(`INSERT INTO ${table}(${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`).run(...toRow(d));
      return { id: Number(info.lastInsertRowid) };
    }),
  );
  r.put(
    `${path}/:id`,
    requireRole(...writers),
    handle((req) => {
      const d = parse(schema, req.body);
      const info = db.prepare(`UPDATE ${table} SET ${cols.map((c) => `${c} = ?`).join(',')} WHERE id = ?`).run(...toRow(d), id(req.params.id));
      if (!info.changes) throw notFound(table);
    }),
  );
}

export function masterDataRoutes(db: DB) {
  const r = Router();

  crud(r, db, '/vendors', 'vendors', vendorSchema, ['purchasing', 'finance'], `
    SELECT v.*, COALESCE((SELECT SUM(total - paid_amount) FROM vendor_invoices vi WHERE vi.vendor_id = v.id), 0) / 100.0 AS open_balance
    FROM vendors v ORDER BY v.code`);
  crud(r, db, '/materials', 'materials', materialSchema, ['purchasing', 'warehouse'], `
    SELECT m.id, m.code, m.name, m.uom, m.material_type, m.reorder_level, m.is_active,
           COALESCE((SELECT SUM(qty) FROM stock s WHERE s.material_id = m.id), 0) AS total_qty,
           m.stock_value / 100.0 AS stock_value
    FROM materials m ORDER BY m.code`);
  crud(r, db, '/warehouses', 'warehouses', warehouseSchema, ['warehouse'], 'SELECT * FROM warehouses ORDER BY code');
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
