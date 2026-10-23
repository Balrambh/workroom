import { useState } from 'react';
import type { FormEvent } from 'react';
import type { CreateAgentResult, JoinRequest, Member, Role, RoomActions, RoomState } from '../lib/types';
import { initial, roleMeta } from '../lib/format';
import { Modal } from './Modal';
import { ArrowUpRightIcon, BotIcon, CheckIcon, CopyIcon, PlusIcon, TrashIcon, XIcon } from './Icons';

interface PeoplePanelProps {
  state: RoomState;
  actions: RoomActions;
}

function requestedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'just now';
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function PeoplePanel({ state, actions }: PeoplePanelProps) {
  const isAdmin = state.me.role === 'admin';
  const [error, setError] = useState<string | null>(null);
  const [agentOpen, setAgentOpen] = useState(false);
  const [agentName, setAgentName] = useState('');
  const [agentDescription, setAgentDescription] = useState('');
  const [agentRole, setAgentRole] = useState<Role>('member');
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<CreateAgentResult | null>(null);
  const [deciding, setDeciding] = useState<string | null>(null);

  const pendingRequests = state.joinRequests ?? [];
  const roomUrl = state.room.code
    ? `${window.location.origin}/room/${state.room.code}`
    : '';
  const guideUrl = `${window.location.origin}/agent-guide`;
  const connectUrl = created
    ? `${window.location.origin}/api/agent/connect/${created.token}`
    : '';
  const agentPrompt = created
    ? `You are the RoomForge agent "${created.agent.name}". Read ${connectUrl} and follow the briefing — open its live WebSocket so messages arrive instantly, then post "I'm connected." to the room.`
    : '';

  function closeAgentModal() {
    setAgentOpen(false);
    setCreated(null);
    setAgentName('');
    setAgentDescription('');
    setAgentRole('member');
    setError(null);
  }

  async function changeRole(member: Member, role: Role) {
    setError(null);
    try {
      await actions.setRole(member, role);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not change the role');
    }
  }

  async function remove(member: Member) {
    if (!window.confirm(`Remove ${member.name} from the room?`)) return;
    setError(null);
    try {
      await actions.removeMember(member);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove the member');
    }
  }

  async function decide(request: JoinRequest, approve: boolean) {
    setError(null);
    setDeciding(request.id);
    try {
      if (approve) await actions.approveJoinRequest(request.id);
      else await actions.denyJoinRequest(request.id);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : `Could not ${approve ? 'approve' : 'decline'} the request`,
      );
    } finally {
      setDeciding(null);
    }
  }

  async function createAgent(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setCreating(true);
    try {
      const result = await actions.createAgent({
        name: agentName.trim(),
        description: agentDescription.trim(),
        role: agentRole,
      });
      setCreated(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the agent');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="panel-scroll">
      {state.room.code ? (
        <section className="invite-block">
          <div className="invite-main">
            <span className="section-label">Room link</span>
            <span className="invite-code">{state.room.code}</span>
          </div>
          <p className="invite-hint">
            Share this link. Anyone can preview the room; {isAdmin ? 'you approve' : 'an admin approves'} who joins.
          </p>
          <div className="invite-link-row">
            <code>{roomUrl}</code>
            <button
              type="button"
              className="btn btn-ghost btn-small"
              onClick={() => actions.copy(roomUrl, 'Room link')}
            >
              <CopyIcon size={13} /> Copy link
            </button>
          </div>
          <div className="room-id-row">
            <span>Room ID</span>
            <code>{state.room.id.slice(0, 8)}…</code>
            <button
              type="button"
              className="icon-btn"
              title="Copy full room ID (for agent scripts)"
              onClick={() => actions.copy(state.room.id, 'Room ID')}
            >
              <CopyIcon size={13} />
            </button>
          </div>
        </section>
      ) : null}

      {isAdmin && pendingRequests.length > 0 ? (
        <section className="requests-block">
          <div className="panel-heading">
            <span>Join requests</span>
            <span className="section-count">{pendingRequests.length}</span>
          </div>
          {pendingRequests.map((request) => (
            <div className="request-row" key={request.id}>
              <span className={`avatar ${request.kind === 'agent' ? 'avatar-agent' : ''}`}>
                {request.kind === 'agent' ? <BotIcon size={15} /> : initial(request.name)}
              </span>
              <div className="request-main">
                <div className="member-name">
                  {request.name}
                  <span className={`tag ${request.kind === 'agent' ? 'tag-violet' : 'tag-blue'}`}>
                    {request.kind === 'agent' ? 'agent' : 'human'}
                  </span>
                </div>
                <div className="member-sub">
                  {request.description ||
                    (request.kind === 'agent'
                      ? 'Wants a live agent connection'
                      : 'Wants to join this room')}
                </div>
                <div className="request-time">
                  {request.kind === 'agent'
                    ? 'Socket waiting · connects on approval'
                    : `Requested ${requestedAt(request.createdAt)}`}
                </div>
              </div>
              <div className="request-actions">
                <button
                  type="button"
                  className="btn btn-primary btn-tiny"
                  disabled={deciding === request.id}
                  onClick={() => decide(request, true)}
                >
                  <CheckIcon size={12} /> Approve
                </button>
                <button
                  type="button"
                  className="icon-btn danger"
                  title={`Decline ${request.name}`}
                  disabled={deciding === request.id}
                  onClick={() => decide(request, false)}
                >
                  <XIcon size={14} />
                </button>
              </div>
            </div>
          ))}
        </section>
      ) : null}

      <div className="panel-heading">
        <span>People &amp; agents</span>
        <div className="panel-heading-actions">
          <span className="section-count">{state.members.length}</span>
          {isAdmin ? (
            <button type="button" className="btn btn-quiet btn-tiny" onClick={() => setAgentOpen(true)}>
              <PlusIcon size={13} /> Add agent
            </button>
          ) : null}
        </div>
      </div>

      {error ? <p className="form-error">{error}</p> : null}

      <div className="member-list">
        {state.members.map((member) => {
          const isMe = member.type === state.me.type && member.id === state.me.id;
          return (
            <div className="member-row" key={`${member.type}-${member.id}`}>
              <span className={`avatar ${member.type === 'agent' ? 'avatar-agent' : ''}`}>
                {member.type === 'agent' ? <BotIcon size={15} /> : initial(member.name)}
              </span>
              <div className="member-main">
                <div className="member-name">
                  {member.name}
                  {isMe ? <span className="tag tag-gray">you</span> : null}
                  {member.type === 'agent' ? <span className="tag tag-violet">agent</span> : null}
                </div>
                <div className="member-sub">
                  {member.description ||
                    (member.type === 'agent' ? 'Connected over the agent API' : `Joined as ${member.role}`)}
                </div>
              </div>
              {isAdmin && !isMe ? (
                <div className="member-actions">
                  <select
                    className="mini-select"
                    value={member.role}
                    onChange={(event) => changeRole(member, event.target.value as Role)}
                    aria-label={`Role for ${member.name}`}
                  >
                    <option value="admin">Admin</option>
                    <option value="member">Member</option>
                    <option value="viewer">Viewer</option>
                  </select>
                  <button
                    type="button"
                    className="icon-btn danger"
                    title={`Remove ${member.name}`}
                    onClick={() => remove(member)}
                  >
                    <TrashIcon size={14} />
                  </button>
                </div>
              ) : (
                <span className={`tag tag-${roleMeta[member.role].tone}`}>{roleMeta[member.role].label}</span>
              )}
            </div>
          );
        })}
      </div>

      {!isAdmin ? (
        <p className="panel-empty">
          Admins assign roles, create agents, and manage repositories. Ask an admin if something needs to change.
        </p>
      ) : null}

      {agentOpen ? (
        <Modal
          title={created ? 'Send this to your agent' : 'Add an agent'}
          subtitle={
            created
              ? 'One line. The agent gets its room, key, and live WebSocket from the link.'
              : 'The agent gets its own room identity, role, and API token.'
          }
          onClose={closeAgentModal}
        >
          {created ? (
            <>
              <div className="agent-created">
                <div className="agent-created-head">
                  <span className="avatar avatar-agent"><BotIcon size={16} /></span>
                  <div>
                    <strong>{created.agent.name}</strong>
                    <span>joined as {created.agent.role}</span>
                  </div>
                </div>

                <div className="connect-prompt">
                  <p>{agentPrompt}</p>
                  <button
                    type="button"
                    className="btn btn-primary btn-block"
                    onClick={() => actions.copy(agentPrompt, 'Agent prompt')}
                  >
                    <CopyIcon size={14} /> Copy prompt
                  </button>
                </div>
                <p className="connect-note">
                  Paste it into your agent chat. The link carries the room, key, and live socket,
                  so treat it like a password — removing the agent revokes it instantly.
                </p>

                <div className="handoff-actions">
                  <a className="btn btn-ghost" href={guideUrl} target="_blank" rel="noreferrer">
                    Open guide <ArrowUpRightIcon size={12} />
                  </a>
                </div>

                <details className="agent-more">
                  <summary>Manual connection details</summary>
                  <div className="agent-run">
                    <span className="section-label">Connect link (returns everything)</span>
                    <div className="token-box">
                      <code>{connectUrl}</code>
                      <button
                        type="button"
                        className="btn btn-ghost btn-small"
                        onClick={() => actions.copy(connectUrl, 'Connect link')}
                      >
                        <CopyIcon size={14} /> Copy link
                      </button>
                    </div>
                  </div>
                  <div className="agent-run">
                    <span className="section-label">Connection key</span>
                    <div className="token-box">
                      <code>{created.token}</code>
                      <button
                        type="button"
                        className="btn btn-ghost btn-small"
                        onClick={() => actions.copy(created.token, 'Connection key')}
                      >
                        <CopyIcon size={14} /> Copy key
                      </button>
                    </div>
                  </div>
                  <p className="hint">
                    If your agent cannot open links, send{' '}
                    <code>Authorization: Bearer &lt;key&gt;</code> to{' '}
                    <code>GET {window.location.origin}/api/me</code> instead.
                  </p>
                </details>
              </div>
              <button type="button" className="btn btn-primary btn-block" onClick={closeAgentModal}>
                Done
              </button>
            </>
          ) : (
            <form className="stack" onSubmit={createAgent}>
              <label className="field">
                <span>Agent name</span>
                <input
                  className="input"
                  value={agentName}
                  onChange={(event) => setAgentName(event.target.value)}
                  placeholder="refactor-bot"
                  required
                />
              </label>
              <label className="field">
                <span>Description</span>
                <input
                  className="input"
                  value={agentDescription}
                  onChange={(event) => setAgentDescription(event.target.value)}
                  placeholder="Keeps the API layer tidy"
                />
              </label>
              <label className="field">
                <span>Role</span>
                <select
                  className="select"
                  value={agentRole}
                  onChange={(event) => setAgentRole(event.target.value as Role)}
                >
                  <option value="member">Member — can chat, claim tasks, update presence</option>
                  <option value="viewer">Viewer — read-only</option>
                  <option value="admin">Admin — full room control</option>
                </select>
              </label>
              {error ? <p className="form-error">{error}</p> : null}
              <button type="submit" className="btn btn-primary btn-block" disabled={creating || !agentName.trim()}>
                {creating ? 'Creating…' : 'Create agent'}
              </button>
            </form>
          )}
        </Modal>
      ) : null}
    </div>
  );
}
