import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import { Accounts, Customers, Materials, Users, Vendors } from './pages/MasterData';
import { CustomizingTable, ImplementationGuide } from './pages/config/Customizing';
import { SODetail, SOEdit, SOList } from './pages/sales/SalesOrders';
import { ArAging, CustomerInvoiceDetail, CustomerInvoiceList, ReceiptList } from './pages/sales/Receivables';
import { JournalDetail, JournalList, JournalNew } from './pages/finance/Journals';
import { Ledger, Statements, TrialBalance, ApAging, CostCenterReport } from './pages/finance/Reports';
import { InvoiceDetail, InvoiceList, PaymentList } from './pages/finance/Payables';
import AccountDetermination from './pages/finance/AccountDetermination';
import { PODetail, POEdit, POList } from './pages/purchasing/PurchaseOrders';
import { MovementList, MovementNew, StockOverview } from './pages/inventory/Inventory';
import { Loading } from './components/ui';
import Configuration from './pages/config/Configuration';
import { IdocDetail, IdocExchange, IdocMonitor } from './pages/idoc/Idocs';

export default function App() {
  const { user, ready } = useAuth();
  if (!ready) return <Loading />;
  if (!user) return <Login />;
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/finance/journals" element={<JournalList />} />
        <Route path="/finance/journals/new" element={<JournalNew />} />
        <Route path="/finance/journals/:id" element={<JournalDetail />} />
        <Route path="/finance/accounts" element={<Accounts />} />
        <Route path="/finance/trial-balance" element={<TrialBalance />} />
        <Route path="/finance/ledger" element={<Ledger />} />
        <Route path="/finance/statements" element={<Statements />} />
        <Route path="/finance/invoices" element={<InvoiceList />} />
        <Route path="/finance/invoices/:id" element={<InvoiceDetail />} />
        <Route path="/finance/payments" element={<PaymentList />} />
        <Route path="/finance/ap-aging" element={<ApAging />} />
        <Route path="/finance/account-determination" element={<AccountDetermination />} />
        <Route path="/sales/orders" element={<SOList />} />
        <Route path="/sales/orders/new" element={<SOEdit />} />
        <Route path="/sales/orders/:id" element={<SODetail />} />
        <Route path="/sales/orders/:id/edit" element={<SOEdit />} />
        <Route path="/sales/customers" element={<Customers />} />
        <Route path="/sales/invoices" element={<CustomerInvoiceList />} />
        <Route path="/sales/invoices/:id" element={<CustomerInvoiceDetail />} />
        <Route path="/sales/receipts" element={<ReceiptList />} />
        <Route path="/sales/ar-aging" element={<ArAging />} />
        <Route path="/purchasing/vendors" element={<Vendors />} />
        <Route path="/purchasing/orders" element={<POList />} />
        <Route path="/purchasing/orders/new" element={<POEdit />} />
        <Route path="/purchasing/orders/:id" element={<PODetail />} />
        <Route path="/purchasing/orders/:id/edit" element={<POEdit />} />
        <Route path="/inventory/stock" element={<StockOverview />} />
        <Route path="/inventory/movements" element={<MovementList />} />
        <Route path="/inventory/movements/new" element={<MovementNew />} />
        <Route path="/inventory/materials" element={<Materials />} />
        <Route path="/inventory/warehouses" element={<Navigate to="/config/table/storage_locations" replace />} />
        <Route path="/admin/users" element={<Users />} />
        <Route path="/config" element={<ImplementationGuide />} />
        <Route path="/config/table/:key" element={<CustomizingTable />} />
        <Route path="/config/:area" element={<Configuration />} />
        <Route path="/finance/cost-centers" element={<CostCenterReport />} />
        <Route path="/idocs" element={<IdocMonitor />} />
        <Route path="/idocs/exchange" element={<IdocExchange />} />
        <Route path="/idocs/:id" element={<IdocDetail />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
