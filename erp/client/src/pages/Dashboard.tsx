import { Link } from 'react-router-dom';
import { fmtMoney, fmtQty, useApi } from '../api';
import { Card, Empty, ErrorBanner, Kpi, Loading, PageHeader, Status } from '../components/ui';

export default function Dashboard() {
  const { data: d, error } = useApi<any>('/dashboard');
  if (error) return <ErrorBanner error={error} />;
  if (!d) return <Loading />;
  return (
    <div>
      <PageHeader title="Dashboard" subtitle={`${d.company} · all amounts in ${d.currency}`} />
      {d.idocErrors > 0 && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          <span>{d.idocErrors} IDoc{d.idocErrors === 1 ? ' needs' : 's need'} attention (not posted or not sent).</span>
          <Link className="font-medium underline" to="/idocs">Open IDoc monitor</Link>
        </div>
      )}
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Cash & bank" value={fmtMoney(d.cash)} />
        <Kpi label="Revenue YTD" value={fmtMoney(d.revenueYtd)} />
        <Kpi label="Net income YTD" value={fmtMoney(d.netIncomeYtd)} tone={d.netIncomeYtd >= 0 ? 'good' : 'warn'} />
        <Kpi label="Inventory value" value={fmtMoney(d.inventoryValue)} />
        <Kpi label="Open receivables" value={fmtMoney(d.openReceivables)} hint={d.overdueReceivables > 0 ? `${fmtMoney(d.overdueReceivables)} overdue` : 'Nothing overdue'} tone={d.overdueReceivables > 0 ? 'warn' : 'default'} />
        <Kpi label="Open payables" value={fmtMoney(d.openPayables)} hint={d.overduePayables > 0 ? `${fmtMoney(d.overduePayables)} overdue` : 'Nothing overdue'} tone={d.overduePayables > 0 ? 'warn' : 'default'} />
        <Kpi label="Open sales orders" value={d.openSOs} hint={d.toBill ? `${d.toBill} with deliveries to invoice` : 'Nothing waiting for billing'} tone={d.toBill ? 'warn' : 'default'} />
        <Kpi label="Open purchase orders" value={d.openPOs} hint={`${d.draftPOs} draft · GR/IR ${fmtMoney(d.grirBalance)}`} />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Card title="Customer invoices due" actions={<Link className="link text-xs" to="/sales/invoices">All customer invoices</Link>}>
          {d.receivablesDue.length === 0 ? <Empty>No open customer invoices</Empty> : (
            <table className="tbl">
              <thead><tr><th>Invoice</th><th>Customer</th><th>Due</th><th className="num">Open</th></tr></thead>
              <tbody>
                {d.receivablesDue.map((i: any) => (
                  <tr key={i.id}>
                    <td><Link className="link" to={`/sales/invoices/${i.id}`}>{i.doc_no}</Link></td>
                    <td>{i.customer_name}</td>
                    <td className={i.due_date < new Date().toISOString().slice(0, 10) ? 'font-medium text-red-600' : ''}>{i.due_date}</td>
                    <td className="num">{fmtMoney(i.open_amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
        <Card title="Vendor invoices due" actions={<Link className="link text-xs" to="/finance/invoices">All vendor invoices</Link>}>
          {d.dueSoon.length === 0 ? <Empty>No open invoices</Empty> : (
            <table className="tbl">
              <thead><tr><th>Invoice</th><th>Vendor</th><th>Due</th><th className="num">Open</th></tr></thead>
              <tbody>
                {d.dueSoon.map((i: any) => (
                  <tr key={i.id}>
                    <td><Link className="link" to={`/finance/invoices/${i.id}`}>{i.doc_no}</Link></td>
                    <td>{i.vendor_name}</td>
                    <td className={i.due_date < new Date().toISOString().slice(0, 10) ? 'font-medium text-red-600' : ''}>{i.due_date}</td>
                    <td className="num">{fmtMoney(i.open_amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
        <Card title="Materials below reorder level" className="xl:col-span-2" actions={<Link className="link text-xs" to="/inventory/stock">Stock overview</Link>}>
          {d.belowReorder.length === 0 ? <Empty>All materials sufficiently stocked</Empty> : (
            <table className="tbl">
              <thead><tr><th>Material</th><th className="num">On hand</th><th className="num">Reorder level</th><th /></tr></thead>
              <tbody>
                {d.belowReorder.map((m: any) => (
                  <tr key={m.id}>
                    <td><span className="font-mono">{m.code}</span> {m.name}</td>
                    <td className="num">{fmtQty(m.qty)} {m.uom}</td>
                    <td className="num">{fmtQty(m.reorderLevel)}</td>
                    <td className="text-right"><Link className="link text-xs" to={`/purchasing/orders/new?material=${m.id}`}>Order</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
        <Card title="Recent journal entries" className="xl:col-span-2" actions={<Link className="link text-xs" to="/finance/journals">All entries</Link>}>
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead><tr><th>Document</th><th>Date</th><th>Source</th><th>Description</th><th className="num">Amount</th><th>Status</th></tr></thead>
              <tbody>
                {d.recentJournals.map((j: any) => (
                  <tr key={j.id}>
                    <td><Link className="link font-mono" to={`/finance/journals/${j.id}`}>{j.doc_no}</Link></td>
                    <td>{j.posting_date}</td>
                    <td>{j.source}</td>
                    <td>{j.description}</td>
                    <td className="num">{fmtMoney(j.amount)}</td>
                    <td><Status value={j.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
