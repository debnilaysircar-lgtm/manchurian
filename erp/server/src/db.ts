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
  role TEXT NOT NULL CHECK (role IN ('admin','finance','purchasing','warehouse','sales')),
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
  customer_id INTEGER REFERENCES customers(id),
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
  sales_price INTEGER NOT NULL DEFAULT 0,    -- list price in cents
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
  movement_type TEXT NOT NULL,   -- 101 GR for PO, 201 GI, 301 transfer, 561 initial, 601 delivery, 701 gain, 702 loss
  material_id INTEGER NOT NULL REFERENCES materials(id),
  warehouse_id INTEGER NOT NULL REFERENCES warehouses(id),
  to_warehouse_id INTEGER REFERENCES warehouses(id),
  qty REAL NOT NULL,
  amount INTEGER NOT NULL DEFAULT 0,
  po_line_id INTEGER REFERENCES po_lines(id),
  so_line_id INTEGER REFERENCES so_lines(id),
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

-- ===== IDoc / ALE =====
CREATE TABLE IF NOT EXISTS idoc_ports (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  port_type TEXT NOT NULL CHECK (port_type IN ('FILE','XML_HTTP')),
  target TEXT NOT NULL,
  description TEXT
);

-- Partner profiles (WE20)
CREATE TABLE IF NOT EXISTS idoc_partners (
  id INTEGER PRIMARY KEY,
  partner_type TEXT NOT NULL CHECK (partner_type IN ('LS','LI','KU')),  -- logical system, vendor, customer
  partner_no TEXT NOT NULL,
  name TEXT NOT NULL,
  port_id INTEGER REFERENCES idoc_ports(id),
  is_active INTEGER NOT NULL DEFAULT 1,
  UNIQUE (partner_type, partner_no)
);

CREATE TABLE IF NOT EXISTS idoc_partner_messages (
  id INTEGER PRIMARY KEY,
  partner_id INTEGER NOT NULL REFERENCES idoc_partners(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('OUT','IN')),
  message_type TEXT NOT NULL,
  output_mode TEXT NOT NULL DEFAULT 'IMMEDIATE' CHECK (output_mode IN ('IMMEDIATE','COLLECT')),
  UNIQUE (partner_id, direction, message_type)
);

CREATE TABLE IF NOT EXISTS idocs (
  id INTEGER PRIMARY KEY,
  docnum TEXT NOT NULL UNIQUE,
  direction TEXT NOT NULL CHECK (direction IN ('OUT','IN')),
  message_type TEXT NOT NULL,
  idoc_type TEXT NOT NULL,
  partner_type TEXT NOT NULL,
  partner_no TEXT NOT NULL,
  partner_id INTEGER REFERENCES idoc_partners(id),
  port TEXT,
  status TEXT NOT NULL,
  ref_type TEXT,          -- PO, SO, DELIVERY, BILLING, VENDOR_INVOICE, GR, MATERIAL, CUSTOMER, VENDOR
  ref_id INTEGER,
  ref_doc_no TEXT,
  data TEXT NOT NULL,     -- JSON: { control, segments }
  created_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS idoc_status (
  id INTEGER PRIMARY KEY,
  idoc_id INTEGER NOT NULL REFERENCES idocs(id),
  status TEXT NOT NULL,
  message TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ===== Sales =====
CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  tax_id TEXT,
  payment_terms_days INTEGER NOT NULL DEFAULT 30,
  credit_limit INTEGER NOT NULL DEFAULT 0,   -- cents; 0 = no credit check
  is_active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS sales_orders (
  id INTEGER PRIMARY KEY,
  doc_no TEXT NOT NULL UNIQUE,
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  warehouse_id INTEGER NOT NULL REFERENCES warehouses(id),
  order_date TEXT NOT NULL,
  requested_date TEXT,
  customer_ref TEXT,
  status TEXT NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT','CONFIRMED','PARTIALLY_DELIVERED','DELIVERED','CLOSED','CANCELLED')),
  notes TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS so_lines (
  id INTEGER PRIMARY KEY,
  so_id INTEGER NOT NULL REFERENCES sales_orders(id),
  line_no INTEGER NOT NULL,
  material_id INTEGER NOT NULL REFERENCES materials(id),
  qty REAL NOT NULL CHECK (qty > 0),
  unit_price INTEGER NOT NULL CHECK (unit_price >= 0),
  delivered_qty REAL NOT NULL DEFAULT 0,
  billed_qty REAL NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS customer_invoices (
  id INTEGER PRIMARY KEY,
  doc_no TEXT NOT NULL UNIQUE,
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  so_id INTEGER REFERENCES sales_orders(id),
  invoice_date TEXT NOT NULL,
  due_date TEXT NOT NULL,
  total INTEGER NOT NULL,
  paid_amount INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','PARTIALLY_PAID','PAID')),
  journal_entry_id INTEGER REFERENCES journal_entries(id),
  created_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS customer_invoice_lines (
  id INTEGER PRIMARY KEY,
  invoice_id INTEGER NOT NULL REFERENCES customer_invoices(id),
  so_line_id INTEGER REFERENCES so_lines(id),
  description TEXT,
  qty REAL NOT NULL,
  unit_price INTEGER NOT NULL,
  amount INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS receipts (
  id INTEGER PRIMARY KEY,
  doc_no TEXT NOT NULL UNIQUE,
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  invoice_id INTEGER NOT NULL REFERENCES customer_invoices(id),
  receipt_date TEXT NOT NULL,
  amount INTEGER NOT NULL CHECK (amount > 0),
  bank_account_id INTEGER NOT NULL REFERENCES accounts(id),
  reference TEXT,
  journal_entry_id INTEGER REFERENCES journal_entries(id),
  created_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

/** Customizing tables (enterprise structure and IMG objects). Columns added to older tables are in addColumns(). */
const CUSTOMIZING_SCHEMA = `
CREATE TABLE IF NOT EXISTS plants (
  id INTEGER PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  country TEXT,
  address TEXT
);
CREATE TABLE IF NOT EXISTS purchasing_groups (
  id INTEGER PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  buyer TEXT,
  email TEXT,
  release_limit INTEGER            -- cents; NULL = use the global release limit
);
CREATE TABLE IF NOT EXISTS sales_areas (
  id INTEGER PRIMARY KEY,
  sales_org TEXT NOT NULL,
  distr_channel TEXT NOT NULL,
  division TEXT NOT NULL,
  name TEXT NOT NULL,
  default_warehouse_id INTEGER REFERENCES warehouses(id),
  UNIQUE (sales_org, distr_channel, division)
);
CREATE TABLE IF NOT EXISTS payment_terms (
  id INTEGER PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  net_days INTEGER NOT NULL CHECK (net_days >= 0)
);
CREATE TABLE IF NOT EXISTS tax_codes (
  id INTEGER PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('INPUT','OUTPUT')),
  rate_pct REAL NOT NULL CHECK (rate_pct >= 0 AND rate_pct <= 100),
  account_id INTEGER NOT NULL REFERENCES accounts(id)
);
CREATE TABLE IF NOT EXISTS cost_centers (
  id INTEGER PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  responsible TEXT,
  is_active INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS fi_document_types (
  id INTEGER PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  manual_allowed INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS units (
  id INTEGER PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  dimension TEXT NOT NULL DEFAULT 'QUANTITY'
);
CREATE TABLE IF NOT EXISTS material_groups (
  id INTEGER PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS material_types (
  id INTEGER PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  purchasable INTEGER NOT NULL DEFAULT 1,
  sellable INTEGER NOT NULL DEFAULT 1
);
`;

/** New columns on existing tables. Runs for new and upgraded databases alike. */
function addColumns(db: DB) {
  const has = (t: string, c: string) => (db.prepare(`PRAGMA table_info(${t})`).all() as { name: string }[]).some((r) => r.name === c);
  const add = (t: string, c: string, def: string) => !has(t, c) && db.exec(`ALTER TABLE ${t} ADD COLUMN ${c} ${def}`);
  add('warehouses', 'plant_id', 'INTEGER REFERENCES plants(id)');
  add('vendors', 'payment_terms_id', 'INTEGER REFERENCES payment_terms(id)');
  add('customers', 'payment_terms_id', 'INTEGER REFERENCES payment_terms(id)');
  add('customers', 'tax_code_id', 'INTEGER REFERENCES tax_codes(id)');
  add('materials', 'material_group_id', 'INTEGER REFERENCES material_groups(id)');
  add('purchase_orders', 'purchasing_group_id', 'INTEGER REFERENCES purchasing_groups(id)');
  add('sales_orders', 'sales_area_id', 'INTEGER REFERENCES sales_areas(id)');
  add('vendor_invoices', 'tax_code_id', 'INTEGER REFERENCES tax_codes(id)');
  add('vendor_invoices', 'tax_amount', 'INTEGER NOT NULL DEFAULT 0');
  add('customer_invoices', 'tax_code_id', 'INTEGER REFERENCES tax_codes(id)');
  add('customer_invoices', 'tax_amount', 'INTEGER NOT NULL DEFAULT 0');
  add('journal_lines', 'cost_center_id', 'INTEGER REFERENCES cost_centers(id)');
  add('journal_entries', 'doc_type', 'TEXT');
}

/** FI document type per posting source (like SAP's SA, WE, RE, ...). */
export const SOURCE_DOC_TYPES: Record<string, string> = {
  MANUAL: 'SA',
  GR: 'WE',
  GI: 'WA',
  INITIAL: 'WA',
  ADJUST: 'WI',
  INVOICE: 'RE',
  PAYMENT: 'KZ',
  DELIVERY: 'WL',
  BILLING: 'RV',
  RECEIPT: 'DZ',
};

/** SAP-style number ranges per document type. */
const NUMBER_RANGES: [string, number][] = [
  ['JE', 100000001],   // FI documents
  ['PO', 4500000001],  // purchase orders
  ['MAT', 5000000001], // material documents
  ['INV', 5100000001], // vendor invoices
  ['PAY', 1500000001], // outgoing payments
  ['SO', 10000001],    // sales orders
  ['BIL', 90000001],   // customer invoices (billing documents)
  ['RCP', 1400000001], // incoming payments
  ['IDOC', 1],         // IDoc numbers (shown with 16 digits)
];

const ACCOUNTS: [string, string, string][] = [
  ['100000', 'Cash on Hand', 'ASSET'],
  ['110000', 'Bank - Main Account', 'ASSET'],
  ['120000', 'Accounts Receivable', 'ASSET'],
  ['140000', 'Inventory - Materials', 'ASSET'],
  ['154000', 'Input Tax Receivable', 'ASSET'],
  ['160000', 'Property, Plant & Equipment', 'ASSET'],
  ['200000', 'Accounts Payable', 'LIABILITY'],
  ['210000', 'GR/IR Clearing', 'LIABILITY'],
  ['175000', 'Output Tax Payable', 'LIABILITY'],
  ['220000', 'Accrued Liabilities', 'LIABILITY'],
  ['300000', 'Share Capital', 'EQUITY'],
  ['310000', 'Retained Earnings', 'EQUITY'],
  ['390000', 'Opening Balance Offset', 'EQUITY'],
  ['400000', 'Sales Revenue', 'REVENUE'],
  ['490000', 'Other Income', 'REVENUE'],
  ['500000', 'Material Consumption', 'EXPENSE'],
  ['505000', 'Cost of Goods Sold', 'EXPENSE'],
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
  ['AR', '120000', 'Customer reconciliation account'],
  ['REVENUE', '400000', 'Sales revenue (ERL)'],
  ['COGS', '505000', 'Cost of goods sold on delivery (GBB-VAX)'],
];

export function openDb(file?: string): DB {
  const target = file ?? process.env.ERP_DB ?? path.resolve(process.cwd(), 'data', 'erp.sqlite');
  if (target !== ':memory:') fs.mkdirSync(path.dirname(target), { recursive: true });
  const db = new Database(target);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  migrate(db);
  db.exec(SCHEMA);
  db.exec(CUSTOMIZING_SCHEMA);
  addColumns(db);
  bootstrap(db);
  bootstrapCustomizing(db);
  return db;
}

/**
 * Upgrades databases created by earlier versions. CREATE TABLE IF NOT EXISTS adds new tables,
 * but new columns and changed CHECK constraints on existing tables need explicit steps.
 */
function migrate(db: DB) {
  const exists = (t: string) => !!db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(t);
  const hasColumn = (t: string, c: string) => (db.prepare(`PRAGMA table_info(${t})`).all() as { name: string }[]).some((r) => r.name === c);
  const addColumn = (t: string, c: string, def: string) => exists(t) && !hasColumn(t, c) && db.exec(`ALTER TABLE ${t} ADD COLUMN ${c} ${def}`);

  addColumn('materials', 'sales_price', 'INTEGER NOT NULL DEFAULT 0');
  addColumn('journal_lines', 'customer_id', 'INTEGER REFERENCES customers(id)');
  addColumn('stock_movements', 'so_line_id', 'INTEGER REFERENCES so_lines(id)');

  // v0.1 users table did not allow the 'sales' role: rebuild it with the new CHECK constraint.
  const usersSql = (db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'users'").get() as { sql: string } | undefined)?.sql;
  if (usersSql && !usersSql.includes("'sales'")) {
    db.pragma('foreign_keys = OFF');
    db.transaction(() => {
      db.exec(`
        CREATE TABLE users_new (
          id INTEGER PRIMARY KEY,
          username TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          full_name TEXT NOT NULL,
          role TEXT NOT NULL CHECK (role IN ('admin','finance','purchasing','warehouse','sales')),
          is_active INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        INSERT INTO users_new SELECT id, username, password_hash, full_name, role, is_active, created_at FROM users;
        DROP TABLE users;
        ALTER TABLE users_new RENAME TO users;`);
    })();
    db.pragma('foreign_keys = ON');
  }
}

/** Idempotent base configuration: number ranges, chart of accounts, account determination, admin user. */
function bootstrap(db: DB) {
  const tx = db.transaction(() => {
    db.prepare('INSERT OR IGNORE INTO settings(key, value) VALUES (?, ?)').run('jwt_secret', crypto.randomBytes(32).toString('hex'));
    db.prepare('INSERT OR IGNORE INTO settings(key, value) VALUES (?, ?)').run('company_name', 'Demo Company Ltd.');
    db.prepare('INSERT OR IGNORE INTO settings(key, value) VALUES (?, ?)').run('currency', 'USD');
    const nr = db.prepare('INSERT OR IGNORE INTO number_ranges(object, next_no) VALUES (?, ?)');
    NUMBER_RANGES.forEach(([o, n]) => nr.run(o, n));

    // Insert standard accounts that are missing (by code); never overwrite user changes.
    const acc = db.prepare('INSERT OR IGNORE INTO accounts(code, name, type) VALUES (?, ?, ?)');
    ACCOUNTS.forEach((a) => acc.run(...a));
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

/**
 * Default customizing, inserted only where missing so user changes survive restarts.
 * Also links data from older versions (warehouses without plant, partners with only a number of days).
 */
function bootstrapCustomizing(db: DB) {
  db.transaction(() => {
    if (!db.prepare('SELECT 1 FROM plants').get()) db.prepare("INSERT INTO plants(code, name, country) VALUES ('1000', 'Main Plant', 'US')").run();
    db.prepare('UPDATE warehouses SET plant_id = (SELECT MIN(id) FROM plants) WHERE plant_id IS NULL').run();

    const mt = db.prepare('INSERT OR IGNORE INTO material_types(code, description, purchasable, sellable) VALUES (?, ?, ?, ?)');
    mt.run('RAW', 'Raw material (ROH)', 1, 1);
    mt.run('TRADING', 'Trading goods (HAWA)', 1, 1);
    mt.run('FINISHED', 'Finished product (FERT)', 0, 1);
    mt.run('CONSUMABLE', 'Operating supplies (HIBE)', 1, 0);

    const u = db.prepare('INSERT OR IGNORE INTO units(code, description, dimension) VALUES (?, ?, ?)');
    for (const [c, d, dim] of [
      ['EA', 'Each', 'QUANTITY'], ['PC', 'Piece', 'QUANTITY'], ['BOX', 'Box', 'QUANTITY'], ['PAL', 'Pallet', 'QUANTITY'],
      ['KG', 'Kilogram', 'MASS'], ['G', 'Gram', 'MASS'], ['TO', 'Metric ton', 'MASS'],
      ['M', 'Meter', 'LENGTH'], ['CM', 'Centimeter', 'LENGTH'], ['M2', 'Square meter', 'AREA'],
      ['L', 'Liter', 'VOLUME'], ['ML', 'Milliliter', 'VOLUME'], ['H', 'Hour', 'TIME'],
    ]) u.run(c, d, dim);
    db.prepare("INSERT OR IGNORE INTO units(code, description) SELECT DISTINCT uom, uom FROM materials").run();

    const dt = db.prepare('INSERT OR IGNORE INTO fi_document_types(code, description, manual_allowed) VALUES (?, ?, ?)');
    for (const [c, d, m] of [
      ['SA', 'G/L account document', 1], ['AB', 'Accounting document', 1], ['WE', 'Goods receipt', 0], ['WA', 'Goods issue', 0],
      ['WI', 'Inventory document', 0], ['WL', 'Goods issue for delivery', 0], ['RE', 'Invoice receipt (gross)', 0],
      ['KZ', 'Vendor payment', 0], ['RV', 'Billing document transfer', 0], ['DZ', 'Customer payment', 0],
    ] as const) dt.run(c, d, m);
    db.prepare("UPDATE journal_entries SET doc_type = CASE source " +
      Object.entries(SOURCE_DOC_TYPES).map(([src, t]) => `WHEN '${src}' THEN '${t}'`).join(' ') +
      " ELSE 'SA' END WHERE doc_type IS NULL AND source <> 'REVERSAL'").run();
    db.prepare(`UPDATE journal_entries SET doc_type = (SELECT o.doc_type FROM journal_entries o WHERE o.id = journal_entries.reversal_of)
                WHERE doc_type IS NULL AND source = 'REVERSAL'`).run();

    const tax = db.prepare(`INSERT OR IGNORE INTO tax_codes(code, description, direction, rate_pct, account_id)
                            SELECT ?, ?, ?, ?, id FROM accounts WHERE code = ?`);
    tax.run('V0', 'Input tax 0%', 'INPUT', 0, '154000');
    tax.run('V1', 'Input tax 10%', 'INPUT', 10, '154000');
    tax.run('A0', 'Output tax 0%', 'OUTPUT', 0, '175000');
    tax.run('A1', 'Output tax 10%', 'OUTPUT', 10, '175000');

    const pt = db.prepare('INSERT OR IGNORE INTO payment_terms(code, description, net_days) VALUES (?, ?, ?)');
    pt.run('NT00', 'Due immediately', 0);
    for (const d of [14, 30, 45, 60]) pt.run(`NT${d}`, `Net ${d} days`, d);
    for (const t of ['vendors', 'customers']) {
      for (const r of db.prepare(`SELECT DISTINCT payment_terms_days d FROM ${t} WHERE payment_terms_id IS NULL`).all() as { d: number }[])
        pt.run(`NT${String(r.d).padStart(2, '0')}`, `Net ${r.d} days`, r.d);
      db.prepare(`UPDATE ${t} SET payment_terms_id = (SELECT id FROM payment_terms p WHERE p.net_days = ${t}.payment_terms_days ORDER BY id LIMIT 1)
                  WHERE payment_terms_id IS NULL`).run();
    }

    if (!db.prepare('SELECT 1 FROM sales_areas').get())
      db.prepare("INSERT INTO sales_areas(sales_org, distr_channel, division, name) VALUES ('1000', '10', '00', 'Direct sales')").run();
    db.prepare('UPDATE sales_orders SET sales_area_id = (SELECT MIN(id) FROM sales_areas) WHERE sales_area_id IS NULL').run();
  })();
}
