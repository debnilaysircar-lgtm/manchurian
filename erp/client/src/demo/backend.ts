/**
 * In-browser backend for the shareable demo: the real server modules run against SQLite compiled to JavaScript.
 * Data is saved to this browser's localStorage after every change.
 */
// @ts-expect-error sql.js ships without types for this build
import initSqlJs from 'sql.js/dist/sql-asm-memory-growth.js';
import { z } from 'zod';
import { configureSqlJs } from './sqlite';
import { Router } from './express';
import { openDb, type DB } from '../../../server/src/db.ts';
import { seedDemoData } from '../../../server/src/seed.ts';
import { authenticate, login } from '../../../server/src/auth.ts';
import { errorMiddleware, handle, parse } from '../../../server/src/lib/errors.ts';
import { masterDataRoutes } from '../../../server/src/routes/masterData.ts';
import { transactionRoutes } from '../../../server/src/routes/transactions.ts';
import { integrationRoutes } from '../../../server/src/routes/integration.ts';

const STORAGE_KEY = 'manchurian-erp-demo-db';
export const isDemo = true;

function loadSaved(): Uint8Array | null {
  try {
    const b64 = localStorage.getItem(STORAGE_KEY);
    if (!b64) return null;
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

function save(db: DB) {
  try {
    const bytes = (db as any).export() as Uint8Array;
    let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    localStorage.setItem(STORAGE_KEY, btoa(bin));
  } catch {
    /* storage unavailable or full: the demo keeps working in memory */
  }
}

function buildApp(db: DB) {
  const app = Router();
  app.post('/api/auth/login', handle((req) => {
    const { username, password } = parse(z.object({ username: z.string().min(1), password: z.string().min(1) }), req.body);
    return login(db, username, password);
  }));
  app.use('/api', authenticate(db));
  app.get('/api/auth/me', handle((req) => req.user));
  app.use('/api', masterDataRoutes(db));
  app.use('/api', transactionRoutes(db));
  app.use('/api', integrationRoutes(db));
  app.use('/api', (_req: unknown, res: any) => res.status(404).json({ error: 'Not found' }));
  app.use(errorMiddleware);
  return app;
}

async function boot(fresh: boolean) {
  const SQL = await initSqlJs();
  const saved = fresh ? null : loadSaved();
  let db: DB;
  try {
    configureSqlJs(SQL, saved);
    db = openDb(':memory:');
  } catch {
    // Saved data unreadable: start over with fresh demo data.
    configureSqlJs(SQL, null);
    db = openDb(':memory:');
  }
  seedDemoData(db);
  save(db);
  return { db, app: buildApp(db) };
}

let ready = boot(false);

export async function send(method: string, path: string, body: unknown, token: string | null): Promise<{ status: number; data: any }> {
  const { db, app } = await ready;
  const url = new URL(path, 'http://demo');
  const req: any = {
    method,
    path: `/api${url.pathname}`,
    query: Object.fromEntries(url.searchParams),
    body: body === undefined ? {} : JSON.parse(JSON.stringify(body)),
    headers: token ? { authorization: `Bearer ${token}` } : {},
  };
  const result = await new Promise<{ status: number; data: any }>((resolve) => {
    const res: any = {
      statusCode: 200,
      headersSent: false,
      status(c: number) {
        this.statusCode = c;
        return this;
      },
      json(v: unknown) {
        this.headersSent = true;
        resolve({ status: this.statusCode, data: JSON.parse(JSON.stringify(v ?? null)) });
        return this;
      },
    };
    app(req, res, (err?: unknown) => resolve({ status: 500, data: { error: err instanceof Error ? err.message : 'Not found' } }));
  });
  if (method !== 'GET') save(db);
  return result;
}

/** Throw away this browser's demo data and start again from the demo data set. */
export async function resetData() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  ready = boot(true);
  await ready;
}
