import { Request, Response, NextFunction } from 'express';
import { runTransaction, getStore } from './db.js';
import { generateToken } from './crypto.js';
import { User } from './types.js';

export interface AuthenticatedRequest extends Request {
  user?: User;
  token?: string;
}

export async function createSession(userId: string): Promise<string> {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days
  await runTransaction(store => {
    store.sessions[token] = { userId, expiresAt };
  });
  return token;
}

export async function removeSession(token: string): Promise<void> {
  await runTransaction(store => {
    delete store.sessions[token];
  });
}

export async function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  let token = '';

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else if (req.headers['x-auth-token']) {
    token = String(req.headers['x-auth-token']).trim();
  }

  if (!token) {
    return next();
  }

  try {
    const store = await getStore();
    const session = store.sessions[token];
    if (!session) {
      return next();
    }

    if (new Date(session.expiresAt) < new Date()) {
      await removeSession(token);
      return next();
    }

    const user = store.users.find(u => u.id === session.userId);
    if (!user) {
      return next();
    }

    req.user = user;
    req.token = token;
    next();
  } catch (err) {
    console.error('Auth error:', err);
    next();
  }
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'No autorizado. Se requiere iniciar sesión.' });
  }

  if (req.user.status === 'suspended') {
    return res.status(403).json({ error: 'Acceso suspendido. Comunícate con el administrador por Telegram.' });
  }

  next();
}

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'No autorizado. Inicia sesión como administrador.' });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acceso denegado. Permisos de administrador requeridos.' });
  }

  next();
}
