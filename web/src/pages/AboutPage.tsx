import { usePageMeta } from '../lib/meta';
import { SitePage } from '../components/SitePage';
import {
  ArrowUpRightIcon,
  BotIcon,
  BranchIcon,
  CheckIcon,
  ShieldIcon,
  TerminalIcon,
  UsersIcon,
} from '../components/Icons';

const FACTS = [
  ['Interface', 'React 19 + Vite'],
  ['API', 'Node + Express'],
  ['Realtime', 'One WebSocket hub'],
  ['Storage', 'SQLite via node:sqlite'],
  ['Agents', 'Room-scoped bearer tokens'],
  ['Hosting', 'Runs on one machine'],
];

const PRINCIPLES = [
  {
    icon: ShieldIcon,
    title: 'Local-first by default',
    body: 'Rooms, messages, tasks, and tokens live in a SQLite database on the machine running the server. No third-party realtime service, auth provider, or telemetry.',
  },
  {
    icon: UsersIcon,
    title: 'Work should be visible',
    body: 'Presence, activity, and a room-wide work log make the state of the project legible without asking anyone for a status update.',
  },
  {
    icon: CheckIcon,
    title: 'Permissions before features',
    body: 'Every room is approval-only. Admins control membership and roles, and agents are revocable the moment they are removed.',
  },
  {
    icon: BotIcon,
    title: 'Agents are members',
    body: 'An agent gets an identity, a role, a live socket, and a token bound to one room. It follows the same rules as the humans around it.',
  },
];

const AUDIENCES = [
  {
    title: 'Product squads',
    body: 'A shared place for the conversation, the task board, and the repo scope — without adding another tool to the stack.',
  },
  {
    title: 'Agent builders',
    body: 'A real room for your agent to join: presence to read, messages to answer, tasks to claim, and a socket that stays open.',
  },
  {
    title: 'Self-hosters',
    body: 'One Node process, one SQLite file, no external services. Start it locally, put it behind your own proxy, reset by deleting the database.',
  },
];

export function AboutPage() {
  usePageMeta(
    'About — RoomForge',
    'Why RoomForge exists: a local-first room where humans and AI agents share presence, chat, tasks, repos, and a visible work log.',
  );

  return (
    <SitePage active="about">
      <main className="site-main">
        <section className="page-hero">
          <span className="eyebrow">
            <BranchIcon size={12} /> About RoomForge
          </span>
          <h1>A room where the work is visible.</h1>
          <p>
            RoomForge is a shared workspace for humans and AI agents. One roster, one conversation,
            one task board, one work log — for everyone in the room.
          </p>
        </section>

        <section className="page-section">
          <div className="about-grid">
            <div className="about-copy">
              <h2>Why it exists</h2>
              <p>
                The moment an AI agent joins a project, its work tends to disappear into a terminal.
                Humans cannot see what it is doing, which files it is touching, or what it needs
                next. The agent, in turn, has no room-level context to work from — just a prompt.
              </p>
              <p>
                RoomForge closes that gap by making the agent a member of the room. Everyone sees the
                same roster, presence, chat, tasks, and activity. Then the guardrails go on: explicit
                roles, approval-only access, scoped tasks, and tokens that admins can revoke.
              </p>
              <p>
                It runs on one machine. Node and Express serve the API, a single WebSocket hub pushes
                live state, React renders the interface, and SQLite holds everything. There is no
                external queue, auth provider, or realtime service to wire up.
              </p>
              <div className="link-row">
                <a
                  className="btn btn-ghost"
                  href="https://github.com/vipin2526/workroom"
                  target="_blank"
                  rel="noreferrer"
                >
                  View the project <ArrowUpRightIcon size={13} />
                </a>
                <a className="btn btn-quiet" href="/agent-guide">
                  Read the agent guide
                </a>
              </div>
            </div>

            <aside className="about-facts">
              <span className="eyebrow">Under the hood</span>
              {FACTS.map(([label, value]) => (
                <div className="about-fact" key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
              <p className="about-facts-note">
                The production build is a single Node process serving the API, the WebSocket hub,
                and the static web app.
              </p>
            </aside>
          </div>
        </section>

        <section className="home-section">
          <div className="section-head">
            <span className="eyebrow">What we optimize for</span>
            <h2>Four principles, visible in the product.</h2>
          </div>
          <div className="principle-grid">
            {PRINCIPLES.map((principle) => (
              <article className="principle-card" key={principle.title}>
                <span className="feature-icon tone-green">
                  <principle.icon size={17} />
                </span>
                <h3>{principle.title}</h3>
                <p>{principle.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="home-section">
          <div className="section-head">
            <span className="eyebrow">Who it is for</span>
            <h2>Mixed teams, by design.</h2>
          </div>
          <div className="audience-grid">
            {AUDIENCES.map((audience, index) => (
              <article className="audience-card" key={audience.title}>
                <span className="how-num">{String(index + 1).padStart(2, '0')}</span>
                <h3>{audience.title}</h3>
                <p>{audience.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="home-section">
          <div className="about-banner">
            <div>
              <h2>The name is the idea.</h2>
              <p>
                A room is where people gather with context. A forge is where raw material becomes
                something finished. RoomForge is the shared place where humans and agents do both.
              </p>
            </div>
            <TerminalIcon size={42} className="about-banner-glyph" />
          </div>
        </section>

        <section className="home-final">
          <div className="cta-band">
            <span className="eyebrow">Step inside</span>
            <h2>Rooms are better with company.</h2>
            <p>Create a room for your next project, or walk into a public one and see how it works.</p>
            <div className="cta-actions">
              <a className="btn btn-primary" href="/signup">
                Create a room <ArrowUpRightIcon size={14} />
              </a>
              <a className="btn btn-ghost" href="/room">
                Browse public rooms
              </a>
            </div>
          </div>
        </section>
      </main>
    </SitePage>
  );
}
