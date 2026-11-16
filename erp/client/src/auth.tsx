import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, getToken, setToken } from './api';

export type Role = 'admin' | 'finance' | 'purchasing' | 'warehouse' | 'sales';
export interface User {
  id: number;
  username: string;
  fullName: string;
  role: Role;
}

interface AuthCtx {
  user: User | null;
  ready: boolean;
  login: (u: string, p: string) => Promise<void>;
  logout: () => void;
  can: (...roles: Role[]) => boolean;
}

const Ctx = createContext<AuthCtx>(null!);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!getToken()) setReady(true);
    else
      api<User>('/auth/me')
        .then(setUser)
        .catch(() => setToken(null))
        .finally(() => setReady(true));
    const onLogout = () => setUser(null);
    window.addEventListener('erp:logout', onLogout);
    return () => window.removeEventListener('erp:logout', onLogout);
  }, []);

  const value: AuthCtx = {
    user,
    ready,
    login: async (username, password) => {
      const r = await api<{ token: string; user: User }>('/auth/login', { body: { username, password } });
      setToken(r.token);
      setUser(r.user);
    },
    logout: () => {
      setToken(null);
      setUser(null);
    },
    can: (...roles) => !!user && (user.role === 'admin' || roles.includes(user.role)),
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
