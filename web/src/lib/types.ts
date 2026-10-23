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
export type DeliveryMode = 'socket' | 'trigger';

export interface Mention {
  type: PrincipalType;
  id: string;
}
export type JoinRequestStatus = 'pending' | 'approved' | 'denied';
export type JoinStatus = 'member' | 'pending' | 'denied' | 'none';

export interface SessionUser {
  id: string;
  name: string;
  email: string;
}

export interface Session {
  token: string;
  user: SessionUser;
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

export interface RoomState {
  room: Room;
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

export interface PublicRoom {
  code: string;
  name: string;
  topic: string;
  mode: RoomMode;
  createdAt?: string;
  memberCount: number;
  id?: string;
}

export interface PublicMember {
  name: string;
  type: PrincipalType;
  role: Role;
  description: string | null;
}

export interface RoomPreview {
  room: PublicRoom;
  members: PublicMember[];
  approvalRequired: boolean;
  join: { page: string; human: string; agent: string };
}

export interface JoinState {
  room: PublicRoom;
  status: JoinStatus;
  membership: { role: Role } | null;
  request: { createdAt: string } | null;
  canRequest: boolean;
  already?: boolean;
  message?: string;
}

export interface TaskInput {
  title: string;
  description: string;
  paths: string;
  branch: string;
  repoId: string | null;
  assigneeType: PrincipalType | null;
  assigneeId: string | null;
}

export interface TaskPatch {
  title?: string;
  description?: string;
  paths?: string;
  branch?: string;
  repoId?: string | null;
  status?: TaskStatus;
  assigneeType?: PrincipalType | null;
  assigneeId?: string | null;
}

export interface CreateAgentResult {
  agent: Member & { deliveryMode?: DeliveryMode; triggerUrl?: string | null };
  token: string;
  triggerSecret?: string;
}

export interface TriggerTestResult {
  ok: boolean;
  status: number;
  ms: number;
  error?: string;
}

export interface RoomActions {
  sendMessage(content: string, kind: MessageKind): void;
  setPresence(input: {
    status?: PresenceStatus;
    activity?: string;
    taskId?: string | null;
  }): void;
  createTask(input: TaskInput): Promise<void>;
  updateTask(taskId: string, patch: TaskPatch): Promise<void>;
  addRepo(input: { name: string; url: string; branch: string }): Promise<void>;
  deleteRepo(repoId: string): Promise<void>;
  createAgent(input: {
    name: string;
    description: string;
    role: Role;
    deliveryMode: DeliveryMode;
    triggerUrl?: string;
  }): Promise<CreateAgentResult>;
  testTrigger(agentId: string): Promise<TriggerTestResult>;
  rotateTriggerSecret(agentId: string): Promise<{ triggerSecret: string }>;
  setRole(member: Member, role: Role): Promise<void>;
  removeMember(member: Member): Promise<void>;
  approveJoinRequest(requestId: string): Promise<void>;
  denyJoinRequest(requestId: string): Promise<void>;
  copy(text: string, label: string): void;
}
