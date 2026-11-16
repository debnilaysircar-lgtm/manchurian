import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { openDb, type DB } from '../src/db.ts';
import { postJournal, reverseJournal, trialBalance, financialStatements } from '../src/services/finance.ts';
import { postGoodsMovement, stockOverview } from '../src/services/inventory.ts';
import { createPO, postGoodsReceipt, postInvoice, postPayment, setPOStatus, getPO } from '../src/services/purchasing.ts';
import { seedDemoData } from '../src/seed.ts';

let db: DB;
let wh1: number, wh2: number, vendor: number, mat: number;
const acc = (code: string) => (db.prepare('SELECT id FROM accounts WHERE code = ?').get(code) as { id: number }).id;
const bal = (code: string) => trialBalance(db).accounts.find((a) => a.code === code)!.balance;

beforeEach(() => {
  db = openDb(':memory:');
  wh1 = Number(db.prepare("INSERT INTO warehouses(code, name) VALUES ('W1','One')").run().lastInsertRowid);
  wh2 = Number(db.prepare("INSERT INTO warehouses(code, name) VALUES ('W2','Two')").run().lastInsertRowid);
  vendor = Number(db.prepare("INSERT INTO vendors(code, name) VALUES ('V1','Vendor')").run().lastInsertRowid);
  mat = Number(db.prepare("INSERT INTO materials(code, name) VALUES ('M1','Widget')").run().lastInsertRowid);
});

function releasedPO(qty = 10, price = 1000) {
  const po = createPO(db, { vendorId: vendor, warehouseId: wh1, lines: [{ materialId: mat, qty, unitPrice: price }] }, 1);
  setPOStatus(db, po.id, 'release');
  const line = (db.prepare('SELECT id FROM po_lines WHERE po_id = ?').get(po.id) as { id: number }).id;
  return { po: po.id, line };
}

test('rejects unbalanced journal entries', () => {
  assert.throws(
    () => postJournal(db, { source: 'MANUAL', lines: [{ accountId: acc('110000'), debit: 100 }, { accountId: acc('300000'), credit: 99 }] }, 1),
    /not balanced/,
  );
});

test('manual journal reversal nets to zero', () => {
  const je = postJournal(db, { source: 'MANUAL', lines: [{ accountId: acc('610000'), debit: 5000 }, { accountId: acc('110000'), credit: 5000 }] }, 1);
  reverseJournal(db, je.id, 1);
  assert.equal(bal('610000'), 0);
  assert.throws(() => reverseJournal(db, je.id, 1), /already reversed/);
});

test('procure-to-pay flow posts GR/IR, AP and clears them', () => {
  const { po, line } = releasedPO(10, 1000); // 10 x 10.00
  postGoodsReceipt(db, po, { lines: [{ poLineId: line, qty: 10 }] }, 1);
  assert.equal(bal('140000'), 100);
  assert.equal(bal('210000'), -100);
  assert.equal(getPO(db, po).status, 'RECEIVED');

  const inv = postInvoice(db, po, { vendorRef: 'X1', lines: [{ poLineId: line, qty: 10, unitPrice: 1050 }] }, 1);
  assert.equal(bal('210000'), 0, 'GR/IR cleared');
  assert.equal(bal('510000'), 5, 'price difference');
  assert.equal(bal('200000'), -105);

  assert.throws(() => postPayment(db, inv.id, { amount: 20000 }, 1), /exceeds open amount/);
  postPayment(db, inv.id, { amount: 10500 }, 1);
  assert.equal(bal('200000'), 0);
  assert.equal((db.prepare('SELECT status FROM vendor_invoices WHERE id = ?').get(inv.id) as any).status, 'PAID');
  setPOStatus(db, po, 'close');
  const tb = trialBalance(db);
  assert.equal(tb.totals.debit, tb.totals.credit);
});

test('three-way match blocks invoicing more than received', () => {
  const { po, line } = releasedPO(10, 1000);
  postGoodsReceipt(db, po, { lines: [{ poLineId: line, qty: 4 }] }, 1);
  assert.equal(getPO(db, po).status, 'PARTIALLY_RECEIVED');
  assert.throws(() => postInvoice(db, po, { vendorRef: 'X', lines: [{ poLineId: line, qty: 5, unitPrice: 1000 }] }, 1), /only 4 received/);
  assert.throws(() => postGoodsReceipt(db, po, { lines: [{ poLineId: line, qty: 7 }] }, 1), /only 6 open/);
});

test('cannot receive against a draft PO', () => {
  const po = createPO(db, { vendorId: vendor, warehouseId: wh1, lines: [{ materialId: mat, qty: 1, unitPrice: 1 }] }, 1);
  const line = (db.prepare('SELECT id FROM po_lines WHERE po_id = ?').get(po.id) as { id: number }).id;
  assert.throws(() => postGoodsReceipt(db, po.id, { lines: [{ poLineId: line, qty: 1 }] }, 1), /status DRAFT/);
});

test('moving average valuation and goods issue', () => {
  postGoodsMovement(db, { movementType: '561', warehouseId: wh1, items: [{ materialId: mat, qty: 10, amount: 10000 }] }, 1); // 10 @ 10.00
  const { po, line } = releasedPO(10, 2000); // 10 @ 20.00
  postGoodsReceipt(db, po, { lines: [{ poLineId: line, qty: 10 }] }, 1);
  assert.equal(stockOverview(db)[0].movingAveragePrice, 15);

  postGoodsMovement(db, { movementType: '201', warehouseId: wh1, items: [{ materialId: mat, qty: 4 }] }, 1);
  assert.equal(bal('500000'), 60);
  assert.equal(bal('140000'), 240);
  assert.throws(() => postGoodsMovement(db, { movementType: '201', warehouseId: wh1, items: [{ materialId: mat, qty: 17 }] }, 1), /Insufficient stock/);

  // Issuing the remainder empties the value exactly
  postGoodsMovement(db, { movementType: '201', warehouseId: wh1, items: [{ materialId: mat, qty: 16 }] }, 1);
  assert.equal(bal('140000'), 0);
});

test('transfer moves quantity without GL impact', () => {
  postGoodsMovement(db, { movementType: '561', warehouseId: wh1, items: [{ materialId: mat, qty: 5, amount: 500 }] }, 1);
  const r = postGoodsMovement(db, { movementType: '301', warehouseId: wh1, toWarehouseId: wh2, items: [{ materialId: mat, qty: 2 }] }, 1);
  assert.equal(r.journalDocNo, null);
  const s = stockOverview(db)[0];
  assert.deepEqual(s.warehouses.map((w) => [w.warehouseCode, w.qty]).sort(), [['W1', 3], ['W2', 2]]);
  assert.throws(() => postGoodsMovement(db, { movementType: '301', warehouseId: wh2, toWarehouseId: wh1, items: [{ materialId: mat, qty: 3 }] }, 1), /Insufficient/);
});

test('demo data keeps the ledger balanced and the balance sheet in balance', () => {
  db = openDb(':memory:'); // fresh database: the seeder skips databases that already have data
  seedDemoData(db);
  assert.ok((db.prepare('SELECT COUNT(*) n FROM sales_orders').get() as { n: number }).n > 0, 'demo data was loaded');
  const tb = trialBalance(db);
  assert.equal(tb.totals.debit, tb.totals.credit);
  const fs = financialStatements(db, '2000-01-01', '2999-12-31').balanceSheet;
  assert.equal(fs.totalAssets, Math.round((fs.totalLiabilities + fs.totalEquity) * 100) / 100);
  // Subledger ties to GL: inventory valuation equals inventory account
  const stockValue = stockOverview(db).reduce((s, m) => s + m.value, 0);
  assert.equal(Math.round(stockValue * 100), Math.round(bal('140000') * 100));
});
