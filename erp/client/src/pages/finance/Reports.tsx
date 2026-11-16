import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { fmtMoney, qs, todayIso, useApi } from '../../api';
import { Card, Empty, ErrorBanner, Field, Loading, PageHeader } from '../../components/ui';

export function TrialBalance() {
  const [asOf, setAsOf] = useState(todayIso());
  const [hideZero, setHideZero] = useState(true);
  const { data, error } = useApi<any>(`/reports/trial-balance${qs({ asOf })}`);
  const rows = data?.accounts.filter((a: any) => !hideZero || a.debit || a.credit) ?? [];
  const balanced = data && Math.round(data.totals.debit * 100) === Math.round(data.totals.credit * 100);
  return (
    <div>
      <PageHeader title="Trial Balance" subtitle="Cumulative debits, credits and balances per G/L account" />
      <ErrorBanner error={error} />
      <Card>
        <div className="flex flex-wrap items-end gap-4 border-b border-slate-200 p-3">
          <Field label="As of"><input className="input" type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} /></Field>
          <label className="flex items-center gap-2 pb-2 text-sm"><input type="checkbox" checked={hideZero} onChange={(e) => setHideZero(e.target.checked)} /> Hide accounts without postings</label>
          {data && <span className={`pb-2 text-sm font-medium ${balanced ? 'text-emerald-700' : 'text-red-600'}`}>{balanced ? '✓ Ledger is balanced' : '⚠ Ledger out of balance'}</span>}
        </div>
        {!data ? <Loading /> : (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead><tr><th>Account</th><th>Name</th><th>Type</th><th className="num">Debit</th><th className="num">Credit</th><th className="num">Balance</th></tr></thead>
              <tbody>
                {rows.map((a: any) => (
                  <tr key={a.id}>
                    <td><Link className="link font-mono" to={`/finance/ledger?account=${a.id}`}>{a.code}</Link></td>
                    <td>{a.name}</td>
                    <td className="text-slate-500">{a.type}</td>
                    <td className="num">{fmtMoney(a.debit)}</td>
                    <td className="num">{fmtMoney(a.credit)}</td>
                    <td className={`num font-medium ${a.balance < 0 ? 'text-slate-600' : ''}`}>{fmtMoney(a.balance)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr className="font-semibold"><td colSpan={3} className="px-3 py-2">Total</td><td className="num px-3">{fmtMoney(data.totals.debit)}</td><td className="num px-3">{fmtMoney(data.totals.credit)}</td><td /></tr></tfoot>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

export function Ledger() {
  const [params, setParams] = useSearchParams();
  const account = params.get('account') ?? '';
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const { data: accounts } = useApi<any[]>('/accounts');
  const { data, error } = useApi<any>(account ? `/reports/ledger/${account}${qs({ from, to })}` : null);
  return (
    <div>
      <PageHeader title="Account Ledger" subtitle="Line items of a G/L account with running balance" />
      <ErrorBanner error={error} />
      <Card>
        <div className="grid gap-3 border-b border-slate-200 p-3 md:grid-cols-4">
          <Field label="G/L account" className="md:col-span-2">
            <select className="input" value={account} onChange={(e) => setParams({ account: e.target.value })}>
              <option value="">Select account…</option>
              {accounts?.map((a) => <option key={a.id} value={a.id}>{a.code} {a.name}</option>)}
            </select>
          </Field>
          <Field label="From"><input className="input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
          <Field label="To"><input className="input" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
        </div>
        {!account ? <Empty>Choose an account</Empty> : !data ? <Loading /> : (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead><tr><th>Date</th><th>Document</th><th>Source</th><th>Text</th><th>Partner / Material</th><th className="num">Debit</th><th className="num">Credit</th><th className="num">Balance</th></tr></thead>
              <tbody>
                <tr className="bg-slate-50 italic"><td colSpan={7}>Opening balance</td><td className="num">{fmtMoney(data.openingBalance)}</td></tr>
                {data.lines.map((l: any, i: number) => (
                  <tr key={i}>
                    <td>{l.posting_date}</td>
                    <td><Link className="link font-mono" to={`/finance/journals/${l.entry_id}`}>{l.doc_no}</Link></td>
                    <td>{l.source}</td>
                    <td>{l.text}</td>
                    <td className="text-slate-500">{l.vendor_name ?? l.customer_name ?? l.material_code}</td>
                    <td className="num">{l.debit ? fmtMoney(l.debit) : ''}</td>
                    <td className="num">{l.credit ? fmtMoney(l.credit) : ''}</td>
                    <td className="num">{fmtMoney(l.balance)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr className="font-semibold"><td colSpan={7} className="px-3 py-2">Closing balance</td><td className="num px-3">{fmtMoney(data.closingBalance)}</td></tr></tfoot>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function Section({ title, rows, total }: { title: string; rows: { code: string; name: string; amount: number }[]; total: number }) {
  return (
    <>
      <tr className="bg-slate-50"><td colSpan={2} className="font-semibold">{title}</td></tr>
      {rows.map((r) => (
        <tr key={r.code + r.name}><td className="pl-6"><span className="font-mono text-slate-500">{r.code}</span> {r.name}</td><td className="num">{fmtMoney(r.amount)}</td></tr>
      ))}
      <tr className="font-semibold"><td className="pl-6">Total {title.toLowerCase()}</td><td className="num border-t border-slate-300">{fmtMoney(total)}</td></tr>
    </>
  );
}

export function Statements() {
  const [to, setTo] = useState(todayIso());
  const [from, setFrom] = useState(`${todayIso().slice(0, 4)}-01-01`);
  const { data, error } = useApi<any>(`/reports/statements${qs({ from, to })}`);
  return (
    <div>
      <PageHeader title="Financial Statements" subtitle="Income statement for the period and balance sheet at period end" />
      <ErrorBanner error={error} />
      <div className="mb-4 flex gap-3">
        <Field label="Period from"><input className="input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
        <Field label="Period to"><input className="input" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
      </div>
      {!data ? <Loading /> : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card title={`Income Statement ${from} – ${to}`}>
            <table className="tbl">
              <tbody>
                <Section title="Revenue" rows={data.incomeStatement.revenue} total={data.incomeStatement.totalRevenue} />
                <Section title="Expenses" rows={data.incomeStatement.expenses} total={data.incomeStatement.totalExpenses} />
                <tr className="text-base font-bold"><td>Net income</td><td className={`num ${data.incomeStatement.netIncome < 0 ? 'text-red-600' : 'text-emerald-700'}`}>{fmtMoney(data.incomeStatement.netIncome)}</td></tr>
              </tbody>
            </table>
          </Card>
          <Card title={`Balance Sheet as of ${to}`}>
            <table className="tbl">
              <tbody>
                <Section title="Assets" rows={data.balanceSheet.assets} total={data.balanceSheet.totalAssets} />
                <Section title="Liabilities" rows={data.balanceSheet.liabilities} total={data.balanceSheet.totalLiabilities} />
                <Section title="Equity" rows={data.balanceSheet.equity} total={data.balanceSheet.totalEquity} />
                <tr className="text-base font-bold"><td>Liabilities + equity</td><td className="num">{fmtMoney(data.balanceSheet.totalLiabilities + data.balanceSheet.totalEquity)}</td></tr>
              </tbody>
            </table>
          </Card>
        </div>
      )}
    </div>
  );
}

export function ApAging() {
  const [asOf, setAsOf] = useState(todayIso());
  const { data, error } = useApi<any>(`/reports/ap-aging${qs({ asOf })}`);
  const cols = [['current', 'Not due'], ['d1_30', '1–30'], ['d31_60', '31–60'], ['d61_90', '61–90'], ['d90_plus', '90+'], ['total', 'Total']];
  const sum = (k: string) => data?.vendors.reduce((s: number, v: any) => s + v[k], 0) ?? 0;
  return (
    <div>
      <PageHeader title="Accounts Payable Aging" subtitle="Open vendor invoices by days past due" />
      <ErrorBanner error={error} />
      <Card>
        <div className="border-b border-slate-200 p-3"><Field label="As of" className="w-48"><input className="input" type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} /></Field></div>
        {!data ? <Loading /> : !data.vendors.length ? <Empty>No open payables</Empty> : (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead><tr><th>Vendor</th>{cols.map(([k, l]) => <th key={k} className="num">{l}</th>)}</tr></thead>
              <tbody>
                {data.vendors.map((v: any) => (
                  <tr key={v.vendorId}>
                    <td><Link className="link" to={`/finance/invoices?vendor=${v.vendorId}`}>{v.code} {v.name}</Link></td>
                    {cols.map(([k]) => <td key={k} className={`num ${k !== 'current' && k !== 'total' && v[k] ? 'text-red-600' : ''}`}>{v[k] ? fmtMoney(v[k]) : '—'}</td>)}
                  </tr>
                ))}
              </tbody>
              <tfoot><tr className="font-semibold"><td className="px-3 py-2">Total</td>{cols.map(([k]) => <td key={k} className="num px-3">{fmtMoney(sum(k))}</td>)}</tr></tfoot>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

export function CostCenterReport() {
  const [to, setTo] = useState(todayIso());
  const [from, setFrom] = useState(`${todayIso().slice(0, 4)}-01-01`);
  const { data, error } = useApi<any>(`/reports/cost-centers${qs({ from, to })}`);
  return (
    <div>
      <PageHeader title="Cost Center Report" subtitle="Actual costs and revenues per cost center and G/L account" />
      <ErrorBanner error={error} />
      <div className="mb-4 flex flex-wrap gap-3">
        <Field label="Period from"><input className="input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
        <Field label="Period to"><input className="input" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
      </div>
      {!data ? <Loading /> : (
        <>
          {data.unassignedExpenses !== 0 && (
            <p className="mb-3 text-sm text-slate-600">
              Expenses without a cost center in this period: <span className="font-medium tabular-nums">{fmtMoney(data.unassignedExpenses)}</span>
            </p>
          )}
          {!data.centers.length ? <Card><Empty>No postings with a cost center in this period</Empty></Card> : (
            <div className="grid gap-4 lg:grid-cols-2">
              {data.centers.map((c: any) => (
                <Card key={c.id} title={<><span className="font-mono">{c.code}</span> {c.name}</>} actions={<span className="text-sm font-semibold tabular-nums">{fmtMoney(c.total)}</span>}>
                  <table className="tbl">
                    <thead><tr><th>Account</th><th className="num">Postings</th><th className="num">Amount</th></tr></thead>
                    <tbody>
                      {c.accounts.map((a: any) => (
                        <tr key={a.code}>
                          <td><span className="font-mono">{a.code}</span> {a.name}</td>
                          <td className="num">{a.postings}</td>
                          <td className="num">{fmtMoney(a.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
