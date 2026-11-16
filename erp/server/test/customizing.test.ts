import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openDb, type DB } from '../src/db.ts';
import { getJournal, postJournal, trialBalance, costCenterReport, reverseJournal } from '../src/services/finance.ts';
import { postGoodsMovement, stockOverview } from '../src/services/inventory.ts';
import { createPO, getPO, postGoodsReceipt, postInvoice, setPOStatus } from '../src/services/purchasing.ts';
import { createSO, getSO, postBilling, postDelivery, setSOStatus } from '../src/services/sales.ts';
import { setConfig } from '../src/services/config.ts';
import { deleteRow, getObject, saveRow } from '../src/services/customizing.ts';
import * as idoc from '../src/services/idoc.ts';
import { seedDemoData } from '../src/seed.ts';

let db: DB;
let wh: number, vendor: number, customer: number, mat: number;
const acc = (code: string) => (db.prepare('SELECT id FROM accounts WHERE code = ?').get(code) as { id: number }).id;
const bal = (code: string) => trialBalance(db).accounts.find((a) => a.code === code)!.balance;
const idOf = (table: string, code: string) => (db.prepare(`SELECT id FROM ${table} WHERE code = ?`).get(code) as { id: number }).id;

beforeEach(() => {
  db = openDb(':memory:');
  const plant = idOf('plants', '1000');
  wh = Number(db.prepare("INSERT INTO warehouses(code, name, plant_id) VALUES ('W1','One', ?)").run(plant).lastInsertRowid);
  vendor = Number(db.prepare("INSERT INTO vendors(code, name) VALUES ('V1','Vendor')").run().lastInsertRowid);
  customer = Number(db.prepare("INSERT INTO customers(code, name) VALUES ('C1','Customer')").run().lastInsertRowid);
  mat = Number(db.prepare("INSERT INTO materials(code, name, sales_price, material_type) VALUES ('M1','Widget', 2000, 'TRADING')").run().lastInsertRowid);
  postGoodsMovement(db, { movementType: '561', warehouseId: wh, items: [{ materialId: mat, qty: 100, amount: 100000 }] }, 1); // 100 @ 10.00
});

test('default customizing is created and data from older versions is linked', () => {
  for (const t of ['plants', 'units', 'material_types', 'fi_document_types', 'tax_codes', 'payment_terms', 'sales_areas'])
    assert.ok((db.prepare(`SELECT COUNT(*) n FROM ${t}`).get() as { n: number }).n > 0, t);
  // A database whose partners only have a number of days gets linked to matching terms when it is opened.
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'erp-cust-')), 'old.sqlite');
  const old = openDb(file);
  old.prepare("INSERT INTO vendors(code, name, payment_terms_days) VALUES ('VX', 'Old vendor', 21)").run();
  old.prepare("INSERT INTO warehouses(code, name) VALUES ('OLD', 'Old warehouse')").run();
  old.close();
  const reopened = openDb(file);
  const v = reopened.prepare("SELECT p.code FROM vendors v JOIN payment_terms p ON p.id = v.payment_terms_id WHERE v.code = 'VX'").get() as any;
  assert.equal(v.code, 'NT21');
  assert.ok((reopened.prepare("SELECT plant_id FROM warehouses WHERE code = 'OLD'").get() as any).plant_id);
  reopened.close();
});

test('plants and storage locations: validation, filtering and protection of used records', () => {
  const p2 = saveRow(db, 'plants', null, { code: '2000', name: 'Second plant', country: 'de' }, 'admin').id;
  assert.equal((db.prepare('SELECT country FROM plants WHERE id = ?').get(p2) as any).country, 'DE');
  assert.throws(() => saveRow(db, 'plants', null, { code: '20', name: 'x' }, 'admin'), /4 characters/);
  assert.throws(() => saveRow(db, 'plants', null, { code: '3000', name: 'x' }, 'warehouse'), /not authorized/);
  const w2 = saveRow(db, 'storage_locations', null, { code: 'w2', name: 'Two', plant_id: p2 }, 'warehouse').id;
  assert.throws(() => saveRow(db, 'storage_locations', null, { code: 'W3', name: 'Three' }, 'admin'), /Plant is required/);
  postGoodsMovement(db, { movementType: '301', warehouseId: wh, toWarehouseId: w2, items: [{ materialId: mat, qty: 30 }] }, 1);
  assert.equal(stockOverview(db, { plantId: p2 })[0].qty, 30);
  assert.equal(stockOverview(db, { plantId: idOf('plants', '1000') })[0].qty, 70);
  assert.throws(() => deleteRow(db, 'plants', p2, 'admin'), /used by 1 storage locations/);
  assert.throws(() => deleteRow(db, 'storage_locations', w2, 'admin'), /used by 1 materials with stock/);
  const w3 = saveRow(db, 'storage_locations', null, { code: 'W3', name: 'Empty', plant_id: p2 }, 'admin').id;
  deleteRow(db, 'storage_locations', w3, 'admin');
  // Codes are keys and cannot be changed afterwards
  saveRow(db, 'plants', p2, { code: '9999', name: 'Renamed' }, 'admin');
  assert.equal((db.prepare('SELECT code, name FROM plants WHERE id = ?').get(p2) as any).code, '2000');
});

test('purchasing group release limit overrides the global limit', () => {
  const g = saveRow(db, 'purchasing_groups', null, { code: '001', name: 'Buyers', release_limit: '50' }, 'purchasing').id;
  assert.equal(getObject(db, 'purchasing_groups').rows[0].release_limit, 50);
  const po = createPO(db, { vendorId: vendor, warehouseId: wh, purchasingGroupId: g, lines: [{ materialId: mat, qty: 10, unitPrice: 1000 }] }, 1); // 100.00
  assert.throws(() => setPOStatus(db, po.id, 'release', 'purchasing'), /release limit of 50/);
  saveRow(db, 'purchasing_groups', g, { code: '001', name: 'Buyers', release_limit: '' }, 'purchasing'); // fall back to global (0 = none)
  setPOStatus(db, po.id, 'release', 'purchasing');
  assert.equal(getPO(db, po.id).purchasing_group_code, '001');
});

test('material types control what can be bought and sold', () => {
  const fin = Number(db.prepare("INSERT INTO materials(code, name, material_type) VALUES ('F1','Finished','FINISHED')").run().lastInsertRowid);
  assert.throws(() => createPO(db, { vendorId: vendor, warehouseId: wh, lines: [{ materialId: fin, qty: 1, unitPrice: 1 }] }, 1), /cannot be purchased/);
  const supply = Number(db.prepare("INSERT INTO materials(code, name, material_type) VALUES ('S1','Gloves','CONSUMABLE')").run().lastInsertRowid);
  assert.throws(() => createSO(db, { customerId: customer, warehouseId: wh, lines: [{ materialId: supply, qty: 1 }] }, 1), /cannot be sold/);
  const t = idOf('material_types', 'CONSUMABLE');
  saveRow(db, 'material_types', t, { description: 'Supplies', purchasable: true, sellable: true }, 'admin');
  createSO(db, { customerId: customer, warehouseId: wh, lines: [{ materialId: supply, qty: 1 }] }, 1);
  assert.throws(() => saveRow(db, 'material_types', null, { code: 'NEW', description: 'x' }, 'admin'), /fixed/);
  assert.throws(() => deleteRow(db, 'material_types', t, 'admin'), /cannot be deleted/);
});

test('input tax on vendor invoices and output tax on customer invoices', () => {
  const po = createPO(db, { vendorId: vendor, warehouseId: wh, lines: [{ materialId: mat, qty: 10, unitPrice: 1000 }] }, 1);
  setPOStatus(db, po.id, 'release');
  const line = getPO(db, po.id).lines[0].id;
  postGoodsReceipt(db, po.id, { lines: [{ poLineId: line, qty: 10 }] }, 1);
  assert.throws(() => postInvoice(db, po.id, { vendorRef: 'X', taxCodeId: idOf('tax_codes', 'A1'), lines: [{ poLineId: line, qty: 10, unitPrice: 1000 }] }, 1), /output tax code/);
  postInvoice(db, po.id, { vendorRef: 'X', taxCodeId: idOf('tax_codes', 'V1'), lines: [{ poLineId: line, qty: 10, unitPrice: 1000 }] }, 1);
  assert.equal(bal('154000'), 10, 'input tax 10% of 100');
  assert.equal(bal('200000'), -110, 'AP is gross');

  db.prepare('UPDATE customers SET tax_code_id = ? WHERE id = ?').run(idOf('tax_codes', 'A1'), customer);
  const so = createSO(db, { customerId: customer, warehouseId: wh, lines: [{ materialId: mat, qty: 5 }] }, 1); // 5 x 20.00
  setSOStatus(db, so.id, 'confirm');
  postDelivery(db, so.id, { lines: [{ soLineId: getSO(db, so.id).lines[0].id, qty: 5 }] }, 1);
  const inv = postBilling(db, so.id, {}, 1);
  assert.equal(bal('175000'), -10, 'output tax 10% of 100');
  assert.equal(bal('400000'), -100, 'revenue is net');
  assert.equal(bal('120000'), 110, 'AR is gross');
  const row = db.prepare('SELECT total, tax_amount FROM customer_invoices WHERE id = ?').get(inv.id) as any;
  assert.deepEqual([row.total, row.tax_amount], [11000, 1000]);
  const tb = trialBalance(db);
  assert.equal(tb.totals.debit, tb.totals.credit);
  // Rate of a used tax code cannot change
  assert.throws(() => saveRow(db, 'tax_codes', idOf('tax_codes', 'A1'), { description: 'x', direction: 'OUTPUT', rate_pct: 20, account_id: acc('175000') }, 'finance'), /used on posted invoices/);
});

test('payment terms drive due dates and changes reach every partner using them', () => {
  const t = saveRow(db, 'payment_terms', null, { code: 'NT21', description: 'Net 21', net_days: 21 }, 'finance').id;
  db.prepare('UPDATE vendors SET payment_terms_id = ?, payment_terms_days = 21 WHERE id = ?').run(t, vendor);
  saveRow(db, 'payment_terms', t, { description: 'Net 25', net_days: 25 }, 'finance');
  assert.equal((db.prepare('SELECT payment_terms_days d FROM vendors WHERE id = ?').get(vendor) as any).d, 25);
  const po = createPO(db, { vendorId: vendor, warehouseId: wh, lines: [{ materialId: mat, qty: 1, unitPrice: 100 }] }, 1);
  setPOStatus(db, po.id, 'release');
  const line = getPO(db, po.id).lines[0].id;
  postGoodsReceipt(db, po.id, { lines: [{ poLineId: line, qty: 1 }] }, 1);
  const inv = postInvoice(db, po.id, { vendorRef: 'T', invoiceDate: '2026-03-01', lines: [{ poLineId: line, qty: 1, unitPrice: 100 }] }, 1);
  assert.equal((db.prepare('SELECT due_date FROM vendor_invoices WHERE id = ?').get(inv.id) as any).due_date, '2026-03-26');
  assert.throws(() => deleteRow(db, 'payment_terms', t, 'finance'), /used by 1 vendors/);
});

test('cost centers on goods issues and journal lines, with the report', () => {
  const cc = saveRow(db, 'cost_centers', null, { code: 'CC10', name: 'Workshop', is_active: true }, 'finance').id;
  setConfig(db, { cost_center_required_gi: true }, 'admin');
  assert.throws(() => postGoodsMovement(db, { movementType: '201', warehouseId: wh, items: [{ materialId: mat, qty: 1 }] }, 1), /cost center is required/);
  postGoodsMovement(db, { movementType: '201', warehouseId: wh, costCenterId: cc, items: [{ materialId: mat, qty: 4 }] }, 1); // 40.00
  assert.throws(
    () => postJournal(db, { source: 'MANUAL', lines: [{ accountId: acc('110000'), debit: 100, costCenterId: cc }, { accountId: acc('300000'), credit: 100 }] }, 1),
    /balance sheet account/,
  );
  const je = postJournal(db, { source: 'MANUAL', lines: [{ accountId: acc('610000'), debit: 2500, costCenterId: cc }, { accountId: acc('110000'), credit: 2500 }] }, 1);
  const rep = costCenterReport(db, '2000-01-01', '2999-12-31');
  assert.equal(rep.centers[0].code, 'CC10');
  assert.equal(rep.centers[0].total, 65);
  reverseJournal(db, je.id, 1);
  assert.equal(costCenterReport(db, '2000-01-01', '2999-12-31').centers[0].total, 40, 'reversal carries the cost center');
  saveRow(db, 'cost_centers', cc, { name: 'Workshop', is_active: false }, 'finance');
  assert.throws(() => postGoodsMovement(db, { movementType: '201', warehouseId: wh, costCenterId: cc, items: [{ materialId: mat, qty: 1 }] }, 1), /closed for postings/);
});

test('document types are assigned per posting source and kept on reversal', () => {
  const po = createPO(db, { vendorId: vendor, warehouseId: wh, lines: [{ materialId: mat, qty: 1, unitPrice: 100 }] }, 1);
  setPOStatus(db, po.id, 'release');
  const gr = postGoodsReceipt(db, po.id, { lines: [{ poLineId: getPO(db, po.id).lines[0].id, qty: 1 }] }, 1);
  const grJe = db.prepare('SELECT doc_type FROM journal_entries WHERE doc_no = ?').get(gr.journalDocNo) as any;
  assert.equal(grJe.doc_type, 'WE');
  const je = postJournal(db, { source: 'MANUAL', docType: 'AB', lines: [{ accountId: acc('610000'), debit: 100 }, { accountId: acc('110000'), credit: 100 }] }, 1);
  const rev = reverseJournal(db, je.id, 1);
  assert.equal((getJournal(db, rev.id) as any).doc_type, 'AB');
  assert.throws(() => postJournal(db, { source: 'MANUAL', docType: 'ZZ', lines: [{ accountId: acc('610000'), debit: 1 }, { accountId: acc('110000'), credit: 1 }] }, 1), /not defined/);
  assert.throws(() => deleteRow(db, 'document_types', idOf('fi_document_types', 'WE'), 'admin'), /used by/);
});

test('units of measure and sales areas', () => {
  const u = saveRow(db, 'units', null, { code: 'drm', description: 'Drum', dimension: 'QUANTITY' }, 'warehouse').id;
  db.prepare("UPDATE materials SET uom = 'DRM' WHERE id = ?").run(mat);
  assert.throws(() => deleteRow(db, 'units', u, 'admin'), /used by 1 materials/);
  assert.throws(() => saveRow(db, 'units', null, { code: 'X', description: 'x', dimension: 'WEIGHT' }, 'admin'), /choose one of/);

  const area = saveRow(db, 'sales_areas', null, { sales_org: '1000', distr_channel: '30', division: '00', name: 'Online', default_warehouse_id: wh }, 'sales').id;
  assert.throws(() => saveRow(db, 'sales_areas', null, { sales_org: '1000', distr_channel: '30', division: '00', name: 'Dup' }, 'sales'), /UNIQUE/);
  const so = createSO(db, { customerId: customer, warehouseId: wh, salesAreaId: area, lines: [{ materialId: mat, qty: 1 }] }, 1);
  assert.equal(getSO(db, so.id).sales_area, '1000/30/00');
  const dflt = createSO(db, { customerId: customer, warehouseId: wh, lines: [{ materialId: mat, qty: 1 }] }, 1);
  assert.equal(getSO(db, dflt.id).sales_area, '1000/10/00', 'first sales area by default');
});

test('IDocs carry tax codes and payment terms', () => {
  idoc.savePartner(db, null, { partner_type: 'LI', partner_no: 'V1', name: 'V1', port_id: null, is_active: true, messages: [{ direction: 'IN', message_type: 'INVOIC', output_mode: 'IMMEDIATE' }] });
  const po = createPO(db, { vendorId: vendor, warehouseId: wh, lines: [{ materialId: mat, qty: 10, unitPrice: 1000 }] }, 1);
  setPOStatus(db, po.id, 'release');
  postGoodsReceipt(db, po.id, { lines: [{ poLineId: getPO(db, po.id).lines[0].id, qty: 10 }] }, 1);
  const xml = idoc.inboundTemplate(db, 'INVOIC', { poId: po.id }).xml.replace('<MWSKZ>V0</MWSKZ>', '<MWSKZ>V1</MWSKZ>');
  const r = idoc.receiveInbound(db, { xml }, 1);
  assert.equal(r.status, '53', r.statuses[0].message);
  assert.equal(bal('154000'), 10);

  idoc.savePartner(db, null, { partner_type: 'LS', partner_no: 'MDM', name: 'MDM', port_id: null, is_active: true, messages: [{ direction: 'IN', message_type: 'CREMAS', output_mode: 'IMMEDIATE' }] });
  const c = idoc.receiveInbound(db, { xml: idoc.inboundTemplate(db, 'CREMAS', {}).xml }, 1); // ZTERM NT45
  assert.equal(c.status, '53');
  const v = db.prepare('SELECT payment_terms_days, payment_terms_id FROM vendors WHERE code = ?').get(c.ref_doc_no) as any;
  assert.deepEqual([v.payment_terms_days, v.payment_terms_id], [45, idOf('payment_terms', 'NT45')]);
});

test('demo data uses the enterprise structure and stays balanced', () => {
  db = openDb(':memory:');
  seedDemoData(db);
  assert.equal((db.prepare('SELECT COUNT(*) n FROM plants').get() as any).n, 2);
  assert.equal((db.prepare('SELECT COUNT(*) n FROM warehouses WHERE plant_id IS NULL').get() as any).n, 0);
  assert.ok(costCenterReport(db, '2000-01-01', '2999-12-31').centers.length >= 2);
  assert.ok(bal('175000') < 0, 'output tax posted for the taxed customer');
  const tb = trialBalance(db);
  assert.equal(tb.totals.debit, tb.totals.credit);
  assert.ok(idoc.listIdocs(db, {}).some((i) => i.direction === 'IN' && i.status === '53'));
});
