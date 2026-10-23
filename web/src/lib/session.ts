import type { Session, SessionUser } from './types';

const SESSION_KEY = 'roomforge.session';

export function readSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { user?: SessionUser; token?: string };
    if (!parsed?.user?.id || !parsed.user.name || !parsed.user.email) return null;
    const session: Session = { user: parsed.user };
    if ('token' in parsed) saveSession(session);
    return session;
  } catch {
    return null;
  }
}

export function saveSession(session: Session): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}
