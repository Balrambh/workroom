export type PrincipalType = 'user' | 'agent';
export type Role = 'admin' | 'member' | 'viewer';
export type RoomMode = 'chat' | 'code';
export type TaskStatus = 'todo' | 'doing' | 'review' | 'done';
export type MessageKind = 'chat' | 'instruction' | 'suggestion';
export type PresenceStatus =
  | 'online'
  | 'working'
  | 'reviewing'
  | 'away'
  | 'offline'
  | 'idle'
  | 'waking'
  | 'unreachable';
export type JoinRequestStatus = 'pending' | 'approved' | 'denied';
export type DeliveryMode = 'socket' | 'trigger';
export type TriggerEventStatus = 'pending' | 'delivered' | 'failed';
export type AgentWakeState = 'waking' | 'unreachable' | null;

export interface Mention {
  type: PrincipalType;
  id: string;
}

export interface Principal {
  type: PrincipalType;
  id: string;
  name: string;
  email?: string;
}

export interface Member {
  type: PrincipalType;
  id: string;
  name: string;
  role: Role;
  joinedAt: string;
  description: string | null;
}

export interface Room {
  id: string;
  name: string;
  topic: string;
  mode: RoomMode;
  createdAt: string;
  createdBy: string;
  code?: string;
}

export interface RoomSummary {
  id: string;
  name: string;
  topic: string;
  mode: RoomMode;
  role: Role;
  memberCount: number;
  code?: string;
  createdAt?: string;
}

export interface Repo {
  id: string;
  roomId: string;
  name: string;
  url: string;
  branch: string;
  addedBy: string;
  createdAt: string;
}

export interface Message {
  id: string;
  roomId: string;
  senderType: PrincipalType | 'system';
  senderId: string;
  senderName: string;
  senderRole: Role;
  kind: MessageKind;
  content: string;
  createdAt: string;
  seq: number;
  mentions: Mention[];
  clientMessageId: string | null;
}

export interface Task {
  id: string;
  roomId: string;
  repoId: string | null;
  repoName: string | null;
  title: string;
  description: string;
  paths: string;
  branch: string;
  status: TaskStatus;
  assigneeType: PrincipalType | null;
  assigneeId: string | null;
  assigneeName: string | null;
  createdByType: PrincipalType;
  createdById: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}

export interface Activity {
  id: string;
  roomId: string;
  type: string;
  summary: string;
  actorType: PrincipalType;
  actorId: string;
  actorName: string;
  data: Record<string, unknown> | null;
  createdAt: string;
}

export interface PresenceEntry {
  type: PrincipalType;
  id: string;
  name: string;
  role: Role;
  status: PresenceStatus;
  activity: string;
  taskId: string | null;
  lastSeen: string | null;
  deliveryMode?: DeliveryMode;
}

export interface JoinRequest {
  id: string;
  kind: PrincipalType;
  name: string;
  description: string;
  status: JoinRequestStatus;
  createdAt: string;
  decidedAt: string | null;
  deliveryMode?: DeliveryMode;
  triggerUrl?: string | null;
}

export interface VoiceParticipant {
  peerId: string;
  type: PrincipalType;
  id: string;
  name: string;
  role: Role;
  muted: boolean;
  deafened: boolean;
  joinedAt: string;
}

export interface AgentRuntime {
  id: string;
  roomId: string;
  name: string;
  deliveryMode: DeliveryMode;
  triggerUrl: string | null;
  hasSecret: boolean;
  wakeState: AgentWakeState;
  wakingSince: string | null;
  lastSocketAt: string | null;
}

export interface RoomState {
  room: Omit<Room, 'code'> & { code?: string };
  me: { type: PrincipalType; id: string; name: string; role: Role };
  members: Member[];
  repos: Repo[];
  tasks: Task[];
  activity: Activity[];
  messages: Message[];
  presence: PresenceEntry[];
  voice: VoiceParticipant[];
  joinRequests?: JoinRequest[];
}
