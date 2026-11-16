import type { DB } from '../db.ts';
import { determineAccount, nextNumber } from '../db.ts';
import { badRequest, notFound } from '../lib/errors.ts';
import { fromCents, roundQty, today } from '../lib/money.ts';
import { postJournal, type JournalLineInput } from './finance.ts';
import { getMaterial, issueFromStock, recordMovement } from './inventory.ts';
import { getConfig } from './config.ts';

const addDays = (date: string, days: number) => {
  const d = new Date(date + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

// ---------- Sales orders ----------

export interface SOInput {
  customerId: number;
  warehouseId: number;
  orderDate?: string;
  requestedDate?: string | null;
  customerRef?: string | null;
  notes?: string | null;
  /** Sales organization / distribution channel / division; omitted = first sales area. */
  salesAreaId?: number | null;
  /** unitPrice in cents; omitted = material list price */
  lines: { materialId: number; qty: number; unitPrice?: number }[];
}

/** Validated sales area id, defaulting to the first one. */
function salesArea(db: DB, id: number | null | undefined): number | null {
  if (id) return id;
  return (db.prepare('SELECT MIN(id) id FROM sales_areas').get() as { id: number | null }).id;
}

function getSORow(db: DB, id: number) {
  const so = db.prepare('SELECT * FROM sales_orders WHERE id = ?').get(id) as any;
  if (!so) throw notFound('Sales order');
  return so;
}

function getCustomer(db: DB, id: number) {
  const c = db.prepare('SELECT * FROM customers WHERE id = ?').get(id) as any;
  if (!c) throw notFound('Customer');
  return c;
}

function validateSO(db: DB, input: SOInput) {
  const c = getCustomer(db, input.customerId);
  if (!c.is_active) throw badRequest('Customer is blocked');
  if (!db.prepare('SELECT 1 FROM warehouses WHERE id = ?').get(input.warehouseId)) throw notFound('Storage location');
  if (input.salesAreaId && !db.prepare('SELECT 1 FROM sales_areas WHERE id = ?').get(input.salesAreaId)) throw notFound('Sales area');
  if (!input.lines.length) throw badRequest('A sales order needs at least one line');
  for (const l of input.lines) {
    const m = getMaterial(db, l.materialId);
    if (!m.is_active) throw badRequest(`Material ${m.code} is inactive`);
    const mt = db.prepare('SELECT m.material_type, t.sellable FROM materials m LEFT JOIN material_types t ON t.code = m.material_type WHERE m.id = ?').get(m.id) as any;
    if (mt?.sellable === 0) throw badRequest(`Material ${m.code} has type ${mt.material_type}, which cannot be sold (see Configuration > Material types)`);
    if (!(l.qty > 0)) throw badRequest(`Quantity for ${m.code} must be positive`);
    if (l.unitPrice != null && !(l.unitPrice >= 0)) throw badRequest(`Price for ${m.code} must not be negative`);
  }
}

function insertLines(db: DB, soId: number, lines: SOInput['lines']) {
  const ins = db.prepare('INSERT INTO so_lines(so_id, line_no, material_id, qty, unit_price) VALUES (?, ?, ?, ?, ?)');
  const listPrice = db.prepare('SELECT sales_price FROM materials WHERE id = ?');
  const override = getConfig<boolean>(db, 'sales_price_override');
  lines.forEach((l, i) => {
    const list = (listPrice.get(l.materialId) as { sales_price: number }).sales_price;
    const price = override ? l.unitPrice ?? list : list;
    ins.run(soId, (i + 1) * 10, l.materialId, roundQty(l.qty), Math.round(price));
  });
}

export function createSO(db: DB, input: SOInput, userId: number | null) {
  validateSO(db, input);
  return db.transaction(() => {
    const docNo = nextNumber(db, 'SO');
    const { lastInsertRowid } = db
      .prepare(
        `INSERT INTO sales_orders(doc_no, customer_id, warehouse_id, order_date, requested_date, customer_ref, notes, sales_area_id, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(docNo, input.customerId, input.warehouseId, input.orderDate ?? today(), input.requestedDate ?? null, input.customerRef ?? null, input.notes ?? null, salesArea(db, input.salesAreaId), userId);
    insertLines(db, Number(lastInsertRowid), input.lines);
    return { id: Number(lastInsertRowid), docNo };
  })();
}

export function updateSO(db: DB, id: number, input: SOInput) {
  const so = getSORow(db, id);
  if (so.status !== 'DRAFT') throw badRequest('Only draft sales orders can be changed');
  validateSO(db, input);
  db.transaction(() => {
    db.prepare('UPDATE sales_orders SET customer_id=?, warehouse_id=?, order_date=?, requested_date=?, customer_ref=?, notes=?, sales_area_id=? WHERE id=?').run(
      input.customerId,
      input.warehouseId,
      input.orderDate ?? so.order_date,
      input.requestedDate ?? null,
      input.customerRef ?? null,
      input.notes ?? null,
      salesArea(db, input.salesAreaId ?? so.sales_area_id),
      id,
    );
    db.prepare('DELETE FROM so_lines WHERE so_id = ?').run(id);
    insertLines(db, id, input.lines);
  })();
}

/**
 * Credit exposure = open receivables + value of confirmed orders not yet billed.
 * Returned in cents.
 */
export function creditExposure(db: DB, customerId: number, excludeSoId?: number) {
  const ar = (db.prepare("SELECT COALESCE(SUM(total - paid_amount), 0) v FROM customer_invoices WHERE customer_id = ? AND status <> 'PAID'").get(customerId) as { v: number }).v;
  const orders = (
    db
      .prepare(
        `SELECT COALESCE(SUM(ROUND((sl.qty - sl.billed_qty) * sl.unit_price)), 0) v
         FROM so_lines sl JOIN sales_orders so ON so.id = sl.so_id
         WHERE so.customer_id = ? AND so.status IN ('CONFIRMED','PARTIALLY_DELIVERED','DELIVERED') AND so.id <> ?`,
      )
      .get(customerId, excludeSoId ?? -1) as { v: number }
  ).v;
  return ar + orders;
}

function orderValue(db: DB, soId: number) {
  return (db.prepare('SELECT COALESCE(SUM(ROUND(qty * unit_price)), 0) v FROM so_lines WHERE so_id = ?').get(soId) as { v: number }).v;
}

export function setSOStatus(db: DB, id: number, action: 'confirm' | 'cancel' | 'close') {
  const so = getSORow(db, id);
  const lines = db.prepare('SELECT delivered_qty, billed_qty FROM so_lines WHERE so_id = ?').all(id) as any[];
  if (action === 'confirm') {
    if (so.status !== 'DRAFT') throw badRequest('Only draft sales orders can be confirmed');
    const c = getCustomer(db, so.customer_id);
    if (!c.is_active) throw badRequest('Customer is blocked');
    if (c.credit_limit > 0 && getConfig<boolean>(db, 'credit_check_enabled')) {
      const exposure = creditExposure(db, c.id, id) + orderValue(db, id);
      if (exposure > c.credit_limit)
        throw badRequest(`Credit limit exceeded: exposure would be ${fromCents(exposure)} against a limit of ${fromCents(c.credit_limit)}`);
    }
    db.prepare("UPDATE sales_orders SET status = 'CONFIRMED' WHERE id = ?").run(id);
  } else if (action === 'cancel') {
    if (!['DRAFT', 'CONFIRMED'].includes(so.status) || lines.some((l) => l.delivered_qty > 0))
      throw badRequest('Only sales orders without deliveries can be cancelled');
    db.prepare("UPDATE sales_orders SET status = 'CANCELLED' WHERE id = ?").run(id);
  } else {
    if (!['CONFIRMED', 'PARTIALLY_DELIVERED', 'DELIVERED'].includes(so.status)) throw badRequest('Sales order cannot be closed in its current status');
    if (lines.some((l) => roundQty(l.delivered_qty - l.billed_qty) !== 0)) throw badRequest('Delivered quantities must be billed before closing');
    db.prepare("UPDATE sales_orders SET status = 'CLOSED' WHERE id = ?").run(id);
  }
}

export function getSO(db: DB, id: number) {
  const so = db
    .prepare(
      `SELECT so.*, c.code AS customer_code, c.name AS customer_name, c.credit_limit / 100.0 AS credit_limit,
              w.code AS warehouse_code, w.name AS warehouse_name, u.full_name AS created_by_name,
              sa.sales_org || '/' || sa.distr_channel || '/' || sa.division AS sales_area, sa.name AS sales_area_name,
              (SELECT code || ' ' || rate_pct || '%' FROM tax_codes t WHERE t.id = c.tax_code_id) AS customer_tax_code, c.tax_code_id AS customer_tax_code_id
       FROM sales_orders so JOIN customers c ON c.id = so.customer_id JOIN warehouses w ON w.id = so.warehouse_id
       LEFT JOIN sales_areas sa ON sa.id = so.sales_area_id
       LEFT JOIN users u ON u.id = so.created_by WHERE so.id = ?`,
    )
    .get(id) as any;
  if (!so) throw notFound('Sales order');
  const lines = db
    .prepare(
      `SELECT sl.id, sl.line_no, sl.material_id, m.code AS material_code, m.name AS material_name, m.uom,
              sl.qty, sl.unit_price / 100.0 AS unit_price, ROUND(sl.qty * sl.unit_price) / 100.0 AS net_value,
              sl.delivered_qty, sl.billed_qty,
              COALESCE((SELECT qty FROM stock s WHERE s.material_id = sl.material_id AND s.warehouse_id = @wh), 0) AS available_qty
       FROM so_lines sl JOIN materials m ON m.id = sl.material_id WHERE sl.so_id = @id ORDER BY sl.line_no`,
    )
    .all({ id, wh: so.warehouse_id }) as any[];
  const history = db
    .prepare(
      `SELECT 'DELIVERY' AS kind, sm.doc_no, sm.posting_date AS date, m.code AS material_code, sm.qty, sm.amount / 100.0 AS amount,
              sm.journal_entry_id, NULL AS invoice_id
       FROM stock_movements sm JOIN so_lines sl ON sl.id = sm.so_line_id JOIN materials m ON m.id = sm.material_id WHERE sl.so_id = @id
       UNION ALL
       SELECT 'INVOICE', ci.doc_no, ci.invoice_date, m.code, il.qty, il.amount / 100.0, ci.journal_entry_id, ci.id
       FROM customer_invoice_lines il JOIN customer_invoices ci ON ci.id = il.invoice_id JOIN so_lines sl ON sl.id = il.so_line_id
       JOIN materials m ON m.id = sl.material_id WHERE sl.so_id = @id
       ORDER BY date, doc_no`,
    )
    .all({ id });
  const total = lines.reduce((s, l) => s + Math.round(l.net_value * 100), 0);
  return { ...so, lines, history, total: fromCents(total) };
}

export function listSOs(db: DB, q: { status?: string; customerId?: number; search?: string }) {
  return db
    .prepare(
      `SELECT so.id, so.doc_no, so.order_date, so.requested_date, so.customer_ref, so.status, c.name AS customer_name, w.code AS warehouse_code,
              (SELECT sales_org || '/' || distr_channel || '/' || division FROM sales_areas sa WHERE sa.id = so.sales_area_id) AS sales_area,
              ROUND(SUM(ROUND(sl.qty * sl.unit_price))) / 100.0 AS total,
              CASE WHEN SUM(sl.qty) > 0 THEN ROUND(100.0 * SUM(sl.delivered_qty) / SUM(sl.qty)) ELSE 0 END AS delivered_pct,
              CASE WHEN SUM(sl.qty) > 0 THEN ROUND(100.0 * SUM(sl.billed_qty) / SUM(sl.qty)) ELSE 0 END AS billed_pct
       FROM sales_orders so JOIN customers c ON c.id = so.customer_id JOIN warehouses w ON w.id = so.warehouse_id
       LEFT JOIN so_lines sl ON sl.so_id = so.id
       WHERE (@status IS NULL OR so.status = @status) AND (@customer IS NULL OR so.customer_id = @customer)
         AND (@search IS NULL OR so.doc_no LIKE @search OR c.name LIKE @search OR so.customer_ref LIKE @search)
       GROUP BY so.id ORDER BY so.id DESC LIMIT 500`,
    )
    .all({ status: q.status ?? null, customer: q.customerId ?? null, search: q.search ? `%${q.search}%` : null });
}

// ---------- Outbound delivery with goods issue (movement 601) ----------

export interface DeliveryInput {
  postingDate?: string;
  note?: string;
  lines: { soLineId: number; qty: number }[];
}

/** Ship goods: stock leaves at moving average price. Dr Cost of goods sold / Cr Inventory. */
export function postDelivery(db: DB, soId: number, input: DeliveryInput, userId: number | null) {
  const so = getSORow(db, soId);
  if (!['CONFIRMED', 'PARTIALLY_DELIVERED'].includes(so.status)) throw badRequest(`Cannot deliver a sales order in status ${so.status}`);
  const items = input.lines.filter((l) => l.qty > 0);
  if (!items.length) throw badRequest('Enter a quantity for at least one line');
  const postingDate = input.postingDate ?? today();

  return db.transaction(() => {
    const docNo = nextNumber(db, 'MAT');
    const inv = determineAccount(db, 'INVENTORY');
    const cogs = determineAccount(db, 'COGS');
    const jlines: JournalLineInput[] = [];
    const moves: Parameters<typeof recordMovement>[1][] = [];
    for (const it of items) {
      const sl = db.prepare('SELECT * FROM so_lines WHERE id = ? AND so_id = ?').get(it.soLineId, soId) as any;
      if (!sl) throw badRequest(`Line ${it.soLineId} does not belong to this sales order`);
      const mat = getMaterial(db, sl.material_id);
      const qty = roundQty(it.qty);
      const open = roundQty(sl.qty - sl.delivered_qty);
      if (qty > open) throw badRequest(`Line ${sl.line_no} (${mat.code}): only ${open} open for delivery`);
      const amount = issueFromStock(db, mat.id, so.warehouse_id, qty);
      db.prepare('UPDATE so_lines SET delivered_qty = ? WHERE id = ?').run(roundQty(sl.delivered_qty + qty), sl.id);
      jlines.push({ accountId: cogs, debit: amount, memo: `Delivery ${so.doc_no}/${sl.line_no} ${mat.code} x ${qty}`, customerId: so.customer_id, materialId: mat.id });
      jlines.push({ accountId: inv, credit: amount, memo: `${mat.code} x ${qty}`, materialId: mat.id });
      moves.push({ docNo, type: '601', materialId: mat.id, warehouseId: so.warehouse_id, qty, amount, soLineId: sl.id, postingDate, note: input.note ?? null, userId });
    }
    let journal: { id: number; docNo: string } | null = null;
    if (jlines.some((l) => (l.debit ?? 0) > 0)) {
      journal = postJournal(db, { postingDate, source: 'DELIVERY', sourceDoc: docNo, reference: so.doc_no, description: `Delivery for sales order ${so.doc_no}`, lines: jlines }, userId);
    }
    moves.forEach((m) => recordMovement(db, { ...m, journalEntryId: journal?.id ?? null }));
    refreshSOStatus(db, soId);
    return { docNo, journalDocNo: journal?.docNo ?? null };
  })();
}

function refreshSOStatus(db: DB, soId: number) {
  const r = db.prepare('SELECT SUM(qty) q, SUM(delivered_qty) dq FROM so_lines WHERE so_id = ?').get(soId) as { q: number; dq: number };
  const status = roundQty(r.dq) <= 0 ? 'CONFIRMED' : roundQty(r.dq) >= roundQty(r.q) ? 'DELIVERED' : 'PARTIALLY_DELIVERED';
  db.prepare("UPDATE sales_orders SET status = ? WHERE id = ? AND status NOT IN ('CLOSED','CANCELLED')").run(status, soId);
}

// ---------- Billing (customer invoice) ----------

export interface BillingInput {
  invoiceDate?: string;
  dueDate?: string;
  /** Lines to bill; omitted = everything delivered but not yet billed. */
  lines?: { soLineId: number; qty: number }[];
  /** Output tax code; omitted = the customer's tax code (none = no tax). */
  taxCodeId?: number | null;
}

/** Delivery-based billing at the order price. Dr Accounts receivable (customer) / Cr Sales revenue. */
export function postBilling(db: DB, soId: number, input: BillingInput, userId: number | null) {
  const so = getSORow(db, soId);
  if (['DRAFT', 'CANCELLED', 'CLOSED'].includes(so.status)) throw badRequest(`Cannot bill a sales order in status ${so.status}`);
  const customer = getCustomer(db, so.customer_id);
  const soLines = db.prepare('SELECT * FROM so_lines WHERE so_id = ? ORDER BY line_no').all(soId) as any[];
  const items = (input.lines ?? soLines.map((l) => ({ soLineId: l.id, qty: roundQty(l.delivered_qty - l.billed_qty) }))).filter((l) => l.qty > 0);
  if (!items.length) throw badRequest('Nothing to bill: no delivered quantity is waiting for billing');
  const invoiceDate = input.invoiceDate ?? today();
  const dueDate = input.dueDate ?? addDays(invoiceDate, customer.payment_terms_days);

  return db.transaction(() => {
    const docNo = nextNumber(db, 'BIL');
    const ar = determineAccount(db, 'AR');
    const revenue = determineAccount(db, 'REVENUE');
    const jlines: JournalLineInput[] = [];
    const ilines: { soLineId: number; qty: number; unitPrice: number; amount: number; desc: string }[] = [];
    let total = 0;
    for (const it of items) {
      const sl = soLines.find((l) => l.id === it.soLineId);
      if (!sl) throw badRequest(`Line ${it.soLineId} does not belong to this sales order`);
      const mat = getMaterial(db, sl.material_id);
      const qty = roundQty(it.qty);
      const open = roundQty(sl.delivered_qty - sl.billed_qty);
      if (qty > open) throw badRequest(`Line ${sl.line_no} (${mat.code}): only ${open} delivered and not yet billed`);
      const amount = Math.round(qty * sl.unit_price);
      total += amount;
      db.prepare('UPDATE so_lines SET billed_qty = ? WHERE id = ?').run(roundQty(sl.billed_qty + qty), sl.id);
      jlines.push({ accountId: revenue, credit: amount, memo: `${so.doc_no}/${sl.line_no} ${mat.code} x ${qty}`, customerId: customer.id, materialId: mat.id });
      ilines.push({ soLineId: sl.id, qty, unitPrice: sl.unit_price, amount, desc: `${mat.code} ${mat.name}` });
    }
    if (total <= 0) throw badRequest('Invoice total must be positive');
    const taxCodeId = input.taxCodeId === undefined ? customer.tax_code_id : input.taxCodeId;
    let tax = 0;
    if (taxCodeId) {
      const tc = db.prepare('SELECT * FROM tax_codes WHERE id = ?').get(taxCodeId) as any;
      if (!tc) throw badRequest('Tax code does not exist');
      if (tc.direction !== 'OUTPUT') throw badRequest(`Tax code ${tc.code} is an input tax code; customer invoices need an output tax code`);
      tax = Math.round((total * tc.rate_pct) / 100);
      if (tax > 0) jlines.push({ accountId: tc.account_id, credit: tax, memo: `Output tax ${tc.code} ${tc.rate_pct}%`, customerId: customer.id });
    }
    total += tax;
    jlines.unshift({ accountId: ar, debit: total, memo: `Customer ${customer.code} invoice ${docNo}`, customerId: customer.id });

    const journal = postJournal(
      db,
      { postingDate: invoiceDate, source: 'BILLING', sourceDoc: docNo, reference: so.customer_ref ?? so.doc_no, description: `Customer invoice ${docNo} for SO ${so.doc_no}`, lines: jlines },
      userId,
    );
    const { lastInsertRowid } = db
      .prepare(
        `INSERT INTO customer_invoices(doc_no, customer_id, so_id, invoice_date, due_date, total, tax_code_id, tax_amount, journal_entry_id, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(docNo, customer.id, soId, invoiceDate, dueDate, total, taxCodeId ?? null, tax, journal.id, userId);
    const invId = Number(lastInsertRowid);
    const ins = db.prepare('INSERT INTO customer_invoice_lines(invoice_id, so_line_id, description, qty, unit_price, amount) VALUES (?, ?, ?, ?, ?, ?)');
    ilines.forEach((l) => ins.run(invId, l.soLineId, l.desc, l.qty, l.unitPrice, l.amount));
    return { id: invId, docNo, journalDocNo: journal.docNo };
  })();
}

const INVOICE_COLS = `ci.id, ci.doc_no, ci.customer_id, ci.so_id, ci.invoice_date, ci.due_date, ci.status, ci.journal_entry_id, ci.created_at,
  ci.total / 100.0 AS total, ci.paid_amount / 100.0 AS paid_amount, (ci.total - ci.paid_amount) / 100.0 AS open_amount,
  (ci.total - ci.tax_amount) / 100.0 AS net_amount, ci.tax_amount / 100.0 AS tax_amount,
  (SELECT code || ' ' || rate_pct || '%' FROM tax_codes t WHERE t.id = ci.tax_code_id) AS tax_code,
  c.code AS customer_code, c.name AS customer_name, so.doc_no AS so_doc_no, so.customer_ref, je.doc_no AS journal_doc_no`;
const INVOICE_FROM = `FROM customer_invoices ci JOIN customers c ON c.id = ci.customer_id
  LEFT JOIN sales_orders so ON so.id = ci.so_id LEFT JOIN journal_entries je ON je.id = ci.journal_entry_id`;

export function listCustomerInvoices(db: DB, q: { status?: string; customerId?: number; open?: boolean }) {
  return db
    .prepare(
      `SELECT ${INVOICE_COLS} ${INVOICE_FROM}
       WHERE (@status IS NULL OR ci.status = @status) AND (@customer IS NULL OR ci.customer_id = @customer)
         AND (@open = 0 OR ci.status <> 'PAID')
       ORDER BY ci.due_date, ci.id LIMIT 500`,
    )
    .all({ status: q.status ?? null, customer: q.customerId ?? null, open: q.open ? 1 : 0 });
}

export function getCustomerInvoice(db: DB, id: number) {
  const inv = db.prepare(`SELECT ${INVOICE_COLS}, c.address AS customer_address, c.tax_id AS customer_tax_id ${INVOICE_FROM} WHERE ci.id = ?`).get(id) as any;
  if (!inv) throw notFound('Customer invoice');
  const lines = db
    .prepare('SELECT description, qty, unit_price / 100.0 AS unit_price, amount / 100.0 AS amount FROM customer_invoice_lines WHERE invoice_id = ? ORDER BY id')
    .all(id);
  const receipts = db
    .prepare(
      `SELECT r.doc_no, r.receipt_date, r.amount / 100.0 AS amount, r.reference, je.id AS journal_entry_id, je.doc_no AS journal_doc_no
       FROM receipts r LEFT JOIN journal_entries je ON je.id = r.journal_entry_id WHERE r.invoice_id = ? ORDER BY r.id`,
    )
    .all(id);
  return { ...inv, lines, receipts };
}

// ---------- Incoming payments ----------

export function postReceipt(
  db: DB,
  invoiceId: number,
  input: { amount: number /* cents */; receiptDate?: string; bankAccountId?: number; reference?: string },
  userId: number | null,
) {
  const inv = db.prepare('SELECT * FROM customer_invoices WHERE id = ?').get(invoiceId) as any;
  if (!inv) throw notFound('Customer invoice');
  const open = inv.total - inv.paid_amount;
  const amount = Math.round(input.amount);
  if (amount <= 0) throw badRequest('Receipt amount must be positive');
  if (amount > open) throw badRequest(`Receipt exceeds open amount of ${fromCents(open)}`);
  const bank = input.bankAccountId ?? determineAccount(db, 'BANK');
  const bankAcc = db.prepare('SELECT type FROM accounts WHERE id = ?').get(bank) as { type: string } | undefined;
  if (!bankAcc || bankAcc.type !== 'ASSET') throw badRequest('Money must be received into an asset (bank/cash) account');
  const receiptDate = input.receiptDate ?? today();

  return db.transaction(() => {
    const docNo = nextNumber(db, 'RCP');
    const journal = postJournal(
      db,
      {
        postingDate: receiptDate,
        source: 'RECEIPT',
        sourceDoc: docNo,
        reference: input.reference ?? inv.doc_no,
        description: `Incoming payment for invoice ${inv.doc_no}`,
        lines: [
          { accountId: bank, debit: amount, memo: `Receipt ${docNo}` },
          { accountId: determineAccount(db, 'AR'), credit: amount, customerId: inv.customer_id, memo: `Clear ${inv.doc_no}` },
        ],
      },
      userId,
    );
    db.prepare(
      `INSERT INTO receipts(doc_no, customer_id, invoice_id, receipt_date, amount, bank_account_id, reference, journal_entry_id, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(docNo, inv.customer_id, invoiceId, receiptDate, amount, bank, input.reference ?? null, journal.id, userId);
    const paid = inv.paid_amount + amount;
    db.prepare('UPDATE customer_invoices SET paid_amount = ?, status = ? WHERE id = ?').run(paid, paid >= inv.total ? 'PAID' : 'PARTIALLY_PAID', invoiceId);
    return { docNo, journalDocNo: journal.docNo };
  })();
}

export function listReceipts(db: DB) {
  return db
    .prepare(
      `SELECT r.id, r.doc_no, r.receipt_date, r.amount / 100.0 AS amount, r.reference, c.name AS customer_name,
              ci.id AS invoice_id, ci.doc_no AS invoice_doc_no, a.code AS bank_code, je.id AS journal_entry_id, je.doc_no AS journal_doc_no
       FROM receipts r JOIN customers c ON c.id = r.customer_id JOIN customer_invoices ci ON ci.id = r.invoice_id
       JOIN accounts a ON a.id = r.bank_account_id LEFT JOIN journal_entries je ON je.id = r.journal_entry_id
       ORDER BY r.id DESC LIMIT 500`,
    )
    .all();
}

/** Open receivables bucketed by days overdue. */
export function arAging(db: DB, asOf = today()) {
  const rows = db
    .prepare(
      `SELECT c.id, c.code, c.name, ci.due_date, (ci.total - ci.paid_amount) AS open
       FROM customer_invoices ci JOIN customers c ON c.id = ci.customer_id WHERE ci.status <> 'PAID'`,
    )
    .all() as { id: number; code: string; name: string; due_date: string; open: number }[];
  const buckets = ['current', 'd1_30', 'd31_60', 'd61_90', 'd90_plus'] as const;
  const byCustomer = new Map<number, any>();
  for (const r of rows) {
    const days = Math.floor((Date.parse(asOf) - Date.parse(r.due_date)) / 86400000);
    const b = days <= 0 ? 'current' : days <= 30 ? 'd1_30' : days <= 60 ? 'd31_60' : days <= 90 ? 'd61_90' : 'd90_plus';
    const c = byCustomer.get(r.id) ?? { customerId: r.id, code: r.code, name: r.name, ...Object.fromEntries(buckets.map((k) => [k, 0])), total: 0 };
    c[b] += r.open;
    c.total += r.open;
    byCustomer.set(r.id, c);
  }
  const customers = [...byCustomer.values()].map((c) => ({ ...c, ...Object.fromEntries([...buckets, 'total'].map((k) => [k, fromCents(c[k])])) }));
  return { asOf, customers };
}
