import type { DB } from '../db.ts';
import { nextNumber } from '../db.ts';
import { badRequest, notFound } from '../lib/errors.ts';
import { fromCents, today } from '../lib/money.ts';

export interface JournalLineInput {
  accountId: number;
  debit?: number; // cents
  credit?: number; // cents
  memo?: string | null;
  vendorId?: number | null;
  materialId?: number | null;
}

export interface JournalInput {
  postingDate?: string;
  reference?: string | null;
  description?: string | null;
  source: string;
  sourceDoc?: string | null;
  lines: JournalLineInput[];
}

/** Post a balanced double-entry journal. All amounts in cents. Returns entry id. */
export function postJournal(db: DB, input: JournalInput, userId: number | null): { id: number; docNo: string } {
  const lines = input.lines
    .map((l) => ({ ...l, debit: Math.round(l.debit ?? 0), credit: Math.round(l.credit ?? 0) }))
    .filter((l) => l.debit !== 0 || l.credit !== 0);
  if (lines.length < 2) throw badRequest('A journal entry needs at least two non-zero lines');
  for (const l of lines) {
    if (l.debit < 0 || l.credit < 0) throw badRequest('Debit and credit must not be negative');
    if (l.debit > 0 && l.credit > 0) throw badRequest('A line cannot have both a debit and a credit');
  }
  const dr = lines.reduce((s, l) => s + l.debit, 0);
  const cr = lines.reduce((s, l) => s + l.credit, 0);
  if (dr !== cr) throw badRequest(`Entry is not balanced: debits ${fromCents(dr)} vs credits ${fromCents(cr)}`);

  const accStmt = db.prepare('SELECT id, is_active FROM accounts WHERE id = ?');
  for (const l of lines) {
    const acc = accStmt.get(l.accountId) as { id: number; is_active: number } | undefined;
    if (!acc) throw badRequest(`GL account ${l.accountId} does not exist`);
    if (!acc.is_active) throw badRequest(`GL account ${l.accountId} is blocked for posting`);
  }

  return db.transaction(() => {
    const docNo = nextNumber(db, 'JE');
    const { lastInsertRowid } = db
      .prepare(
        `INSERT INTO journal_entries(doc_no, posting_date, reference, description, source, source_doc, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(docNo, input.postingDate ?? today(), input.reference ?? null, input.description ?? null, input.source, input.sourceDoc ?? null, userId);
    const id = Number(lastInsertRowid);
    const ins = db.prepare(
      `INSERT INTO journal_lines(entry_id, line_no, account_id, debit, credit, memo, vendor_id, material_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    lines.forEach((l, i) => ins.run(id, i + 1, l.accountId, l.debit, l.credit, l.memo ?? null, l.vendorId ?? null, l.materialId ?? null));
    return { id, docNo };
  })();
}

/** Reverse a manual journal entry by posting a mirror entry. Subledger-generated entries must be reversed in their module. */
export function reverseJournal(db: DB, entryId: number, userId: number, postingDate?: string) {
  const e = db.prepare('SELECT * FROM journal_entries WHERE id = ?').get(entryId) as any;
  if (!e) throw notFound('Journal entry');
  if (e.status === 'REVERSED') throw badRequest('Entry is already reversed');
  if (e.source === 'REVERSAL') throw badRequest('A reversal entry cannot itself be reversed');
  if (e.source !== 'MANUAL') throw badRequest(`Entries from ${e.source} must be corrected in their originating module`);
  const lines = db.prepare('SELECT * FROM journal_lines WHERE entry_id = ? ORDER BY line_no').all(entryId) as any[];
  return db.transaction(() => {
    const rev = postJournal(
      db,
      {
        postingDate: postingDate ?? today(),
        reference: e.doc_no,
        description: `Reversal of ${e.doc_no}`,
        source: 'REVERSAL',
        sourceDoc: e.doc_no,
        lines: lines.map((l) => ({
          accountId: l.account_id,
          debit: l.credit,
          credit: l.debit,
          memo: l.memo,
          vendorId: l.vendor_id,
          materialId: l.material_id,
        })),
      },
      userId,
    );
    db.prepare("UPDATE journal_entries SET status = 'REVERSED', reversed_by = ? WHERE id = ?").run(rev.id, entryId);
    db.prepare('UPDATE journal_entries SET reversal_of = ? WHERE id = ?').run(entryId, rev.id);
    return rev;
  })();
}

export function getJournal(db: DB, id: number) {
  const entry = db
    .prepare(
      `SELECT je.*, u.full_name AS created_by_name, r.doc_no AS reversed_by_doc, o.doc_no AS reversal_of_doc
       FROM journal_entries je LEFT JOIN users u ON u.id = je.created_by
       LEFT JOIN journal_entries r ON r.id = je.reversed_by
       LEFT JOIN journal_entries o ON o.id = je.reversal_of
       WHERE je.id = ?`,
    )
    .get(id);
  if (!entry) throw notFound('Journal entry');
  const lines = db
    .prepare(
      `SELECT jl.line_no, jl.account_id, a.code AS account_code, a.name AS account_name,
              jl.debit / 100.0 AS debit, jl.credit / 100.0 AS credit, jl.memo,
              v.code AS vendor_code, v.name AS vendor_name, m.code AS material_code
       FROM journal_lines jl JOIN accounts a ON a.id = jl.account_id
       LEFT JOIN vendors v ON v.id = jl.vendor_id LEFT JOIN materials m ON m.id = jl.material_id
       WHERE jl.entry_id = ? ORDER BY jl.line_no`,
    )
    .all(id);
  return { ...entry, lines };
}

export function listJournals(db: DB, q: { from?: string; to?: string; source?: string; search?: string }) {
  return db
    .prepare(
      `SELECT je.id, je.doc_no, je.posting_date, je.reference, je.description, je.source, je.source_doc, je.status,
              SUM(jl.debit) / 100.0 AS amount, u.full_name AS created_by_name
       FROM journal_entries je JOIN journal_lines jl ON jl.entry_id = je.id
       LEFT JOIN users u ON u.id = je.created_by
       WHERE (@from IS NULL OR je.posting_date >= @from) AND (@to IS NULL OR je.posting_date <= @to)
         AND (@source IS NULL OR je.source = @source)
         AND (@search IS NULL OR je.doc_no LIKE @search OR je.reference LIKE @search OR je.description LIKE @search)
       GROUP BY je.id ORDER BY je.posting_date DESC, je.id DESC LIMIT 500`,
    )
    .all({ from: q.from ?? null, to: q.to ?? null, source: q.source ?? null, search: q.search ? `%${q.search}%` : null });
}

/** Balance per account up to and including a date. Debit-positive. */
export function trialBalance(db: DB, asOf?: string, from?: string) {
  const rows = db
    .prepare(
      `SELECT a.id, a.code, a.name, a.type,
              COALESCE(SUM(jl.debit), 0) AS dr, COALESCE(SUM(jl.credit), 0) AS cr
       FROM accounts a
       LEFT JOIN journal_lines jl ON jl.account_id = a.id
         AND jl.entry_id IN (SELECT id FROM journal_entries
                             WHERE (@asOf IS NULL OR posting_date <= @asOf) AND (@from IS NULL OR posting_date >= @from))
       GROUP BY a.id ORDER BY a.code`,
    )
    .all({ asOf: asOf ?? null, from: from ?? null }) as { id: number; code: string; name: string; type: string; dr: number; cr: number }[];
  const accounts = rows.map((r) => ({
    id: r.id,
    code: r.code,
    name: r.name,
    type: r.type,
    debit: fromCents(r.dr),
    credit: fromCents(r.cr),
    balance: fromCents(r.dr - r.cr),
  }));
  const totals = {
    debit: fromCents(rows.reduce((s, r) => s + r.dr, 0)),
    credit: fromCents(rows.reduce((s, r) => s + r.cr, 0)),
  };
  return { asOf: asOf ?? today(), accounts, totals };
}

/** Balance sheet as of a date and income statement for a period. */
export function financialStatements(db: DB, from: string, to: string) {
  const bs = trialBalance(db, to).accounts;
  const pl = trialBalance(db, to, from).accounts;
  const section = (rows: typeof bs, type: string, sign: 1 | -1) =>
    rows.filter((r) => r.type === type && r.balance !== 0).map((r) => ({ code: r.code, name: r.name, amount: Math.round(sign * r.balance * 100) / 100 }));
  const sum = (rows: { amount: number }[]) => Math.round(rows.reduce((s, r) => s + r.amount * 100, 0)) / 100;

  const revenue = section(pl, 'REVENUE', -1);
  const expenses = section(pl, 'EXPENSE', 1);
  const netIncome = Math.round((sum(revenue) - sum(expenses)) * 100) / 100;

  // Cumulative (all-time to date) P&L is shown as current-year earnings in equity so the balance sheet balances.
  const cumRev = sum(section(bs, 'REVENUE', -1));
  const cumExp = sum(section(bs, 'EXPENSE', 1));
  const assets = section(bs, 'ASSET', 1);
  const liabilities = section(bs, 'LIABILITY', -1);
  const equity = section(bs, 'EQUITY', -1);
  const earnings = Math.round((cumRev - cumExp) * 100) / 100;
  if (earnings !== 0) equity.push({ code: '—', name: 'Earnings (unclosed P&L)', amount: earnings });

  return {
    period: { from, to },
    incomeStatement: { revenue, expenses, totalRevenue: sum(revenue), totalExpenses: sum(expenses), netIncome },
    balanceSheet: {
      assets,
      liabilities,
      equity,
      totalAssets: sum(assets),
      totalLiabilities: sum(liabilities),
      totalEquity: sum(equity),
    },
  };
}

/** Line items of one GL account with running balance. */
export function accountLedger(db: DB, accountId: number, from?: string, to?: string) {
  const account = db.prepare('SELECT * FROM accounts WHERE id = ?').get(accountId);
  if (!account) throw notFound('GL account');
  const opening = db
    .prepare(
      `SELECT COALESCE(SUM(jl.debit - jl.credit), 0) AS bal FROM journal_lines jl
       JOIN journal_entries je ON je.id = jl.entry_id WHERE jl.account_id = ? AND (? IS NOT NULL AND je.posting_date < ?)`,
    )
    .get(accountId, from ?? null, from ?? null) as { bal: number };
  const items = db
    .prepare(
      `SELECT je.id AS entry_id, je.doc_no, je.posting_date, je.source, je.reference, COALESCE(jl.memo, je.description) AS text,
              jl.debit, jl.credit, v.name AS vendor_name, m.code AS material_code
       FROM journal_lines jl JOIN journal_entries je ON je.id = jl.entry_id
       LEFT JOIN vendors v ON v.id = jl.vendor_id LEFT JOIN materials m ON m.id = jl.material_id
       WHERE jl.account_id = @acc AND (@from IS NULL OR je.posting_date >= @from) AND (@to IS NULL OR je.posting_date <= @to)
       ORDER BY je.posting_date, je.id, jl.line_no`,
    )
    .all({ acc: accountId, from: from ?? null, to: to ?? null }) as any[];
  let running = opening.bal;
  const lines = items.map((i) => {
    running += i.debit - i.credit;
    return { ...i, debit: fromCents(i.debit), credit: fromCents(i.credit), balance: fromCents(running) };
  });
  return { account, openingBalance: fromCents(opening.bal), closingBalance: fromCents(running), lines };
}
