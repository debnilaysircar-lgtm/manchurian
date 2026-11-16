import type { DB } from '../db.ts';
import { determineAccount, nextNumber } from '../db.ts';
import { badRequest, notFound } from '../lib/errors.ts';
import { fromCents, roundQty, today } from '../lib/money.ts';
import { postJournal, type JournalLineInput } from './finance.ts';

export const MOVEMENT_TYPES: Record<string, string> = {
  '101': 'Goods receipt for purchase order',
  '201': 'Goods issue to consumption',
  '301': 'Transfer between warehouses',
  '561': 'Initial stock entry',
  '701': 'Physical inventory gain',
  '702': 'Physical inventory loss',
};

interface MaterialRow {
  id: number;
  code: string;
  name: string;
  stock_value: number;
  is_active: number;
}

export function getMaterial(db: DB, id: number): MaterialRow {
  const m = db.prepare('SELECT * FROM materials WHERE id = ?').get(id) as MaterialRow | undefined;
  if (!m) throw notFound(`Material ${id}`);
  return m;
}

export function totalQty(db: DB, materialId: number): number {
  return (db.prepare('SELECT COALESCE(SUM(qty), 0) q FROM stock WHERE material_id = ?').get(materialId) as { q: number }).q;
}

export function warehouseQty(db: DB, materialId: number, warehouseId: number): number {
  const r = db.prepare('SELECT qty FROM stock WHERE material_id = ? AND warehouse_id = ?').get(materialId, warehouseId) as { qty: number } | undefined;
  return r?.qty ?? 0;
}

/** Moving average price in cents per unit. */
export function movingAveragePrice(db: DB, materialId: number): number {
  const m = getMaterial(db, materialId);
  const q = totalQty(db, materialId);
  return q > 0 ? m.stock_value / q : 0;
}

function assertWarehouse(db: DB, id: number) {
  if (!db.prepare('SELECT 1 FROM warehouses WHERE id = ?').get(id)) throw notFound(`Warehouse ${id}`);
}

function changeQty(db: DB, materialId: number, warehouseId: number, delta: number) {
  const current = warehouseQty(db, materialId, warehouseId);
  const next = roundQty(current + delta);
  if (next < 0) {
    const m = getMaterial(db, materialId);
    throw badRequest(`Insufficient stock for ${m.code}: available ${current}, requested ${roundQty(-delta)}`);
  }
  db.prepare(
    `INSERT INTO stock(material_id, warehouse_id, qty) VALUES (?, ?, ?)
     ON CONFLICT(material_id, warehouse_id) DO UPDATE SET qty = excluded.qty`,
  ).run(materialId, warehouseId, next);
}

/** Value (cents) of removing qty from total stock at moving average price; takes the full remaining value on the last unit. */
function issueValue(db: DB, materialId: number, qty: number): number {
  const m = getMaterial(db, materialId);
  const total = totalQty(db, materialId);
  if (roundQty(total - qty) <= 0) return m.stock_value;
  return Math.round((m.stock_value * qty) / total);
}

/** Increase valuated stock (used by GR, initial entry, gains). Caller posts the journal. */
export function receiveIntoStock(db: DB, materialId: number, warehouseId: number, qty: number, valueCents: number) {
  changeQty(db, materialId, warehouseId, qty);
  db.prepare('UPDATE materials SET stock_value = stock_value + ? WHERE id = ?').run(valueCents, materialId);
}

export function recordMovement(
  db: DB,
  m: {
    docNo: string;
    type: string;
    materialId: number;
    warehouseId: number;
    toWarehouseId?: number | null;
    qty: number;
    amount: number;
    poLineId?: number | null;
    journalEntryId?: number | null;
    postingDate: string;
    note?: string | null;
    userId: number | null;
  },
) {
  db.prepare(
    `INSERT INTO stock_movements(doc_no, movement_type, material_id, warehouse_id, to_warehouse_id, qty, amount,
       po_line_id, journal_entry_id, posting_date, note, created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
  ).run(
    m.docNo,
    m.type,
    m.materialId,
    m.warehouseId,
    m.toWarehouseId ?? null,
    m.qty,
    m.amount,
    m.poLineId ?? null,
    m.journalEntryId ?? null,
    m.postingDate,
    m.note ?? null,
    m.userId,
  );
}

export interface MovementItem {
  materialId: number;
  qty: number;
  /** Only for 561 initial stock: total value in cents. */
  amount?: number;
}

export interface MovementInput {
  movementType: '201' | '301' | '561' | '701' | '702';
  warehouseId: number;
  toWarehouseId?: number;
  postingDate?: string;
  note?: string;
  /** Optional GL account override for the offset (e.g. a specific expense account for 201). */
  offsetAccountId?: number;
  items: MovementItem[];
}

/** Post a goods movement (non-PO). Updates quantities, valuation, and posts to the GL in one transaction. */
export function postGoodsMovement(db: DB, input: MovementInput, userId: number | null) {
  const { movementType: type, warehouseId, items } = input;
  if (!MOVEMENT_TYPES[type] || (type as string) === '101') throw badRequest(`Movement type ${type} cannot be posted here`);
  if (!items.length) throw badRequest('At least one item is required');
  assertWarehouse(db, warehouseId);
  if (type === '301') {
    if (!input.toWarehouseId) throw badRequest('Destination warehouse is required for a transfer');
    if (input.toWarehouseId === warehouseId) throw badRequest('Source and destination warehouse must differ');
    assertWarehouse(db, input.toWarehouseId);
  }
  const postingDate = input.postingDate ?? today();

  return db.transaction(() => {
    const docNo = nextNumber(db, 'MAT');
    const inventoryAcc = determineAccount(db, 'INVENTORY');
    const offsetKey = { '201': 'CONSUMPTION', '561': 'OPENING', '701': 'INV_DIFF', '702': 'INV_DIFF', '301': null }[type];
    const offsetAcc = offsetKey ? input.offsetAccountId ?? determineAccount(db, offsetKey) : null;
    const jlines: JournalLineInput[] = [];
    const movements: Parameters<typeof recordMovement>[1][] = [];

    for (const it of items) {
      const mat = getMaterial(db, it.materialId);
      if (!mat.is_active) throw badRequest(`Material ${mat.code} is inactive`);
      const qty = roundQty(it.qty);
      if (qty <= 0) throw badRequest(`Quantity for ${mat.code} must be positive`);
      let amount = 0;

      switch (type) {
        case '201':
        case '702': {
          // Value at moving average before reducing quantity (changeQty rejects negative stock)
          const available = warehouseQty(db, mat.id, warehouseId);
          if (available < qty) throw badRequest(`Insufficient stock for ${mat.code}: available ${available}, requested ${qty}`);
          amount = issueValue(db, mat.id, qty);
          changeQty(db, mat.id, warehouseId, -qty);
          db.prepare('UPDATE materials SET stock_value = stock_value - ? WHERE id = ?').run(amount, mat.id);
          jlines.push({ accountId: offsetAcc!, debit: amount, memo: `${MOVEMENT_TYPES[type]} ${mat.code}`, materialId: mat.id });
          jlines.push({ accountId: inventoryAcc, credit: amount, memo: `${mat.code} x ${qty}`, materialId: mat.id });
          break;
        }
        case '561':
        case '701': {
          if (type === '561') {
            if (it.amount == null || it.amount < 0) throw badRequest(`Value is required for initial stock of ${mat.code}`);
            amount = Math.round(it.amount);
          } else {
            const map = movingAveragePrice(db, mat.id);
            if (map === 0) throw badRequest(`${mat.code} has no moving average price; use initial stock entry (561) instead`);
            amount = Math.round(map * qty);
          }
          receiveIntoStock(db, mat.id, warehouseId, qty, amount);
          jlines.push({ accountId: inventoryAcc, debit: amount, memo: `${mat.code} x ${qty}`, materialId: mat.id });
          jlines.push({ accountId: offsetAcc!, credit: amount, memo: `${MOVEMENT_TYPES[type]} ${mat.code}`, materialId: mat.id });
          break;
        }
        case '301': {
          changeQty(db, mat.id, warehouseId, -qty);
          changeQty(db, mat.id, input.toWarehouseId!, qty);
          amount = Math.round(movingAveragePrice(db, mat.id) * qty);
          break;
        }
      }
      movements.push({
        docNo,
        type,
        materialId: mat.id,
        warehouseId,
        toWarehouseId: input.toWarehouseId ?? null,
        qty,
        amount,
        postingDate,
        note: input.note ?? null,
        userId,
      });
    }

    let journal: { id: number; docNo: string } | null = null;
    if (type !== '301' && jlines.some((l) => (l.debit ?? 0) > 0)) {
      journal = postJournal(
        db,
        { postingDate, source: type === '201' ? 'GI' : type === '561' ? 'INITIAL' : 'ADJUST', sourceDoc: docNo, description: MOVEMENT_TYPES[type], reference: input.note ?? null, lines: jlines },
        userId,
      );
    }
    movements.forEach((m) => recordMovement(db, { ...m, journalEntryId: journal?.id ?? null }));
    return { docNo, journalDocNo: journal?.docNo ?? null };
  })();
}

export function stockOverview(db: DB, warehouseId?: number) {
  const materials = db
    .prepare(
      `SELECT m.id, m.code, m.name, m.uom, m.material_type, m.reorder_level, m.stock_value,
              COALESCE((SELECT SUM(qty) FROM stock s WHERE s.material_id = m.id), 0) AS total_qty
       FROM materials m ORDER BY m.code`,
    )
    .all() as any[];
  const perWh = db
    .prepare(
      `SELECT s.material_id, s.warehouse_id, w.code AS warehouse_code, s.qty FROM stock s
       JOIN warehouses w ON w.id = s.warehouse_id WHERE s.qty <> 0 AND (@wh IS NULL OR s.warehouse_id = @wh)`,
    )
    .all({ wh: warehouseId ?? null }) as any[];
  return materials
    .map((m) => {
      const map = m.total_qty > 0 ? m.stock_value / m.total_qty : 0;
      const breakdown = perWh.filter((p) => p.material_id === m.id).map((p) => ({ warehouseId: p.warehouse_id, warehouseCode: p.warehouse_code, qty: p.qty }));
      const qty = warehouseId ? breakdown.reduce((s, b) => s + b.qty, 0) : m.total_qty;
      return {
        id: m.id,
        code: m.code,
        name: m.name,
        uom: m.uom,
        materialType: m.material_type,
        reorderLevel: m.reorder_level,
        qty: roundQty(qty),
        movingAveragePrice: fromCents(map),
        value: warehouseId ? fromCents(Math.round(map * qty)) : fromCents(m.stock_value),
        belowReorder: m.reorder_level > 0 && m.total_qty < m.reorder_level,
        warehouses: breakdown,
      };
    })
    .filter((r) => !warehouseId || r.qty !== 0);
}

export function listMovements(db: DB, q: { materialId?: number; warehouseId?: number; type?: string; from?: string; to?: string }) {
  return db
    .prepare(
      `SELECT sm.id, sm.doc_no, sm.movement_type, sm.posting_date, sm.qty, sm.amount / 100.0 AS amount, sm.note,
              m.code AS material_code, m.name AS material_name, m.uom,
              w.code AS warehouse_code, tw.code AS to_warehouse_code,
              je.id AS journal_entry_id, je.doc_no AS journal_doc_no, po.doc_no AS po_doc_no, u.full_name AS created_by_name
       FROM stock_movements sm JOIN materials m ON m.id = sm.material_id
       JOIN warehouses w ON w.id = sm.warehouse_id LEFT JOIN warehouses tw ON tw.id = sm.to_warehouse_id
       LEFT JOIN journal_entries je ON je.id = sm.journal_entry_id
       LEFT JOIN po_lines pl ON pl.id = sm.po_line_id LEFT JOIN purchase_orders po ON po.id = pl.po_id
       LEFT JOIN users u ON u.id = sm.created_by
       WHERE (@mat IS NULL OR sm.material_id = @mat) AND (@wh IS NULL OR sm.warehouse_id = @wh OR sm.to_warehouse_id = @wh)
         AND (@type IS NULL OR sm.movement_type = @type)
         AND (@from IS NULL OR sm.posting_date >= @from) AND (@to IS NULL OR sm.posting_date <= @to)
       ORDER BY sm.posting_date DESC, sm.id DESC LIMIT 500`,
    )
    .all({ mat: q.materialId ?? null, wh: q.warehouseId ?? null, type: q.type ?? null, from: q.from ?? null, to: q.to ?? null });
}
