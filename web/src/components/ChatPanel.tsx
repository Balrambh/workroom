import { useEffect, useRef, useState } from 'react';
import type { RoomActions, RoomState } from '../lib/types';
import { clockTime, initial } from '../lib/format';
import { BotIcon, SendIcon } from './Icons';

interface ChatPanelProps {
  state: RoomState;
  actions: RoomActions;
}

const KIND_OPTIONS = [
  { value: 'chat', label: 'Chat' },
  { value: 'instruction', label: 'Instruction' },
  { value: 'suggestion', label: 'Suggestion' },
] as const;

function dayLabel(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function ChatPanel({ state, actions }: ChatPanelProps) {
  const [text, setText] = useState('');
  const [kind, setKind] = useState<(typeof KIND_OPTIONS)[number]['value']>('chat');
  const endRef = useRef<HTMLDivElement | null>(null);
  const readOnly = state.me.role === 'viewer';

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [state.messages.length]);

  function send() {
    const content = text.trim();
    if (!content || readOnly) return;
    actions.sendMessage(content, kind);
    setText('');
  }

  return (
    <section className="chat">
      <div className="chat-strip">
        <span className="section-label">Discussion</span>
        <span className="section-count">{state.messages.length} messages</span>
      </div>

      <div className="messages">
        {state.messages.length === 0 ? (
          <div className="chat-empty">
            <div className="empty-glyph">◆</div>
            <h3>Start the conversation</h3>
            <p>Drop an instruction, a suggestion, or just say hello. Agents in the room see it live.</p>
          </div>
        ) : null}

        {state.messages.map((message, index) => {
          const previous = state.messages[index - 1];
          const newDay = !previous || new Date(previous.createdAt).toDateString() !== new Date(message.createdAt).toDateString();
          const sameSender =
            previous &&
            previous.senderType === message.senderType &&
            previous.senderId === message.senderId &&
            new Date(message.createdAt).getTime() - new Date(previous.createdAt).getTime() < 5 * 60 * 1000;
          const isAgent = message.senderType === 'agent';

          return (
            <div key={message.id}>
              {newDay ? <div className="day-divider"><span>{dayLabel(message.createdAt)}</span></div> : null}
              <article className={`msg ${isAgent ? 'agent' : ''} kind-${message.kind} ${sameSender ? 'grouped' : ''}`}>
                <div className="msg-avatar-wrap">
                  {!sameSender ? (
                    <span className={`avatar ${isAgent ? 'avatar-agent' : ''}`}>
                      {isAgent ? <BotIcon size={15} /> : initial(message.senderName)}
                    </span>
                  ) : null}
                </div>
                <div className="msg-body">
                  {!sameSender ? (
                    <div className="msg-head">
                      <span className="msg-author">{message.senderName}</span>
                      {isAgent ? <span className="tag tag-agent">agent</span> : null}
                      {message.senderRole === 'admin' ? <span className="tag tag-amber">admin</span> : null}
                      {message.kind !== 'chat' ? (
                        <span className={`tag ${message.kind === 'instruction' ? 'tag-amber' : 'tag-violet'}`}>
                          {message.kind}
                        </span>
                      ) : null}
                      <span className="msg-time">{clockTime(message.createdAt)}</span>
                    </div>
                  ) : null}
                  <p className="msg-text">{message.content}</p>
                </div>
              </article>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <div className="composer">
        {readOnly ? (
          <div className="readonly-banner">You are a viewer in this room. Chat, tasks, and presence updates are read-only.</div>
        ) : (
          <>
            <div className="composer-top">
              <div className="kind-picker">
                {KIND_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`kind-btn ${kind === option.value ? 'active' : ''} ${option.value}`}
                    onClick={() => setKind(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <span className="composer-hint">Enter to send · Shift+Enter for a new line</span>
            </div>
            <div className="composer-row">
              <textarea
                className="textarea composer-input"
                placeholder={
                  kind === 'instruction'
                    ? 'Give the room a clear instruction…'
                    : kind === 'suggestion'
                      ? 'Share a suggestion for the team…'
                      : 'Message the room…'
                }
                rows={2}
                value={text}
                onChange={(event) => setText(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    send();
                  }
                }}
              />
              <button type="button" className="btn btn-primary send-btn" onClick={send} disabled={!text.trim()}>
                <SendIcon size={17} />
                Send
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
