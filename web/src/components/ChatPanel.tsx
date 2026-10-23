import { useEffect, useRef, useState } from 'react';
import type { RoomActions, RoomState } from '../lib/types';
import { clockTime, initial } from '../lib/format';
import { BotIcon, ChatIcon, LightbulbIcon, SendIcon, TerminalIcon } from './Icons';

interface ChatPanelProps {
  state: RoomState;
  actions: RoomActions;
}

const KIND_OPTIONS = [
  {
    value: 'chat',
    label: 'Chat',
    icon: ChatIcon,
    placeholder: 'Message the room…',
  },
  {
    value: 'instruction',
    label: 'Instruction',
    icon: TerminalIcon,
    placeholder: 'Give the room a clear instruction…',
  },
  {
    value: 'suggestion',
    label: 'Suggestion',
    icon: LightbulbIcon,
    placeholder: 'Share a suggestion for the team…',
  },
] as const;

const drafts = new Map<string, string>();

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
  const [text, setText] = useState(() => drafts.get(state.room.id) ?? '');
  const [kind, setKind] = useState<(typeof KIND_OPTIONS)[number]['value']>('chat');
  const listRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const stickToBottom = useRef(true);
  const readOnly = state.me.role === 'viewer';
  const activeOption = KIND_OPTIONS.find((option) => option.value === kind) ?? KIND_OPTIONS[0];

  useEffect(() => {
    stickToBottom.current = true;
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [state.room.id]);

  useEffect(() => {
    if (!stickToBottom.current) return;
    const list = listRef.current;
    if (list) list.scrollTo({ top: list.scrollHeight, behavior: 'smooth' });
  }, [state.messages.length]);

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    input.style.height = 'auto';
    input.style.height = `${Math.min(Math.max(input.scrollHeight, 26), 160)}px`;
    if (stickToBottom.current) {
      const list = listRef.current;
      if (list) list.scrollTop = list.scrollHeight;
    }
  }, [text]);

  function updateText(next: string) {
    setText(next);
    drafts.set(state.room.id, next);
  }

  function send() {
    const content = text.trim();
    if (!content || readOnly) return;
    actions.sendMessage(content, kind);
    drafts.delete(state.room.id);
    setText('');
    inputRef.current?.focus();
  }

  function handleScroll() {
    const el = listRef.current;
    if (!el) return;
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 64;
  }

  return (
    <section className="chat">
      <div className="chat-head">
        <span className="chat-head-title">
          <ChatIcon size={14} />
          Chat
        </span>
        <span className="chat-head-meta">
          {state.messages.length === 0 ? 'No messages yet' : `${state.messages.length} messages`}
        </span>
      </div>

      <div className="messages" ref={listRef} onScroll={handleScroll}>
        {state.messages.length === 0 ? (
          <div className="chat-empty">
            <span className="chat-empty-icon">
              <ChatIcon size={18} />
            </span>
            <h3>Start the conversation</h3>
            <p>Say hello, drop an instruction, or share a suggestion. Everyone here sees it live.</p>
          </div>
        ) : (
          <div className="messages-spacer" aria-hidden="true" />
        )}

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
      </div>

      <div className="composer">
        {readOnly ? (
          <div className="readonly-banner">You are a viewer in this room. Chat, tasks, and presence updates are read-only.</div>
        ) : (
          <div className="composer-box">
            <textarea
              ref={inputRef}
              className="composer-input"
              placeholder={activeOption.placeholder}
              aria-label="Message the room"
              rows={1}
              maxLength={4000}
              enterKeyHint="send"
              value={text}
              onChange={(event) => updateText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  send();
                }
              }}
            />
            <div className="composer-bar">
              <div className="kind-picker" role="group" aria-label="Message type">
                {KIND_OPTIONS.map((option) => {
                  const OptionIcon = option.icon;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      className={`kind-btn kind-${option.value} ${kind === option.value ? 'active' : ''}`}
                      aria-pressed={kind === option.value}
                      onClick={() => setKind(option.value)}
                    >
                      <OptionIcon size={12} />
                      {option.label}
                    </button>
                  );
                })}
              </div>
              <div className="composer-actions">
                <button
                  type="button"
                  className="btn btn-primary composer-send"
                  aria-label="Send message"
                  disabled={!text.trim()}
                  onClick={send}
                >
                  <SendIcon size={15} />
                  <span className="send-label">Send</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
