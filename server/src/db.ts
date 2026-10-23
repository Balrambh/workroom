import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const here = dirname(fileURLToPath(import.meta.url));
const dataDir = resolve(here, '../data');
mkdirSync(dataDir, { recursive: true });

export const db = new DatabaseSync(process.env.DB_PATH ?? resolve(dataDir, 'roomforge.db'));

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS rooms (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    topic TEXT NOT NULL DEFAULT '',
    mode TEXT NOT NULL CHECK (mode IN ('chat', 'code')),
    code TEXT NOT NULL UNIQUE,
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL,
    last_seq INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS agents (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    role TEXT NOT NULL CHECK (role IN ('admin', 'member', 'viewer')),
    token_hash TEXT NOT NULL UNIQUE,
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL,
    delivery_mode TEXT NOT NULL DEFAULT 'socket',
    trigger_url TEXT,
    trigger_secret_enc TEXT,
    last_socket_at TEXT,
    wake_state TEXT,
    waking_since TEXT
  );

  CREATE TABLE IF NOT EXISTS room_members (
    room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    principal_type TEXT NOT NULL CHECK (principal_type IN ('user', 'agent')),
    principal_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'member', 'viewer')),
    joined_at TEXT NOT NULL,
    PRIMARY KEY (room_id, principal_type, principal_id)
  );

  CREATE TABLE IF NOT EXISTS room_repos (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    branch TEXT NOT NULL DEFAULT 'main',
    added_by TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    sender_type TEXT NOT NULL,
    sender_id TEXT NOT NULL,
    sender_name TEXT NOT NULL,
    sender_role TEXT NOT NULL,
    kind TEXT NOT NULL CHECK (kind IN ('chat', 'instruction', 'suggestion')),
    content TEXT NOT NULL,
    created_at TEXT NOT NULL,
    seq INTEGER,
    mentions TEXT,
    client_message_id TEXT
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    repo_id TEXT REFERENCES room_repos(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    paths TEXT NOT NULL DEFAULT '',
    branch TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL CHECK (status IN ('todo', 'doing', 'review', 'done')),
    assignee_type TEXT,
    assignee_id TEXT,
    created_by_type TEXT NOT NULL,
    created_by_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS activity (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    summary TEXT NOT NULL,
    actor_type TEXT NOT NULL,
    actor_id TEXT NOT NULL,
    actor_name TEXT NOT NULL,
    data TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS room_join_requests (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    kind TEXT NOT NULL CHECK (kind IN ('user', 'agent')),
    request_key TEXT NOT NULL UNIQUE,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
    agent_id TEXT,
    agent_token TEXT,
    decided_by TEXT,
    decided_at TEXT,
    created_at TEXT NOT NULL,
    delivery_mode TEXT NOT NULL DEFAULT 'socket',
    trigger_url TEXT,
    trigger_secret_enc TEXT,
    trigger_secret_returned INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS trigger_events (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    message_id TEXT NOT NULL,
    seq INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    attempts INTEGER NOT NULL DEFAULT 0,
    next_attempt_at TEXT NOT NULL,
    last_error TEXT,
    created_at TEXT NOT NULL,
    delivered_at TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_messages_room ON messages(room_id, created_at);
  CREATE INDEX IF NOT EXISTS idx_join_requests_room ON room_join_requests(room_id, status, created_at);
  CREATE INDEX IF NOT EXISTS idx_join_requests_user ON room_join_requests(room_id, user_id, created_at);
  CREATE INDEX IF NOT EXISTS idx_tasks_room ON tasks(room_id, created_at);
  CREATE INDEX IF NOT EXISTS idx_activity_room ON activity(room_id, created_at);
  CREATE INDEX IF NOT EXISTS idx_members_principal ON room_members(principal_type, principal_id);
  CREATE INDEX IF NOT EXISTS idx_trigger_events_due ON trigger_events(status, next_attempt_at);
  CREATE INDEX IF NOT EXISTS idx_trigger_events_agent ON trigger_events(agent_id, room_id, status);
`);

/* Additive migrations for databases created before wake/trigger support. */
function hasColumn(table: string, column: string): boolean {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  return rows.some((row) => row.name === column);
}

function addColumn(table: string, column: string, definition: string): void {
  if (!hasColumn(table, column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}

addColumn('rooms', 'last_seq', 'INTEGER NOT NULL DEFAULT 0');
addColumn('agents', 'delivery_mode', "TEXT NOT NULL DEFAULT 'socket'");
addColumn('agents', 'trigger_url', 'TEXT');
addColumn('agents', 'trigger_secret_enc', 'TEXT');
addColumn('agents', 'last_socket_at', 'TEXT');
addColumn('agents', 'wake_state', 'TEXT');
addColumn('agents', 'waking_since', 'TEXT');
addColumn('room_join_requests', 'delivery_mode', "TEXT NOT NULL DEFAULT 'socket'");
addColumn('room_join_requests', 'trigger_url', 'TEXT');
addColumn('room_join_requests', 'trigger_secret_enc', 'TEXT');
addColumn('room_join_requests', 'trigger_secret_returned', 'INTEGER NOT NULL DEFAULT 0');
addColumn('messages', 'seq', 'INTEGER');
addColumn('messages', 'mentions', 'TEXT');
addColumn('messages', 'client_message_id', 'TEXT');

db.exec(`
  CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_client
    ON messages(room_id, sender_id, client_message_id)
    WHERE client_message_id IS NOT NULL;
  CREATE INDEX IF NOT EXISTS idx_messages_room_seq ON messages(room_id, seq);
`);

/* Backfill sequence numbers so existing rooms can catch up with after_seq. */
const unsequenced = db
  .prepare('SELECT id, room_id FROM messages WHERE seq IS NULL ORDER BY room_id, created_at, rowid')
  .all() as { id: string; room_id: string }[];
if (unsequenced.length) {
  const counters = new Map<string, number>();
  const maxRows = db
    .prepare('SELECT room_id, MAX(seq) AS max_seq FROM messages GROUP BY room_id')
    .all() as { room_id: string; max_seq: number | null }[];
  for (const row of maxRows) counters.set(row.room_id, Number(row.max_seq ?? 0));
  db.exec('BEGIN');
  try {
    const assign = db.prepare('UPDATE messages SET seq = ? WHERE id = ?');
    for (const row of unsequenced) {
      const next = (counters.get(row.room_id) ?? 0) + 1;
      counters.set(row.room_id, next);
      assign.run(next, row.id);
    }
    const setLast = db.prepare('UPDATE rooms SET last_seq = ? WHERE id = ?');
    for (const [roomId, last] of counters) setLast.run(last, roomId);
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}
