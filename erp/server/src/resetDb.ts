import fs from 'node:fs';
import path from 'node:path';

const file = process.env.ERP_DB ?? path.resolve(process.cwd(), 'data', 'erp.sqlite');
for (const f of [file, `${file}-wal`, `${file}-shm`]) if (fs.existsSync(f)) fs.rmSync(f);
console.log(`Deleted ${file}. It will be recreated (with demo data unless ERP_SEED_DEMO=false) on next start.`);
