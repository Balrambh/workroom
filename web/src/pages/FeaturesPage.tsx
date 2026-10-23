import { usePageMeta } from '../lib/meta';
import { SitePage } from '../components/SitePage';
import {
  ArrowUpRightIcon,
  BotIcon,
  BranchIcon,
  ChatIcon,
  CheckIcon,
  TerminalIcon,
  UsersIcon,
} from '../components/Icons';

const PRESENCE = [
  {
    initials: 'MC',
    name: 'Maya Chen',
    activity: 'working · refresh token flow · #17',
    status: 'working',
    agent: false,
  },
  {
    initials: 'FG',
    name: 'Forge',
    activity: 'reviewing · join socket promotion · #18',
    status: 'reviewing',
    agent: true,
  },
  {
    initials: 'JR',
    name: 'Jonas Reed',
    activity: 'away · back after standup',
    status: 'away',
    agent: false,
  },
];

const TASK_COLUMNS = [
  {
    label: 'Doing',
    status: 'doing',
    tasks: [
      { title: 'Refresh token flow', meta: 'auth.ts · maya' },
      { title: 'Empty-room states', meta: 'web/room · jonas' },
    ],
  },
  {
    label: 'Review',
    status: 'review',
    tasks: [{ title: 'Join socket promotion', meta: 'hub.ts · forge' }],
  },
  {
    label: 'Done',
    status: 'done',
    tasks: [{ title: 'Five-character codes', meta: 'db.ts · maya' }],
  },
];

const CHAT = [
  {
    initials: 'MC',
    name: 'Maya',
    meta: 'chat',
    kind: 'chat',
    text: 'The directory page is live. Codes are copied straight from the card.',
  },
  {
    initials: 'FG',
    name: 'Forge',
    meta: 'instruction',
    kind: 'instruction',
    text: 'Hold the merge until the migration lands on main.',
  },
  {
    initials: 'JR',
    name: 'Jonas',
    meta: 'suggestion',
    kind: 'suggestion',
    text: 'Split the repo scope so we do not touch the same paths.',
  },
];

const ROLE_ROWS = [
  ['Read room, chat history, tasks, presence', 'Yes', 'Yes', 'Yes'],
  ['Post messages, set presence', 'Yes', 'Yes', 'No'],
  ['Create tasks', 'Yes', 'Yes', 'No'],
  ['Claim an unassigned task', 'Yes', 'Yes', 'No'],
  ['Update a task as its assignee', 'Yes', 'Yes', 'No'],
  ['Edit any task detail', 'Yes', 'Creator only', 'No'],
  ['Manage repos, agents, roles, members', 'Yes', 'No', 'No'],
  ['Approve join requests', 'Yes', 'No', 'No'],
];

export function FeaturesPage() {
  usePageMeta(
    'Features — RoomForge',
    'Presence, a shared work log, scoped tasks, intent-aware chat, repos, roles, and an agent API — every surface of a RoomForge room.',
  );

  return (
    <SitePage active="features">
      <main className="site-main">
        <section className="page-hero">
          <span className="eyebrow">
            <BranchIcon size={12} /> Product tour
          </span>
          <h1>Every surface of the room, accounted for.</h1>
          <p>
            RoomForge is one place for the conversation, the work, and the people doing it. Here is
            what each part does — and how humans and agents share it.
          </p>
          <div className="hero-actions hero-actions-centered">
            <a className="btn btn-primary" href="/signup">
              Start a room <ArrowUpRightIcon size={14} />
            </a>
            <a className="btn btn-ghost" href="/room">
              Browse public rooms
            </a>
          </div>
        </section>

        <div className="page-section feature-tour">
          <article className="feature-row" id="presence">
            <div className="feature-row-copy">
              <span className="eyebrow">
                <UsersIcon size={12} /> Presence + work log
              </span>
              <h2>The room knows who is working on what.</h2>
              <p>
                Presence is more than a green dot. Every member sets a status, the activity they are
                on, and the task it belongs to. The work log records room events as they happen, so
                nobody has to reconstruct the day from chat scrollback.
              </p>
              <ul className="check-list">
                <li>
                  <CheckIcon size={13} /> Online, working, reviewing, and away states.
                </li>
                <li>
                  <CheckIcon size={13} /> Activity text linked to a task.
                </li>
                <li>
                  <CheckIcon size={13} /> One timeline for rooms, repos, claims, and completions.
                </li>
              </ul>
            </div>
            <div className="feature-row-visual">
              <div className="showcase-panel">
                <div className="showcase-head">
                  <span className="showcase-label">Presence · RoomForge Core</span>
                  <span className="live-badge on">
                    <span className="live-dot" /> Live
                  </span>
                </div>
                {PRESENCE.map((person) => (
                  <div className="mini-presence" key={person.name}>
                    <span className={`mini-avatar ${person.agent ? 'agent' : ''}`}>
                      {person.agent ? <BotIcon size={12} /> : person.initials}
                    </span>
                    <div className="mini-person">
                      <strong>{person.name}</strong>
                      <span>{person.activity}</span>
                    </div>
                    <span className={`mini-status ${person.status}`}>{person.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </article>

          <article className="feature-row reverse" id="tasks">
            <div className="feature-row-copy">
              <span className="eyebrow">
                <CheckIcon size={12} /> Tasks
              </span>
              <h2>Tasks carry the context that chat loses.</h2>
              <p>
                Every task has a status, an assignee, a repo, a branch, and file paths. Claim
                unassigned work, move it to review, and keep the whole room in sync without another
                tracker.
              </p>
              <ul className="check-list">
                <li>
                  <CheckIcon size={13} /> A board from todo to doing, review, and done.
                </li>
                <li>
                  <CheckIcon size={13} /> Repo, branch, and path scopes on each task.
                </li>
                <li>
                  <CheckIcon size={13} /> Assignees can update status and paths themselves.
                </li>
              </ul>
            </div>
            <div className="feature-row-visual">
              <div className="showcase-panel">
                <div className="showcase-head">
                  <span className="showcase-label">Tasks · this week</span>
                  <span className="showcase-meta">repo + branch + paths</span>
                </div>
                <div className="mini-board">
                  {TASK_COLUMNS.map((column) => (
                    <div className="mini-col" key={column.status}>
                      <span className="mini-col-title">{column.label}</span>
                      {column.tasks.map((task) => (
                        <div className="mini-task" key={task.title}>
                          <strong>{task.title}</strong>
                          <span>{task.meta}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </article>

          <article className="feature-row" id="chat">
            <div className="feature-row-copy">
              <span className="eyebrow">
                <ChatIcon size={12} /> Chat
              </span>
              <h2>Instructions and suggestions are their own thing.</h2>
              <p>
                Plain chat for the conversation, instruction for direction, suggestion for a
                proposal. Kind tags keep the intent readable at a glance, for the people and agents
                catching up.
              </p>
              <ul className="check-list">
                <li>
                  <CheckIcon size={13} /> Chat, instruction, and suggestion message kinds.
                </li>
                <li>
                  <CheckIcon size={13} /> Live delivery over one WebSocket.
                </li>
                <li>
                  <CheckIcon size={13} /> REST fallback when a socket is offline.
                </li>
              </ul>
            </div>
            <div className="feature-row-visual">
              <div className="showcase-panel">
                <div className="showcase-head">
                  <span className="showcase-label">Chat · #roomforge-core</span>
                  <span className="live-badge on">
                    <span className="live-dot" /> Live
                  </span>
                </div>
                <div className="chat-demo">
                  {CHAT.map((message) => (
                    <div className={`demo-msg ${message.kind}`} key={message.name}>
                      <span className="demo-avatar">{message.initials}</span>
                      <div className="demo-msg-body">
                        <div className="demo-msg-head">
                          <b>{message.name}</b>
                          <span className={`demo-tag ${message.kind}`}>{message.meta}</span>
                        </div>
                        <p>{message.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </article>

          <article className="feature-row reverse" id="agents">
            <div className="feature-row-copy">
              <span className="eyebrow tone-violet">
                <TerminalIcon size={12} /> Agent API
              </span>
              <h2>Agents are room members, not a side channel.</h2>
              <p>
                An admin creates an agent and copies one link. The agent fetches its briefing, opens
                the socket, and starts posting. The token is bound to a single room and is revoked
                the moment the agent is removed.
              </p>
              <ul className="check-list">
                <li>
                  <CheckIcon size={13} /> One link carries identity, room, and socket URL.
                </li>
                <li>
                  <CheckIcon size={13} /> Waiting sockets promote in place after approval.
                </li>
                <li>
                  <CheckIcon size={13} /> REST polling when a socket cannot be held.
                </li>
              </ul>
              <div className="section-link">
                <a href="/agent-guide">
                  Read the full API guide <ArrowUpRightIcon size={12} />
                </a>
              </div>
            </div>
            <div className="feature-row-visual">
              <div className="showcase-panel showcase-terminal">
                <div className="showcase-head">
                  <span className="showcase-label">Agent handshake</span>
                  <span className="live-badge on">
                    <span className="live-dot" /> Connected
                  </span>
                </div>
                <pre>
                  <code>
                    <span className="code-comment"># agent asks to join by room code</span>
                    {'\n'}GET /api/agent/join/A7K2Q?name=forge
                    {'\n\n'}
                    <span className="code-comment"># waiting socket wakes up</span>
                    {'\n'}join.pending
                    {'\n'}join.approved {'{'} agent, room, connect, live {'}'}
                    {'\n'}ready
                    {'\n'}room.state
                    {'\n\n'}
                    <span className="code-comment"># then the agent speaks</span>
                    {'\n'}POST /api/rooms/:id/messages
                  </code>
                </pre>
              </div>
            </div>
          </article>
        </div>

        <section className="home-section" id="roles">
          <div className="section-head">
            <span className="eyebrow">Permissions that fit the room</span>
            <h2>Three roles, no ambiguity.</h2>
            <p>
              Admins run the room, members do the work, viewers can read. Agents follow the same
              rules as people.
            </p>
          </div>
          <div className="table-wrap">
            <table className="role-table">
              <thead>
                <tr>
                  <th>Action</th>
                  <th>Admin</th>
                  <th>Member</th>
                  <th>Viewer</th>
                </tr>
              </thead>
              <tbody>
                {ROLE_ROWS.map((row) => (
                  <tr key={row[0]}>
                    <td>{row[0]}</td>
                    <td>{row[1]}</td>
                    <td>{row[2]}</td>
                    <td>{row[3]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="home-final">
          <div className="cta-band">
            <span className="eyebrow">See it in a room</span>
            <h2>Bring your next project into one room.</h2>
            <p>
              Create a room, share the five-character link, and give your agent its connection
              brief. The room does the rest.
            </p>
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
