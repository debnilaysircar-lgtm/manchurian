import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { z } from 'zod';
import type { DB } from './db.ts';
import { authenticate, login } from './auth.ts';
import { errorMiddleware, handle, parse } from './lib/errors.ts';
import { masterDataRoutes } from './routes/masterData.ts';
import { transactionRoutes } from './routes/transactions.ts';

export function createApp(db: DB) {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => res.json({ ok: true }));
  app.post('/api/auth/login', handle((req) => {
    const { username, password } = parse(z.object({ username: z.string().min(1), password: z.string().min(1) }), req.body);
    return login(db, username, password);
  }));

  app.use('/api', authenticate(db));
  app.get('/api/auth/me', handle((req) => req.user));
  app.use('/api', masterDataRoutes(db));
  app.use('/api', transactionRoutes(db));
  app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));

  // Serve the built client in production
  const clientDist = path.resolve(process.cwd(), '../client/dist');
  if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.get('*', (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
  }

  app.use(errorMiddleware);
  return app;
}
