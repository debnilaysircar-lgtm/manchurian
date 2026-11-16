# Manchurian ERP

A small ERP system modeled on SAP's core logistics and finance flows:

| Module | SAP equivalent | What it does |
|---|---|---|
| **Finance** | FI-GL, FI-AP | Chart of accounts, double-entry journal entries (balanced, with reversals), vendor invoices, outgoing payments, trial balance, account ledger, balance sheet and P&L, AP aging |
| **Sales** | SD, FI-AR | Customers with credit limits, sales orders (draft → confirmed → delivered → closed), deliveries with goods issue, customer invoices (billing), incoming payments, AR aging, printable invoices |
| **Purchasing** | MM-PUR | Vendors, purchase orders (draft → released → received → closed), goods receipt and invoice entry against a PO, with a three-way match |
| **Inventory** | MM-IM | Materials, warehouses, stock per warehouse, moving-average valuation, goods movements (201 / 301 / 561 / 701 / 702) |

Every logistics transaction (goods receipt, delivery, goods movement, invoice, payment) posts to the general ledger automatically, using configurable account determination. So the inventory subledger always matches G/L account 140000, and GR/IR clears when an invoice is posted.

## Tech stack

- **server/**: Node.js, Express, TypeScript (run with `tsx`), SQLite (`better-sqlite3`), JWT auth, `zod` validation
- **client/**: React 18, Vite, TypeScript, Tailwind CSS, React Router

## Getting started (Windows, macOS or Linux)

Requirements: **Node.js 20 or 22** (LTS) and npm.

```bash
cd erp
npm install          # installs root, server and client dependencies
npm run dev          # API on http://localhost:4000, UI on http://localhost:5173
```

Open http://localhost:5173 and sign in.

| User | Password | Role |
|---|---|---|
| admin | admin123 | admin (everything) |
| fiona | demo123 | finance |
| paul | demo123 | purchasing |
| wendy | demo123 | warehouse |
| sam | demo123 | sales |

The first start creates `server/data/erp.sqlite` and loads demo data: vendors, materials, two warehouses, opening stock, complete and partial procure-to-pay cycles, three customers, and order-to-cash cycles (one partly paid, one overdue, one draft).

**Upgrading from the first version:** just start the new version on your existing database. It adds the sales tables, the `sales` role, and the new G/L account 505000 Cost of Goods Sold automatically, keeping all your data. If the database holds the original demo data, the sales demo data is added too.

### Useful commands

```bash
npm test             # backend tests (posting logic, three-way match, valuation, balanced ledger)
npm run typecheck    # TypeScript checks for server and client
npm run reset-db     # delete the database; it is recreated on next start
npm run build        # build the UI into client/dist
npm start            # production mode: the API also serves the built UI on http://localhost:4000
```

### Environment variables (server)

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `4000` | API port |
| `ERP_DB` | `server/data/erp.sqlite` | Database file |
| `ERP_SEED_DEMO` | `true` | Set to `false` for an empty system (admin user and chart of accounts only) |
| `ERP_ADMIN_PASSWORD` | `admin123` | Initial admin password (applies only when the database is created) |
| `ERP_JWT_SECRET` | generated and stored in the database | Token signing secret |

## Business process walkthrough

### Procure to pay

1. **Purchasing → Purchase Orders → New**: choose a vendor, warehouse and items, then save (draft).
2. **Release** the PO.
3. **Post goods receipt** (movement 101): stock increases at the PO price.
   *Dr 140000 Inventory / Cr 210000 GR/IR*
4. **Enter invoice**: quantity is limited to what was received but not yet invoiced (three-way match).
   *Dr 210000 GR/IR, Dr/Cr 510000 Price differences / Cr 200000 Accounts payable*
5. **Finance → Vendor Invoices → Post payment**.
   *Dr 200000 AP / Cr 110000 Bank*
6. **Inventory → Goods Movements → 201 Goods issue**: stock is consumed at the moving-average price.
   *Dr 500000 Consumption / Cr 140000 Inventory*

### Order to cash

1. **Sales → Sales Orders → New**: choose a customer and items. The price defaults to the material's list price. Save (draft).
2. **Confirm**: the customer's credit limit is checked (open receivables + confirmed-but-unbilled orders + this order). A credit limit of 0 means no check.
3. **Post delivery** (movement 601): stock leaves at the moving-average price.
   *Dr 505000 Cost of goods sold / Cr 140000 Inventory*
4. **Create invoice**: bills delivered-but-not-yet-billed quantities at the order price.
   *Dr 120000 Accounts receivable / Cr 400000 Sales revenue*
5. **Customer invoice → Record payment**.
   *Dr 110000 Bank / Cr 120000 AR*

Check **Trial Balance** and **Financial Statements** after either flow. The ledger always balances.

## Document number ranges

| Object | Range |
|---|---|
| FI documents | 100000001… |
| Purchase orders | 4500000001… |
| Material documents | 5000000001… |
| Vendor invoices | 5100000001… |
| Payments | 1500000001… |
| Sales orders | 10000001… |
| Customer invoices | 90000001… |
| Incoming payments | 1400000001… |

## Design notes

- Amounts are stored as integer cents. Quantities are rounded to 3 decimals.
- Every posting runs in one SQLite transaction. A stock change and its journal entry either both commit or both roll back.
- Documents that other modules generate are corrected in the module that created them. Only manual journal entries can be reversed from Finance.
- Roles: `admin` can do everything. `finance` posts journals, invoices and payments. `purchasing` manages vendors and POs. `warehouse` posts goods movements, receipts and deliveries. `sales` manages customers and sales orders, posts deliveries and customer invoices, and records customer payments. Every role can read all data.

## Roadmap ideas

- Quotations, pricing conditions (discounts, customer-specific prices) and stock reservation for open sales orders
- Credit memos and returns (sales and purchasing)
- Tax codes (input VAT/GST), multi-currency, multiple company codes
- Fiscal periods and period close, year-end carry-forward
- Purchase requisitions and approval workflow
- Reversal of goods receipts and invoices (cancel material/invoice documents)
- PostgreSQL support and an audit log of master data changes
