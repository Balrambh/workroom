import type { RoomSummary, SessionUser } from '../lib/types';
import { initial } from '../lib/format';
import {
  ArrowUpRightIcon,
  BranchIcon,
  ChatIcon,
  HashIcon,
  PencilIcon,
  PlusIcon,
  TerminalIcon,
  XIcon,
} from './Icons';

interface SidebarProps {
  rooms: RoomSummary[];
  activeId: string | null;
  user: SessionUser;
  connected: boolean;
  open: boolean;
  onClose: () => void;
  onOpenProfile: () => void;
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
  onOpenProfile,
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
          rooms.map((room) => {
            const unread = room.unreadCount ?? 0;
            const waiting = room.role === 'admin' ? room.pendingRequests ?? 0 : 0;
            return (
              <button
                key={room.id}
                type="button"
                className={`room-item ${activeId === room.id ? 'active' : ''} ${unread > 0 ? 'has-unread' : ''}`}
                aria-current={activeId === room.id ? 'page' : undefined}
                aria-label={`${room.name}${unread > 0 ? `, ${unread} unread` : ''}${waiting > 0 ? `, ${waiting} join request${waiting === 1 ? '' : 's'} waiting` : ''}`}
                onClick={() => onSelect(room.id)}
              >
                <span className={`room-icon room-icon-${room.mode}`}>
                  {room.mode === 'code' ? <BranchIcon size={15} /> : <HashIcon size={15} />}
                </span>
                <span className="room-item-main">
                  <span className="room-item-top">
                    <span className="room-item-name">{room.name}</span>
                    {waiting > 0 ? (
                      <span
                        className="room-pending-dot"
                        title={`${waiting} join request${waiting === 1 ? '' : 's'} waiting`}
                      />
                    ) : null}
                  </span>
                  <span className="room-item-meta">
                    <ChatIcon size={11} /> {room.memberCount} · {room.role}
                  </span>
                </span>
                {unread > 0 ? (
                  <span className="room-unread" aria-hidden="true">
                    {unread > 99 ? '99+' : unread}
                  </span>
                ) : null}
              </button>
            );
          })
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
          <button
            type="button"
            className="user-chip"
            onClick={onOpenProfile}
            title="Open your profile"
          >
            <span className="avatar">{initial(user.name)}</span>
            <span className="user-main">
              <span className="user-name">{user.name}</span>
              <span className="user-email">{user.handle ? `@${user.handle}` : user.email}</span>
            </span>
            <span className="user-chip-edit" aria-hidden="true">
              <PencilIcon size={12} />
            </span>
          </button>
          <button type="button" className="btn btn-quiet btn-small" onClick={onLogout}>
            Sign out
          </button>
        </div>
      </div>
    </aside>
  );
}
