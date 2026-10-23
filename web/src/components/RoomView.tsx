import { useEffect, useRef, useState } from 'react';
import type { RoomActions, RoomState } from '../lib/types';
import { ChatPanel } from './ChatPanel';
import { RightPanel } from './RightPanel';
import type { PanelTab } from './RightPanel';
import { ActivityIcon, BranchIcon, CopyIcon, HashIcon, MenuIcon, UsersIcon, XIcon } from './Icons';

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
  const [panelTab, setPanelTab] = useState<PanelTab>('live');
  const pendingRequests = state.me.role === 'admin' ? state.joinRequests ?? [] : [];
  const pendingCount = pendingRequests.length;
  const [alertDismissed, setAlertDismissed] = useState(false);
  const previousPending = useRef(pendingCount);
  const requestNames = pendingRequests.slice(0, 2).map((request) => request.name).join(', ');
  const extraRequests = pendingCount > 2 ? ` +${pendingCount - 2}` : '';

  useEffect(() => {
    setDetailsOpen(false);
  }, [state.room.id]);

  useEffect(() => {
    if (pendingCount > previousPending.current) setAlertDismissed(false);
    previousPending.current = pendingCount;
  }, [pendingCount]);

  useEffect(() => {
    if (!detailsOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDetailsOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [detailsOpen]);

  function reviewRequests() {
    setPanelTab('people');
    setDetailsOpen(true);
  }

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
            aria-label={
              pendingCount > 0
                ? `Open room details, ${pendingCount} join request${pendingCount === 1 ? '' : 's'} waiting`
                : 'Open room details'
            }
            aria-expanded={detailsOpen}
            aria-controls="room-details-panel"
            onClick={() => setDetailsOpen(true)}
          >
            <ActivityIcon size={14} />
            <span>Room info</span>
            {pendingCount > 0 ? <span className="info-alert-dot" aria-hidden="true" /> : null}
          </button>
          <span className={`live-badge ${connected ? 'on' : 'off'}`}>
            <span className="live-dot" />
            {connected ? 'Live' : 'Reconnecting'}
          </span>
        </div>
      </header>

      {pendingCount > 0 && !alertDismissed ? (
        <div className="join-alert" role="status" aria-live="polite">
          <span className="join-alert-icon">
            <UsersIcon size={15} />
          </span>
          <div className="join-alert-text">
            <strong>
              {pendingCount === 1 ? '1 join request waiting' : `${pendingCount} join requests waiting`}
            </strong>
            <span>
              {requestNames}
              {extraRequests} · approve or decline in People
            </span>
          </div>
          <button type="button" className="btn btn-alert btn-tiny" onClick={reviewRequests}>
            Review
          </button>
          <button
            type="button"
            className="icon-btn"
            aria-label="Dismiss join request alert"
            onClick={() => setAlertDismissed(true)}
          >
            <XIcon size={14} />
          </button>
        </div>
      ) : null}

      {detailsOpen ? (
        <button
          type="button"
          className="drawer-backdrop"
          aria-label="Close room details"
          onClick={() => setDetailsOpen(false)}
        />
      ) : null}

      <div className="room-body">
        <ChatPanel state={state} actions={actions} key={state.room.id} />
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
          <RightPanel
            state={state}
            actions={actions}
            tab={panelTab}
            onTabChange={setPanelTab}
          />
        </div>
      </div>
    </div>
  );
}
