import type {
  CreateAgentResult,
  DeliveryMode,
  JoinState,
  Member,
  Message,
  MessageKind,
  PresenceEntry,
  PresenceStatus,
  Repo,
  Role,
  PublicRoom,
  RoomMode,
  RoomPreview,
  RoomState,
  RoomSummary,
  Session,
  SessionUser,
  Task,
  TaskInput,
  TaskPatch,
  TriggerTestResult,
} from './types';

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

let authToken = '';

export function setAuthToken(token: string): void {
  authToken = token;
}

async function request<T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  const response = await fetch(`/api${path}`, {
    method: options.method ?? 'GET',
    headers: {
      ...(options.body !== undefined ? { 'content-type': 'application/json' } : {}),
      ...(authToken ? { authorization: `Bearer ${authToken}` } : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const data = (await response.json()) as { error?: string };
      if (data.error) message = data.error;
    } catch {
      // non-JSON error response
    }
    throw new ApiError(response.status, message);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export const api = {
  register(input: { name: string; email: string; password: string }): Promise<Session> {
    return request<Session>('/auth/register', { method: 'POST', body: input });
  },

  login(input: { email: string; password: string }): Promise<Session> {
    return request<Session>('/auth/login', { method: 'POST', body: input });
  },

  me(): Promise<{ principal: { type: string; id: string; name: string; email?: string } }> {
    return request('/me');
  },

  rooms(): Promise<{ rooms: RoomSummary[] }> {
    return request('/rooms');
  },

  publicRooms(): Promise<{ rooms: PublicRoom[] }> {
    return request('/rooms/public');
  },

  createRoom(input: { name: string; topic: string; mode: RoomMode }): Promise<{ room: RoomSummary }> {
    return request('/rooms', { method: 'POST', body: input });
  },

  previewRoom(code: string): Promise<RoomPreview> {
    return request(`/rooms/public/${encodeURIComponent(code)}`);
  },

  requestJoin(code: string): Promise<JoinState> {
    return request(`/join/${encodeURIComponent(code)}`);
  },

  joinStatus(code: string): Promise<JoinState> {
    return request(`/join/${encodeURIComponent(code)}/status`);
  },

  room(roomId: string): Promise<RoomState> {
    return request(`/rooms/${roomId}`);
  },

  messages(roomId: string, before?: string): Promise<{ messages: Message[] }> {
    const query = before ? `?before=${encodeURIComponent(before)}` : '';
    return request(`/rooms/${roomId}/messages${query}`);
  },

  sendMessage(roomId: string, content: string, kind: MessageKind): Promise<Message> {
    return request(`/rooms/${roomId}/messages`, { method: 'POST', body: { content, kind } });
  },

  setPresence(
    roomId: string,
    input: { status?: PresenceStatus; activity?: string; taskId?: string | null },
  ): Promise<{ presence: PresenceEntry[] }> {
    return request(`/rooms/${roomId}/presence`, { method: 'PATCH', body: input });
  },

  createAgent(
    roomId: string,
    input: { name: string; description: string; role: Role; deliveryMode: DeliveryMode; triggerUrl?: string },
  ): Promise<CreateAgentResult> {
    return request(`/rooms/${roomId}/agents`, { method: 'POST', body: input });
  },

  testTrigger(agentId: string): Promise<TriggerTestResult> {
    return request('/agent/me/test-trigger', { method: 'POST', body: { agentId } });
  },

  rotateTriggerSecret(agentId: string): Promise<{ triggerSecret: string }> {
    return request('/agent/me/rotate-trigger-secret', { method: 'POST', body: { agentId } });
  },

  setRole(roomId: string, member: Member, role: Role): Promise<{ members: Member[] }> {
    return request(`/rooms/${roomId}/members/${member.type}/${member.id}`, {
      method: 'PATCH',
      body: { role },
    });
  },

  removeMember(roomId: string, member: Member): Promise<{ ok: boolean }> {
    return request(`/rooms/${roomId}/members/${member.type}/${member.id}`, { method: 'DELETE' });
  },

  approveJoinRequest(roomId: string, requestId: string): Promise<{ ok: true }> {
    return request(`/rooms/${roomId}/join-requests/${requestId}/approve`, { method: 'POST' });
  },

  denyJoinRequest(roomId: string, requestId: string): Promise<{ ok: true }> {
    return request(`/rooms/${roomId}/join-requests/${requestId}/deny`, { method: 'POST' });
  },

  addRepo(
    roomId: string,
    input: { name: string; url: string; branch: string },
  ): Promise<Repo> {
    return request(`/rooms/${roomId}/repos`, { method: 'POST', body: input });
  },

  deleteRepo(roomId: string, repoId: string): Promise<{ ok: boolean }> {
    return request(`/rooms/${roomId}/repos/${repoId}`, { method: 'DELETE' });
  },

  createTask(roomId: string, input: TaskInput): Promise<Task> {
    return request(`/rooms/${roomId}/tasks`, { method: 'POST', body: input });
  },

  updateTask(roomId: string, taskId: string, patch: TaskPatch): Promise<Task> {
    return request(`/rooms/${roomId}/tasks/${taskId}`, { method: 'PATCH', body: patch });
  },
};

export type { SessionUser };
