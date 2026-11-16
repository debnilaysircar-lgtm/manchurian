import bcrypt from 'bcryptjs';
import type { DB } from './db.ts';
import { postJournal } from './services/finance.ts';
import { postGoodsMovement } from './services/inventory.ts';
import { createPO, postGoodsReceipt, postInvoice, postPayment, setPOStatus } from './services/purchasing.ts';

/** Seeds demo master data and runs a few business transactions through the real services, so all postings are consistent. */
export function seedDemoData(db: DB) {
  const already = db.prepare('SELECT COUNT(*) c FROM vendors').get() as { c: number };
  if (already.c > 0) return;

  const d = (offset: number) => {
    const x = new Date();
    x.setDate(x.getDate() + offset);
    return x.toISOString().slice(0, 10);
  };
  const acc = (code: string) => (db.prepare('SELECT id FROM accounts WHERE code = ?').get(code) as { id: number }).id;

  db.transaction(() => {
    const user = db.prepare('INSERT INTO users(username, password_hash, full_name, role) VALUES (?, ?, ?, ?)');
    const pw = bcrypt.hashSync('demo123', 10);
    user.run('fiona', pw, 'Fiona Finance', 'finance');
    user.run('paul', pw, 'Paul Purchasing', 'purchasing');
    user.run('wendy', pw, 'Wendy Warehouse', 'warehouse');

    const wh = db.prepare('INSERT INTO warehouses(code, name, address) VALUES (?, ?, ?)');
    const main = Number(wh.run('WH01', 'Main Warehouse', '1 Industrial Park').lastInsertRowid);
    const east = Number(wh.run('WH02', 'East Distribution Center', '200 Logistics Way').lastInsertRowid);

    const v = db.prepare('INSERT INTO vendors(code, name, email, phone, address, payment_terms_days) VALUES (?, ?, ?, ?, ?, ?)');
    const steel = Number(v.run('V1000', 'Acme Steel Supply', 'orders@acmesteel.example', '+1 555 0100', '12 Foundry Rd', 30).lastInsertRowid);
    const pack = Number(v.run('V1001', 'PackRight Packaging', 'sales@packright.example', '+1 555 0101', '8 Carton St', 45).lastInsertRowid);
    v.run('V1002', 'Global Electronics Components', 'info@gec.example', '+1 555 0102', '77 Circuit Ave', 60);

    const m = db.prepare('INSERT INTO materials(code, name, uom, material_type, reorder_level) VALUES (?, ?, ?, ?, ?)');
    const sheet = Number(m.run('RM-1001', 'Steel Sheet 2mm', 'KG', 'RAW', 500).lastInsertRowid);
    const bolt = Number(m.run('RM-1002', 'Hex Bolt M8', 'EA', 'RAW', 2000).lastInsertRowid);
    const box = Number(m.run('PK-2001', 'Shipping Carton Large', 'EA', 'CONSUMABLE', 300).lastInsertRowid);
    m.run('EL-3001', 'Control Board v2', 'EA', 'RAW', 50);
    m.run('FG-9001', 'Industrial Cabinet', 'EA', 'FINISHED', 0);

    // Opening capital
    postJournal(db, {
      postingDate: d(-60), source: 'MANUAL', description: 'Opening capital contribution', reference: 'OPEN',
      lines: [{ accountId: acc('110000'), debit: 25000000 }, { accountId: acc('300000'), credit: 25000000 }],
    }, 1);
    postJournal(db, {
      postingDate: d(-30), source: 'MANUAL', description: 'Office rent', reference: 'RENT-01',
      lines: [{ accountId: acc('610000'), debit: 350000 }, { accountId: acc('110000'), credit: 350000 }],
    }, 1);

    // Initial stock
    postGoodsMovement(db, { movementType: '561', warehouseId: main, postingDate: d(-55), note: 'Data migration', items: [
      { materialId: sheet, qty: 800, amount: 280000 },
      { materialId: bolt, qty: 5000, amount: 60000 },
    ] }, 1);

    // Full procure-to-pay cycle
    const po1 = createPO(db, { vendorId: steel, warehouseId: main, orderDate: d(-40), deliveryDate: d(-30), lines: [
      { materialId: sheet, qty: 1000, unitPrice: 360 },
      { materialId: bolt, qty: 10000, unitPrice: 11 },
    ] }, 3);
    setPOStatus(db, po1.id, 'release');
    const l1 = db.prepare('SELECT id, qty FROM po_lines WHERE po_id = ? ORDER BY line_no').all(po1.id) as { id: number; qty: number }[];
    postGoodsReceipt(db, po1.id, { postingDate: d(-30), lines: l1.map((l) => ({ poLineId: l.id, qty: l.qty })) }, 4);
    const inv1 = postInvoice(db, po1.id, { vendorRef: 'AS-88231', invoiceDate: d(-28), lines: [
      { poLineId: l1[0].id, qty: 1000, unitPrice: 365 }, // small price variance
      { poLineId: l1[1].id, qty: 10000, unitPrice: 11 },
    ] }, 2);
    postPayment(db, inv1.id, { amount: 200000, paymentDate: d(-5), reference: 'WIRE-5531' }, 2);

    // Partially received PO, invoice still open
    const po2 = createPO(db, { vendorId: pack, warehouseId: east, orderDate: d(-20), deliveryDate: d(5), lines: [{ materialId: box, qty: 1000, unitPrice: 95 }] }, 3);
    setPOStatus(db, po2.id, 'release');
    const l2 = db.prepare('SELECT id FROM po_lines WHERE po_id = ?').get(po2.id) as { id: number };
    postGoodsReceipt(db, po2.id, { postingDate: d(-10), lines: [{ poLineId: l2.id, qty: 400 }] }, 4);
    postInvoice(db, po2.id, { vendorRef: 'PR-2024-117', invoiceDate: d(-9), dueDate: d(-2), lines: [{ poLineId: l2.id, qty: 400, unitPrice: 95 }] }, 2);

    // Draft PO
    createPO(db, { vendorId: steel, warehouseId: main, deliveryDate: d(14), notes: 'Q-next restock', lines: [{ materialId: sheet, qty: 500, unitPrice: 360 }] }, 3);

    // Consumption
    postGoodsMovement(db, { movementType: '201', warehouseId: main, postingDate: d(-3), note: 'Production order 1001', items: [
      { materialId: sheet, qty: 1350 },
      { materialId: bolt, qty: 4000 },
    ] }, 4);
    postGoodsMovement(db, { movementType: '301', warehouseId: east, toWarehouseId: main, postingDate: d(-2), items: [{ materialId: box, qty: 150 }] }, 4);

  })();
  console.log('Demo data loaded. Users: admin/admin123, fiona|paul|wendy / demo123');
}
