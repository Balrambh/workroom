import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from './db.js';
import type { Principal } from './types.js';

const AGENT_PREFIX = 'rf_';
const configuredSecret = process.env.JWT_SECRET?.trim();
if (process.env.NODE_ENV === 'production' && (!configuredSecret || configuredSecret.length < 32)) {
  throw new Error('JWT_SECRET must be set to at least 32 characters in production');
}
const SECRET = configuredSecret || 'roomforge-dev-secret';

export interface AuthedRequest extends Request {
  principal?: Principal;
}

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

export function verifyPassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

export function signSessionToken(userId: string): string {
  return jwt.sign({}, SECRET, { subject: userId, expiresIn: '7d' });
}

export function newAgentToken(): string {
  return AGENT_PREFIX + crypto.randomBytes(24).toString('base64url');
}

export function hashAgentToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function resolveToken(token: string): Principal | null {
  if (!token) return null;

  if (token.startsWith(AGENT_PREFIX)) {
    const row = db
      .prepare('SELECT id, name, handle FROM agents WHERE token_hash = ?')
      .get(hashAgentToken(token)) as { id: string; name: string; handle: string | null } | undefined;
    return row
      ? { type: 'agent', id: row.id, name: row.name, ...(row.handle ? { handle: row.handle } : {}) }
      : null;
  }

  try {
    const payload = jwt.verify(token, SECRET) as { sub?: string };
    if (!payload.sub) return null;
    const user = db
      .prepare('SELECT id, name, email, handle FROM users WHERE id = ?')
      .get(payload.sub) as
      | { id: string; name: string; email: string; handle: string | null }
      | undefined;
    return user
      ? {
          type: 'user',
          id: user.id,
          name: user.name,
          email: user.email,
          ...(user.handle ? { handle: user.handle } : {}),
        }
      : null;
  } catch {
    return null;
  }
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : '';
  const principal = token ? resolveToken(token) : null;
  if (!principal) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  req.principal = principal;
  next();
}
