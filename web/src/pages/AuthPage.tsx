import { useEffect } from 'react';
import { setAuthToken } from '../lib/api';
import { usePageMeta } from '../lib/meta';
import { readSession, saveSession } from '../lib/session';
import type { Session } from '../lib/types';
import { AuthScreen } from '../components/AuthScreen';

function safeNext(): string {
  const next = new URLSearchParams(window.location.search).get('next');
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/';
}

export function AuthPage({ initialMode }: { initialMode: 'login' | 'register' }) {
  const next = safeNext();

  usePageMeta(
    initialMode === 'login' ? 'Sign in — RoomForge' : 'Create your account — RoomForge',
    initialMode === 'login'
      ? 'Sign in to RoomForge and pick up where your room left off.'
      : 'Create a RoomForge account, start a room, and invite people and agents with a five-character code.',
  );

  useEffect(() => {
    if (readSession()) window.location.replace(next);
  }, [next]);

  function handleAuth(session: Session) {
    setAuthToken(session.token);
    saveSession(session);
    window.location.assign(next);
  }

  return <AuthScreen initialMode={initialMode} onAuth={handleAuth} />;
}
