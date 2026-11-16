import type { Request, Response, NextFunction, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import type { DB } from './db.ts';
import { getSetting } from './db.ts';
import { HttpError } from './lib/errors.ts';

export type Role = 'admin' | 'finance' | 'purchasing' | 'warehouse';
export interface AuthUser {
  id: number;
  username: string;
  fullName: string;
  role: Role;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

const secret = (db: DB) => process.env.ERP_JWT_SECRET ?? getSetting(db, 'jwt_secret')!;

export function login(db: DB, username: string, password: string) {
  const u = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as any;
  if (!u || !u.is_active || !bcrypt.compareSync(password, u.password_hash)) throw new HttpError(401, 'Invalid username or password');
  const user: AuthUser = { id: u.id, username: u.username, fullName: u.full_name, role: u.role };
  const token = jwt.sign(user, secret(db), { expiresIn: '12h' });
  return { token, user };
}

export const authenticate =
  (db: DB): RequestHandler =>
  (req, _res, next) => {
    const header = req.headers.authorization ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return next(new HttpError(401, 'Not signed in'));
    try {
      const payload = jwt.verify(token, secret(db)) as AuthUser;
      const active = db.prepare('SELECT role, is_active FROM users WHERE id = ?').get(payload.id) as { role: Role; is_active: number } | undefined;
      if (!active?.is_active) return next(new HttpError(401, 'User is inactive'));
      req.user = { ...payload, role: active.role };
      next();
    } catch {
      next(new HttpError(401, 'Session expired, please sign in again'));
    }
  };

/** Admins can do everything; other roles only what is listed. */
export const requireRole =
  (...roles: Role[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (req.user && (req.user.role === 'admin' || roles.includes(req.user.role))) return next();
    next(new HttpError(403, 'You are not authorized for this action'));
  };
