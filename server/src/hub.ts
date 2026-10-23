import type { Server as HttpServer } from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';
import type { RawData } from 'ws';
import { resolveToken } from './auth.js';
import { WAKE_TIMEOUT_MS } from './wake-config.js';
import { HttpError } from './errors.js';
import * as store from './store.js';
import type {
  Member,
  Mention,
  Message,
  MessageKind,
  PresenceEntry,
  PresenceStatus,
  Principal,
  Role,
  RoomState,
} from './types.js';

interface Client {
  ws: WebSocket;
  principal: Principal;
  rooms: Set<string>;
  alive: boolean;
}

interface PendingClient {
  ws: WebSocket;
  requestId: string;
  roomId: string;
  alive: boolean;
}

interface LivePresence {
  status: PresenceStatus;
  activity: string;
  taskId: string | null;
  lastSeen: string;
}

const clients = new Map<WebSocket, Client>();
const pendingClients = new Map<WebSocket, PendingClient>();
const presence = new Map<string, Map<string, LivePresence>>();
const agentSockets = new Map<string, WebSocket>();
const agentMessageTimes = new Map<string, number[]>();
const pausedRooms = new Set<string>();

const PRESENCE_STATUSES = new Set<PresenceStatus>(['online', 'working', 'reviewing', 'away', 'offline']);
const MESSAGE_KINDS = new Set<MessageKind>(['chat', 'instruction', 'suggestion']);
const STATUS_LABEL: Record<string, string> = {
  todo: 'To do',
  doing: 'In progress',
  review: 'Review',
  done: 'Done',
};

const principalKey = (type: string, id: string) => `${type}:${id}`;
const nowIso = () => new Date().toISOString();

function send(ws: WebSocket, payload: unknown): void {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(payload));
}

function truncate(text: string, max = 90): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function presenceEntry(roomId: string, type: string, id: string): LivePresence | undefined {
  return presence.get(roomId)?.get(principalKey(type, id));
}

function ensurePresence(roomId: string, principal: Principal): LivePresence {
  let roomPresence = presence.get(roomId);
  if (!roomPresence) {
    roomPresence = new Map();
    presence.set(roomId, roomPresence);
  }
  const key = principalKey(principal.type, principal.id);
  const existing = roomPresence.get(key);
  if (existing) {
    if (existing.status === 'offline') existing.status = 'online';
    existing.lastSeen = nowIso();
    return existing;
  }
  const entry: LivePresence = {
    status: 'online',
    activity: '',
    taskId: null,
    lastSeen: nowIso(),
  };
  roomPresence.set(key, entry);
  return entry;
}

export function isAgentConnected(agentId: string): boolean {
  const socket = agentSockets.get(agentId);
  return Boolean(socket && socket.readyState === WebSocket.OPEN);
}

/* Agent state is derived, never stored as presence: a live socket wins, then a
 * delivered trigger (waking) or a failed one (unreachable), then sleep mode. */
function agentPresenceStatus(agentId: string, entry: LivePresence | undefined): PresenceStatus {
  if (isAgentConnected(agentId)) {
    const status = entry?.status;
    if (status && status !== 'offline' && status !== 'idle' && status !== 'waking' && status !== 'unreachable') {
      return status;
    }
    return 'online';
  }
  const runtime = store.getAgentRuntime(agentId);
  if (!runtime) return 'offline';
  if (runtime.wakeState === 'waking') return 'waking';
  if (runtime.wakeState === 'unreachable') return 'unreachable';
  return runtime.deliveryMode === 'trigger' ? 'idle' : 'offline';
}

export function presenceList(roomId: string): PresenceEntry[] {
  const members = store.listMembers(roomId);
  const live = presence.get(roomId);
  const rank: Record<PresenceStatus, number> = {
    working: 0,
    reviewing: 1,
    online: 2,
    away: 3,
    idle: 4,
    waking: 5,
    unreachable: 6,
    offline: 7,
  };
  return members
    .map((member) => {
      const entry = live?.get(principalKey(member.type, member.id));
      const runtime = member.type === 'agent' ? store.getAgentRuntime(member.id) : undefined;
      return {
        type: member.type,
        id: member.id,
        name: member.name,
        role: member.role,
        status:
          member.type === 'agent'
            ? agentPresenceStatus(member.id, entry)
            : ((entry?.status ?? 'offline') as PresenceStatus),
        activity: entry?.activity ?? '',
        taskId: entry?.taskId ?? null,
        lastSeen: entry?.lastSeen ?? runtime?.lastSocketAt ?? null,
        ...(member.type === 'agent' ? { deliveryMode: runtime?.deliveryMode ?? 'socket' } : {}),
      };
    })
    .sort((a, b) => rank[a.status] - rank[b.status] || a.name.localeCompare(b.name));
}

export function broadcast(roomId: string, payload: Record<string, unknown>): void {
  const body = JSON.stringify({ roomId, ...payload });
  for (const client of clients.values()) {
    if (client.rooms.has(roomId) && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(body);
    }
  }
}

export function broadcastPresence(roomId: string): void {
  broadcast(roomId, { type: 'presence.update', presence: presenceList(roomId) });
}

export function broadcastMembers(roomId: string): void {
  broadcast(roomId, { type: 'members.updated', members: store.listMembers(roomId) });
  broadcastPresence(roomId);
}

/* Pending requests are admin-only, so this does not use the room-wide broadcast. */
export function broadcastJoinRequests(roomId: string): void {
  const requests = store.listPendingJoinRequests(roomId);
  const body = JSON.stringify({ roomId, type: 'join.requests.updated', requests });
  for (const client of clients.values()) {
    if (!client.rooms.has(roomId) || client.ws.readyState !== WebSocket.OPEN) continue;
    if (store.getMembership(roomId, client.principal)?.role === 'admin') {
      client.ws.send(body);
    }
  }
}

export function buildRoomState(roomId: string, principal: Principal): RoomState | null {
  const membership = store.getMembership(roomId, principal);
  const room = store.getRoom(roomId);
  if (!membership || !room) return null;

  return {
    room,
    me: { type: principal.type, id: principal.id, name: principal.name, role: membership.role },
    members: store.listMembers(roomId),
    repos: store.listRepos(roomId),
    tasks: store.listTasks(roomId),
    activity: store.listActivity(roomId, 80),
    messages: store.listMessages(roomId, undefined, 80),
    presence: presenceList(roomId),
    ...(membership.role === 'admin'
      ? { joinRequests: store.listPendingJoinRequests(roomId) }
      : {}),
  };
}

export function setPresence(
  roomId: string,
  principal: Principal,
  input: { status?: string; activity?: string; taskId?: string | null },
): PresenceEntry[] | null {
  const membership = store.getMembership(roomId, principal);
  if (!membership) return null;

  const entry = ensurePresence(roomId, principal);
  if (input.status !== undefined) {
    if (!PRESENCE_STATUSES.has(input.status as PresenceStatus) || input.status === 'offline') {
      throw new Error('Invalid presence status');
    }
    entry.status = input.status as PresenceStatus;
  }
  if (input.activity !== undefined) {
    entry.activity = String(input.activity).slice(0, 160);
  }
  if (input.taskId !== undefined) {
    if (input.taskId && !store.getTask(roomId, input.taskId)) {
      throw new Error('Task does not belong to this room');
    }
    entry.taskId = input.taskId;
  }
  entry.lastSeen = nowIso();
  broadcastPresence(roomId);
  return presenceList(roomId);
}

export function evictFromRoom(roomId: string, type: string, id: string): void {
  presence.get(roomId)?.delete(principalKey(type, id));
  for (const client of clients.values()) {
    if (client.rooms.has(roomId) && client.principal.type === type && client.principal.id === id) {
      client.rooms.delete(roomId);
      send(client.ws, { type: 'removed', roomId });
    }
  }
  broadcastPresence(roomId);
}

function markOfflineIfGone(roomId: string, principal: Principal): void {
  const stillConnected = [...clients.values()].some(
    (client) =>
      client.rooms.has(roomId) &&
      client.principal.type === principal.type &&
      client.principal.id === principal.id,
  );
  if (stillConnected) return;

  const entry = presenceEntry(roomId, principal.type, principal.id);
  if (entry) {
    entry.status = 'offline';
    entry.lastSeen = nowIso();
  }
  broadcastPresence(roomId);
}

/* --------------------------- message pipeline ---------------------------- */

const AGENT_MESSAGES_PER_MINUTE = 20;
const AGENT_RATE_WINDOW_MS = 60_000;
const LOOP_WINDOW = 4;

function collectMentions(roomId: string, content: string, explicit: Mention[]): Mention[] {
  const members = store.listMembers(roomId);
  const found = new Map<string, Mention>();

  for (const member of members) {
    const escaped = member.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`(^|[^\\p{L}\\p{N}_])@${escaped}(?=$|[^\\p{L}\\p{N}_])`, 'iu');
    if (pattern.test(content)) found.set(principalKey(member.type, member.id), { type: member.type, id: member.id });
  }

  for (const mention of explicit) {
    const member = members.find((candidate) => candidate.type === mention.type && candidate.id === mention.id);
    if (member) found.set(principalKey(member.type, member.id), { type: member.type, id: member.id });
  }

  return [...found.values()];
}

function enforceAgentSend(roomId: string, agentId: string): void {
  if (pausedRooms.has(roomId)) throw new HttpError(429, 'loop_guard');

  const last = store.latestMessages(roomId, LOOP_WINDOW);
  if (last.length === LOOP_WINDOW && last.every((message) => message.senderType === 'agent')) {
    pausedRooms.add(roomId);
    const notice = store.insertSystemMessage(roomId, 'Agents paused until a human replies.');
    broadcast(roomId, { type: 'message.new', message: notice });
    throw new HttpError(429, 'loop_guard');
  }

  const now = Date.now();
  const recent = (agentMessageTimes.get(agentId) ?? []).filter((at) => now - at < AGENT_RATE_WINDOW_MS);
  if (recent.length >= AGENT_MESSAGES_PER_MINUTE) throw new HttpError(429, 'rate_limited');
  recent.push(now);
  agentMessageTimes.set(agentId, recent);
}

/* A sleeping trigger-mode agent gets one wake event per room, then catches up
 * over after_seq. A live socket always wins and never receives a trigger. */
function routeMentions(roomId: string, message: Message): void {
  const deliveredSince = new Date(Date.now() - WAKE_TIMEOUT_MS).toISOString();
  for (const mention of message.mentions) {
    if (mention.type !== 'agent') continue;
    if (mention.id === message.senderId) continue;
    if (isAgentConnected(mention.id)) continue;
    const agent = store.getAgentTrigger(mention.id);
    if (!agent || agent.deliveryMode !== 'trigger' || !agent.triggerUrl) continue;
    if (store.hasLiveTriggerEvent(mention.id, roomId, deliveredSince)) continue;
    store.createTriggerEvent(mention.id, roomId, message.id, message.seq);
  }
}

export interface CreateRoomMessageInput {
  roomId: string;
  principal: Principal;
  role: Role;
  kind: MessageKind;
  content: string;
  clientMessageId?: string | null;
  explicitMentions?: Mention[];
}

export function createRoomMessage(input: CreateRoomMessageInput): { message: Message; duplicate: boolean } {
  const clientMessageId = input.clientMessageId?.trim() || null;
  if (clientMessageId) {
    const existing = store.findMessageByClientId(input.roomId, input.principal.id, clientMessageId);
    if (existing) return { message: existing, duplicate: true };
  }

  if (input.principal.type === 'agent') enforceAgentSend(input.roomId, input.principal.id);

  const mentions = collectMentions(input.roomId, input.content, input.explicitMentions ?? []);
  const message = store.insertMessage(
    input.roomId,
    input.principal,
    input.role,
    input.kind,
    input.content,
    { mentions, clientMessageId },
  );

  if (input.principal.type === 'user') pausedRooms.delete(input.roomId);
  broadcast(input.roomId, { type: 'message.new', message });

  if (input.kind !== 'chat') {
    const label = input.kind === 'instruction' ? 'instruction' : 'suggestion';
    const activity = store.logActivity(
      input.roomId,
      input.principal,
      input.kind,
      `${input.principal.name} shared ${input.kind === 'instruction' ? 'an' : 'a'} ${label}: “${truncate(input.content)}”`,
      { messageId: message.id },
    );
    broadcast(input.roomId, { type: 'activity.new', activity });
  }

  routeMentions(input.roomId, message);
  return { message, duplicate: false };
}

function handleJoin(client: Client, roomId: string): void {
  const membership = store.getMembership(roomId, client.principal);
  if (!membership) {
    send(client.ws, { type: 'error', message: 'You are not a member of that room.' });
    return;
  }
  client.rooms.add(roomId);
  ensurePresence(roomId, client.principal);
  const state = buildRoomState(roomId, client.principal);
  if (state) send(client.ws, { type: 'room.state', roomId, state });
  broadcastPresence(roomId);
}

function handleLeave(client: Client, roomId: string): void {
  if (!client.rooms.has(roomId)) return;
  client.rooms.delete(roomId);
  markOfflineIfGone(roomId, client.principal);
}

function roomIdFor(client: Client, payload: Record<string, unknown>): string {
  const explicit = String(payload.roomId ?? '');
  if (explicit) return explicit;
  if (client.principal.type === 'agent') return store.getAgentRoom(client.principal.id) ?? '';
  return '';
}

function handleMessageSend(client: Client, payload: Record<string, unknown>): void {
  const roomId = roomIdFor(client, payload);
  const membership = store.getMembership(roomId, client.principal);
  if (!membership) return;
  if (membership.role === 'viewer') {
    send(client.ws, { type: 'error', message: 'Viewers cannot post messages.' });
    return;
  }
  const content = String(payload.content ?? '').trim();
  if (!content) return;
  if (content.length > 4000) {
    send(client.ws, { type: 'error', message: 'Messages are limited to 4000 characters.' });
    return;
  }
  const kind = MESSAGE_KINDS.has(payload.kind as MessageKind) ? (payload.kind as MessageKind) : 'chat';
  const clientMessageId =
    typeof payload.clientMessageId === 'string' && payload.clientMessageId.trim()
      ? payload.clientMessageId.trim()
      : null;
  if (clientMessageId && clientMessageId.length > 100) {
    send(client.ws, { type: 'error', message: 'clientMessageId is limited to 100 characters.' });
    return;
  }
  const explicitMentions = Array.isArray(payload.mentions)
    ? (payload.mentions as Record<string, unknown>[])
        .filter((item) => item && (item.type === 'agent' || item.type === 'user') && typeof item.id === 'string')
        .slice(0, 20)
        .map((item) => ({ type: item.type as 'agent' | 'user', id: item.id as string }))
    : [];

  try {
    createRoomMessage({
      roomId,
      principal: client.principal,
      role: membership.role,
      kind,
      content,
      clientMessageId,
      explicitMentions,
    });
  } catch (error) {
    if (error instanceof HttpError && error.status === 429) {
      send(client.ws, {
        type: 'error',
        error: error.message,
        message:
          error.message === 'loop_guard'
            ? 'Agents are paused until a human replies.'
            : 'Agent message rate limit reached (20 per minute).',
      });
      return;
    }
    send(client.ws, { type: 'error', message: 'Could not send the message.' });
  }
}

function handlePresenceSet(client: Client, payload: Record<string, unknown>): void {
  const roomId = roomIdFor(client, payload);
  const membership = store.getMembership(roomId, client.principal);
  if (!membership) return;
  try {
    setPresence(roomId, client.principal, {
      status: payload.status === undefined ? undefined : String(payload.status),
      activity: payload.activity === undefined ? undefined : String(payload.activity),
      taskId:
        payload.taskId === undefined
          ? undefined
          : payload.taskId === null
            ? null
            : String(payload.taskId),
    });
  } catch {
    send(client.ws, { type: 'error', message: 'Could not update presence.' });
  }
}

function handleClientMessage(client: Client, raw: RawData): void {
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(raw.toString()) as Record<string, unknown>;
  } catch {
    return;
  }

  switch (payload.type) {
    case 'room.join':
      handleJoin(client, String(payload.roomId ?? ''));
      break;
    case 'room.leave':
      handleLeave(client, String(payload.roomId ?? ''));
      break;
    case 'message.send':
      handleMessageSend(client, payload);
      break;
    case 'presence.set':
      handlePresenceSet(client, payload);
      break;
    case 'ping':
      send(client.ws, { type: 'pong' });
      break;
    default:
      break;
  }
}

function registerClient(ws: WebSocket, principal: Principal): Client {
  const client: Client = { ws, principal, rooms: new Set(), alive: true };
  clients.set(ws, client);

  const agentRoomId = principal.type === 'agent' ? store.getAgentRoom(principal.id) : undefined;

  if (principal.type === 'agent') {
    const existing = agentSockets.get(principal.id);
    if (existing && existing !== ws) {
      try {
        existing.close(4008, 'replaced');
      } catch {
        // already closing
      }
    }
    agentSockets.set(principal.id, ws);
    store.markAgentSocket(principal.id);
  }

  send(ws, {
    type: 'ready',
    principal: { type: principal.type, id: principal.id, name: principal.name },
    roomId: agentRoomId ?? null,
    lastSeq: agentRoomId ? store.getRoomLastSeq(agentRoomId) : null,
  });

  if (agentRoomId) {
    handleJoin(client, agentRoomId);
    broadcastPresence(agentRoomId);
  }
  return client;
}

/* An agent can wait on ws?join=<request key> before it has a token. The socket
 * stays in pendingClients until an admin approves the request. */
function attachPendingJoin(ws: WebSocket, requestKey: string): void {
  const request = store.getJoinRequestByKey(requestKey);
  if (!request) {
    ws.close(4001, 'unknown join request');
    return;
  }
  const room = store.getRoom(request.room_id);
  if (!room) {
    ws.close(4001, 'unknown join request');
    return;
  }

  if (request.status === 'denied') {
    send(ws, { type: 'join.denied', message: 'An admin declined this join request.' });
    setTimeout(() => ws.close(4003, 'denied'), 100);
    return;
  }

  if (request.status === 'approved') {
    const principal = request.agent_token ? resolveToken(request.agent_token) : null;
    if (!principal) {
      ws.close(4001, 'join request is no longer active');
      return;
    }
    registerClient(ws, principal);
    return;
  }

  pendingClients.set(ws, { ws, requestId: request.id, roomId: request.room_id, alive: true });
  send(ws, {
    type: 'join.pending',
    message: 'Request received. Keep this socket open; an admin must approve it.',
    room: { code: room.code, name: room.name, topic: room.topic, mode: room.mode },
    request: { name: request.name, status: request.status, createdAt: request.created_at },
  });
}

/* Called after an admin approves an agent request. Sockets already waiting on
 * that request receive the credentials and become normal room members. */
export function promoteJoinRequest(
  requestId: string,
  principal: Principal,
  briefing: Record<string, unknown>,
): void {
  for (const [ws, pending] of [...pendingClients]) {
    if (pending.requestId !== requestId) continue;
    pendingClients.delete(ws);
    send(ws, { type: 'join.approved', ...briefing });
    registerClient(ws, principal);
  }
}

export function rejectJoinRequestSocket(requestId: string, message: string): void {
  for (const [ws, pending] of [...pendingClients]) {
    if (pending.requestId !== requestId) continue;
    pendingClients.delete(ws);
    send(ws, { type: 'join.denied', message });
    setTimeout(() => ws.close(4003, 'denied'), 100);
  }
}

export function attachHub(server: HttpServer): void {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws, req) => {
    const url = new URL(req.url ?? '/ws', 'http://localhost');
    const principal = resolveToken(url.searchParams.get('token') ?? '');
    const joinKey = url.searchParams.get('join') ?? '';

    if (principal) {
      registerClient(ws, principal);
    } else if (joinKey) {
      attachPendingJoin(ws, joinKey);
    } else {
      ws.close(4001, 'unauthorized');
      return;
    }

    ws.on('message', (raw) => {
      const client = clients.get(ws);
      if (client) {
        handleClientMessage(client, raw);
        return;
      }
      if (!pendingClients.has(ws)) return;
      try {
        const payload = JSON.parse(raw.toString()) as Record<string, unknown>;
        if (payload.type === 'ping') send(ws, { type: 'pong' });
      } catch {
        // ignore malformed frames from pending sockets
      }
    });

    ws.on('pong', () => {
      const client = clients.get(ws);
      if (client) client.alive = true;
      const pending = pendingClients.get(ws);
      if (pending) pending.alive = true;
    });

    ws.on('close', () => {
      pendingClients.delete(ws);
      const client = clients.get(ws);
      if (!client) return;
      clients.delete(ws);
      if (client.principal.type === 'agent' && agentSockets.get(client.principal.id) === ws) {
        agentSockets.delete(client.principal.id);
        store.markAgentSocket(client.principal.id);
      }
      for (const roomId of client.rooms) {
        markOfflineIfGone(roomId, client.principal);
      }
    });

    ws.on('error', () => {
      // close handler takes care of cleanup
    });
  });

  /* Idle sockets through proxies or cloud firewalls often get dropped silently.
   * Ping every 30s and terminate clients that missed the previous ping. */
  const heartbeat = setInterval(() => {
    for (const client of clients.values()) {
      if (!client.alive) {
        client.ws.terminate();
        continue;
      }
      client.alive = false;
      client.ws.ping();
    }
    for (const pending of pendingClients.values()) {
      if (!pending.alive) {
        pending.ws.terminate();
        continue;
      }
      pending.alive = false;
      pending.ws.ping();
    }
  }, 30_000);
  heartbeat.unref();
  wss.on('close', () => clearInterval(heartbeat));
}

export function memberName(roomId: string, type: string, id: string): string | null {
  const member: Member | undefined = store
    .listMembers(roomId)
    .find((candidate) => candidate.type === type && candidate.id === id);
  return member?.name ?? null;
}

export const taskStatusLabel = (status: string): string => STATUS_LABEL[status] ?? status;
