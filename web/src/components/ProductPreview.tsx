import { BotIcon } from './Icons';

const MESSAGES = [
  {
    initials: 'MC',
    name: 'Maya Chen',
    meta: 'working · auth',
    text: 'Picked up the token refresh task. Keeping the old endpoint until the SDK ships.',
    tag: null,
  },
  {
    initials: 'FG',
    name: 'Forge',
    meta: 'agent · reviewing',
    text: 'Holding the merge until the auth migration lands on main.',
    tag: 'instruction',
  },
  {
    initials: 'JR',
    name: 'Jonas Reed',
    meta: 'reviewing · #18',
    text: 'Suggested splitting the repo scope so nobody edits the same paths.',
    tag: 'suggestion',
  },
];

const TASKS = [
  { status: 'doing', title: 'Refresh token flow', meta: 'auth.ts · maya' },
  { status: 'review', title: 'Join socket promotion', meta: 'hub.ts · forge' },
  { status: 'todo', title: 'Public rooms directory', meta: 'web/room' },
];

export function ProductPreview() {
  return (
    <div className="product-preview" aria-hidden="true">
      <div className="pv-chrome">
        <span className="pv-dot" />
        <span className="pv-dot" />
        <span className="pv-dot" />
        <span className="pv-url">roomforge.local/room/A7K2Q</span>
      </div>

      <div className="pv-body">
        <aside className="pv-side">
          <div className="pv-brand">
            <span>◆</span> RoomForge
          </div>
          <div className="pv-label">Rooms</div>
          <div className="pv-room active">
            <span>
              <span className="pv-hash">#</span> RoomForge Core
            </span>
            <span className="pv-live-dot" />
          </div>
          <div className="pv-room">
            <span>
              <span className="pv-hash">#</span> Payments squad
            </span>
          </div>
          <div className="pv-room">
            <span>
              <span className="pv-hash">#</span> Design review
            </span>
          </div>
          <div className="pv-label">People</div>
          <div className="pv-person">
            <span className="pv-mini-avatar">MC</span> Maya
          </div>
          <div className="pv-person">
            <span className="pv-mini-avatar agent">
              <BotIcon size={9} />
            </span>
            Forge
          </div>
          <div className="pv-person">
            <span className="pv-mini-avatar">JR</span> Jonas
          </div>
        </aside>

        <div className="pv-main">
          <div className="pv-head">
            <div className="pv-head-title">
              <strong>RoomForge Core</strong>
              <span>Ship the room rewrite</span>
            </div>
            <span className="pv-code">A7K2Q</span>
          </div>

          <div className="pv-messages">
            {MESSAGES.map((message) => (
              <div className="pv-msg" key={message.name}>
                <span className={`pv-avatar ${message.tag === 'instruction' ? 'agent' : ''}`}>
                  {message.tag === 'instruction' ? <BotIcon size={10} /> : message.initials}
                </span>
                <div className="pv-msg-body">
                  <div className="pv-msg-head">
                    <b>{message.name}</b>
                    <span>{message.meta}</span>
                    {message.tag ? <span className={`pv-tag ${message.tag}`}>{message.tag}</span> : null}
                  </div>
                  <p>{message.text}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="pv-composer">
            <span>Message the room…</span>
            <span className="pv-send">Send</span>
          </div>
        </div>

        <aside className="pv-right">
          <div className="pv-label">Tasks</div>
          {TASKS.map((task) => (
            <div className="pv-task" key={task.title}>
              <div className="pv-task-top">
                <span className={`pv-status-dot ${task.status}`} />
                <strong>{task.title}</strong>
              </div>
              <span className="pv-task-meta">{task.meta}</span>
            </div>
          ))}
          <div className="pv-label">Live now</div>
          <div className="pv-presence">
            <span>Maya</span>
            <span>#17</span>
          </div>
          <div className="pv-presence">
            <span>Forge</span>
            <span>#18</span>
          </div>
        </aside>
      </div>
    </div>
  );
}
