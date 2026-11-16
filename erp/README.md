# Manchurian ERP

A small ERP system modeled on SAP's core logistics and finance flows:

| Module | SAP equivalent | What it does |
|---|---|---|
| **Finance** | FI-GL, FI-AP | Chart of accounts, double-entry journal entries (balanced, with reversals), vendor invoices, outgoing payments, trial balance, account ledger, balance sheet and P&L, AP aging |
| **Purchasing** | MM-PUR | Vendors, purchase orders (draft → released → received → closed), goods receipt and invoice entry against a PO, with a three-way match |
| **Inventory** | MM-IM | Materials, warehouses, stock per warehouse, moving-average valuation, goods movements (201 / 301 / 561 / 701 / 702) |

Every logistics transaction posts to the general ledger automatically, using configurable account determination. So the inventory subledger always matches G/L account 140000, and GR/IR clears when an invoice is posted.

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

The first start creates `server/data/erp.sqlite` and loads demo data: vendors, materials, two warehouses, opening stock, and complete and partial procure-to-pay cycles.

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
7. Check **Trial Balance** and **Financial Statements**. The ledger always balances.

## Document number ranges

| Object | Range |
|---|---|
| FI documents | 100000001… |
| Purchase orders | 4500000001… |
| Material documents | 5000000001… |
| Vendor invoices | 5100000001… |
| Payments | 1500000001… |

## Design notes

- Amounts are stored as integer cents. Quantities are rounded to 3 decimals.
- Every posting runs in one SQLite transaction. A stock change and its journal entry either both commit or both roll back.
- Documents that other modules generate are corrected in the module that created them. Only manual journal entries can be reversed from Finance.
- Roles: `admin` can do everything. `finance` posts journals, invoices and payments. `purchasing` manages vendors and POs. `warehouse` posts goods movements and receipts. Every role can read all data.

## Roadmap ideas

- Sales & Distribution (customers, sales orders, deliveries, billing, AR)
- Tax codes (input VAT/GST), multi-currency, multiple company codes
- Fiscal periods and period close, year-end carry-forward
- Purchase requisitions and approval workflow
- Reversal of goods receipts and invoices (cancel material/invoice documents)
- PostgreSQL support and an audit log of master data changes
