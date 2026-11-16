import { useState, type ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../auth';

const NAV: { section: string; items: { to: string; label: string; admin?: boolean }[] }[] = [
  { section: 'Overview', items: [{ to: '/', label: 'Dashboard' }] },
  {
    section: 'Finance',
    items: [
      { to: '/finance/journals', label: 'Journal Entries' },
      { to: '/finance/accounts', label: 'Chart of Accounts' },
      { to: '/finance/invoices', label: 'Vendor Invoices' },
      { to: '/finance/payments', label: 'Payments' },
      { to: '/finance/trial-balance', label: 'Trial Balance' },
      { to: '/finance/ledger', label: 'Account Ledger' },
      { to: '/finance/statements', label: 'Financial Statements' },
      { to: '/finance/ap-aging', label: 'AP Aging' },
      { to: '/finance/account-determination', label: 'Account Determination' },
    ],
  },
  {
    section: 'Purchasing',
    items: [
      { to: '/purchasing/orders', label: 'Purchase Orders' },
      { to: '/purchasing/vendors', label: 'Vendors' },
    ],
  },
  {
    section: 'Inventory',
    items: [
      { to: '/inventory/stock', label: 'Stock Overview' },
      { to: '/inventory/movements', label: 'Goods Movements' },
      { to: '/inventory/materials', label: 'Materials' },
      { to: '/inventory/warehouses', label: 'Warehouses' },
    ],
  },
  { section: 'Administration', items: [{ to: '/admin/users', label: 'Users', admin: true }] },
];

export default function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 flex h-12 items-center justify-between bg-shell px-4 text-white">
        <div className="flex items-center gap-3">
          <button className="md:hidden" onClick={() => setOpen(!open)} aria-label="Toggle menu">
            ☰
          </button>
          <span className="rounded bg-brand-500 px-1.5 py-0.5 text-xs font-bold">ERP</span>
          <span className="font-semibold">Manchurian ERP</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="hidden sm:inline">
            {user?.fullName} <span className="text-slate-400">· {user?.role}</span>
          </span>
          <button onClick={logout} className="rounded border border-white/30 px-2 py-0.5 hover:bg-white/10">
            Sign out
          </button>
        </div>
      </header>
      <div className="flex">
        <nav className={`${open ? 'block' : 'hidden'} fixed inset-y-12 left-0 z-30 w-56 overflow-y-auto border-r border-slate-200 bg-white md:sticky md:top-12 md:block md:h-[calc(100vh-3rem)]`}>
          {NAV.map((g) => {
            const items = g.items.filter((i) => !i.admin || user?.role === 'admin');
            if (!items.length) return null;
            return (
              <div key={g.section} className="py-2">
                <div className="px-4 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{g.section}</div>
                {items.map((i) => (
                  <NavLink
                    key={i.to}
                    to={i.to}
                    end={i.to === '/'}
                    onClick={() => setOpen(false)}
                    className={({ isActive }) =>
                      `block border-l-[3px] px-4 py-1.5 text-sm ${isActive ? 'border-brand-500 bg-brand-50 font-medium text-brand-700' : 'border-transparent text-slate-700 hover:bg-slate-50'}`
                    }
                  >
                    {i.label}
                  </NavLink>
                ))}
              </div>
            );
          })}
        </nav>
        <main className="min-w-0 flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
