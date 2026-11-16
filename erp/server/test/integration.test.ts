import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { openDb, type DB } from '../src/db.ts';
import { postJournal, trialBalance } from '../src/services/finance.ts';
import { postGoodsMovement } from '../src/services/inventory.ts';
import { createPO, getPO, postGoodsReceipt, postInvoice, setPOStatus } from '../src/services/purchasing.ts';
import { createSO, getSO, setSOStatus } from '../src/services/sales.ts';
import { getConfig, setConfig, setNumberRange } from '../src/services/config.ts';
import * as idoc from '../src/services/idoc.ts';
import { seedDemoData } from '../src/seed.ts';

let db: DB;
let wh: number, vendor: number, customer: number, mat: number;
const acc = (code: string) => (db.prepare('SELECT id FROM accounts WHERE code = ?').get(code) as { id: number }).id;

beforeEach(() => {
  db = openDb(':memory:');
  wh = Number(db.prepare("INSERT INTO warehouses(code, name) VALUES ('W1','One')").run().lastInsertRowid);
  vendor = Number(db.prepare("INSERT INTO vendors(code, name) VALUES ('V1','Vendor')").run().lastInsertRowid);
  customer = Number(db.prepare("INSERT INTO customers(code, name, credit_limit) VALUES ('C1','Customer', 1000)").run().lastInsertRowid);
  mat = Number(db.prepare("INSERT INTO materials(code, name, sales_price) VALUES ('M1','Widget', 2500)").run().lastInsertRowid);
});

const releasedPO = (qty = 10, price = 1000) => {
  const po = createPO(db, { vendorId: vendor, warehouseId: wh, lines: [{ materialId: mat, qty, unitPrice: price }] }, 1);
  setPOStatus(db, po.id, 'release');
  return po;
};

// ---------- configuration ----------

test('closed posting period blocks journal entries', () => {
  setConfig(db, { posting_period_from: '2026-01-01', posting_period_to: '2026-12-31' }, 'admin');
  const lines = [{ accountId: acc('610000'), debit: 100 }, { accountId: acc('110000'), credit: 100 }];
  assert.throws(() => postJournal(db, { source: 'MANUAL', postingDate: '2025-12-31', lines }, 1), /outside the open posting period/);
  postJournal(db, { source: 'MANUAL', postingDate: '2026-06-30', lines }, 1);
  assert.throws(() => setConfig(db, { posting_period_from: '2027-01-01' }, 'admin'), /must not be after/);
});

test('settings are validated and restricted by role', () => {
  assert.throws(() => setConfig(db, { invoice_price_tolerance_pct: 150 }, 'admin'), /at most 100/);
  assert.throws(() => setConfig(db, { credit_check_enabled: false }, 'warehouse'), /not authorized/);
  assert.throws(() => setConfig(db, { currency: 'dollars' }, 'admin'), /three capital letters/);
  setConfig(db, { credit_check_enabled: false }, 'sales');
  assert.equal(getConfig(db, 'credit_check_enabled'), false);
});

test('invoice price tolerance rejects large price deviations', () => {
  const po = releasedPO(10, 1000);
  const line = getPO(db, po.id).lines[0].id;
  postGoodsReceipt(db, po.id, { lines: [{ poLineId: line, qty: 10 }] }, 1);
  setConfig(db, { invoice_price_tolerance_pct: 5 }, 'admin');
  assert.throws(() => postInvoice(db, po.id, { vendorRef: 'A', lines: [{ poLineId: line, qty: 10, unitPrice: 1100 }] }, 1), /5% tolerance/);
  postInvoice(db, po.id, { vendorRef: 'B', lines: [{ poLineId: line, qty: 10, unitPrice: 1040 }] }, 1);
});

test('PO release limit requires an administrator', () => {
  setConfig(db, { po_release_limit: 50 }, 'admin');
  const po = createPO(db, { vendorId: vendor, warehouseId: wh, lines: [{ materialId: mat, qty: 10, unitPrice: 1000 }] }, 1); // 100.00
  assert.throws(() => setPOStatus(db, po.id, 'release', 'purchasing'), /release limit/);
  setPOStatus(db, po.id, 'release', 'admin');
});

test('credit check and price override switches change sales behaviour', () => {
  postGoodsMovement(db, { movementType: '561', warehouseId: wh, items: [{ materialId: mat, qty: 10, amount: 1000 }] }, 1);
  const big = createSO(db, { customerId: customer, warehouseId: wh, lines: [{ materialId: mat, qty: 2 }] }, 1); // 50.00 > 10.00 limit
  assert.throws(() => setSOStatus(db, big.id, 'confirm'), /Credit limit exceeded/);
  setConfig(db, { credit_check_enabled: false }, 'admin');
  setSOStatus(db, big.id, 'confirm');

  setConfig(db, { sales_price_override: false }, 'admin');
  const so = createSO(db, { customerId: customer, warehouseId: wh, lines: [{ materialId: mat, qty: 1, unitPrice: 1 }] }, 1);
  assert.equal(getSO(db, so.id).lines[0].unit_price, 25, 'list price enforced');
});

test('disabled movement types and required notes are enforced', () => {
  setConfig(db, { movement_types_enabled: ['201', '561'], movement_note_required: true }, 'admin');
  assert.throws(() => postGoodsMovement(db, { movementType: '701', warehouseId: wh, items: [{ materialId: mat, qty: 1 }] }, 1), /not enabled/);
  postGoodsMovement(db, { movementType: '561', warehouseId: wh, items: [{ materialId: mat, qty: 5, amount: 500 }] }, 1);
  assert.throws(() => postGoodsMovement(db, { movementType: '201', warehouseId: wh, items: [{ materialId: mat, qty: 1 }] }, 1), /note is required/);
  postGoodsMovement(db, { movementType: '201', warehouseId: wh, note: 'Scrap', items: [{ materialId: mat, qty: 1 }] }, 1);
});

test('number ranges only move forward', () => {
  assert.throws(() => setNumberRange(db, 'PO', 4500000000), /at least 4500000001/);
  setNumberRange(db, 'PO', 4500100000);
  assert.equal(createPO(db, { vendorId: vendor, warehouseId: wh, lines: [{ materialId: mat, qty: 1, unitPrice: 1 }] }, 1).docNo, '4500100000');
});

// ---------- IDocs ----------

function profile(type: 'LS' | 'LI' | 'KU', no: string, messages: [string, string][], mode: 'IMMEDIATE' | 'COLLECT' = 'IMMEDIATE') {
  const port = Number(db.prepare("INSERT OR IGNORE INTO idoc_ports(name, port_type, target) VALUES ('P1', 'XML_HTTP', 'https://x.example')").run().lastInsertRowid) ||
    (db.prepare("SELECT id FROM idoc_ports WHERE name = 'P1'").get() as { id: number }).id;
  return idoc.savePartner(db, null, {
    partner_type: type,
    partner_no: no,
    name: no,
    port_id: port,
    is_active: true,
    messages: messages.map(([direction, message_type]) => ({ direction: direction as 'IN' | 'OUT', message_type, output_mode: mode })),
  });
}

test('XML round trip keeps control record and nested segments', () => {
  const data: idoc.IdocData = {
    control: { IDOCTYP: 'ORDERS05', MESTYP: 'ORDERS', SNDPRT: 'KU', SNDPRN: 'C1' },
    segments: [{ name: 'E1EDP01', fields: { MENGE: '5', KTEXT: 'Bolts & nuts <M8>' }, children: [{ name: 'E1EDP19', fields: { IDTNR: 'M1' } }] }],
  };
  const back = idoc.fromXml(idoc.toXml(data));
  assert.deepEqual(back, data);
  assert.throws(() => idoc.fromXml('<ORDERS05><IDOC></ORDERS05>'), /Invalid XML/);
});

test('outbound ORDERS is created on PO release only when a partner profile exists', () => {
  const p1 = releasedPO();
  assert.equal(idoc.onPOReleased(db, p1.id, 1), null, 'no profile, no IDoc');
  profile('LI', 'V1', [['OUT', 'ORDERS']]);
  const p2 = releasedPO();
  const docnum = idoc.onPOReleased(db, p2.id, 1);
  assert.ok(docnum);
  const out = idoc.listIdocs(db, { direction: 'OUT' })[0];
  assert.equal(out.status, '03');
  const full = idoc.getIdoc(db, out.id);
  assert.equal(full.control.RCVPRN, 'V1');
  assert.match(full.xml, /<BELNR>4500000002<\/BELNR>/);
});

test('collect mode waits at status 30 until dispatched', () => {
  profile('LI', 'V1', [['OUT', 'ORDERS']], 'COLLECT');
  const po = releasedPO();
  idoc.onPOReleased(db, po.id, 1);
  const out = idoc.listIdocs(db, {})[0];
  assert.equal(out.status, '30');
  idoc.dispatch(db, out.id);
  assert.equal(idoc.getIdoc(db, out.id).status, '03');
});

test('inbound ORDERS from a customer creates a sales order', () => {
  postGoodsMovement(db, { movementType: '561', warehouseId: wh, items: [{ materialId: mat, qty: 10, amount: 1000 }] }, 1);
  profile('KU', 'C1', [['IN', 'ORDERS']]);
  const { xml } = idoc.inboundTemplate(db, 'ORDERS', { customerCode: 'C1' });
  const r = idoc.receiveInbound(db, { xml }, 1);
  assert.equal(r.status, '53', r.statuses[0].message);
  const so = getSO(db, r.ref_id);
  assert.equal(so.customer_code, 'C1');
  assert.equal(so.lines[0].qty, 5);
  assert.deepEqual(r.statuses.map((s: any) => s.status).reverse(), ['50', '64', '53']);
});

test('inbound without partner profile is held with status 56 and can be reprocessed', () => {
  postGoodsMovement(db, { movementType: '561', warehouseId: wh, items: [{ materialId: mat, qty: 10, amount: 1000 }] }, 1);
  const { xml } = idoc.inboundTemplate(db, 'ORDERS', { customerCode: 'C1' });
  const r = idoc.receiveInbound(db, { xml }, 1);
  assert.equal(r.status, '56');
  profile('KU', 'C1', [['IN', 'ORDERS']]);
  assert.equal(idoc.processInbound(db, r.id, 1).status, '53');
});

test('vendor DESADV posts the goods receipt and INVOIC fails until goods arrive', () => {
  profile('LI', 'V1', [['IN', 'DESADV'], ['IN', 'INVOIC']]);
  const po = releasedPO(10, 1000);
  const line = getPO(db, po.id).lines[0];
  const inv = idoc.toXml({
    control: { IDOCTYP: 'INVOIC02', MESTYP: 'INVOIC', SNDPRT: 'LI', SNDPRN: 'V1' },
    segments: [
      { name: 'E1EDK01', fields: { BELNR: 'V1-INV-1' } },
      { name: 'E1EDK02', fields: { QUALF: '001', BELNR: po.docNo } },
      { name: 'E1EDP01', fields: { POSEX: String(line.line_no), MENGE: '10', VPREI: '10.00' } },
    ],
  });
  const early = idoc.receiveInbound(db, { xml: inv }, 1);
  assert.equal(early.status, '51');
  assert.match(early.statuses[0].message, /only 0 received/);
  assert.equal(trialBalance(db).totals.debit, 0, 'failed IDoc posted nothing');

  const asn = idoc.receiveInbound(db, { xml: idoc.inboundTemplate(db, 'DESADV', { poId: po.id }).xml }, 1);
  assert.equal(asn.status, '53', asn.statuses[0].message);
  assert.equal(getPO(db, po.id).status, 'RECEIVED');

  const retried = idoc.processInbound(db, early.id, 1);
  assert.equal(retried.status, '53', retried.statuses[0].message);
  assert.equal(retried.ref_type, 'VENDOR_INVOICE');
});

test('DESADV from the wrong vendor is rejected', () => {
  db.prepare("INSERT INTO vendors(code, name) VALUES ('V2','Other')").run();
  profile('LI', 'V2', [['IN', 'DESADV']]);
  const po = releasedPO();
  const xml = idoc.inboundTemplate(db, 'DESADV', { poId: po.id }).xml.replace('<SNDPRN>V1</SNDPRN>', '<SNDPRN>V2</SNDPRN>');
  const r = idoc.receiveInbound(db, { xml }, 1);
  assert.equal(r.status, '51');
  assert.match(r.statuses[0].message, /belongs to vendor V1/);
});

test('master data IDocs create and update records', () => {
  profile('LS', 'MDM', [['IN', 'MATMAS'], ['IN', 'DEBMAS'], ['IN', 'CREMAS'], ['OUT', 'MATMAS']]);
  for (const kind of ['MATMAS', 'DEBMAS', 'CREMAS']) {
    const r = idoc.receiveInbound(db, { xml: idoc.inboundTemplate(db, kind, {}).xml }, 1);
    assert.equal(r.status, '53', `${kind}: ${r.statuses[0].message}`);
    assert.match(r.statuses[0].message, /created/);
  }
  const debmas = idoc.listIdocs(db, { messageType: 'DEBMAS' })[0];
  const c = db.prepare('SELECT * FROM customers WHERE code = ?').get(debmas.ref_doc_no) as any;
  assert.equal(c.payment_terms_days, 30);
  assert.equal(c.credit_limit, 1500000);

  const partnerId = (db.prepare("SELECT id FROM idoc_partners WHERE partner_no = 'MDM'").get() as { id: number }).id;
  const sent = idoc.sendMaterial(db, mat, partnerId, 1);
  const out = idoc.getIdoc(db, idoc.listIdocs(db, { direction: 'OUT' })[0].id);
  assert.equal(out.docnum, sent.docnum);
  assert.match(out.xml, /<SALES_PRICE>25.00<\/SALES_PRICE>/);
});

test('partner profile validation', () => {
  assert.throws(() => profile('KU', 'NOPE', [['IN', 'ORDERS']]), /Customer NOPE does not exist/);
  assert.throws(() => profile('KU', 'C1', [['IN', 'INVOIC']]), /only possible with partner type LI/);
});

test('demo data seeds IDoc traffic and keeps the ledger balanced', () => {
  db = openDb(':memory:'); // fresh database: the seeder skips databases that already have data
  seedDemoData(db);
  assert.ok((db.prepare('SELECT COUNT(*) n FROM sales_orders').get() as { n: number }).n > 0, 'demo data was loaded');
  const all = idoc.listIdocs(db, {});
  assert.ok(all.some((i) => i.direction === 'OUT' && i.status === '03'));
  assert.ok(all.some((i) => i.direction === 'IN' && i.status === '53'));
  assert.ok(all.some((i) => i.direction === 'IN' && i.status === '51'), 'one failing inbound invoice for the demo');
  const tb = trialBalance(db);
  assert.equal(tb.totals.debit, tb.totals.credit);
});
