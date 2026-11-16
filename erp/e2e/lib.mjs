// Shared helpers for the end-to-end test suites.
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const RESULTS = path.join(ROOT, 'test-results');

export function freePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
    srv.on('error', reject);
  });
}

/** Starts the real API server on a fresh temporary database with demo data. */
export async function startServer() {
  const port = await freePort();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'erp-e2e-'));
  const proc = spawn(process.execPath, ['--import', 'tsx', 'src/index.ts'], {
    cwd: path.join(ROOT, 'server'),
    env: { ...process.env, PORT: String(port), ERP_DB: path.join(dir, 'erp.sqlite'), ERP_SEED_DEMO: 'true' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let log = '';
  proc.stdout.on('data', (d) => (log += d));
  proc.stderr.on('data', (d) => (log += d));
  const base = `http://127.0.0.1:${port}`;
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (proc.exitCode !== null) throw new Error(`Server exited early:\n${log}`);
    try {
      const r = await fetch(`${base}/api/health`);
      if (r.ok) break;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  if (Date.now() >= deadline) throw new Error(`Server did not start within 60s:\n${log}`);
  return {
    base,
    log: () => log,
    stop: async () => {
      proc.kill();
      await new Promise((r) => (proc.exitCode !== null ? r() : proc.once('exit', r)));
      fs.rmSync(dir, { recursive: true, force: true });
    },
  };
}

/** Serves the single-file demo the way the artifact host does: wrapped in a page, with a strict CSP (no eval, no network). */
export async function startDemoHost(fragmentFile) {
  const frag = fs.readFileSync(fragmentFile, 'utf8');
  const page = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><style>:root{color-scheme:light}body{margin:0;font:14px system-ui}</style></head><body>${frag}</body></html>`;
  const csp = "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline' https://fonts.googleapis.com; img-src data: blob:; font-src https://fonts.gstatic.com data:; connect-src 'none'";
  const port = await freePort();
  const srv = http.createServer((_req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Content-Security-Policy': csp });
    res.end(page);
  });
  await new Promise((r) => srv.listen(port, '127.0.0.1', r));
  return { base: `http://127.0.0.1:${port}/`, stop: () => new Promise((r) => srv.close(r)) };
}

/** Playwright, if available (pre-installed globally here; otherwise `npm i -D playwright` in erp/). */
export function loadPlaywright() {
  for (const from of [path.join(ROOT, 'package.json'), path.join(process.cwd(), 'x.js')]) {
    try {
      return createRequire(from)('playwright');
    } catch {
      /* try next */
    }
  }
  return null;
}

export class AssertionFailed extends Error {}
export function check(cond, message) {
  if (!cond) throw new AssertionFailed(message);
}
export function checkEqual(actual, expected, message) {
  if (actual !== expected) throw new AssertionFailed(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

/** Runs named test functions one after another and collects results. */
export async function runTests(suiteName, tests, setup) {
  const results = [];
  for (const t of tests) {
    const started = Date.now();
    let ctx;
    try {
      ctx = await setup(t);
      await t.fn(ctx);
      await ctx.verify?.();
      results.push({ suite: suiteName, name: t.name, ok: true, ms: Date.now() - started });
      process.stdout.write(`  \u2713 ${t.name} (${Date.now() - started} ms)\n`);
    } catch (e) {
      const shot = ctx?.page ? await saveScreenshot(ctx.page, `${suiteName}-${t.name}`) : null;
      results.push({ suite: suiteName, name: t.name, ok: false, ms: Date.now() - started, error: e.message.split('\n')[0], screenshot: shot });
      process.stdout.write(`  \u2717 ${t.name}: ${e.message.split('\n')[0]}${shot ? `\n      screenshot: ${shot}` : ''}\n`);
    } finally {
      await ctx?.teardown?.();
    }
  }
  return results;
}

async function saveScreenshot(page, name) {
  try {
    fs.mkdirSync(RESULTS, { recursive: true });
    const file = path.join(RESULTS, `${name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.png`);
    await page.screenshot({ path: file, fullPage: true });
    return path.relative(ROOT, file);
  } catch {
    return null;
  }
}
