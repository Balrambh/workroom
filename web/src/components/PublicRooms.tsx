import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { api } from '../lib/api';
import { usePageMeta } from '../lib/meta';
import type { PublicRoom, RoomMode } from '../lib/types';
import { LinkifyText } from './LinkifyText';
import { SitePage } from './SitePage';
import {
  ArrowUpRightIcon,
  BranchIcon,
  CheckIcon,
  CopyIcon,
  HashIcon,
  SearchIcon,
  ShieldIcon,
  UsersIcon,
} from './Icons';

export function PublicRoomsPage() {
  usePageMeta(
    'Public rooms — RoomForge',
    'Browse public RoomForge rooms, preview members, or jump straight to a room with its five-character code.',
  );

  const [rooms, setRooms] = useState<PublicRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [modeFilter, setModeFilter] = useState<'all' | RoomMode>('all');
  const [jumpCode, setJumpCode] = useState('');
  const [jumpError, setJumpError] = useState<string | null>(null);

  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadRooms = () => {
    setLoading(true);
    setError(null);
    api
      .publicRooms()
      .then((data) => {
        setRooms(data.rooms);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Could not load public rooms');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    loadRooms();
  }, []);

  const filteredRooms = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rooms.filter((r) => {
      const matchesMode = modeFilter === 'all' || r.mode === modeFilter;
      if (!matchesMode) return false;
      if (!q) return true;
      return (
        r.name.toLowerCase().includes(q) ||
        r.code.toLowerCase().includes(q) ||
        (r.topic && r.topic.toLowerCase().includes(q))
      );
    });
  }, [rooms, search, modeFilter]);

  function handleJump(e: FormEvent) {
    e.preventDefault();
    setJumpError(null);
    const code = jumpCode.trim();
    if (!code) {
      setJumpError('Please enter a room code');
      return;
    }
    window.location.assign(`/room/${code}`);
  }

  function copyCode(code: string, e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    void navigator.clipboard.writeText(code).then(() => {
      setCopiedCode(code);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopiedCode(null), 1800);
    });
  }

  return (
    <SitePage active="rooms">
      <main className="site-main">
        <div className="directory-main">
          {/* Hero Section */}
          <div className="directory-hero">
            <span className="landing-eyebrow">
              <ShieldIcon size={13} /> RoomForge Directory
            </span>
            <h1>Public Rooms</h1>
            <p className="directory-subtitle">
              Browse all available rooms or enter any room&apos;s unique five-character code to jump
              straight into <code>/room/:code</code>.
            </p>

          {/* Quick jump input */}
          <form className="quick-jump-form" onSubmit={handleJump}>
            <div className="quick-jump-box">
              <span className="quick-jump-label">/room/</span>
              <input
                className="quick-jump-input"
                placeholder="A7K2Q"
                value={jumpCode}
                onChange={(e) => {
                  setJumpCode(e.target.value);
                  if (jumpError) setJumpError(null);
                }}
                maxLength={16}
                autoComplete="off"
                spellCheck="false"
              />
              <button type="submit" className="btn btn-primary btn-small">
                Go to room <ArrowUpRightIcon size={13} />
              </button>
            </div>
            {jumpError ? <p className="form-error jump-error">{jumpError}</p> : null}
          </form>
        </div>

        {/* Filters & Search Toolbar */}
        <div className="directory-toolbar">
          <div className="directory-search-box">
            <SearchIcon size={16} />
            <input
              type="text"
              placeholder="Search rooms by name, topic, or code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search ? (
              <button
                type="button"
                className="btn-clear-search"
                onClick={() => setSearch('')}
                title="Clear search"
                aria-label="Clear search"
              >
                ✕
              </button>
            ) : null}
          </div>

          <div className="directory-filter-tabs">
            <button
              type="button"
              className={`filter-tab ${modeFilter === 'all' ? 'active' : ''}`}
              onClick={() => setModeFilter('all')}
            >
              All ({rooms.length})
            </button>
            <button
              type="button"
              className={`filter-tab ${modeFilter === 'code' ? 'active' : ''}`}
              onClick={() => setModeFilter('code')}
            >
              <BranchIcon size={13} /> Code rooms ({rooms.filter((r) => r.mode === 'code').length})
            </button>
            <button
              type="button"
              className={`filter-tab ${modeFilter === 'chat' ? 'active' : ''}`}
              onClick={() => setModeFilter('chat')}
            >
              <HashIcon size={13} /> Chat rooms ({rooms.filter((r) => r.mode === 'chat').length})
            </button>
          </div>
        </div>

        {/* Content State: Loading, Error, Empty, or List */}
        {loading ? (
          <div className="directory-grid-loading">
            <div className="skeleton-card" />
            <div className="skeleton-card" />
            <div className="skeleton-card" />
          </div>
        ) : error ? (
          <div className="landing-card landing-notfound directory-error-card">
            <h2>Could not load rooms</h2>
            <p>{error}</p>
            <button type="button" className="btn btn-primary" onClick={loadRooms}>
              Retry
            </button>
          </div>
        ) : filteredRooms.length === 0 ? (
          <div className="directory-empty-card">
            <div className="empty-glyph">◆</div>
            <h3>{search ? 'No matching rooms found' : 'No public rooms yet'}</h3>
            <p>
              {search
                ? `No room matches "${search}". Try searching by another keyword or code.`
                : 'Create the first room and share its 5-digit code with collaborators and agents.'}
            </p>
            {search ? (
              <button
                type="button"
                className="btn btn-ghost btn-small"
                onClick={() => {
                  setSearch('');
                  setModeFilter('all');
                }}
              >
                Reset filters
              </button>
            ) : (
              <a className="btn btn-primary btn-small" href="/">
                Create a room
              </a>
            )}
          </div>
        ) : (
          <div className="directory-grid">
            {filteredRooms.map((room) => {
              const isCodeMode = room.mode === 'code';
              const roomUrl = `/room/${room.code}`;
              return (
                <div
                  key={room.code}
                  className="directory-card"
                  onClick={() => window.location.assign(roomUrl)}
                >
                  <div className="directory-card-head">
                    <span className={`mode-badge mode-${room.mode}`}>
                      {isCodeMode ? <BranchIcon size={12} /> : <HashIcon size={12} />}
                      {isCodeMode ? 'Code room' : 'Chat room'}
                    </span>
                    <button
                      type="button"
                      className="room-code-tag"
                      title="Click to copy code"
                      aria-label={`Copy room code ${room.code}`}
                      onClick={(e) => copyCode(room.code, e)}
                    >
                      <span className="code-text">{room.code}</span>
                      {copiedCode === room.code ? (
                        <CheckIcon size={12} />
                      ) : (
                        <CopyIcon size={12} />
                      )}
                    </button>
                  </div>

                  <h2 className="directory-card-title">
                    <a href={roomUrl} onClick={(e) => e.stopPropagation()}>
                      {room.name}
                    </a>
                  </h2>

                  <p className="directory-card-topic">
                    <LinkifyText
                      text={room.topic || 'No topic description provided.'}
                      stopPropagation
                    />
                  </p>

                  <div className="directory-card-foot">
                    <div className="directory-card-members">
                      <UsersIcon size={13} />
                      <span>
                        {room.memberCount} {room.memberCount === 1 ? 'member' : 'members'}
                      </span>
                    </div>

                    <a
                      href={roomUrl}
                      className="btn btn-ghost btn-tiny directory-enter-btn"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Enter <ArrowUpRightIcon size={12} />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Routing & Integration Info Box */}
        <div className="directory-info-box">
          <div className="info-item">
            <span className="info-num">1</span>
            <div>
              <strong>Instant five-character routes</strong>
              <p>
                Every room is reachable directly at <code>/room/:code</code> (for example,{' '}
                <code>/room/A7K2Q</code>).
              </p>
            </div>
          </div>
          <div className="info-item">
            <span className="info-num">2</span>
            <div>
              <strong>People &amp; Teams</strong>
              <p>
                Sign in, preview member rosters, and request membership. Admins approve requests in
                real-time.
              </p>
            </div>
          </div>
          <div className="info-item">
            <span className="info-num">3</span>
            <div>
              <strong>Autonomous Agents</strong>
              <p>
                Agents join with zero setup using <code>/api/agent/join/:code?name=AgentName</code>.
              </p>
            </div>
          </div>
        </div>
        </div>
      </main>
    </SitePage>
  );
}
