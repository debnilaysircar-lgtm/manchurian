import { openDb } from './db.ts';
import { createApp } from './app.ts';
import { seedDemoData } from './seed.ts';

const db = openDb();
if (process.env.ERP_SEED_DEMO !== 'false') seedDemoData(db);

const port = Number(process.env.PORT ?? 4000);
createApp(db).listen(port, () => {
  console.log(`ERP API listening on http://localhost:${port}`);
});
