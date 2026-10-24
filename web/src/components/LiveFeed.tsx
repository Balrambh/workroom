import { useEffect, useState } from 'react';
import type { Activity, PrincipalType, RoomActions, RoomState } from '../lib/types';
import { presenceMeta, timeAgo } from '../lib/format';
import { Avatar } from './Avatar';
import { ActivityIcon, BranchIcon, ChatIcon, CheckIcon, UsersIcon } from './Icons';

interface LiveFeedProps {
  state: RoomState;
  actions: RoomActions;
  onOpenProfile: (type: PrincipalType, id: string) => void;
}

const STATUS_CHOICES = ['working', 'reviewing', 'online', 'away'] as const;

function activityIcon(activity: Activity) {
  if (activity.type.startsWith('task.')) return <CheckIcon size={13} />;
  if (activity.type === 'instruction' || activity.type === 'suggestion') return <ChatIcon size={13} />;
  if (activity.type.startsWith('repo.')) return <BranchIcon size={13} />;
  if (activity.type.startsWith('member.') || activity.type.startsWith('agent.')) return <UsersIcon size={13} />;
  return <ActivityIcon size={13} />;
}

export function LiveFeed({ state, actions, onOpenProfile }: LiveFeedProps) {
  const myPresence = state.presence.find((entry) => entry.type === state.me.type && entry.id === state.me.id);
  const [status, setStatus] = useState<(typeof STATUS_CHOICES)[number]>(
    myPresence && myPresence.status !== 'offline'
      ? (myPresence.status as (typeof STATUS_CHOICES)[number])
      : 'online',
  );
  const [activity, setActivity] = useState(myPresence?.activity ?? '');
  const [taskId, setTaskId] = useState(myPresence?.taskId ?? '');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!myPresence) {
      setStatus('online');
      setActivity('');
      setTaskId('');
      return;
    }
    if (myPresence.status !== 'offline') {
      setStatus(myPresence.status as (typeof STATUS_CHOICES)[number]);
    }
    setActivity(myPresence.activity);
    setTaskId(myPresence.taskId ?? '');
  }, [myPresence?.status, myPresence?.activity, myPresence?.taskId]);

  const myOpenTasks = state.tasks.filter(
    (task) =>
      task.assigneeType === state.me.type &&
      task.assigneeId === state.me.id &&
      task.status !== 'done',
  );

  function save() {
    actions.setPresence({ status, activity: activity.trim(), taskId: taskId || null });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  }

  return (
    <div className="panel-scroll">
      {state.me.role !== 'viewer' ? (
        <section className="status-editor">
          <div className="panel-heading">
            <span>Your status</span>
            {saved ? <span className="saved-flag">Updated</span> : null}
          </div>
          <div className="status-editor-row">
            <select
              className="select"
              value={status}
              onChange={(event) => setStatus(event.target.value as (typeof STATUS_CHOICES)[number])}
            >
              {STATUS_CHOICES.map((choice) => (
                <option key={choice} value={choice}>
                  {presenceMeta[choice].label}
                </option>
              ))}
            </select>
            <input
              className="input"
              value={activity}
              maxLength={160}
              placeholder="What are you doing?"
              onChange={(event) => setActivity(event.target.value)}
            />
          </div>
          <div className="status-editor-row">
            <select className="select" value={taskId} onChange={(event) => setTaskId(event.target.value)}>
              <option value="">No linked task</option>
              {myOpenTasks.map((task) => (
                <option key={task.id} value={task.id}>
                  {task.title}
                </option>
              ))}
            </select>
            <button type="button" className="btn btn-ghost btn-small" onClick={save}>
              Broadcast
            </button>
          </div>
        </section>
      ) : null}

      <section className="panel-section">
        <div className="panel-heading">
          <span>Room activity</span>
          <span className="section-count">{state.activity.length} events</span>
        </div>
        <div className="activity-list">
          {state.activity.length === 0 ? (
            <p className="panel-empty">Nothing has happened yet. Tasks, roles, and repo changes show up here.</p>
          ) : (
            state.activity.map((event) => {
              const actor = state.members.find(
                (member) => member.type === event.actorType && member.id === event.actorId,
              );
              return (
                <div className="activity-row" key={event.id}>
                  <span className={`activity-icon kind-${event.type.split('.')[0]}`}>
                    {activityIcon(event)}
                  </span>
                  <div className="activity-main">
                    <p>{event.summary}</p>
                    <span className="activity-time">{timeAgo(event.createdAt)}</span>
                  </div>
                  {actor ? (
                    <button
                      type="button"
                      className="activity-actor"
                      title={`Open ${actor.name}'s profile`}
                      aria-label={`Open ${actor.name}'s profile`}
                      onClick={() => onOpenProfile(actor.type, actor.id)}
                    >
                      <Avatar
                        name={actor.name}
                        type={actor.type}
                        avatar={actor.avatar}
                        iconSize={11}
                      />
                    </button>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
