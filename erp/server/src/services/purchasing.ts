import type { DB } from '../db.ts';
import { determineAccount, nextNumber } from '../db.ts';
import { badRequest, notFound } from '../lib/errors.ts';
import { fromCents, roundQty, today } from '../lib/money.ts';
import { postJournal, type JournalLineInput } from './finance.ts';
import { getMaterial, receiveIntoStock, recordMovement } from './inventory.ts';
import { getConfig } from './config.ts';

// ---------- Purchase orders ----------

export interface POInput {
  vendorId: number;
  warehouseId: number;
  orderDate?: string;
  deliveryDate?: string | null;
  notes?: string | null;
  lines: { materialId: number; qty: number; unitPrice: number /* cents */ }[];
}

function getPORow(db: DB, id: number) {
  const po = db.prepare('SELECT * FROM purchase_orders WHERE id = ?').get(id) as any;
  if (!po) throw notFound('Purchase order');
  return po;
}

function validatePO(db: DB, input: POInput) {
  const v = db.prepare('SELECT is_active FROM vendors WHERE id = ?').get(input.vendorId) as { is_active: number } | undefined;
  if (!v) throw notFound('Vendor');
  if (!v.is_active) throw badRequest('Vendor is blocked');
  if (!db.prepare('SELECT 1 FROM warehouses WHERE id = ?').get(input.warehouseId)) throw notFound('Warehouse');
  if (!input.lines.length) throw badRequest('A purchase order needs at least one line');
  for (const l of input.lines) {
    const m = getMaterial(db, l.materialId);
    if (!m.is_active) throw badRequest(`Material ${m.code} is inactive`);
    if (!(l.qty > 0)) throw badRequest(`Quantity for ${m.code} must be positive`);
    if (!(l.unitPrice >= 0)) throw badRequest(`Price for ${m.code} must not be negative`);
  }
}

function insertLines(db: DB, poId: number, lines: POInput['lines']) {
  const ins = db.prepare('INSERT INTO po_lines(po_id, line_no, material_id, qty, unit_price) VALUES (?, ?, ?, ?, ?)');
  lines.forEach((l, i) => ins.run(poId, (i + 1) * 10, l.materialId, roundQty(l.qty), Math.round(l.unitPrice)));
}

export function createPO(db: DB, input: POInput, userId: number | null) {
  validatePO(db, input);
  return db.transaction(() => {
    const docNo = nextNumber(db, 'PO');
    const { lastInsertRowid } = db
      .prepare(
        `INSERT INTO purchase_orders(doc_no, vendor_id, warehouse_id, order_date, delivery_date, notes, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(docNo, input.vendorId, input.warehouseId, input.orderDate ?? today(), input.deliveryDate ?? null, input.notes ?? null, userId);
    insertLines(db, Number(lastInsertRowid), input.lines);
    return { id: Number(lastInsertRowid), docNo };
  })();
}

export function updatePO(db: DB, id: number, input: POInput) {
  const po = getPORow(db, id);
  if (po.status !== 'DRAFT') throw badRequest('Only draft purchase orders can be changed');
  validatePO(db, input);
  db.transaction(() => {
    db.prepare('UPDATE purchase_orders SET vendor_id=?, warehouse_id=?, order_date=?, delivery_date=?, notes=? WHERE id=?').run(
      input.vendorId,
      input.warehouseId,
      input.orderDate ?? po.order_date,
      input.deliveryDate ?? null,
      input.notes ?? null,
      id,
    );
    db.prepare('DELETE FROM po_lines WHERE po_id = ?').run(id);
    insertLines(db, id, input.lines);
  })();
}

export function setPOStatus(db: DB, id: number, action: 'release' | 'cancel' | 'close', role = 'admin') {
  const po = getPORow(db, id);
  const lines = db.prepare('SELECT received_qty, invoiced_qty FROM po_lines WHERE po_id = ?').all(id) as any[];
  if (action === 'release') {
    if (po.status !== 'DRAFT') throw badRequest('Only draft purchase orders can be released');
    const limit = toCentsNum(getConfig<number>(db, 'po_release_limit'));
    const value = (db.prepare('SELECT COALESCE(SUM(ROUND(qty * unit_price)), 0) v FROM po_lines WHERE po_id = ?').get(id) as { v: number }).v;
    if (limit > 0 && value > limit && role !== 'admin')
      throw badRequest(`Net value ${fromCents(value)} is above the release limit of ${fromCents(limit)}; an administrator must release this order`);
    db.prepare("UPDATE purchase_orders SET status = 'RELEASED' WHERE id = ?").run(id);
  } else if (action === 'cancel') {
    if (!['DRAFT', 'RELEASED'].includes(po.status) || lines.some((l) => l.received_qty > 0))
      throw badRequest('Only purchase orders without goods receipts can be cancelled');
    db.prepare("UPDATE purchase_orders SET status = 'CANCELLED' WHERE id = ?").run(id);
  } else {
    if (!['RELEASED', 'PARTIALLY_RECEIVED', 'RECEIVED'].includes(po.status)) throw badRequest('Purchase order cannot be closed in its current status');
    if (lines.some((l) => roundQty(l.received_qty - l.invoiced_qty) !== 0))
      throw badRequest('Received quantities must be fully invoiced before closing (GR/IR must clear)');
    db.prepare("UPDATE purchase_orders SET status = 'CLOSED' WHERE id = ?").run(id);
  }
}

export function getPO(db: DB, id: number) {
  const po = db
    .prepare(
      `SELECT po.*, v.code AS vendor_code, v.name AS vendor_name, w.code AS warehouse_code, w.name AS warehouse_name,
              u.full_name AS created_by_name
       FROM purchase_orders po JOIN vendors v ON v.id = po.vendor_id JOIN warehouses w ON w.id = po.warehouse_id
       LEFT JOIN users u ON u.id = po.created_by WHERE po.id = ?`,
    )
    .get(id) as any;
  if (!po) throw notFound('Purchase order');
  const lines = db
    .prepare(
      `SELECT pl.id, pl.line_no, pl.material_id, m.code AS material_code, m.name AS material_name, m.uom,
              pl.qty, pl.unit_price / 100.0 AS unit_price, ROUND(pl.qty * pl.unit_price) / 100.0 AS net_value,
              pl.received_qty, pl.invoiced_qty
       FROM po_lines pl JOIN materials m ON m.id = pl.material_id WHERE pl.po_id = ? ORDER BY pl.line_no`,
    )
    .all(id) as any[];
  const history = db
    .prepare(
      `SELECT 'GR' AS kind, sm.doc_no, sm.posting_date AS date, m.code AS material_code, sm.qty, sm.amount / 100.0 AS amount
       FROM stock_movements sm JOIN po_lines pl ON pl.id = sm.po_line_id JOIN materials m ON m.id = sm.material_id WHERE pl.po_id = @id
       UNION ALL
       SELECT 'INVOICE', vi.doc_no, vi.invoice_date, m.code, il.qty, il.amount / 100.0
       FROM invoice_lines il JOIN vendor_invoices vi ON vi.id = il.invoice_id JOIN po_lines pl ON pl.id = il.po_line_id
       JOIN materials m ON m.id = pl.material_id WHERE pl.po_id = @id
       ORDER BY date, doc_no`,
    )
    .all({ id });
  const total = lines.reduce((s, l) => s + Math.round(l.net_value * 100), 0);
  return { ...po, lines, history, total: fromCents(total) };
}

export function listPOs(db: DB, q: { status?: string; vendorId?: number; search?: string }) {
  return db
    .prepare(
      `SELECT po.id, po.doc_no, po.order_date, po.delivery_date, po.status, v.name AS vendor_name, w.code AS warehouse_code,
              ROUND(SUM(ROUND(pl.qty * pl.unit_price))) / 100.0 AS total,
              CASE WHEN SUM(pl.qty) > 0 THEN ROUND(100.0 * SUM(pl.received_qty) / SUM(pl.qty)) ELSE 0 END AS received_pct,
              CASE WHEN SUM(pl.qty) > 0 THEN ROUND(100.0 * SUM(pl.invoiced_qty) / SUM(pl.qty)) ELSE 0 END AS invoiced_pct
       FROM purchase_orders po JOIN vendors v ON v.id = po.vendor_id JOIN warehouses w ON w.id = po.warehouse_id
       LEFT JOIN po_lines pl ON pl.po_id = po.id
       WHERE (@status IS NULL OR po.status = @status) AND (@vendor IS NULL OR po.vendor_id = @vendor)
         AND (@search IS NULL OR po.doc_no LIKE @search OR v.name LIKE @search)
       GROUP BY po.id ORDER BY po.id DESC LIMIT 500`,
    )
    .all({ status: q.status ?? null, vendor: q.vendorId ?? null, search: q.search ? `%${q.search}%` : null });
}

// ---------- Goods receipt (movement 101) ----------

export interface GRInput {
  postingDate?: string;
  note?: string;
  lines: { poLineId: number; qty: number }[];
}

/** Receive goods against a PO: stock up at PO price, Dr Inventory / Cr GR/IR. */
export function postGoodsReceipt(db: DB, poId: number, input: GRInput, userId: number | null) {
  const po = getPORow(db, poId);
  if (!['RELEASED', 'PARTIALLY_RECEIVED'].includes(po.status)) throw badRequest(`Cannot receive goods for a purchase order in status ${po.status}`);
  const items = input.lines.filter((l) => l.qty > 0);
  if (!items.length) throw badRequest('Enter a quantity for at least one line');
  const postingDate = input.postingDate ?? today();

  return db.transaction(() => {
    const docNo = nextNumber(db, 'MAT');
    const inv = determineAccount(db, 'INVENTORY');
    const grir = determineAccount(db, 'GRIR');
    const jlines: JournalLineInput[] = [];
    const moves: Parameters<typeof recordMovement>[1][] = [];
    for (const it of items) {
      const pl = db.prepare('SELECT * FROM po_lines WHERE id = ? AND po_id = ?').get(it.poLineId, poId) as any;
      if (!pl) throw badRequest(`Line ${it.poLineId} does not belong to this purchase order`);
      const mat = getMaterial(db, pl.material_id);
      const qty = roundQty(it.qty);
      const open = roundQty(pl.qty - pl.received_qty);
      if (qty > open) throw badRequest(`Line ${pl.line_no} (${mat.code}): only ${open} open for receipt`);
      const amount = Math.round(qty * pl.unit_price);
      receiveIntoStock(db, mat.id, po.warehouse_id, qty, amount);
      db.prepare('UPDATE po_lines SET received_qty = ? WHERE id = ?').run(roundQty(pl.received_qty + qty), pl.id);
      jlines.push({ accountId: inv, debit: amount, memo: `GR ${po.doc_no}/${pl.line_no} ${mat.code} x ${qty}`, materialId: mat.id });
      jlines.push({ accountId: grir, credit: amount, memo: `GR ${po.doc_no}/${pl.line_no}`, vendorId: po.vendor_id, materialId: mat.id });
      moves.push({ docNo, type: '101', materialId: mat.id, warehouseId: po.warehouse_id, qty, amount, poLineId: pl.id, postingDate, note: input.note ?? null, userId });
    }
    let journal: { id: number; docNo: string } | null = null;
    if (jlines.some((l) => (l.debit ?? 0) > 0)) {
      journal = postJournal(db, { postingDate, source: 'GR', sourceDoc: docNo, reference: po.doc_no, description: `Goods receipt for PO ${po.doc_no}`, lines: jlines }, userId);
    }
    moves.forEach((m) => recordMovement(db, { ...m, journalEntryId: journal?.id ?? null }));
    refreshPOStatus(db, poId);
    return { docNo, journalDocNo: journal?.docNo ?? null };
  })();
}

function refreshPOStatus(db: DB, poId: number) {
  const r = db.prepare('SELECT SUM(qty) q, SUM(received_qty) rq FROM po_lines WHERE po_id = ?').get(poId) as { q: number; rq: number };
  const status = roundQty(r.rq) <= 0 ? 'RELEASED' : roundQty(r.rq) >= roundQty(r.q) ? 'RECEIVED' : 'PARTIALLY_RECEIVED';
  db.prepare("UPDATE purchase_orders SET status = ? WHERE id = ? AND status NOT IN ('CLOSED','CANCELLED')").run(status, poId);
}

// ---------- Vendor invoices (logistics invoice verification) ----------

export interface InvoiceInput {
  vendorRef: string;
  invoiceDate?: string;
  dueDate?: string;
  lines: { poLineId: number; qty: number; unitPrice: number /* cents */ }[];
}

/**
 * Three-way match: invoiced qty may not exceed received-but-not-invoiced qty.
 * Posting: Dr GR/IR (at PO price), Dr/Cr price differences, Cr AP (vendor).
 */
export function postInvoice(db: DB, poId: number, input: InvoiceInput, userId: number | null) {
  const po = getPORow(db, poId);
  if (['DRAFT', 'CANCELLED', 'CLOSED'].includes(po.status)) throw badRequest(`Cannot invoice a purchase order in status ${po.status}`);
  const vendor = db.prepare('SELECT * FROM vendors WHERE id = ?').get(po.vendor_id) as any;
  const items = input.lines.filter((l) => l.qty > 0);
  if (!items.length) throw badRequest('Enter a quantity for at least one line');
  if (!input.vendorRef.trim()) throw badRequest('Vendor invoice reference is required');
  const invoiceDate = input.invoiceDate ?? today();
  const dueDate = input.dueDate ?? addDays(invoiceDate, vendor.payment_terms_days);

  return db.transaction(() => {
    const docNo = nextNumber(db, 'INV');
    const grir = determineAccount(db, 'GRIR');
    const ap = determineAccount(db, 'AP');
    const prd = determineAccount(db, 'PRICE_DIFF');
    const jlines: JournalLineInput[] = [];
    const ilines: { poLineId: number; qty: number; unitPrice: number; amount: number; desc: string }[] = [];
    let total = 0;
    for (const it of items) {
      const pl = db.prepare('SELECT * FROM po_lines WHERE id = ? AND po_id = ?').get(it.poLineId, poId) as any;
      if (!pl) throw badRequest(`Line ${it.poLineId} does not belong to this purchase order`);
      const mat = getMaterial(db, pl.material_id);
      const qty = roundQty(it.qty);
      const open = roundQty(pl.received_qty - pl.invoiced_qty);
      if (qty > open) throw badRequest(`Line ${pl.line_no} (${mat.code}): only ${open} received and not yet invoiced`);
      if (!(it.unitPrice >= 0)) throw badRequest(`Invalid price on line ${pl.line_no}`);
      const tolerance = getConfig<number>(db, 'invoice_price_tolerance_pct');
      if (tolerance > 0 && pl.unit_price > 0 && (Math.abs(it.unitPrice - pl.unit_price) / pl.unit_price) * 100 > tolerance + 1e-9)
        throw badRequest(
          `Line ${pl.line_no} (${mat.code}): invoice price ${fromCents(it.unitPrice)} differs from PO price ${fromCents(pl.unit_price)} by more than the ${tolerance}% tolerance`,
        );
      const amount = Math.round(qty * it.unitPrice);
      const grirAmount = Math.round(qty * pl.unit_price);
      const diff = amount - grirAmount;
      total += amount;
      db.prepare('UPDATE po_lines SET invoiced_qty = ? WHERE id = ?').run(roundQty(pl.invoiced_qty + qty), pl.id);
      jlines.push({ accountId: grir, debit: grirAmount, memo: `IR ${po.doc_no}/${pl.line_no} ${mat.code} x ${qty}`, vendorId: po.vendor_id, materialId: mat.id });
      if (diff > 0) jlines.push({ accountId: prd, debit: diff, memo: `Price difference ${mat.code}`, materialId: mat.id });
      if (diff < 0) jlines.push({ accountId: prd, credit: -diff, memo: `Price difference ${mat.code}`, materialId: mat.id });
      ilines.push({ poLineId: pl.id, qty, unitPrice: Math.round(it.unitPrice), amount, desc: `${mat.code} ${mat.name}` });
    }
    if (total <= 0) throw badRequest('Invoice total must be positive');
    jlines.push({ accountId: ap, credit: total, memo: `Vendor ${vendor.code} inv ${input.vendorRef}`, vendorId: vendor.id });

    const journal = postJournal(
      db,
      { postingDate: invoiceDate, source: 'INVOICE', sourceDoc: docNo, reference: input.vendorRef, description: `Invoice ${input.vendorRef} for PO ${po.doc_no}`, lines: jlines },
      userId,
    );
    const { lastInsertRowid } = db
      .prepare(
        `INSERT INTO vendor_invoices(doc_no, vendor_id, po_id, vendor_ref, invoice_date, due_date, total, journal_entry_id, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(docNo, vendor.id, poId, input.vendorRef.trim(), invoiceDate, dueDate, total, journal.id, userId);
    const invId = Number(lastInsertRowid);
    const ins = db.prepare('INSERT INTO invoice_lines(invoice_id, po_line_id, description, qty, unit_price, amount) VALUES (?, ?, ?, ?, ?, ?)');
    ilines.forEach((l) => ins.run(invId, l.poLineId, l.desc, l.qty, l.unitPrice, l.amount));
    return { id: invId, docNo, journalDocNo: journal.docNo };
  })();
}

const toCentsNum = (amount: number) => Math.round(amount * 100);

function addDays(date: string, days: number) {
  const d = new Date(date + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function listInvoices(db: DB, q: { status?: string; vendorId?: number; open?: boolean }) {
  return db
    .prepare(
      `SELECT vi.id, vi.doc_no, vi.vendor_ref, vi.invoice_date, vi.due_date, vi.status,
              vi.total / 100.0 AS total, vi.paid_amount / 100.0 AS paid_amount, (vi.total - vi.paid_amount) / 100.0 AS open_amount,
              v.id AS vendor_id, v.code AS vendor_code, v.name AS vendor_name, po.id AS po_id, po.doc_no AS po_doc_no,
              je.id AS journal_entry_id, je.doc_no AS journal_doc_no
       FROM vendor_invoices vi JOIN vendors v ON v.id = vi.vendor_id
       LEFT JOIN purchase_orders po ON po.id = vi.po_id LEFT JOIN journal_entries je ON je.id = vi.journal_entry_id
       WHERE (@status IS NULL OR vi.status = @status) AND (@vendor IS NULL OR vi.vendor_id = @vendor)
         AND (@open = 0 OR vi.status <> 'PAID')
       ORDER BY vi.due_date, vi.id LIMIT 500`,
    )
    .all({ status: q.status ?? null, vendor: q.vendorId ?? null, open: q.open ? 1 : 0 });
}

export function getInvoice(db: DB, id: number) {
  const inv = listInvoicesById(db, id) as any;
  if (!inv) throw notFound('Invoice');
  const lines = db
    .prepare('SELECT description, qty, unit_price / 100.0 AS unit_price, amount / 100.0 AS amount FROM invoice_lines WHERE invoice_id = ?')
    .all(id);
  const payments = db
    .prepare(
      `SELECT p.doc_no, p.payment_date, p.amount / 100.0 AS amount, p.reference, je.id AS journal_entry_id, je.doc_no AS journal_doc_no
       FROM payments p LEFT JOIN journal_entries je ON je.id = p.journal_entry_id WHERE p.invoice_id = ? ORDER BY p.id`,
    )
    .all(id);
  return { ...inv, lines, payments };
}

function listInvoicesById(db: DB, id: number) {
  return db
    .prepare(
      `SELECT vi.id, vi.doc_no, vi.vendor_id, vi.po_id, vi.vendor_ref, vi.invoice_date, vi.due_date, vi.status, vi.journal_entry_id, vi.created_at,
              vi.total / 100.0 AS total, vi.paid_amount / 100.0 AS paid_amount, (vi.total - vi.paid_amount) / 100.0 AS open_amount,
              v.code AS vendor_code, v.name AS vendor_name, po.doc_no AS po_doc_no, je.doc_no AS journal_doc_no
       FROM vendor_invoices vi JOIN vendors v ON v.id = vi.vendor_id
       LEFT JOIN purchase_orders po ON po.id = vi.po_id LEFT JOIN journal_entries je ON je.id = vi.journal_entry_id WHERE vi.id = ?`,
    )
    .get(id);
}

// ---------- Outgoing payments ----------

export function postPayment(
  db: DB,
  invoiceId: number,
  input: { amount: number /* cents */; paymentDate?: string; bankAccountId?: number; reference?: string },
  userId: number | null,
) {
  const inv = db.prepare('SELECT * FROM vendor_invoices WHERE id = ?').get(invoiceId) as any;
  if (!inv) throw notFound('Invoice');
  const open = inv.total - inv.paid_amount;
  const amount = Math.round(input.amount);
  if (amount <= 0) throw badRequest('Payment amount must be positive');
  if (amount > open) throw badRequest(`Payment exceeds open amount of ${fromCents(open)}`);
  const bank = input.bankAccountId ?? determineAccount(db, 'BANK');
  const bankAcc = db.prepare('SELECT type FROM accounts WHERE id = ?').get(bank) as { type: string } | undefined;
  if (!bankAcc || bankAcc.type !== 'ASSET') throw badRequest('Payment must be made from an asset (bank/cash) account');
  const paymentDate = input.paymentDate ?? today();

  return db.transaction(() => {
    const docNo = nextNumber(db, 'PAY');
    const journal = postJournal(
      db,
      {
        postingDate: paymentDate,
        source: 'PAYMENT',
        sourceDoc: docNo,
        reference: input.reference ?? inv.vendor_ref,
        description: `Payment of invoice ${inv.doc_no} (${inv.vendor_ref})`,
        lines: [
          { accountId: determineAccount(db, 'AP'), debit: amount, vendorId: inv.vendor_id, memo: `Clear ${inv.doc_no}` },
          { accountId: bank, credit: amount, memo: `Payment ${docNo}` },
        ],
      },
      userId,
    );
    db.prepare(
      `INSERT INTO payments(doc_no, vendor_id, invoice_id, payment_date, amount, bank_account_id, reference, journal_entry_id, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(docNo, inv.vendor_id, invoiceId, paymentDate, amount, bank, input.reference ?? null, journal.id, userId);
    const paid = inv.paid_amount + amount;
    db.prepare('UPDATE vendor_invoices SET paid_amount = ?, status = ? WHERE id = ?').run(paid, paid >= inv.total ? 'PAID' : 'PARTIALLY_PAID', invoiceId);
    return { docNo, journalDocNo: journal.docNo };
  })();
}

export function listPayments(db: DB) {
  return db
    .prepare(
      `SELECT p.id, p.doc_no, p.payment_date, p.amount / 100.0 AS amount, p.reference, v.name AS vendor_name,
              vi.id AS invoice_id, vi.doc_no AS invoice_doc_no, vi.vendor_ref, a.code AS bank_code, je.id AS journal_entry_id, je.doc_no AS journal_doc_no
       FROM payments p JOIN vendors v ON v.id = p.vendor_id JOIN vendor_invoices vi ON vi.id = p.invoice_id
       JOIN accounts a ON a.id = p.bank_account_id LEFT JOIN journal_entries je ON je.id = p.journal_entry_id
       ORDER BY p.id DESC LIMIT 500`,
    )
    .all();
}

/** Open payables bucketed by days overdue. */
export function apAging(db: DB, asOf = today()) {
  const rows = db
    .prepare(
      `SELECT v.id, v.code, v.name, vi.due_date, (vi.total - vi.paid_amount) AS open
       FROM vendor_invoices vi JOIN vendors v ON v.id = vi.vendor_id WHERE vi.status <> 'PAID'`,
    )
    .all() as { id: number; code: string; name: string; due_date: string; open: number }[];
  const buckets = ['current', 'd1_30', 'd31_60', 'd61_90', 'd90_plus'] as const;
  const byVendor = new Map<number, any>();
  for (const r of rows) {
    const days = Math.floor((Date.parse(asOf) - Date.parse(r.due_date)) / 86400000);
    const b = days <= 0 ? 'current' : days <= 30 ? 'd1_30' : days <= 60 ? 'd31_60' : days <= 90 ? 'd61_90' : 'd90_plus';
    const v = byVendor.get(r.id) ?? { vendorId: r.id, code: r.code, name: r.name, ...Object.fromEntries(buckets.map((k) => [k, 0])), total: 0 };
    v[b] += r.open;
    v.total += r.open;
    byVendor.set(r.id, v);
  }
  const vendors = [...byVendor.values()].map((v) => ({ ...v, ...Object.fromEntries([...buckets, 'total'].map((k) => [k, fromCents(v[k])])) }));
  return { asOf, vendors };
}
