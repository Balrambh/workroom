import { randomBytes, randomUUID } from 'node:crypto';
import { db } from './db.js';
import type {
  Activity,
  JoinRequest,
  JoinRequestStatus,
  Member,
  Message,
  MessageKind,
  Principal,
  PrincipalType,
  Repo,
  Role,
  Room,
  RoomMode,
  RoomSummary,
  Task,
  TaskStatus,
} from './types.js';

type Row = Record<string, any>;

const nowIso = () => new Date().toISOString();
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function newRoomCode(): string {
  let out = '';
  for (let i = 0; i < 5; i += 1) {
    out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return out;
}

/* ------------------------------- users ---------------------------------- */

export interface UserRow {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  created_at: string;
}

export function createUser(name: string, email: string, passwordHash: string): UserRow {
  const user: UserRow = {
    id: randomUUID(),
    email,
    name,
    password_hash: passwordHash,
    created_at: nowIso(),
  };
  db.prepare('INSERT INTO users (id, email, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)').run(
    user.id,
    user.email,
    user.name,
    user.password_hash,
    user.created_at,
  );
  return user;
}

export function findUserByEmail(email: string): UserRow | undefined {
  return db.prepare('SELECT * FROM users WHERE email = ?').get(email) as UserRow | undefined;
}

export function findUserById(id: string): UserRow | undefined {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined;
}

/* ------------------------------- rooms ---------------------------------- */

function mapRoom(row: Row): Room {
  return {
    id: row.id,
    name: row.name,
    topic: row.topic,
    mode: row.mode as RoomMode,
    createdAt: row.created_at,
    createdBy: row.created_by,
    code: row.code,
  };
}

export function getRoom(roomId: string): Room | undefined {
  const row = db.prepare('SELECT * FROM rooms WHERE id = ?').get(roomId) as Row | undefined;
  return row ? mapRoom(row) : undefined;
}

export function getRoomByCode(code: string): Room | undefined {
  const row = db.prepare('SELECT * FROM rooms WHERE code = ?').get(code) as Row | undefined;
  return row ? mapRoom(row) : undefined;
}

export function createRoom(name: string, topic: string, mode: RoomMode, creator: Principal): Room {
  let code = newRoomCode();
  while (db.prepare('SELECT 1 FROM rooms WHERE code = ?').get(code)) {
    code = newRoomCode();
  }
  const id = randomUUID();
  const createdAt = nowIso();
  db.prepare(
    'INSERT INTO rooms (id, name, topic, mode, code, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
  ).run(id, name, topic, mode, code, creator.id, createdAt);
  addMember(id, creator, 'admin');
  return getRoom(id)!;
}

export function listRoomsFor(principal: Principal): RoomSummary[] {
  const rows = db
    .prepare(
      `SELECT r.id, r.name, r.topic, r.mode, rm.role,
              (SELECT COUNT(*) FROM room_members m WHERE m.room_id = r.id) AS member_count
       FROM room_members rm
       JOIN rooms r ON r.id = rm.room_id
       WHERE rm.principal_type = ? AND rm.principal_id = ?
       ORDER BY r.created_at DESC`,
    )
    .all(principal.type, principal.id) as Row[];

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    topic: row.topic,
    mode: row.mode as RoomMode,
    role: row.role as Role,
    memberCount: Number(row.member_count),
  }));
}

/* ------------------------------ members --------------------------------- */

export function getMembership(roomId: string, principal: Principal): { role: Role; joinedAt: string } | undefined {
  const row = db
    .prepare('SELECT role, joined_at FROM room_members WHERE room_id = ? AND principal_type = ? AND principal_id = ?')
    .get(roomId, principal.type, principal.id) as Row | undefined;
  return row ? { role: row.role as Role, joinedAt: row.joined_at } : undefined;
}

export function addMember(roomId: string, principal: Principal, role: Role): void {
  db.prepare(
    'INSERT OR IGNORE INTO room_members (room_id, principal_type, principal_id, role, joined_at) VALUES (?, ?, ?, ?, ?)',
  ).run(roomId, principal.type, principal.id, role, nowIso());
}

export function setMemberRole(roomId: string, type: PrincipalType, id: string, role: Role): void {
  db.prepare('UPDATE room_members SET role = ? WHERE room_id = ? AND principal_type = ? AND principal_id = ?').run(
    role,
    roomId,
    type,
    id,
  );
  if (type === 'agent') {
    db.prepare('UPDATE agents SET role = ? WHERE id = ?').run(role, id);
  }
}

export function removeMember(roomId: string, type: PrincipalType, id: string): void {
  db.prepare('DELETE FROM room_members WHERE room_id = ? AND principal_type = ? AND principal_id = ?').run(
    roomId,
    type,
    id,
  );
}

export function unassignTasks(roomId: string, type: PrincipalType, id: string): void {
  db.prepare(
    'UPDATE tasks SET assignee_type = NULL, assignee_id = NULL, updated_at = ? WHERE room_id = ? AND assignee_type = ? AND assignee_id = ?',
  ).run(nowIso(), roomId, type, id);
}

export function listMembers(roomId: string): Member[] {
  const rows = db
    .prepare(
      `SELECT rm.principal_type, rm.principal_id, rm.role, rm.joined_at,
              COALESCE(u.name, a.name, 'Unknown') AS name,
              a.description AS description
       FROM room_members rm
       LEFT JOIN users u ON rm.principal_type = 'user' AND u.id = rm.principal_id
       LEFT JOIN agents a ON rm.principal_type = 'agent' AND a.id = rm.principal_id
       WHERE rm.room_id = ?
       ORDER BY rm.joined_at ASC`,
    )
    .all(roomId) as Row[];

  return rows.map((row) => ({
    type: row.principal_type as PrincipalType,
    id: row.principal_id,
    name: row.name,
    role: row.role as Role,
    joinedAt: row.joined_at,
    description: row.description ?? null,
  }));
}

/* ------------------------------- agents --------------------------------- */

export function createAgent(
  roomId: string,
  name: string,
  description: string,
  role: Role,
  tokenHash: string,
  createdBy: string,
): Member {
  const id = randomUUID();
  db.prepare(
    'INSERT INTO agents (id, room_id, name, description, role, token_hash, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
  ).run(id, roomId, name, description, role, tokenHash, createdBy, nowIso());
  addMember(roomId, { type: 'agent', id, name }, role);
  return listMembers(roomId).find((member) => member.type === 'agent' && member.id === id)!;
}

export function deleteAgent(agentId: string): void {
  db.prepare('DELETE FROM agents WHERE id = ?').run(agentId);
}

export function getAgentRoom(agentId: string): string | undefined {
  const row = db.prepare('SELECT room_id FROM agents WHERE id = ?').get(agentId) as
    | { room_id: string }
    | undefined;
  return row?.room_id;
}

/* ---------------------------- join requests ----------------------------- */

export interface JoinRequestRow {
  id: string;
  room_id: string;
  kind: PrincipalType;
  request_key: string;
  user_id: string | null;
  name: string;
  description: string;
  status: JoinRequestStatus;
  agent_id: string | null;
  agent_token: string | null;
  decided_by: string | null;
  decided_at: string | null;
  created_at: string;
}

function mapJoinRequest(row: Row): JoinRequest {
  return {
    id: row.id,
    kind: row.kind as PrincipalType,
    name: row.name,
    description: row.description,
    status: row.status as JoinRequestStatus,
    createdAt: row.created_at,
    decidedAt: row.decided_at ?? null,
  };
}

export function getJoinRequestById(id: string): JoinRequestRow | undefined {
  return db.prepare('SELECT * FROM room_join_requests WHERE id = ?').get(id) as JoinRequestRow | undefined;
}

export function getJoinRequestByKey(key: string): JoinRequestRow | undefined {
  return db.prepare('SELECT * FROM room_join_requests WHERE request_key = ?').get(key) as
    | JoinRequestRow
    | undefined;
}

export function getLatestJoinRequestForUser(roomId: string, userId: string): JoinRequestRow | undefined {
  return db
    .prepare(
      'SELECT * FROM room_join_requests WHERE room_id = ? AND user_id = ? ORDER BY created_at DESC, rowid DESC LIMIT 1',
    )
    .get(roomId, userId) as JoinRequestRow | undefined;
}

export function createJoinRequest(
  roomId: string,
  kind: PrincipalType,
  name: string,
  description: string,
  userId: string | null = null,
): JoinRequestRow {
  let key = `jr_${randomBytes(18).toString('base64url')}`;
  while (db.prepare('SELECT 1 FROM room_join_requests WHERE request_key = ?').get(key)) {
    key = `jr_${randomBytes(18).toString('base64url')}`;
  }
  const id = randomUUID();
  db.prepare(
    `INSERT INTO room_join_requests (id, room_id, kind, request_key, user_id, name, description, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
  ).run(id, roomId, kind, key, userId, name, description, nowIso());
  return getJoinRequestById(id)!;
}

export function listPendingJoinRequests(roomId: string): JoinRequest[] {
  const rows = db
    .prepare("SELECT * FROM room_join_requests WHERE room_id = ? AND status = 'pending' ORDER BY created_at ASC")
    .all(roomId) as Row[];
  return rows.map(mapJoinRequest);
}

export function approveJoinRequest(
  id: string,
  decidedBy: string,
  agentId: string | null = null,
  agentToken: string | null = null,
): void {
  db.prepare(
    `UPDATE room_join_requests
     SET status = 'approved', decided_by = ?, decided_at = ?, agent_id = ?, agent_token = ?
     WHERE id = ? AND status = 'pending'`,
  ).run(decidedBy, nowIso(), agentId, agentToken, id);
}

export function denyJoinRequest(id: string, decidedBy: string): void {
  db.prepare(
    "UPDATE room_join_requests SET status = 'denied', decided_by = ?, decided_at = ? WHERE id = ? AND status = 'pending'",
  ).run(decidedBy, nowIso(), id);
}

export function deleteJoinRequestsForAgent(agentId: string): void {
  db.prepare('DELETE FROM room_join_requests WHERE agent_id = ?').run(agentId);
}

export function deletePendingJoinRequestsForUser(roomId: string, userId: string): void {
  db.prepare("DELETE FROM room_join_requests WHERE room_id = ? AND user_id = ? AND status = 'pending'").run(
    roomId,
    userId,
  );
}

/* ------------------------------- repos ---------------------------------- */

function mapRepo(row: Row): Repo {
  return {
    id: row.id,
    roomId: row.room_id,
    name: row.name,
    url: row.url,
    branch: row.branch,
    addedBy: row.added_by,
    createdAt: row.created_at,
  };
}

export function listRepos(roomId: string): Repo[] {
  const rows = db.prepare('SELECT * FROM room_repos WHERE room_id = ? ORDER BY created_at ASC').all(roomId) as Row[];
  return rows.map(mapRepo);
}

export function getRepo(roomId: string, repoId: string): Repo | undefined {
  const row = db.prepare('SELECT * FROM room_repos WHERE id = ? AND room_id = ?').get(repoId, roomId) as
    | Row
    | undefined;
  return row ? mapRepo(row) : undefined;
}

export function addRepo(
  roomId: string,
  name: string,
  url: string,
  branch: string,
  addedBy: string,
): Repo {
  const id = randomUUID();
  db.prepare(
    'INSERT INTO room_repos (id, room_id, name, url, branch, added_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
  ).run(id, roomId, name, url, branch, addedBy, nowIso());
  return getRepo(roomId, id)!;
}

export function deleteRepo(roomId: string, repoId: string): void {
  db.prepare('DELETE FROM room_repos WHERE id = ? AND room_id = ?').run(repoId, roomId);
}

/* ------------------------------ messages -------------------------------- */

function mapMessage(row: Row): Message {
  return {
    id: row.id,
    roomId: row.room_id,
    senderType: row.sender_type as PrincipalType,
    senderId: row.sender_id,
    senderName: row.sender_name,
    senderRole: row.sender_role as Role,
    kind: row.kind as MessageKind,
    content: row.content,
    createdAt: row.created_at,
  };
}

export function insertMessage(
  roomId: string,
  sender: Principal,
  senderRole: Role,
  kind: MessageKind,
  content: string,
): Message {
  const message: Message = {
    id: randomUUID(),
    roomId,
    senderType: sender.type,
    senderId: sender.id,
    senderName: sender.name,
    senderRole,
    kind,
    content,
    createdAt: nowIso(),
  };
  db.prepare(
    'INSERT INTO messages (id, room_id, sender_type, sender_id, sender_name, sender_role, kind, content, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
  ).run(
    message.id,
    message.roomId,
    message.senderType,
    message.senderId,
    message.senderName,
    message.senderRole,
    message.kind,
    message.content,
    message.createdAt,
  );
  return message;
}

export function listMessages(roomId: string, before?: string, limit = 80): Message[] {
  const rows = before
    ? (db
        .prepare('SELECT * FROM messages WHERE room_id = ? AND created_at < ? ORDER BY created_at DESC LIMIT ?')
        .all(roomId, before, limit) as Row[])
    : (db
        .prepare('SELECT * FROM messages WHERE room_id = ? ORDER BY created_at DESC LIMIT ?')
        .all(roomId, limit) as Row[]);
  return rows.map(mapMessage).reverse();
}

/* -------------------------------- tasks --------------------------------- */

const TASK_SELECT = `
  SELECT t.*, r.name AS repo_name,
         COALESCE(au.name, aa.name) AS assignee_name,
         COALESCE(cu.name, ca.name, 'Unknown') AS created_by_name
  FROM tasks t
  LEFT JOIN room_repos r ON r.id = t.repo_id
  LEFT JOIN users au ON t.assignee_type = 'user' AND au.id = t.assignee_id
  LEFT JOIN agents aa ON t.assignee_type = 'agent' AND aa.id = t.assignee_id
  LEFT JOIN users cu ON t.created_by_type = 'user' AND cu.id = t.created_by_id
  LEFT JOIN agents ca ON t.created_by_type = 'agent' AND ca.id = t.created_by_id
`;

function mapTask(row: Row): Task {
  return {
    id: row.id,
    roomId: row.room_id,
    repoId: row.repo_id ?? null,
    repoName: row.repo_name ?? null,
    title: row.title,
    description: row.description,
    paths: row.paths,
    branch: row.branch,
    status: row.status as TaskStatus,
    assigneeType: (row.assignee_type as PrincipalType | null) ?? null,
    assigneeId: row.assignee_id ?? null,
    assigneeName: row.assignee_name ?? null,
    createdByType: row.created_by_type as PrincipalType,
    createdById: row.created_by_id,
    createdByName: row.created_by_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function listTasks(roomId: string): Task[] {
  const rows = db
    .prepare(
      `${TASK_SELECT}
       WHERE t.room_id = ?
       ORDER BY CASE t.status WHEN 'doing' THEN 0 WHEN 'review' THEN 1 WHEN 'todo' THEN 2 ELSE 3 END,
                t.created_at DESC`,
    )
    .all(roomId) as Row[];
  return rows.map(mapTask);
}

export function getTask(roomId: string, taskId: string): Task | undefined {
  const row = db.prepare(`${TASK_SELECT} WHERE t.room_id = ? AND t.id = ?`).get(roomId, taskId) as Row | undefined;
  return row ? mapTask(row) : undefined;
}

export interface NewTaskInput {
  title: string;
  description: string;
  paths: string;
  branch: string;
  repoId: string | null;
  assigneeType: PrincipalType | null;
  assigneeId: string | null;
}

export function createTask(roomId: string, input: NewTaskInput, creator: Principal): Task {
  const id = randomUUID();
  const timestamp = nowIso();
  db.prepare(
    `INSERT INTO tasks (id, room_id, repo_id, title, description, paths, branch, status,
                        assignee_type, assignee_id, created_by_type, created_by_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'todo', ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    roomId,
    input.repoId,
    input.title,
    input.description,
    input.paths,
    input.branch,
    input.assigneeType,
    input.assigneeId,
    creator.type,
    creator.id,
    timestamp,
    timestamp,
  );
  return getTask(roomId, id)!;
}

export function updateTaskFields(
  roomId: string,
  taskId: string,
  patch: Partial<{
    title: string;
    description: string;
    paths: string;
    branch: string;
    repoId: string | null;
    status: TaskStatus;
    assigneeType: PrincipalType | null;
    assigneeId: string | null;
  }>,
): Task {
  const columns: Record<string, string> = {
    title: 'title',
    description: 'description',
    paths: 'paths',
    branch: 'branch',
    repoId: 'repo_id',
    status: 'status',
    assigneeType: 'assignee_type',
    assigneeId: 'assignee_id',
  };
  const sets: string[] = [];
  const values: (string | null)[] = [];
  for (const [key, column] of Object.entries(columns)) {
    if (Object.prototype.hasOwnProperty.call(patch, key)) {
      sets.push(`${column} = ?`);
      const value = (patch as Record<string, unknown>)[key];
      values.push(value === undefined ? null : (value as string | null));
    }
  }
  sets.push('updated_at = ?');
  values.push(nowIso());
  db.prepare(`UPDATE tasks SET ${sets.join(', ')} WHERE id = ? AND room_id = ?`).run(...values, taskId, roomId);
  return getTask(roomId, taskId)!;
}

/* ------------------------------ activity -------------------------------- */

function mapActivity(row: Row): Activity {
  return {
    id: row.id,
    roomId: row.room_id,
    type: row.type,
    summary: row.summary,
    actorType: row.actor_type as PrincipalType,
    actorId: row.actor_id,
    actorName: row.actor_name,
    data: row.data ? (JSON.parse(row.data) as Record<string, unknown>) : null,
    createdAt: row.created_at,
  };
}

export function logActivity(
  roomId: string,
  actor: Principal,
  type: string,
  summary: string,
  data?: Record<string, unknown>,
): Activity {
  const activity: Activity = {
    id: randomUUID(),
    roomId,
    type,
    summary,
    actorType: actor.type,
    actorId: actor.id,
    actorName: actor.name,
    data: data ?? null,
    createdAt: nowIso(),
  };
  db.prepare(
    'INSERT INTO activity (id, room_id, type, summary, actor_type, actor_id, actor_name, data, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
  ).run(
    activity.id,
    activity.roomId,
    activity.type,
    activity.summary,
    activity.actorType,
    activity.actorId,
    activity.actorName,
    activity.data ? JSON.stringify(activity.data) : null,
    activity.createdAt,
  );
  return activity;
}

export function listActivity(roomId: string, limit = 80): Activity[] {
  const rows = db
    .prepare('SELECT * FROM activity WHERE room_id = ? ORDER BY created_at DESC LIMIT ?')
    .all(roomId, limit) as Row[];
  return rows.map(mapActivity);
}
