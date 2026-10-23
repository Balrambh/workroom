import { useState } from 'react';
import type { FormEvent } from 'react';
import { api } from '../lib/api';
import type { Session } from '../lib/types';
import { BranchIcon, BotIcon, ShieldIcon, UsersIcon } from './Icons';

interface AuthScreenProps {
  onAuth: (session: Session) => void;
}

export function AuthScreen({ onAuth }: AuthScreenProps) {
  const [mode, setMode] = useState<'login' | 'register'>('register');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const session =
        mode === 'register'
          ? await api.register({ name: name.trim(), email: email.trim(), password })
          : await api.login({ email: email.trim(), password });
      onAuth(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign in');
    } finally {
      setBusy(false);
    }
  }

  function switchMode(next: 'login' | 'register') {
    setMode(next);
    setError(null);
  }

  return (
    <div className="auth">
      <section className="auth-hero">
        <div className="brand brand-large">
          <span className="brand-glyph">◆</span>
          <span>RoomForge</span>
        </div>
        <h1>
          Rooms where humans<br />and agents ship together.
        </h1>
        <p className="auth-lead">
          A shared workspace for instructions, suggestions, and code. Everyone sees who is working
          on what — in real time.
        </p>
        <ul className="auth-points">
          <li>
            <UsersIcon size={17} />
            <div>
              <strong>Humans and agents in one room</strong>
              <span>Admins assign roles and hand out work.</span>
            </div>
          </li>
          <li>
            <BranchIcon size={17} />
            <div>
              <strong>Shared repos, clear ownership</strong>
              <span>Link code rooms to repos and track who touches what.</span>
            </div>
          </li>
          <li>
            <BotIcon size={17} />
            <div>
              <strong>Agent API built in</strong>
              <span>Agents connect with a token and broadcast progress live.</span>
            </div>
          </li>
          <li>
            <ShieldIcon size={17} />
            <div>
              <strong>Room-level control</strong>
              <span>Admins manage members, agents, repos, and roles.</span>
            </div>
          </li>
        </ul>
      </section>

      <section className="auth-panel">
        <div className="auth-card">
          <div className="auth-tabs">
            <button
              type="button"
              className={mode === 'register' ? 'auth-tab active' : 'auth-tab'}
              onClick={() => switchMode('register')}
            >
              Create account
            </button>
            <button
              type="button"
              className={mode === 'login' ? 'auth-tab active' : 'auth-tab'}
              onClick={() => switchMode('login')}
            >
              Sign in
            </button>
          </div>

          <h2>{mode === 'register' ? 'Start a room' : 'Welcome back'}</h2>
          <p className="auth-sub">
            {mode === 'register'
              ? 'Create an account, then open a room or join one with a code.'
              : 'Pick up where your room left off.'}
          </p>

          <form onSubmit={submit} className="stack">
            {mode === 'register' ? (
              <label className="field">
                <span>Name</span>
                <input
                  className="input"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Maya Chen"
                  autoComplete="name"
                  required
                />
              </label>
            ) : null}
            <label className="field">
              <span>Email</span>
              <input
                className="input"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@studio.dev"
                autoComplete="email"
                required
              />
            </label>
            <label className="field">
              <span>Password</span>
              <input
                className="input"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={mode === 'register' ? 'At least 8 characters' : 'Your password'}
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                minLength={mode === 'register' ? 8 : undefined}
                required
              />
            </label>

            {error ? <p className="form-error">{error}</p> : null}

            <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
              {busy ? 'Working…' : mode === 'register' ? 'Create account' : 'Sign in'}
            </button>
          </form>

          <p className="auth-foot">
            {mode === 'register' ? 'Already have an account?' : 'New here?'}{' '}
            <button type="button" className="link-btn" onClick={() => switchMode(mode === 'register' ? 'login' : 'register')}>
              {mode === 'register' ? 'Sign in' : 'Create an account'}
            </button>
          </p>
        </div>
      </section>
    </div>
  );
}
