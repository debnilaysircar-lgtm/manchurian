import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export type DB = Database.Database;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin','finance','purchasing','warehouse')),
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS number_ranges (
  object TEXT PRIMARY KEY,
  next_no INTEGER NOT NULL
);

-- ===== Finance =====
CREATE TABLE IF NOT EXISTS accounts (
  id INTEGER PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('ASSET','LIABILITY','EQUITY','REVENUE','EXPENSE')),
  is_active INTEGER NOT NULL DEFAULT 1
);

-- Automatic account determination (like SAP OBYC): key -> GL account
CREATE TABLE IF NOT EXISTS account_determination (
  key TEXT PRIMARY KEY,
  account_id INTEGER NOT NULL REFERENCES accounts(id),
  description TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS journal_entries (
  id INTEGER PRIMARY KEY,
  doc_no TEXT NOT NULL UNIQUE,
  posting_date TEXT NOT NULL,
  reference TEXT,
  description TEXT,
  source TEXT NOT NULL,              -- MANUAL, GR, GI, TRANSFER, INITIAL, ADJUST, INVOICE, PAYMENT, REVERSAL
  source_doc TEXT,
  status TEXT NOT NULL DEFAULT 'POSTED' CHECK (status IN ('POSTED','REVERSED')),
  reversed_by INTEGER REFERENCES journal_entries(id),
  reversal_of INTEGER REFERENCES journal_entries(id),
  created_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS journal_lines (
  id INTEGER PRIMARY KEY,
  entry_id INTEGER NOT NULL REFERENCES journal_entries(id),
  line_no INTEGER NOT NULL,
  account_id INTEGER NOT NULL REFERENCES accounts(id),
  debit INTEGER NOT NULL DEFAULT 0,
  credit INTEGER NOT NULL DEFAULT 0,
  memo TEXT,
  vendor_id INTEGER REFERENCES vendors(id),
  material_id INTEGER REFERENCES materials(id),
  CHECK (debit >= 0 AND credit >= 0 AND (debit = 0 OR credit = 0))
);
CREATE INDEX IF NOT EXISTS ix_jl_account ON journal_lines(account_id);
CREATE INDEX IF NOT EXISTS ix_jl_entry ON journal_lines(entry_id);

-- ===== Master data =====
CREATE TABLE IF NOT EXISTS vendors (
  id INTEGER PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  tax_id TEXT,
  payment_terms_days INTEGER NOT NULL DEFAULT 30,
  is_active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS warehouses (
  id INTEGER PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  address TEXT
);

CREATE TABLE IF NOT EXISTS materials (
  id INTEGER PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  uom TEXT NOT NULL DEFAULT 'EA',
  material_type TEXT NOT NULL DEFAULT 'RAW' CHECK (material_type IN ('RAW','TRADING','FINISHED','CONSUMABLE')),
  reorder_level REAL NOT NULL DEFAULT 0,
  stock_value INTEGER NOT NULL DEFAULT 0,   -- total valuated stock in cents (all warehouses)
  is_active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS stock (
  material_id INTEGER NOT NULL REFERENCES materials(id),
  warehouse_id INTEGER NOT NULL REFERENCES warehouses(id),
  qty REAL NOT NULL DEFAULT 0,
  PRIMARY KEY (material_id, warehouse_id)
);

CREATE TABLE IF NOT EXISTS stock_movements (
  id INTEGER PRIMARY KEY,
  doc_no TEXT NOT NULL,
  movement_type TEXT NOT NULL,   -- 101 GR for PO, 201 GI, 301 transfer, 561 initial, 701 gain, 702 loss
  material_id INTEGER NOT NULL REFERENCES materials(id),
  warehouse_id INTEGER NOT NULL REFERENCES warehouses(id),
  to_warehouse_id INTEGER REFERENCES warehouses(id),
  qty REAL NOT NULL,
  amount INTEGER NOT NULL DEFAULT 0,
  po_line_id INTEGER REFERENCES po_lines(id),
  journal_entry_id INTEGER REFERENCES journal_entries(id),
  posting_date TEXT NOT NULL,
  note TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS ix_sm_material ON stock_movements(material_id);

-- ===== Purchasing =====
CREATE TABLE IF NOT EXISTS purchase_orders (
  id INTEGER PRIMARY KEY,
  doc_no TEXT NOT NULL UNIQUE,
  vendor_id INTEGER NOT NULL REFERENCES vendors(id),
  warehouse_id INTEGER NOT NULL REFERENCES warehouses(id),
  order_date TEXT NOT NULL,
  delivery_date TEXT,
  status TEXT NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT','RELEASED','PARTIALLY_RECEIVED','RECEIVED','CLOSED','CANCELLED')),
  notes TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS po_lines (
  id INTEGER PRIMARY KEY,
  po_id INTEGER NOT NULL REFERENCES purchase_orders(id),
  line_no INTEGER NOT NULL,
  material_id INTEGER NOT NULL REFERENCES materials(id),
  qty REAL NOT NULL CHECK (qty > 0),
  unit_price INTEGER NOT NULL CHECK (unit_price >= 0),
  received_qty REAL NOT NULL DEFAULT 0,
  invoiced_qty REAL NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS vendor_invoices (
  id INTEGER PRIMARY KEY,
  doc_no TEXT NOT NULL UNIQUE,
  vendor_id INTEGER NOT NULL REFERENCES vendors(id),
  po_id INTEGER REFERENCES purchase_orders(id),
  vendor_ref TEXT NOT NULL,
  invoice_date TEXT NOT NULL,
  due_date TEXT NOT NULL,
  total INTEGER NOT NULL,
  paid_amount INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','PARTIALLY_PAID','PAID')),
  journal_entry_id INTEGER REFERENCES journal_entries(id),
  created_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (vendor_id, vendor_ref)
);

CREATE TABLE IF NOT EXISTS invoice_lines (
  id INTEGER PRIMARY KEY,
  invoice_id INTEGER NOT NULL REFERENCES vendor_invoices(id),
  po_line_id INTEGER REFERENCES po_lines(id),
  description TEXT,
  qty REAL NOT NULL,
  unit_price INTEGER NOT NULL,
  amount INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY,
  doc_no TEXT NOT NULL UNIQUE,
  vendor_id INTEGER NOT NULL REFERENCES vendors(id),
  invoice_id INTEGER NOT NULL REFERENCES vendor_invoices(id),
  payment_date TEXT NOT NULL,
  amount INTEGER NOT NULL CHECK (amount > 0),
  bank_account_id INTEGER NOT NULL REFERENCES accounts(id),
  reference TEXT,
  journal_entry_id INTEGER REFERENCES journal_entries(id),
  created_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

/** SAP-style number ranges per document type. */
const NUMBER_RANGES: [string, number][] = [
  ['JE', 100000001],   // FI documents
  ['PO', 4500000001],  // purchase orders
  ['MAT', 5000000001], // material documents
  ['INV', 5100000001], // vendor invoices
  ['PAY', 1500000001], // outgoing payments
];

const ACCOUNTS: [string, string, string][] = [
  ['100000', 'Cash on Hand', 'ASSET'],
  ['110000', 'Bank - Main Account', 'ASSET'],
  ['120000', 'Accounts Receivable', 'ASSET'],
  ['140000', 'Inventory - Materials', 'ASSET'],
  ['160000', 'Property, Plant & Equipment', 'ASSET'],
  ['200000', 'Accounts Payable', 'LIABILITY'],
  ['210000', 'GR/IR Clearing', 'LIABILITY'],
  ['220000', 'Accrued Liabilities', 'LIABILITY'],
  ['300000', 'Share Capital', 'EQUITY'],
  ['310000', 'Retained Earnings', 'EQUITY'],
  ['390000', 'Opening Balance Offset', 'EQUITY'],
  ['400000', 'Sales Revenue', 'REVENUE'],
  ['490000', 'Other Income', 'REVENUE'],
  ['500000', 'Material Consumption', 'EXPENSE'],
  ['510000', 'Purchase Price Differences', 'EXPENSE'],
  ['520000', 'Inventory Differences', 'EXPENSE'],
  ['600000', 'Salaries & Wages', 'EXPENSE'],
  ['610000', 'Rent', 'EXPENSE'],
  ['620000', 'Utilities', 'EXPENSE'],
];

const DETERMINATION: [string, string, string][] = [
  ['INVENTORY', '140000', 'Inventory posting (BSX)'],
  ['GRIR', '210000', 'GR/IR clearing (WRX)'],
  ['AP', '200000', 'Vendor reconciliation account'],
  ['BANK', '110000', 'Default bank account for payments'],
  ['CONSUMPTION', '500000', 'Goods issue offset (GBB-VBR)'],
  ['PRICE_DIFF', '510000', 'Invoice price differences (PRD)'],
  ['INV_DIFF', '520000', 'Physical inventory differences (GBB-INV)'],
  ['OPENING', '390000', 'Initial stock entry offset'],
];

export function openDb(file?: string): DB {
  const target = file ?? process.env.ERP_DB ?? path.resolve(process.cwd(), 'data', 'erp.sqlite');
  if (target !== ':memory:') fs.mkdirSync(path.dirname(target), { recursive: true });
  const db = new Database(target);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(SCHEMA);
  bootstrap(db);
  return db;
}

/** Idempotent base configuration: number ranges, chart of accounts, account determination, admin user. */
function bootstrap(db: DB) {
  const tx = db.transaction(() => {
    db.prepare('INSERT OR IGNORE INTO settings(key, value) VALUES (?, ?)').run('jwt_secret', crypto.randomBytes(32).toString('hex'));
    db.prepare('INSERT OR IGNORE INTO settings(key, value) VALUES (?, ?)').run('company_name', 'Demo Company Ltd.');
    db.prepare('INSERT OR IGNORE INTO settings(key, value) VALUES (?, ?)').run('currency', 'USD');
    const nr = db.prepare('INSERT OR IGNORE INTO number_ranges(object, next_no) VALUES (?, ?)');
    NUMBER_RANGES.forEach(([o, n]) => nr.run(o, n));

    const hasAccounts = db.prepare('SELECT COUNT(*) c FROM accounts').get() as { c: number };
    if (hasAccounts.c === 0) {
      const acc = db.prepare('INSERT INTO accounts(code, name, type) VALUES (?, ?, ?)');
      ACCOUNTS.forEach((a) => acc.run(...a));
    }
    const det = db.prepare(
      `INSERT OR IGNORE INTO account_determination(key, account_id, description)
       SELECT ?, id, ? FROM accounts WHERE code = ?`,
    );
    DETERMINATION.forEach(([k, code, d]) => det.run(k, d, code));

    const users = db.prepare('SELECT COUNT(*) c FROM users').get() as { c: number };
    if (users.c === 0) {
      db.prepare('INSERT INTO users(username, password_hash, full_name, role) VALUES (?, ?, ?, ?)').run(
        'admin',
        bcrypt.hashSync(process.env.ERP_ADMIN_PASSWORD ?? 'admin123', 10),
        'System Administrator',
        'admin',
      );
    }
  });
  tx();
}

export function nextNumber(db: DB, object: string): string {
  const row = db.prepare('UPDATE number_ranges SET next_no = next_no + 1 WHERE object = ? RETURNING next_no - 1 AS no').get(object) as
    | { no: number }
    | undefined;
  if (!row) throw new Error(`Number range ${object} missing`);
  return String(row.no);
}

export function determineAccount(db: DB, key: string): number {
  const row = db.prepare('SELECT account_id FROM account_determination WHERE key = ?').get(key) as { account_id: number } | undefined;
  if (!row) throw new Error(`Account determination for ${key} is not configured`);
  return row.account_id;
}

export function getSetting(db: DB, key: string): string | undefined {
  return (db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined)?.value;
}
