#!/usr/bin/env node
// Runs every check for the ERP and prints one summary:
//   type checks, unit/integration tests, builds, API tests against a real server,
//   browser tests against a real server, and browser tests of the single-file demo.
//
// Usage (from erp/):  npm run test:all [-- --no-browser] [-- --no-build] [-- --no-demo]
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { RESULTS, ROOT } from '../e2e/lib.mjs';
import { runApiTests } from '../e2e/api.mjs';
import { runBrowserTests } from '../e2e/browser.mjs';

const args = new Set(process.argv.slice(2));
const noBrowser = args.has('--no-browser');
const noBuild = args.has('--no-build');
const noDemo = args.has('--no-demo');

const steps = [];
const started = Date.now();

function sh(cmd, cmdArgs, cwd = ROOT) {
  return new Promise((resolve) => {
    const p = spawn(cmd, cmdArgs, { cwd, shell: process.platform === 'win32', env: process.env });
    let out = '';
    p.stdout.on('data', (d) => (out += d));
    p.stderr.on('data', (d) => (out += d));
    p.on('close', (code) => resolve({ code, out }));
  });
}

async function step(name, fn) {
  process.stdout.write(`\n▶ ${name}\n`);
  const t0 = Date.now();
  try {
    const r = await fn();
    steps.push({ name, ms: Date.now() - t0, ...r });
    process.stdout.write(`  ${r.ok ? '✓' : r.skipped ? '–' : '✗'} ${r.summary}\n`);
    if (!r.ok && r.details) process.stdout.write(r.details.split('\n').map((l) => `    ${l}`).join('\n') + '\n');
  } catch (e) {
    steps.push({ name, ms: Date.now() - t0, ok: false, summary: e.message });
    process.stdout.write(`  ✗ ${e.message}\n`);
  }
}

const npm = (dir, script) => sh('npm', ['--prefix', dir, 'run', script]);
const lastLines = (out, n = 25) => out.trim().split('\n').slice(-n).join('\n');

await step('Type check: server', async () => {
  const r = await npm('server', 'typecheck');
  return { ok: r.code === 0, summary: r.code === 0 ? 'no type errors' : 'type errors found', details: lastLines(r.out) };
});

await step('Type check: client', async () => {
  const r = await npm('client', 'typecheck');
  return { ok: r.code === 0, summary: r.code === 0 ? 'no type errors' : 'type errors found', details: lastLines(r.out) };
});

await step('Unit and integration tests (server business logic)', async () => {
  const r = await sh('npm', ['--prefix', 'server', 'test']);
  const pass = Number(r.out.match(/^# pass (\d+)/m)?.[1] ?? 0);
  const fail = Number(r.out.match(/^# fail (\d+)/m)?.[1] ?? 0);
  const failing = [...r.out.matchAll(/^not ok \d+ - (.+)$/gm)].map((m) => m[1]);
  return {
    ok: r.code === 0 && fail === 0 && pass > 0,
    summary: `${pass} passed, ${fail} failed`,
    tests: { pass, fail },
    details: failing.length ? `Failing: ${failing.join('; ')}` : lastLines(r.out),
  };
});

if (!noBuild) {
  await step('Build: client', async () => {
    const r = await npm('client', 'build');
    return { ok: r.code === 0, summary: r.code === 0 ? 'built client/dist' : 'build failed', details: lastLines(r.out) };
  });
  if (!noDemo)
    await step('Build: single-file demo', async () => {
      const r = await npm('client', 'build:demo');
      const size = r.out.match(/manchurian-erp\.html: ([\d.]+ MB)/)?.[1];
      return { ok: r.code === 0, summary: r.code === 0 ? `built client/dist-demo/manchurian-erp.html (${size})` : 'build failed', details: lastLines(r.out) };
    });
}

let apiResults = [];
await step('API tests (real server, demo data)', async () => {
  console.log('');
  apiResults = await runApiTests();
  const failed = apiResults.filter((t) => !t.ok);
  return { ok: !failed.length, summary: `${apiResults.length - failed.length} passed, ${failed.length} failed`, tests: { pass: apiResults.length - failed.length, fail: failed.length } };
});

let browserResults = [];
if (!noBrowser) {
  await step('Browser tests (UI flows, real server and demo build)', async () => {
    const r = await runBrowserTests({ demo: !noDemo });
    if (r.skipped) return { ok: true, skipped: true, summary: `skipped: ${r.skipped}` };
    browserResults = r.results;
    const failed = browserResults.filter((t) => !t.ok);
    return { ok: !failed.length, summary: `${browserResults.length - failed.length} passed, ${failed.length} failed`, tests: { pass: browserResults.length - failed.length, fail: failed.length } };
  });
}

// ---------- summary ----------
const total = (Date.now() - started) / 1000;
const allOk = steps.every((s) => s.ok);
const counted = steps.filter((s) => s.tests).reduce((a, s) => ({ pass: a.pass + s.tests.pass, fail: a.fail + s.tests.fail }), { pass: 0, fail: 0 });

const line = '─'.repeat(78);
console.log(`\n${line}\nSUMMARY\n${line}`);
for (const s of steps) console.log(`${s.ok ? (s.skipped ? '–' : '✓') : '✗'} ${s.name.padEnd(54)} ${s.summary}  (${(s.ms / 1000).toFixed(1)}s)`);
console.log(line);
console.log(`${allOk ? 'ALL CHECKS PASSED' : 'SOME CHECKS FAILED'}: ${counted.pass} tests passed, ${counted.fail} failed, ${steps.filter((s) => !s.ok).length} failing steps, ${total.toFixed(0)}s`);

fs.mkdirSync(RESULTS, { recursive: true });
const md = [
  `# Test report`,
  ``,
  `Run: ${new Date().toISOString()} · Node ${process.version} · ${process.platform} · ${total.toFixed(0)} s`,
  ``,
  `**${allOk ? 'All checks passed' : 'Some checks failed'}**: ${counted.pass} tests passed, ${counted.fail} failed.`,
  ``,
  `| Step | Result | Time |`,
  `|---|---|---|`,
  ...steps.map((s) => `| ${s.name} | ${s.ok ? (s.skipped ? '–' : '✓') : '✗'} ${s.summary} | ${(s.ms / 1000).toFixed(1)} s |`),
  ``,
  `## API and browser tests`,
  ``,
  `| Suite | Test | Result | Time |`,
  `|---|---|---|---|`,
  ...[...apiResults, ...browserResults].map((t) => `| ${t.suite} | ${t.name} | ${t.ok ? '✓' : `✗ ${t.error}${t.screenshot ? ` (screenshot: ${t.screenshot})` : ''}`} | ${(t.ms / 1000).toFixed(1)} s |`),
  ``,
];
fs.writeFileSync(path.join(RESULTS, 'report.md'), md.join('\n'));
console.log(`Report: ${path.relative(process.cwd(), path.join(RESULTS, 'report.md'))}`);
process.exit(allOk ? 0 : 1);
