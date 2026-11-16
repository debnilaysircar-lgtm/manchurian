// API tests against a real running server (Express + SQLite) with demo data.
import { check, checkEqual, runTests, startServer } from './lib.mjs';

const READ_ENDPOINTS = [
  '/dashboard', '/accounts', '/vendors', '/customers', '/materials', '/warehouses', '/plants', '/payment-terms', '/units',
  '/material-groups', '/purchasing-groups', '/sales-areas', '/journals', '/reports/trial-balance', '/reports/statements',
  '/reports/ap-aging', '/reports/ar-aging', '/reports/cost-centers', '/stock', '/movements', '/movement-types',
  '/purchase-orders', '/invoices', '/payments', '/sales-orders', '/customer-invoices', '/receipts', '/config',
  '/number-ranges', '/customizing', '/idocs', '/idocs/stats', '/idoc-meta', '/idoc-ports', '/idoc-partners',
  '/document-types', '/cost-centers', '/tax-codes', '/users', '/account-determination', '/auth/me',
];

export async function runApiTests() {
  const server = await startServer();
  const call = async (method, path, { token, body } = {}) => {
    const res = await fetch(`${server.base}/api${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: res.status, data: await res.json().catch(() => null) };
  };
  const login = async (username, password) => {
    const r = await call('POST', '/auth/login', { body: { username, password } });
    checkEqual(r.status, 200, `login ${username}`);
    return r.data.token;
  };
  let admin;

  const tests = [
    { name: 'health check answers', fn: async () => checkEqual((await call("GET", "/health")).status, 200, "GET /health") },
    {
      name: 'sign-in rejects a wrong password and protects the API',
      fn: async () => {
        checkEqual((await call('POST', '/auth/login', { body: { username: 'admin', password: 'nope' } })).status, 401, 'wrong password');
        checkEqual((await call('GET', '/dashboard')).status, 401, 'no token');
        checkEqual((await call('GET', '/dashboard', { token: 'garbage' })).status, 401, 'bad token');
        admin = await login('admin', 'admin123');
      },
    },
    {
      name: `all ${READ_ENDPOINTS.length} list and report endpoints respond`,
      fn: async () => {
        const failed = [];
        for (const p of READ_ENDPOINTS) {
          const r = await call('GET', p, { token: admin });
          if (r.status !== 200) failed.push(`${p} -> ${r.status}`);
        }
        check(!failed.length, `failing endpoints: ${failed.join(', ')}`);
      },
    },
    {
      name: 'every customizing table and every detail view loads',
      fn: async () => {
        const objs = (await call('GET', '/customizing', { token: admin })).data;
        check(objs.length >= 11, `expected at least 11 customizing objects, got ${objs.length}`);
        for (const o of objs) checkEqual((await call('GET', `/customizing/${o.key}`, { token: admin })).status, 200, `customizing ${o.key}`);
        for (const [list, detail] of [
          ['/purchase-orders', '/purchase-orders/'], ['/sales-orders', '/sales-orders/'], ['/journals', '/journals/'],
          ['/invoices', '/invoices/'], ['/customer-invoices', '/customer-invoices/'], ['/idocs', '/idocs/'],
        ]) {
          const first = (await call('GET', list, { token: admin })).data[0];
          check(first, `${list} has demo data`);
          checkEqual((await call('GET', detail + first.id, { token: admin })).status, 200, `${detail}${first.id}`);
        }
      },
    },
    {
      name: 'demo data ledger is balanced and the balance sheet balances',
      fn: async () => {
        const tb = (await call('GET', '/reports/trial-balance', { token: admin })).data;
        checkEqual(tb.totals.debit, tb.totals.credit, 'trial balance');
        const bs = (await call('GET', '/reports/statements?from=2000-01-01&to=2999-12-31', { token: admin })).data.balanceSheet;
        checkEqual(Math.round(bs.totalAssets * 100), Math.round((bs.totalLiabilities + bs.totalEquity) * 100), 'assets = liabilities + equity');
      },
    },
    {
      name: 'roles limit what each user may change',
      fn: async () => {
        const wendy = await login('wendy', 'demo123');
        const sam = await login('sam', 'demo123');
        const je = { lines: [{ accountId: 1, debit: 1 }, { accountId: 2, credit: 1 }] };
        checkEqual((await call('POST', '/journals', { token: wendy, body: je })).status, 403, 'warehouse posting a journal');
        checkEqual((await call('PUT', '/config', { token: wendy, body: { credit_check_enabled: false } })).status, 403, 'warehouse changing sales config');
        checkEqual((await call('PUT', '/config', { token: sam, body: { credit_check_enabled: true } })).status, 200, 'sales changing sales config');
        checkEqual((await call('POST', '/customizing/plants', { token: sam, body: { code: '7000', name: 'x' } })).status, 403, 'sales creating a plant');
        checkEqual((await call('GET', '/users', { token: sam })).status, 403, 'non-admin listing users');
      },
    },
    {
      name: 'invalid input is rejected with a readable message',
      fn: async () => {
        const accts = (await call('GET', '/accounts', { token: admin })).data;
        const id = (c) => accts.find((a) => a.code === c).id;
        const r = await call('POST', '/journals', { token: admin, body: { lines: [{ accountId: id('610000'), debit: 10 }, { accountId: id('110000'), credit: 9 }] } });
        checkEqual(r.status, 400, 'unbalanced entry');
        check(/not balanced/.test(r.data.error), `message: ${r.data.error}`);
        const m = await call('POST', '/materials', { token: admin, body: { code: 'X-1', name: 'Test', uom: 'ZZZ' } });
        checkEqual(m.status, 400, 'unknown unit of measure');
        const c = await call('PUT', '/config', { token: admin, body: { currency: 'dollars' } });
        checkEqual(c.status, 400, 'bad currency');
        checkEqual((await call('GET', '/no-such-thing', { token: admin })).status, 404, 'unknown route');
        checkEqual((await call('GET', '/purchase-orders/999999', { token: admin })).status, 404, 'unknown document');
      },
    },
    {
      name: 'order to cash through the API posts tax and clears receivables',
      fn: async () => {
        const cust = (await call('GET', '/customers', { token: admin })).data.find((c) => c.code === 'C1000');
        const mat = (await call('GET', '/materials', { token: admin })).data.find((m) => m.code === 'TG-4001');
        const wh = (await call('GET', '/warehouses', { token: admin })).data.find((w) => w.code === 'WH01');
        const so = (await call('POST', '/sales-orders', { token: admin, body: { customerId: cust.id, warehouseId: wh.id, lines: [{ materialId: mat.id, qty: 2 }] } })).data;
        checkEqual((await call('POST', `/sales-orders/${so.id}/confirm`, { token: admin, body: {} })).status, 200, 'confirm');
        const line = (await call('GET', `/sales-orders/${so.id}`, { token: admin })).data.lines[0];
        checkEqual((await call('POST', `/sales-orders/${so.id}/delivery`, { token: admin, body: { lines: [{ soLineId: line.id, qty: 2 }] } })).status, 200, 'delivery');
        const bill = await call('POST', `/sales-orders/${so.id}/billing`, { token: admin, body: {} });
        checkEqual(bill.status, 200, 'billing');
        check(bill.data.idoc, 'Northwind has an outbound INVOIC profile, so an IDoc is sent');
        const inv = (await call('GET', `/customer-invoices/${bill.data.id}`, { token: admin })).data;
        checkEqual(inv.total, 173.8, 'gross = 2 x 79.00 + 10% output tax');
        checkEqual((await call('POST', `/customer-invoices/${inv.id}/receipt`, { token: admin, body: { amount: inv.total } })).status, 200, 'receipt');
        checkEqual((await call('GET', `/customer-invoices/${inv.id}`, { token: admin })).data.status, 'PAID', 'invoice status');
        const tb = (await call('GET', '/reports/trial-balance', { token: admin })).data;
        checkEqual(tb.totals.debit, tb.totals.credit, 'ledger still balanced');
      },
    },
    {
      name: 'IDoc inbound over the API: customer order and an unknown message type',
      fn: async () => {
        const t = (await call('GET', '/idocs/templates/ORDERS?customer=C1000', { token: admin })).data;
        const r = await call('POST', '/idocs/inbound', { token: admin, body: { xml: t.xml } });
        checkEqual(r.data.status, '53', `inbound ORDERS status (${r.data.statuses?.[0]?.message})`);
        const bad = await call('POST', '/idocs/inbound', { token: admin, body: { xml: t.xml.replace(/<MESTYP>ORDERS<\/MESTYP>/, '<MESTYP>HRMD_A</MESTYP>') } });
        checkEqual(bad.status, 400, 'unsupported message type');
        const broken = await call('POST', '/idocs/inbound', { token: admin, body: { xml: '<ORDERS05><IDOC>' } });
        check(broken.status === 400 && /Invalid XML/.test(broken.data.error), 'malformed XML rejected');
      },
    },
  ];

  try {
    return await runTests('api', tests, async () => ({}));
  } finally {
    await server.stop();
  }
}
