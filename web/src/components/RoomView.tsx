import type { RoomActions, RoomState } from '../lib/types';
import { ChatPanel } from './ChatPanel';
import { RightPanel } from './RightPanel';
import { BranchIcon, CopyIcon, HashIcon } from './Icons';

interface RoomViewProps {
  state: RoomState;
  actions: RoomActions;
  connected: boolean;
}

export function RoomView({ state, actions, connected }: RoomViewProps) {
  const isCode = state.room.mode === 'code';

  return (
    <div className="room">
      <header className="room-head">
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
          <span className={`live-badge ${connected ? 'on' : 'off'}`}>
            <span className="live-dot" />
            {connected ? 'Live' : 'Reconnecting'}
          </span>
        </div>
      </header>

      <div className="room-body">
        <ChatPanel state={state} actions={actions} />
        <RightPanel state={state} actions={actions} />
      </div>
    </div>
  );
}
