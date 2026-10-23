import type { RoomSummary, SessionUser } from '../lib/types';
import { initial } from '../lib/format';
import { ArrowUpRightIcon, BranchIcon, ChatIcon, HashIcon, PlusIcon, TerminalIcon, XIcon } from './Icons';

interface SidebarProps {
  rooms: RoomSummary[];
  activeId: string | null;
  user: SessionUser;
  connected: boolean;
  open: boolean;
  onClose: () => void;
  onSelect: (roomId: string) => void;
  onNewRoom: () => void;
  onJoinRoom: () => void;
  onLogout: () => void;
}

export function Sidebar({
  rooms,
  activeId,
  user,
  connected,
  open,
  onClose,
  onSelect,
  onNewRoom,
  onJoinRoom,
  onLogout,
}: SidebarProps) {
  return (
    <aside className={`sidebar ${open ? 'open' : ''}`} id="app-sidebar">
      <div className="brand">
        <span className="brand-glyph">◆</span>
        <div>
          <div className="brand-name">RoomForge</div>
          <div className="brand-sub">humans + agents</div>
        </div>
        <button
          type="button"
          className="icon-btn sidebar-close"
          aria-label="Close rooms menu"
          onClick={onClose}
        >
          <XIcon size={16} />
        </button>
      </div>

      <div className="sidebar-actions">
        <button type="button" className="btn btn-primary btn-small" onClick={onNewRoom}>
          <PlusIcon size={15} /> New room
        </button>
        <button type="button" className="btn btn-ghost btn-small" onClick={onJoinRoom}>
          Join
        </button>
      </div>

      <div className="sidebar-section">
        <span className="section-label">Rooms</span>
        <span className="section-count">{rooms.length}</span>
      </div>

      <nav className="room-list" aria-label="Your rooms">
        {rooms.length === 0 ? (
          <div className="sidebar-empty">
            No rooms yet.
            <span>Create one, or join with an invite code.</span>
          </div>
        ) : (
          rooms.map((room) => (
            <button
              key={room.id}
              type="button"
              className={`room-item ${activeId === room.id ? 'active' : ''}`}
              aria-current={activeId === room.id ? 'page' : undefined}
              onClick={() => onSelect(room.id)}
            >
              <span className={`room-icon room-icon-${room.mode}`}>
                {room.mode === 'code' ? <BranchIcon size={15} /> : <HashIcon size={15} />}
              </span>
              <span className="room-item-main">
                <span className="room-item-name">{room.name}</span>
                <span className="room-item-meta">
                  <ChatIcon size={11} /> {room.memberCount} · {room.role}
                </span>
              </span>
            </button>
          ))
        )}
      </nav>

      <a className="sidebar-guide" href="/room">
        <HashIcon size={14} />
        <span>Browse public rooms</span>
        <ArrowUpRightIcon size={12} />
      </a>

      <a className="sidebar-guide" href="/agent-guide" target="_blank" rel="noreferrer">
        <TerminalIcon size={14} />
        <span>Agent API guide</span>
        <ArrowUpRightIcon size={12} />
      </a>

      <div className="sidebar-foot">
        <div className={`conn ${connected ? 'on' : 'off'}`}>
          <span className="conn-dot" />
          {connected ? 'Realtime connected' : 'Reconnecting…'}
        </div>
        <div className="user-row">
          <span className="avatar">{initial(user.name)}</span>
          <span className="user-main">
            <span className="user-name">{user.name}</span>
            <span className="user-email">{user.email}</span>
          </span>
          <button type="button" className="btn btn-quiet btn-small" onClick={onLogout}>
            Sign out
          </button>
        </div>
      </div>
    </aside>
  );
}
