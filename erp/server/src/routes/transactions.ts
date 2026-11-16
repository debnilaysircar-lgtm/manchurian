import { Router } from 'express';
import { z } from 'zod';
import type { DB } from '../db.ts';
import { getSetting } from '../db.ts';
import { requireRole } from '../auth.ts';
import { badRequest, handle, parse } from '../lib/errors.ts';
import { fromCents, toCents, today } from '../lib/money.ts';
import * as fi from '../services/finance.ts';
import * as inv from '../services/inventory.ts';
import * as mm from '../services/purchasing.ts';

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');
const optDate = date.optional().or(z.literal('').transform(() => undefined));
const intId = z.coerce.number().int().positive();
const num = (v: unknown) => (v === undefined || v === '' ? undefined : Number(v));
const str = (v: unknown) => (typeof v === 'string' && v !== '' ? v : undefined);
const pid = (v: string) => {
  const n = Number(v);
  if (!Number.isInteger(n)) throw badRequest('Invalid id');
  return n;
};

export function transactionRoutes(db: DB) {
  const r = Router();
  const uid = (req: Express.Request) => req.user!.id;

  // ---------- Finance ----------
  r.get('/journals', handle((req) => fi.listJournals(db, { from: str(req.query.from), to: str(req.query.to), source: str(req.query.source), search: str(req.query.search) })));
  r.get('/journals/:id', handle((req) => fi.getJournal(db, pid(req.params.id))));
  r.post('/journals', requireRole('finance'), handle((req) => {
    const d = parse(
      z.object({
        postingDate: optDate,
        reference: z.string().max(60).nullish(),
        description: z.string().max(200).nullish(),
        lines: z.array(z.object({
          accountId: intId,
          debit: z.coerce.number().min(0).default(0),
          credit: z.coerce.number().min(0).default(0),
          memo: z.string().max(200).nullish(),
          vendorId: intId.nullish(),
        })).min(2),
      }),
      req.body,
    );
    return fi.postJournal(db, { ...d, source: 'MANUAL', lines: d.lines.map((l) => ({ ...l, debit: toCents(l.debit), credit: toCents(l.credit) })) }, uid(req));
  }));
  r.post('/journals/:id/reverse', requireRole('finance'), handle((req) => {
    const d = parse(z.object({ postingDate: optDate }), req.body ?? {});
    return fi.reverseJournal(db, pid(req.params.id), uid(req), d.postingDate);
  }));
  r.get('/reports/trial-balance', handle((req) => fi.trialBalance(db, str(req.query.asOf))));
  r.get('/reports/ledger/:accountId', handle((req) => fi.accountLedger(db, pid(req.params.accountId), str(req.query.from), str(req.query.to))));
  r.get('/reports/statements', handle((req) => {
    const to = str(req.query.to) ?? today();
    const from = str(req.query.from) ?? `${to.slice(0, 4)}-01-01`;
    return fi.financialStatements(db, from, to);
  }));
  r.get('/reports/ap-aging', handle((req) => mm.apAging(db, str(req.query.asOf))));

  // ---------- Inventory ----------
  r.get('/movement-types', handle(() => Object.entries(inv.MOVEMENT_TYPES).map(([code, name]) => ({ code, name }))));
  r.get('/stock', handle((req) => inv.stockOverview(db, num(req.query.warehouseId))));
  r.get('/movements', handle((req) =>
    inv.listMovements(db, {
      materialId: num(req.query.materialId),
      warehouseId: num(req.query.warehouseId),
      type: str(req.query.type),
      from: str(req.query.from),
      to: str(req.query.to),
    })));
  r.post('/movements', requireRole('warehouse'), handle((req) => {
    const d = parse(
      z.object({
        movementType: z.enum(['201', '301', '561', '701', '702']),
        warehouseId: intId,
        toWarehouseId: intId.optional(),
        postingDate: optDate,
        note: z.string().max(200).optional(),
        offsetAccountId: intId.optional(),
        items: z.array(z.object({ materialId: intId, qty: z.coerce.number().positive(), amount: z.coerce.number().min(0).optional() })).min(1),
      }),
      req.body,
    );
    return inv.postGoodsMovement(db, { ...d, items: d.items.map((i) => ({ ...i, amount: i.amount === undefined ? undefined : toCents(i.amount) })) }, uid(req));
  }));

  // ---------- Purchasing ----------
  const poSchema = z.object({
    vendorId: intId,
    warehouseId: intId,
    orderDate: optDate,
    deliveryDate: optDate.nullish(),
    notes: z.string().max(500).nullish(),
    lines: z.array(z.object({ materialId: intId, qty: z.coerce.number().positive(), unitPrice: z.coerce.number().min(0) })).min(1),
  });
  const toPO = (d: z.infer<typeof poSchema>) => ({ ...d, lines: d.lines.map((l) => ({ ...l, unitPrice: toCents(l.unitPrice) })) });

  r.get('/purchase-orders', handle((req) => mm.listPOs(db, { status: str(req.query.status), vendorId: num(req.query.vendorId), search: str(req.query.search) })));
  r.get('/purchase-orders/:id', handle((req) => mm.getPO(db, pid(req.params.id))));
  r.post('/purchase-orders', requireRole('purchasing'), handle((req) => mm.createPO(db, toPO(parse(poSchema, req.body)), uid(req))));
  r.put('/purchase-orders/:id', requireRole('purchasing'), handle((req) => mm.updatePO(db, pid(req.params.id), toPO(parse(poSchema, req.body)))));
  r.post('/purchase-orders/:id/:action(release|cancel|close)', requireRole('purchasing'), handle((req) =>
    mm.setPOStatus(db, pid(req.params.id), req.params.action as 'release' | 'cancel' | 'close')));
  r.post('/purchase-orders/:id/goods-receipt', requireRole('warehouse', 'purchasing'), handle((req) => {
    const d = parse(
      z.object({ postingDate: optDate, note: z.string().max(200).optional(), lines: z.array(z.object({ poLineId: intId, qty: z.coerce.number().min(0) })).min(1) }),
      req.body,
    );
    return mm.postGoodsReceipt(db, pid(req.params.id), d, uid(req));
  }));
  r.post('/purchase-orders/:id/invoice', requireRole('finance'), handle((req) => {
    const d = parse(
      z.object({
        vendorRef: z.string().trim().min(1).max(40),
        invoiceDate: optDate,
        dueDate: optDate,
        lines: z.array(z.object({ poLineId: intId, qty: z.coerce.number().min(0), unitPrice: z.coerce.number().min(0) })).min(1),
      }),
      req.body,
    );
    return mm.postInvoice(db, pid(req.params.id), { ...d, lines: d.lines.map((l) => ({ ...l, unitPrice: toCents(l.unitPrice) })) }, uid(req));
  }));

  r.get('/invoices', handle((req) => mm.listInvoices(db, { status: str(req.query.status), vendorId: num(req.query.vendorId), open: req.query.open === 'true' })));
  r.get('/invoices/:id', handle((req) => mm.getInvoice(db, pid(req.params.id))));
  r.post('/invoices/:id/pay', requireRole('finance'), handle((req) => {
    const d = parse(
      z.object({ amount: z.coerce.number().positive(), paymentDate: optDate, bankAccountId: intId.optional(), reference: z.string().max(60).optional() }),
      req.body,
    );
    return mm.postPayment(db, pid(req.params.id), { ...d, amount: toCents(d.amount) }, uid(req));
  }));
  r.get('/payments', handle(() => mm.listPayments(db)));

  // ---------- Dashboard ----------
  r.get('/dashboard', handle(() => {
    const tb = fi.trialBalance(db).accounts;
    const bal = (type: string) => tb.filter((a) => a.type === type).reduce((s, a) => s + a.balance, 0);
    const cash = tb.filter((a) => ['100000', '110000'].includes(a.code)).reduce((s, a) => s + a.balance, 0);
    const scalar = (sql: string) => (db.prepare(sql).get() as { v: number }).v ?? 0;
    const stock = inv.stockOverview(db);
    return {
      company: getSetting(db, 'company_name'),
      currency: getSetting(db, 'currency'),
      cash,
      inventoryValue: stock.reduce((s, m) => s + m.value, 0),
      openPayables: fromCents(scalar("SELECT SUM(total - paid_amount) v FROM vendor_invoices WHERE status <> 'PAID'")),
      overduePayables: fromCents(scalar(`SELECT SUM(total - paid_amount) v FROM vendor_invoices WHERE status <> 'PAID' AND due_date < date('now')`)),
      grirBalance: -(tb.find((a) => a.code === '210000')?.balance ?? 0),
      netIncomeYtd: fi.financialStatements(db, `${today().slice(0, 4)}-01-01`, today()).incomeStatement.netIncome,
      totalAssets: bal('ASSET'),
      openPOs: scalar("SELECT COUNT(*) v FROM purchase_orders WHERE status IN ('RELEASED','PARTIALLY_RECEIVED')"),
      draftPOs: scalar("SELECT COUNT(*) v FROM purchase_orders WHERE status = 'DRAFT'"),
      belowReorder: stock.filter((m) => m.belowReorder).map((m) => ({ id: m.id, code: m.code, name: m.name, qty: m.qty, reorderLevel: m.reorderLevel, uom: m.uom })),
      recentJournals: fi.listJournals(db, {}).slice(0, 8),
      dueSoon: mm.listInvoices(db, { open: true }).slice(0, 8),
    };
  }));

  return r;
}
