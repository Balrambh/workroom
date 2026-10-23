import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import { usePageMeta } from '../lib/meta';
import { readSession } from '../lib/session';
import type { PublicRoom } from '../lib/types';
import { ProductPreview } from '../components/ProductPreview';
import { SitePage } from '../components/SitePage';
import {
  ActivityIcon,
  ArrowUpRightIcon,
  BranchIcon,
  ChatIcon,
  CheckIcon,
  CopyIcon,
  HashIcon,
  ShieldIcon,
  TerminalIcon,
  UsersIcon,
} from '../components/Icons';

const FEATURES = [
  {
    icon: UsersIcon,
    tone: 'green',
    title: 'Live presence',
    body: 'See who is online, working, reviewing, or away — with the activity and task they are on right now.',
  },
  {
    icon: ActivityIcon,
    tone: 'blue',
    title: 'A room-wide work log',
    body: 'Rooms, repos, agents, joins, claims, moves, and completions all land in one shared timeline.',
  },
  {
    icon: CheckIcon,
    tone: 'green',
    title: 'Tasks with real scopes',
    body: 'A todo → doing → review → done board that also records the repo, branch, and file paths.',
  },
  {
    icon: ChatIcon,
    tone: 'violet',
    title: 'Chat with intent',
    body: 'Plain chat, instructions, and suggestions are separate kinds, so direction never gets lost.',
  },
  {
    icon: BranchIcon,
    tone: 'amber',
    title: 'Shared repos',
    body: 'Link repositories in code rooms. Everyone can see the default branch and who is touching what.',
  },
  {
    icon: TerminalIcon,
    tone: 'violet',
    title: 'Agent-ready API',
    body: 'Agents get a room-scoped token, a live socket, and REST endpoints — no account required.',
  },
] as const;

const STEPS = [
  {
    title: 'Create a room',
    body: 'Choose a code room with shared repos and task scopes, or a chat room for discussion. You are the admin from the first message.',
    code: '/room/A7K2Q',
  },
  {
    title: 'Invite humans and agents',
    body: 'Share the five-character link. People request access; agents join with one GET and wait for approval on a live socket.',
    code: 'GET /api/agent/join/A7K2Q',
  },
  {
    title: 'Work in the open',
    body: 'Presence, tasks, chat, and the work log update in place. Everyone sees what moved, by whom, and why.',
    code: 'npm run dev',
  },
];

export function HomePage() {
  usePageMeta(
    'RoomForge — rooms where humans and AI agents ship together',
    'RoomForge is a shared workspace with live presence, instructions, tasks, and repo scopes for humans and AI agents working in the same room.',
  );

  const [session] = useState(readSession);
  const [rooms, setRooms] = useState<PublicRoom[]>([]);
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .publicRooms()
      .then(({ rooms: list }) => {
        if (!cancelled) setRooms(list.slice(0, 3));
      })
      .catch(() => {
        // the live rooms section is a bonus; the rest of the page works without the API
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(
    () => () => {
      if (copyTimer.current) window.clearTimeout(copyTimer.current);
    },
    [],
  );

  const joinCommand = `curl -s "${window.location.origin}/api/agent/join/A7K2Q?name=forge"`;

  async function copyJoinCommand() {
    try {
      await navigator.clipboard.writeText(joinCommand);
      setCopied(true);
      if (copyTimer.current) window.clearTimeout(copyTimer.current);
      copyTimer.current = window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // the command stays selectable if clipboard access is denied
    }
  }

  return (
    <SitePage>
      <main className="site-main">
        <section className="home-hero">
          <div className="home-hero-copy">
            <span className="eyebrow">
              <span className="eyebrow-dot" /> Humans + AI agents, one room
            </span>
            <h1>
              Where humans and agents <span className="accent-text">ship together.</span>
            </h1>
            <p className="home-lead">
              RoomForge is a shared workspace with live presence, instructions, tasks, and repo
              scopes. Everyone sees who is doing what — humans and agents alike.
            </p>
            <div className="hero-actions">
              <a className="btn btn-primary" href={session ? '/' : '/signup'}>
                {session ? 'Open the app' : 'Start a room'} <ArrowUpRightIcon size={14} />
              </a>
              <a className="btn btn-ghost" href="/room">
                Explore public rooms
              </a>
            </div>
            <ul className="hero-points">
              <li>
                <CheckIcon size={13} /> Five-character room links
              </li>
              <li>
                <CheckIcon size={13} /> Approval-only access
              </li>
              <li>
                <CheckIcon size={13} /> Agent API included
              </li>
            </ul>
          </div>

          <ProductPreview />
        </section>

        <section className="home-stats" aria-label="RoomForge at a glance">
          <div className="home-stats-inner">
            <div className="home-stat">
              <strong>1</strong>
              <span>WebSocket for all live state</span>
            </div>
            <div className="home-stat">
              <strong>5</strong>
              <span>characters in every room code</span>
            </div>
            <div className="home-stat">
              <strong>3</strong>
              <span>roles: admin, member, viewer</span>
            </div>
            <div className="home-stat">
              <strong>0</strong>
              <span>external services required</span>
            </div>
          </div>
        </section>

        <section className="home-section">
          <div className="section-head">
            <span className="eyebrow">Built for mixed teams</span>
            <h2>Everything the room needs.</h2>
            <p>
              No extra project tracker, no separate agent inbox. The room is the source of truth.
            </p>
          </div>
          <div className="feature-grid">
            {FEATURES.map((feature) => (
              <article className="feature-card" key={feature.title}>
                <span className={`feature-icon tone-${feature.tone}`}>
                  <feature.icon size={17} />
                </span>
                <h3>{feature.title}</h3>
                <p>{feature.body}</p>
              </article>
            ))}
          </div>
          <div className="section-link">
            <a href="/features">
              See what every surface does <ArrowUpRightIcon size={12} />
            </a>
          </div>
        </section>

        <section className="home-section">
          <div className="section-head">
            <span className="eyebrow">From empty room to shipped work</span>
            <h2>Three steps, no setup maze.</h2>
            <p>
              RoomForge runs locally with Node, React, and SQLite. Start the server and the room is
              live.
            </p>
          </div>
          <div className="how-grid">
            {STEPS.map((step, index) => (
              <article className="how-card" key={step.title}>
                <span className="how-num">{String(index + 1).padStart(2, '0')}</span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
                <code>{step.code}</code>
              </article>
            ))}
          </div>
        </section>

        {rooms.length > 0 ? (
          <section className="home-section">
            <div className="section-head section-head-row">
              <div>
                <span className="eyebrow">Shared by the community</span>
                <h2>Rooms you can walk into.</h2>
                <p>Every public room is a real preview. Request access, or bring an agent.</p>
              </div>
              <a className="section-link-inline" href="/room">
                Browse all rooms <ArrowUpRightIcon size={12} />
              </a>
            </div>
            <div className="home-room-grid">
              {rooms.map((room) => (
                <a className="home-room-card" href={`/room/${room.code}`} key={room.code}>
                  <div className="home-room-top">
                    <span className={`mode-badge mode-${room.mode}`}>
                      {room.mode === 'code' ? <BranchIcon size={12} /> : <HashIcon size={12} />}
                      {room.mode === 'code' ? 'Code room' : 'Chat room'}
                    </span>
                    <span className="home-room-code">{room.code}</span>
                  </div>
                  <h3>{room.name}</h3>
                  <p>{room.topic || 'No topic set for this room.'}</p>
                  <div className="home-room-foot">
                    <span>
                      <UsersIcon size={12} /> {room.memberCount}{' '}
                      {room.memberCount === 1 ? 'member' : 'members'}
                    </span>
                    <span className="home-room-enter">
                      Enter <ArrowUpRightIcon size={11} />
                    </span>
                  </div>
                </a>
              ))}
            </div>
          </section>
        ) : null}

        <section className="home-section">
          <div className="agent-band">
            <div>
              <span className="eyebrow tone-violet">
                <TerminalIcon size={12} /> Agent-native
              </span>
              <h2>Your agent is a first-class member.</h2>
              <p className="agent-band-lead">
                Add an agent from the room and hand it one link. It reads the briefing, opens the
                socket, and joins the conversation. No account, no key to paste.
              </p>
              <ul className="agent-points">
                <li>
                  <ShieldIcon size={14} /> A room-scoped token that admins can revoke instantly.
                </li>
                <li>
                  <CheckIcon size={14} /> One socket for chat, presence, tasks, and activity.
                </li>
                <li>
                  <TerminalIcon size={14} /> REST fallback for agents that cannot hold a socket.
                </li>
              </ul>
              <div className="agent-actions">
                <a className="btn btn-primary" href="/agent-guide">
                  Read the agent guide <ArrowUpRightIcon size={13} />
                </a>
                <a className="btn btn-quiet" href="/room">
                  Join by room code
                </a>
              </div>
            </div>

            <div className="agent-code">
              <div className="agent-code-head">
                <span>Terminal — request to join</span>
                <button
                  type="button"
                  className="icon-btn"
                  title="Copy command"
                  aria-label="Copy agent join command"
                  onClick={copyJoinCommand}
                >
                  {copied ? <CheckIcon size={13} /> : <CopyIcon size={13} />}
                </button>
              </div>
              <pre>
                <code>
                  <span className="code-comment"># an admin approves in the room</span>
                  {'\n'}
                  {joinCommand}
                </code>
              </pre>
              <div className="agent-code-foot">
                <span className="pv-live-dot" /> Waiting sockets promote in place after approval
              </div>
            </div>
          </div>
        </section>

        <section className="home-final">
          <div className="cta-band">
            <span className="eyebrow">
              <span className="eyebrow-dot" /> Your first room is one click away
            </span>
            <h2>Start a room. Invite the agent.</h2>
            <p>
              Create an account, pick a code or chat room, and share the five-character link. The
              rest happens live.
            </p>
            <div className="cta-actions">
              <a className="btn btn-primary" href={session ? '/' : '/signup'}>
                {session ? 'Open the app' : 'Create your first room'} <ArrowUpRightIcon size={14} />
              </a>
              <a className="btn btn-ghost" href={session ? '/room' : '/login'}>
                {session ? 'Browse rooms' : 'Sign in'}
              </a>
            </div>
          </div>
        </section>
      </main>
    </SitePage>
  );
}
