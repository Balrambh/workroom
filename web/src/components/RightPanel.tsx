import { useState } from 'react';
import type { ReactNode } from 'react';
import type { RoomActions, RoomState } from '../lib/types';
import { ActivityIcon, BranchIcon, CheckIcon, UsersIcon } from './Icons';
import { LiveFeed } from './LiveFeed';
import { TasksPanel } from './TasksPanel';
import { ReposPanel } from './ReposPanel';
import { PeoplePanel } from './PeoplePanel';

interface RightPanelProps {
  state: RoomState;
  actions: RoomActions;
}

type Tab = 'live' | 'tasks' | 'repos' | 'people';

export function RightPanel({ state, actions }: RightPanelProps) {
  const [tab, setTab] = useState<Tab>('live');
  const openTasks = state.tasks.filter((task) => task.status !== 'done').length;
  const isCode = state.room.mode === 'code';

  const tabs: { id: Tab; label: string; icon: ReactNode; count: number | null }[] = [
    { id: 'live', label: 'Live', icon: <ActivityIcon size={13} />, count: null },
    { id: 'tasks', label: 'Tasks', icon: <CheckIcon size={13} />, count: openTasks },
    ...(isCode ? [{ id: 'repos' as Tab, label: 'Repos', icon: <BranchIcon size={13} />, count: state.repos.length }] : []),
    { id: 'people', label: 'People', icon: <UsersIcon size={13} />, count: state.members.length },
  ];
  const activeTab = tabs.some((candidate) => candidate.id === tab) ? tab : 'live';

  return (
    <aside className="right-panel">
      <div className="tabs" role="tablist" aria-label="Room panels">
        {tabs.map((candidate) => (
          <button
            key={candidate.id}
            type="button"
            role="tab"
            aria-selected={activeTab === candidate.id}
            className={`tab ${activeTab === candidate.id ? 'active' : ''}`}
            onClick={() => setTab(candidate.id)}
          >
            <span className="tab-icon">{candidate.icon}</span>
            {candidate.label}
            {candidate.count !== null && candidate.count > 0 ? (
              <span className="tab-count">{candidate.count}</span>
            ) : null}
          </button>
        ))}
      </div>

      {activeTab === 'live' ? <LiveFeed state={state} actions={actions} /> : null}
      {activeTab === 'tasks' ? <TasksPanel state={state} actions={actions} /> : null}
      {activeTab === 'repos' ? <ReposPanel state={state} actions={actions} /> : null}
      {activeTab === 'people' ? <PeoplePanel state={state} actions={actions} /> : null}
    </aside>
  );
}
