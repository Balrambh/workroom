import type { MissionPhase, PresenceStatus, TaskStatus } from './types';

export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return 'never';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 'unknown';
  const seconds = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (seconds < 10) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function clockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function initial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || '?';
}

export function principalKey(type: string, id: string): string {
  return `${type}:${id}`;
}

export const presenceMeta: Record<PresenceStatus, { label: string; tone: string }> = {
  working: { label: 'Working', tone: 'green' },
  reviewing: { label: 'Reviewing', tone: 'violet' },
  online: { label: 'Online', tone: 'teal' },
  away: { label: 'Away', tone: 'amber' },
  offline: { label: 'Offline', tone: 'gray' },
  idle: { label: 'Idle · wakeable', tone: 'teal' },
  waking: { label: 'Waking', tone: 'amber' },
  unreachable: { label: 'Unreachable', tone: 'red' },
};

export const missionPhaseMeta: Record<MissionPhase, { label: string; hint: string }> = {
  frame: { label: 'Framing', hint: 'Define the problem, unknowns, and success criteria' },
  explore: { label: 'Exploring', hint: 'Gather evidence and compare options' },
  decide: { label: 'Deciding', hint: 'Commit to a path using the room decision rule' },
  build: { label: 'Building', hint: 'Execute the agreed work' },
  review: { label: 'Reviewing', hint: 'Check the outcome against success criteria' },
  shipped: { label: 'Shipped', hint: 'Done and captured for reuse' },
};

export const taskMeta: Record<TaskStatus, { label: string; tone: string; order: number }> = {
  doing: { label: 'In progress', tone: 'green', order: 0 },
  review: { label: 'Review', tone: 'violet', order: 1 },
  todo: { label: 'To do', tone: 'gray', order: 2 },
  done: { label: 'Done', tone: 'teal', order: 3 },
};

export const roleMeta: Record<string, { label: string; tone: string }> = {
  admin: { label: 'Admin', tone: 'amber' },
  member: { label: 'Member', tone: 'teal' },
  viewer: { label: 'Viewer', tone: 'gray' },
};

export function parsePaths(paths: string): string[] {
  return paths
    .split(',')
    .map((path) => path.trim())
    .filter(Boolean);
}
