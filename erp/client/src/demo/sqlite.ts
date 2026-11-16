/**
 * The subset of the better-sqlite3 API the server code uses, implemented on sql.js (SQLite compiled to JavaScript).
 * Lets the unchanged server modules run in the browser.
 */
let SQL: any = null;
let initialBytes: Uint8Array | null = null;

export function configureSqlJs(sql: any, bytes: Uint8Array | null) {
  SQL = sql;
  initialBytes = bytes;
}

const norm = (v: unknown) => (v === undefined ? null : typeof v === 'boolean' ? Number(v) : typeof v === 'bigint' ? Number(v) : v);

class Statement {
  constructor(private db: Database, private sql: string) {}
  private prep(args: unknown[]) {
    const s = this.db.raw.prepare(this.sql);
    const a0 = args[0];
    if (args.length === 1 && a0 && typeof a0 === 'object' && !Array.isArray(a0) && !(a0 instanceof Uint8Array)) {
      const named: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(a0)) named[`@${k}`] = norm(v);
      s.bind(named);
    } else if (args.length) s.bind(args.map(norm));
    return s;
  }
  get(...args: unknown[]) {
    const s = this.prep(args);
    try {
      return s.step() ? s.getAsObject() : undefined;
    } finally {
      s.free();
    }
  }
  all(...args: unknown[]) {
    const s = this.prep(args);
    try {
      const rows: any[] = [];
      while (s.step()) rows.push(s.getAsObject());
      return rows;
    } finally {
      s.free();
    }
  }
  run(...args: unknown[]) {
    const s = this.prep(args);
    try {
      while (s.step());
    } finally {
      s.free();
    }
    const changes = this.db.raw.getRowsModified();
    const id = this.db.raw.exec('SELECT last_insert_rowid()')[0].values[0][0];
    return { changes, lastInsertRowid: id };
  }
}

export default class Database {
  raw: any;
  private depth = 0;
  constructor(_file?: string) {
    if (!SQL) throw new Error('sql.js is not initialised');
    this.raw = initialBytes ? new SQL.Database(initialBytes) : new SQL.Database();
  }
  prepare(sql: string) {
    return new Statement(this, sql);
  }
  exec(sql: string) {
    this.raw.exec(sql);
    return this;
  }
  pragma(p: string, opts?: { simple?: boolean }) {
    if (/journal_mode/i.test(p)) return 'memory';
    const res = this.raw.exec(`PRAGMA ${p}`);
    const rows = res.length ? res[0].values.map((v: any[]) => Object.fromEntries(res[0].columns.map((c: string, i: number) => [c, v[i]]))) : [];
    return opts?.simple ? (rows[0] ? Object.values(rows[0])[0] : undefined) : rows;
  }
  /** Nested calls become savepoints, like better-sqlite3. */
  transaction<A extends unknown[], R>(fn: (...args: A) => R) {
    return (...args: A): R => {
      const level = this.depth;
      this.raw.exec(level === 0 ? 'BEGIN' : `SAVEPOINT sp${level}`);
      this.depth++;
      try {
        const r = fn(...args);
        this.depth--;
        this.raw.exec(level === 0 ? 'COMMIT' : `RELEASE sp${level}`);
        return r;
      } catch (e) {
        this.depth--;
        this.raw.exec(level === 0 ? 'ROLLBACK' : `ROLLBACK TO sp${level}; RELEASE sp${level}`);
        throw e;
      }
    };
  }
  export(): Uint8Array {
    const bytes = this.raw.export();
    this.raw.exec('PRAGMA foreign_keys = ON');
    return bytes;
  }
  close() {
    this.raw.close();
  }
}
