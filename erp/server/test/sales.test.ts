import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openDb, type DB } from '../src/db.ts';
import { trialBalance } from '../src/services/finance.ts';
import { postGoodsMovement, stockOverview } from '../src/services/inventory.ts';
import { createSO, getSO, postBilling, postDelivery, postReceipt, setSOStatus, arAging } from '../src/services/sales.ts';

let db: DB;
let wh: number, customer: number, mat: number;
const bal = (code: string) => trialBalance(db).accounts.find((a) => a.code === code)!.balance;

beforeEach(() => {
  db = openDb(':memory:');
  wh = Number(db.prepare("INSERT INTO warehouses(code, name) VALUES ('W1','One')").run().lastInsertRowid);
  customer = Number(db.prepare("INSERT INTO customers(code, name, payment_terms_days) VALUES ('C1','Customer', 30)").run().lastInsertRowid);
  mat = Number(db.prepare("INSERT INTO materials(code, name, sales_price) VALUES ('M1','Widget', 2500)").run().lastInsertRowid);
  postGoodsMovement(db, { movementType: '561', warehouseId: wh, items: [{ materialId: mat, qty: 10, amount: 10000 }] }, 1); // 10 @ 10.00
});

function confirmedSO(qty = 4, unitPrice?: number) {
  const so = createSO(db, { customerId: customer, warehouseId: wh, lines: [{ materialId: mat, qty, unitPrice }] }, 1);
  setSOStatus(db, so.id, 'confirm');
  const line = (db.prepare('SELECT id FROM so_lines WHERE so_id = ?').get(so.id) as { id: number }).id;
  return { so: so.id, line };
}

test('order-to-cash: delivery posts COGS, billing posts revenue/AR, receipt clears AR', () => {
  const { so, line } = confirmedSO(4); // list price 25.00
  assert.equal(getSO(db, so).lines[0].unit_price, 25, 'defaults to material list price');

  postDelivery(db, so, { lines: [{ soLineId: line, qty: 4 }] }, 1);
  assert.equal(bal('505000'), 40, 'COGS at moving average 4 x 10.00');
  assert.equal(bal('140000'), 60);
  assert.equal(getSO(db, so).status, 'DELIVERED');

  const inv = postBilling(db, so, {}, 1);
  assert.equal(bal('120000'), 100);
  assert.equal(bal('400000'), -100);

  assert.throws(() => postReceipt(db, inv.id, { amount: 20000 }, 1), /exceeds open amount/);
  postReceipt(db, inv.id, { amount: 6000 }, 1);
  postReceipt(db, inv.id, { amount: 4000 }, 1);
  assert.equal(bal('120000'), 0);
  assert.equal((db.prepare('SELECT status FROM customer_invoices WHERE id = ?').get(inv.id) as any).status, 'PAID');
  setSOStatus(db, so, 'close');

  const tb = trialBalance(db);
  assert.equal(tb.totals.debit, tb.totals.credit);
  assert.equal(Math.round(stockOverview(db)[0].value * 100), Math.round(bal('140000') * 100));
});

test('billing is limited to delivered quantity', () => {
  const { so, line } = confirmedSO(6, 3000);
  assert.throws(() => postBilling(db, so, {}, 1), /Nothing to bill/);
  postDelivery(db, so, { lines: [{ soLineId: line, qty: 2 }] }, 1);
  assert.equal(getSO(db, so).status, 'PARTIALLY_DELIVERED');
  assert.throws(() => postBilling(db, so, { lines: [{ soLineId: line, qty: 3 }] }, 1), /only 2 delivered/);
  postBilling(db, so, {}, 1);
  assert.equal(bal('400000'), -60);
  assert.throws(() => setSOStatus(db, so, 'cancel'), /without deliveries/);
});

test('delivery cannot exceed stock or open order quantity', () => {
  const { so, line } = confirmedSO(12);
  assert.throws(() => postDelivery(db, so, { lines: [{ soLineId: line, qty: 11 }] }, 1), /Insufficient stock/);
  postDelivery(db, so, { lines: [{ soLineId: line, qty: 10 }] }, 1);
  assert.throws(() => postDelivery(db, so, { lines: [{ soLineId: line, qty: 3 }] }, 1), /only 2 open/);
  assert.equal(bal('140000'), 0, 'last units take the full remaining value');
});

test('draft orders cannot be delivered', () => {
  const so = createSO(db, { customerId: customer, warehouseId: wh, lines: [{ materialId: mat, qty: 1 }] }, 1);
  const line = (db.prepare('SELECT id FROM so_lines WHERE so_id = ?').get(so.id) as { id: number }).id;
  assert.throws(() => postDelivery(db, so.id, { lines: [{ soLineId: line, qty: 1 }] }, 1), /status DRAFT/);
});

test('credit limit blocks confirmation when exposure is too high', () => {
  db.prepare('UPDATE customers SET credit_limit = 10000 WHERE id = ?').run(customer); // 100.00
  const first = confirmedSO(3); // 75.00
  postDelivery(db, first.so, { lines: [{ soLineId: first.line, qty: 3 }] }, 1);
  postBilling(db, first.so, {}, 1); // 75 open AR
  const second = createSO(db, { customerId: customer, warehouseId: wh, lines: [{ materialId: mat, qty: 2 }] }, 1); // +50
  assert.throws(() => setSOStatus(db, second.id, 'confirm'), /Credit limit exceeded/);
  const small = createSO(db, { customerId: customer, warehouseId: wh, lines: [{ materialId: mat, qty: 1 }] }, 1); // +25
  setSOStatus(db, small.id, 'confirm');
});

test('AR aging puts overdue invoices in the right bucket', () => {
  const { so, line } = confirmedSO(2);
  postDelivery(db, so, { lines: [{ soLineId: line, qty: 2 }] }, 1);
  postBilling(db, so, { invoiceDate: '2026-01-01', dueDate: '2026-01-31' }, 1);
  const aging = arAging(db, '2026-03-15');
  assert.equal(aging.customers[0].d31_60, 50);
  assert.equal(aging.customers[0].total, 50);
});

test('upgrades a database created before the Sales module', () => {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'erp-mig-')), 'old.sqlite');
  const old = new Database(file);
  old.exec(`
    CREATE TABLE users (id INTEGER PRIMARY KEY, username TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, full_name TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('admin','finance','purchasing','warehouse')), is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')));
    INSERT INTO users(username, password_hash, full_name, role) VALUES ('admin', 'x', 'Admin', 'admin');
    CREATE TABLE materials (id INTEGER PRIMARY KEY, code TEXT NOT NULL UNIQUE, name TEXT NOT NULL, uom TEXT NOT NULL DEFAULT 'EA',
      material_type TEXT NOT NULL DEFAULT 'RAW', reorder_level REAL NOT NULL DEFAULT 0, stock_value INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1);
    CREATE TABLE accounts (id INTEGER PRIMARY KEY, code TEXT NOT NULL UNIQUE, name TEXT NOT NULL, type TEXT NOT NULL, is_active INTEGER NOT NULL DEFAULT 1);
    INSERT INTO accounts(code, name, type) VALUES ('110000', 'My renamed bank', 'ASSET');`);
  old.close();

  const upgraded = openDb(file);
  upgraded.prepare("INSERT INTO users(username, password_hash, full_name, role) VALUES ('s', 'x', 'S', 'sales')").run();
  upgraded.prepare("INSERT INTO materials(code, name, sales_price) VALUES ('X', 'X', 100)").run();
  assert.equal((upgraded.prepare("SELECT name FROM accounts WHERE code = '110000'").get() as any).name, 'My renamed bank', 'existing accounts untouched');
  assert.ok(upgraded.prepare("SELECT 1 FROM accounts WHERE code = '505000'").get(), 'new COGS account added');
  assert.ok(upgraded.prepare("SELECT 1 FROM account_determination WHERE key = 'COGS'").get());
  assert.equal((upgraded.prepare("SELECT username FROM users WHERE id = 1").get() as any).username, 'admin');
  upgraded.close();
});
