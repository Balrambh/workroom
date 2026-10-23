import { useEffect, useState } from 'react';
import type { RoomActions, RoomState } from '../lib/types';
import { ChatPanel } from './ChatPanel';
import { RightPanel } from './RightPanel';
import { ActivityIcon, BranchIcon, CopyIcon, HashIcon, MenuIcon, XIcon } from './Icons';

interface RoomViewProps {
  state: RoomState;
  actions: RoomActions;
  connected: boolean;
  navOpen: boolean;
  onOpenNav: () => void;
}

export function RoomView({ state, actions, connected, navOpen, onOpenNav }: RoomViewProps) {
  const isCode = state.room.mode === 'code';
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    setDetailsOpen(false);
  }, [state.room.id]);

  useEffect(() => {
    if (!detailsOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDetailsOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [detailsOpen]);

  return (
    <div className="room">
      <header className="room-head">
        <button
          type="button"
          className="icon-btn room-nav-btn"
          aria-label="Open rooms menu"
          aria-expanded={navOpen}
          aria-controls="app-sidebar"
          onClick={onOpenNav}
        >
          <MenuIcon size={18} />
        </button>
        <div className="room-head-main">
          <div className="room-title-line">
            <span className={`mode-badge mode-${state.room.mode}`}>
              {isCode ? <BranchIcon size={12} /> : <HashIcon size={12} />}
              {isCode ? 'Code room' : 'Chat room'}
            </span>
            <h1>{state.room.name}</h1>
          </div>
          <p className="room-topic">{state.room.topic || 'No topic set for this room.'}</p>
        </div>
        <div className="room-head-actions">
          {state.room.code ? (
            <button
              type="button"
              className="btn btn-ghost btn-small invite-btn"
              onClick={() =>
                actions.copy(`${window.location.origin}/room/${state.room.code}`, 'Room link')
              }
              title="Copy room link"
            >
              <CopyIcon size={13} />
              <span className="invite-code-small">{state.room.code}</span>
            </button>
          ) : null}
          <button
            type="button"
            className="btn btn-ghost btn-small room-info-btn"
            aria-label="Open room details"
            aria-expanded={detailsOpen}
            aria-controls="room-details-panel"
            onClick={() => setDetailsOpen(true)}
          >
            <ActivityIcon size={14} />
            <span>Room info</span>
          </button>
          <span className={`live-badge ${connected ? 'on' : 'off'}`}>
            <span className="live-dot" />
            {connected ? 'Live' : 'Reconnecting'}
          </span>
        </div>
      </header>

      {detailsOpen ? (
        <button
          type="button"
          className="drawer-backdrop"
          aria-label="Close room details"
          onClick={() => setDetailsOpen(false)}
        />
      ) : null}

      <div className="room-body">
        <ChatPanel state={state} actions={actions} />
        <div
          className={`room-aside ${detailsOpen ? 'open' : ''}`}
          id="room-details-panel"
        >
          <div className="room-aside-head">
            <span>Room details</span>
            <button
              type="button"
              className="icon-btn"
              aria-label="Close room details"
              onClick={() => setDetailsOpen(false)}
            >
              <XIcon size={16} />
            </button>
          </div>
          <RightPanel state={state} actions={actions} />
        </div>
      </div>
    </div>
  );
}
