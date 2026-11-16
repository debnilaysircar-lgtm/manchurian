// Browser end-to-end tests: real UI against a real server, and the single-file demo under a strict CSP.
import fs from 'node:fs';
import path from 'node:path';
import { check, checkEqual, loadPlaywright, ROOT, runTests, startDemoHost, startServer } from './lib.mjs';

const DEMO_FILE = path.join(ROOT, 'client', 'dist-demo', 'manchurian-erp.html');

// ---------- helpers ----------

async function login(page, base, user, password) {
  await page.goto(base);
  await page.waitForSelector('button:has-text("Sign in")');
  if (await page.locator('text=Sign in as a demo user').count()) {
    await page.locator('button', { hasText: new RegExp(`^${user}`) }).first().click();
  } else {
    await page.fill('input >> nth=0', user);
    await page.fill('input[type=password]', password);
    await page.click('button:has-text("Sign in")');
  }
  await page.waitForSelector('text=Revenue YTD', { timeout: 30_000 });
}

async function go(page, label) {
  const link = page.locator('nav a', { hasText: label }).first();
  if (!(await link.isVisible())) await page.click('button[aria-label="Toggle menu"]');
  await link.click();
}

const confirmDialog = (page) => page.click('.fixed button:has-text("Continue")');
/** Gross total in an invoice dialog, read once the totals are shown (they wait for tax codes to load). */
const modalTotal = async (page) => {
  await page.locator('.fixed tfoot:not(.invisible)').waitFor();
  return page.locator('.fixed tfoot tr').last().locator('td').last().innerText();
};
const noHorizontalScroll = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

// ---------- scenarios against the real server ----------

const serverTests = [
  {
    name: 'sign-in, roles and read-only configuration',
    async fn({ page, base }) {
      await page.goto(base);
      await page.fill('input >> nth=0', 'admin');
      await page.fill('input[type=password]', 'wrong');
      await page.click('button:has-text("Sign in")');
      await page.waitForSelector('text=Invalid username or password');

      await login(page, base, 'sam', 'demo123');
      await go(page, 'Journal Entries');
      await page.waitForSelector('h1:has-text("Journal Entries")');
      checkEqual(await page.locator('text=New journal entry').count(), 0, 'sales user sees "New journal entry"');
      check(!(await page.locator('nav a', { hasText: 'Users' }).count()), 'sales user sees the Users screen');
      await go(page, 'Implementation Guide');
      await page.click('main >> text=Purchasing: tolerances & release');
      await page.waitForSelector('text=Read only for your role');

      await page.click('button:has-text("Sign out")');
      await login(page, base, 'admin', 'admin123');
      check(await page.locator('nav a', { hasText: 'Users' }).count(), 'admin sees the Users screen');
    },
  },
  {
    name: 'procure to pay with input tax',
    async fn({ page, base }) {
      await login(page, base, 'admin', 'admin123');
      await go(page, 'Purchase Orders');
      await page.click('text=+ New purchase order');
      await page.locator('select').nth(0).selectOption({ label: 'V1002 Global Electronics Components' });
      await page.locator('tbody select').first().selectOption({ label: 'EL-3001 Control Board v2' });
      const nums = page.locator('tbody input[type=number]');
      await nums.nth(0).fill('100');
      await nums.nth(1).fill('42.50');
      await page.click('button:has-text("Save")');
      await page.waitForSelector('h1:has-text("Purchase Order 45")');
      await page.click('button:has-text("Release")');
      await confirmDialog(page);
      await page.click('button:has-text("Post goods receipt")');
      await page.locator('.fixed tbody input').fill('60');
      await page.click('.fixed button:has-text("Post goods receipt")');
      await page.waitForSelector('text=/Material document \\d+ posted/');
      await page.waitForSelector('text=PARTIALLY RECEIVED');

      await page.click('button:has-text("Enter invoice")');
      await page.locator('.fixed input').first().fill('GEC-E2E-1');
      await page.locator('.fixed select').selectOption({ label: 'V1 Input tax 10%' });
      await page.locator('.fixed tbody input').nth(1).fill('43');
      checkEqual(await modalTotal(page), '2,838.00', 'gross = 60 x 43.00 + 10% input tax');
      await page.click('.fixed button:has-text("Post invoice")');
      await page.waitForSelector('text=/Invoice \\d+ posted/');

      await go(page, 'Vendor Invoices');
      await page.locator('tr', { hasText: 'GEC-E2E-1' }).locator('a').first().click();
      await page.waitForSelector('text=Input tax');
      await page.click('button:has-text("Post payment")');
      await page.click('.fixed button:has-text("Post payment")');
      await page.waitForSelector('text=/Payment \\d+ posted/');
      await page.waitForSelector('span:has-text("PAID")');
      await go(page, 'Trial Balance');
      await page.waitForSelector('text=Ledger is balanced');
    },
  },
  {
    name: 'order to cash with credit check, output tax and payment',
    async fn({ page, base }) {
      await login(page, base, 'sam', 'demo123');
      await go(page, 'Sales Orders');
      await page.click('text=+ New sales order');
      await page.locator('select').nth(0).selectOption({ label: 'C1001 Contoso Builders' });
      await page.locator('tbody select').first().selectOption({ label: 'TG-4001 Steel Shelf Unit' });
      await page.locator('tbody input[type=number]').nth(0).fill('50');
      await page.waitForSelector('text=will be blocked at confirmation');
      await page.click('button:has-text("Save")');
      await page.waitForSelector('h1:has-text("Sales Order")');
      await page.click('button:has-text("Confirm")');
      await confirmDialog(page);
      await page.waitForSelector('text=Credit limit exceeded');

      await go(page, 'Sales Orders');
      await page.click('text=+ New sales order');
      await page.locator('select').nth(0).selectOption({ label: 'C1000 Northwind Retail' });
      await page.locator('input').nth(0).fill('NW-E2E-1');
      await page.locator('tbody select').first().selectOption({ label: 'TG-4001 Steel Shelf Unit' });
      checkEqual(await page.locator('tbody input[type=number]').nth(1).inputValue(), '79', 'list price proposed');
      await page.locator('tbody input[type=number]').nth(0).fill('12');
      await page.click('button:has-text("Save")');
      await page.waitForSelector('button:has-text("Confirm")');
      await page.click('button:has-text("Confirm")');
      await confirmDialog(page);
      await page.click('button:has-text("Post delivery")');
      await page.locator('.fixed tbody input').fill('8');
      await page.click('.fixed button:has-text("Post delivery")');
      await page.waitForSelector('text=/Delivery \\d+ posted.*DELVRY07/');
      await page.click('button:has-text("Create invoice")');
      checkEqual(await modalTotal(page), '695.20', 'gross = 8 x 79.00 + 10% output tax');
      await page.click('.fixed button:has-text("Post invoice")');
      await page.waitForSelector('text=/Customer invoice \\d+ posted.*INVOIC02/');
      await page.click('td a:has-text("9000")');
      await page.waitForSelector('text=Bill to');
      await page.click('button:has-text("Record payment")');
      await page.click('.fixed button:has-text("Post receipt")');
      await page.waitForSelector('text=/Incoming payment \\d+ posted/');
      await page.waitForSelector('span:has-text("PAID")');
      await go(page, 'AR Aging');
      await page.waitForSelector('text=Contoso Builders');
    },
  },
  {
    name: 'goods movements, plants, stock filters and cost centers',
    async fn({ page, base }) {
      await login(page, base, 'wendy', 'demo123');
      await go(page, 'Goods Movements');
      await page.click('text=+ Post goods movement');
      await page.locator('select').nth(1).selectOption({ label: 'WH01 Main Warehouse' });
      await page.selectOption('#mv-cost-center', { label: 'CC1000 Production' });
      await page.locator('tbody select').first().selectOption({ label: 'RM-1002 Hex Bolt M8' });
      await page.locator('tbody input[type=number]').fill('999999');
      await page.click('button:has-text("Post")');
      await page.waitForSelector('text=Insufficient stock');
      await page.locator('tbody input[type=number]').fill('100');
      await page.click('button:has-text("Post")');
      await page.waitForSelector('h1:has-text("Goods Movements")');

      await page.click('text=+ Post goods movement');
      await page.locator('select').nth(0).selectOption('301');
      await page.locator('select').nth(1).selectOption({ label: 'WH02 East Distribution Center' });
      await page.locator('select').nth(2).selectOption({ label: 'WH01 Main Warehouse' });
      await page.locator('tbody select').first().selectOption({ label: 'PK-2001 Shipping Carton Large' });
      await page.locator('tbody input[type=number]').fill('10');
      await page.click('button:has-text("Post")');
      await page.waitForSelector('h1:has-text("Goods Movements")');

      await go(page, 'Stock Overview');
      await page.locator('select').first().selectOption({ label: '2000 East Distribution' });
      await page.waitForSelector('td:has-text("PK-2001")');
      checkEqual(await page.locator('tbody tr').count(), 1, 'materials stored in plant 2000');
      await go(page, 'Cost Center Report');
      await page.waitForSelector('text=CC1000');
    },
  },
  {
    name: 'configuration: enterprise structure, settings and document types',
    async fn({ page, base }) {
      await login(page, base, 'admin', 'admin123');
      await go(page, 'Implementation Guide');
      await page.waitForSelector('text=Enterprise structure');
      await page.click('main >> text=Plants');
      await page.click('button:has-text("New entry")');
      await page.fill('#cust-code', '3000');
      await page.fill('#cust-name', 'West Hub');
      await page.click('.fixed button:has-text("Save")');
      await page.waitForSelector('text=Entry created');
      await go(page, 'Storage Locations');
      await page.click('button:has-text("New entry")');
      await page.fill('#cust-code', 'WH03');
      await page.fill('#cust-name', 'West Hub Store');
      await page.selectOption('#cust-plant_id', { label: '3000 West Hub' });
      await page.click('.fixed button:has-text("Save")');
      await page.waitForSelector('text=Entry created');
      await go(page, 'Plants');
      await page.locator('tr:has-text("West Hub") >> button:has-text("Delete")').click();
      await page.click('.fixed button:has-text("Delete")');
      await page.waitForSelector('text=used by 1 storage locations');

      await go(page, 'Implementation Guide');
      await page.click('main >> text=Purchasing: tolerances & release');
      await page.fill('#cfg-invoice_price_tolerance_pct', '3');
      await page.click('button:has-text("Save changes")');
      await page.waitForSelector('text=Saved 1 setting');
      await go(page, 'Dashboard');
      await go(page, 'Implementation Guide');
      await page.click('main >> text=Purchasing: tolerances & release');
      checkEqual(await page.inputValue('#cfg-invoice_price_tolerance_pct'), '3', 'saved tolerance');
      await go(page, 'Implementation Guide');
      await page.click('main >> text=Company code & number ranges');
      await page.waitForSelector('text=Number ranges');

      await go(page, 'Journal Entries');
      await page.click('text=+ New journal entry');
      await page.locator('select').first().selectOption('AB');
      const rows = page.locator('tbody tr');
      await rows.nth(0).locator('select').first().selectOption({ label: '620000 Utilities' });
      await rows.nth(0).locator('input[type=number]').first().fill('120');
      await rows.nth(0).locator('select').nth(1).selectOption({ label: 'CC2000 Administration' });
      await rows.nth(1).locator('select').first().selectOption({ label: '110000 Bank - Main Account' });
      await rows.nth(1).locator('input[type=number]').nth(1).fill('120');
      check(await rows.nth(1).locator('select').nth(1).isDisabled(), 'cost center is disabled on a balance sheet line');
      await page.click('button:has-text("Post")');
      await page.waitForSelector('dt:has-text("Document type")');
      checkEqual(await page.locator('dt:has-text("Document type") + dd').innerText(), 'AB', 'document type');
    },
  },
  {
    name: 'IDoc exchange: inbound order, outbound PO and vendor replies',
    async fn({ page, base }) {
      await login(page, base, 'admin', 'admin123');
      await go(page, 'IDoc Exchange');
      await page.click('button:has-text("Customer order")');
      await page.waitForFunction(() => document.querySelector('#idoc-xml').value.includes('ORDERS05'));
      await page.click('button:has-text("3. Send to ERP")');
      await page.waitForSelector('text=/Sales order \\d+ created/');

      await go(page, 'Purchase Orders');
      await page.locator('tr', { hasText: 'DRAFT' }).locator('a').first().click();
      await page.click('button:has-text("Release")');
      await confirmDialog(page);
      await page.waitForSelector('text=/IDoc \\d+ \\(ORDERS05\\) created/');

      await go(page, 'IDoc Exchange');
      await page.locator('tbody tr').first().locator('button:has-text("View")').click();
      await page.click('button:has-text("Shipping notification")');
      await page.waitForFunction(() => document.querySelector('#idoc-xml').value.includes('DELVRY07'));
      await page.click('button:has-text("3. Send to ERP")');
      await page.waitForSelector('text=/Goods receipt posted/');
      await page.click('button:has-text("Invoice")');
      await page.waitForFunction(() => document.querySelector('#idoc-xml').value.includes('INVOIC02'));
      await page.click('button:has-text("3. Send to ERP")');
      await page.waitForSelector('text=/Vendor invoice \\d+ posted/');

      await go(page, 'IDoc Monitor');
      await page.locator('select').nth(2).selectOption('51');
      await page.locator('tbody a').first().click();
      await page.waitForSelector('text=Status records');
      await page.click('button:has-text("XML")');
      check((await page.locator('pre').innerText()).includes('<INVOIC02>'), 'XML view shows the IDoc');
    },
  },
  {
    name: 'phone-width layout has no sideways scrolling',
    viewport: { width: 390, height: 844 },
    async fn({ page, base }) {
      await page.goto(base);
      await page.waitForSelector('button:has-text("Sign in")');
      check(await noHorizontalScroll(page), 'login page');
      await login(page, base, 'admin', 'admin123');
      check(await noHorizontalScroll(page), 'dashboard');
      for (const [label, heading] of [['IDoc Exchange', 'IDoc Exchange'], ['Stock Overview', 'Stock Overview'], ['Implementation Guide', 'Implementation Guide'], ['Purchase Orders', 'Purchase Orders']]) {
        await go(page, label);
        await page.waitForSelector(`h1:has-text("${heading}")`);
        check(await noHorizontalScroll(page), label);
      }
    },
  },
];

// ---------- scenarios against the single-file demo ----------

const demoTests = [
  {
    name: 'demo boots under a strict CSP and keeps data across a reload',
    async fn({ page, base }) {
      await login(page, base, 'admin');
      await page.waitForSelector('text=Demo · runs in your browser');
      await go(page, 'Implementation Guide');
      await page.click('main >> text=Purchasing: tolerances & release');
      await page.fill('#cfg-invoice_price_tolerance_pct', '4');
      await page.click('button:has-text("Save changes")');
      await page.waitForSelector('text=Saved 1 setting');
      await page.reload();
      await page.waitForSelector('text=Revenue YTD', { timeout: 30_000 });
      await go(page, 'Implementation Guide');
      await page.click('main >> text=Purchasing: tolerances & release');
      checkEqual(await page.inputValue('#cfg-invoice_price_tolerance_pct'), '4', 'tolerance after reload');
    },
  },
  {
    name: 'demo runs business logic and IDocs in the browser',
    async fn({ page, base }) {
      await login(page, base, 'admin');
      await go(page, 'IDoc Exchange');
      await page.click('button:has-text("Customer order")');
      await page.waitForFunction(() => document.querySelector('#idoc-xml').value.includes('ORDERS05'));
      await page.click('button:has-text("3. Send to ERP")');
      await page.waitForSelector('text=/Sales order \\d+ created/');
      await go(page, 'Trial Balance');
      await page.waitForSelector('text=Ledger is balanced');
    },
  },
  {
    name: 'demo reset restores the original demo data',
    async fn({ page, base }) {
      await login(page, base, 'admin');
      await go(page, 'Implementation Guide');
      await page.click('main >> text=Purchasing: tolerances & release');
      await page.fill('#cfg-invoice_price_tolerance_pct', '4');
      await page.click('button:has-text("Save changes")');
      await page.waitForSelector('text=Saved 1 setting');
      await page.click('button:has-text("Sign out")');
      await page.click('button:has-text("Reset demo data")');
      await page.waitForSelector('text=Demo data was reset');
      await login(page, base, 'admin');
      await go(page, 'Implementation Guide');
      await page.click('main >> text=Purchasing: tolerances & release');
      checkEqual(await page.inputValue('#cfg-invoice_price_tolerance_pct'), '10', 'tolerance after reset');
    },
  },
  {
    name: 'demo at phone width has no sideways scrolling',
    viewport: { width: 390, height: 844 },
    async fn({ page, base }) {
      await page.goto(base);
      await page.waitForSelector('text=Sign in as a demo user');
      check(await noHorizontalScroll(page), 'demo login');
      await login(page, base, 'sam');
      check(await noHorizontalScroll(page), 'demo dashboard');
    },
  },
];

export async function runBrowserTests({ demo = true } = {}) {
  const pw = loadPlaywright();
  if (!pw) return { skipped: 'Playwright is not installed. Run `npm i -D playwright` and `npx playwright install chromium` in erp/.' };
  const browser = await pw.chromium.launch();
  const results = [];
  const setup = (makeTarget) => async (t) => {
    const target = await makeTarget();
    const context = await browser.newContext({ viewport: t.viewport ?? { width: 1400, height: 900 } });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.setDefaultTimeout(15_000);
    const ctx = {
      page,
      base: target.base,
      teardown: async () => {
        await context.close();
        await target.stop?.();
      },
      // Any uncaught error in the page fails the test, even if the flow completed.
      verify: async () => check(!errors.length, `JavaScript errors in the page: ${errors.join(' | ')}`),
    };
    return ctx;
  };
  try {
    console.log('\nBrowser tests (real server, fresh database per scenario)');
    results.push(...(await runTests('browser', serverTests, setup(startServer))));
    if (demo) {
      if (!fs.existsSync(DEMO_FILE)) {
        results.push({ suite: 'demo', name: 'demo build present', ok: false, ms: 0, error: `${path.relative(ROOT, DEMO_FILE)} is missing; run npm --prefix client run build:demo` });
      } else {
        console.log('\nBrowser tests (single-file demo under strict CSP, fresh browser storage per scenario)');
        const host = await startDemoHost(DEMO_FILE);
        try {
          results.push(...(await runTests('demo', demoTests, setup(async () => ({ base: host.base })))));
        } finally {
          await host.stop();
        }
      }
    }
  } finally {
    await browser.close();
  }
  return { results };
}
