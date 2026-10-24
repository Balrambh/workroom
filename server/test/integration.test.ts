import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import crypto from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { after, before, test } from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { WebSocket } from 'ws';

const serverDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const RUN_ID = crypto.randomBytes(4).toString('hex');

let tempDir = '';
let dbPath = '';
let server: TestServer;
let adminToken = '';
let memberToken = '';
let roomId = '';
let roomCode = '';
let retryAgentId = '';
const run = () => `${Date.now()}-${RUN_ID}`;
const AVATAR_PATTERN = /^avatar-(0[1-9]|[12][0-9]|30)$/;

interface TestServer {
  child: ChildProcess;
  port: number;
  base: string;
  logs: () => string;
  exit: Promise<{ code: number | null; signal: NodeJS.Signals | null }>;
}

function freePort(): Promise<number> {
  return new Promise((resolvePort, reject) => {
    const probe = createServer();
    probe.unref();
    probe.on('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const address = probe.address() as AddressInfo;
      probe.close(() => resolvePort(address.port));
    });
  });
}

async function waitFor<T>(
  label: string,
  probe: () => Promise<T | false | null | undefined> | T | false | null | undefined,
  timeoutMs = 10_000,
  intervalMs = 100,
): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;
  while (Date.now() < deadline) {
    try {
      const value = await probe();
      if (value) return value as T;
    } catch (error) {
      lastError = error;
    }
    await sleep(intervalMs);
  }
  throw new Error(`${label} timed out${lastError ? `: ${String(lastError)}` : ''}`);
}

async function startServer(dbPath: string): Promise<TestServer> {
  const port = await freePort();
  const child = spawn(process.execPath, ['--import', 'tsx', 'src/index.ts'], {
    cwd: serverDir,
    env: {
      ...process.env,
      NODE_ENV: 'test',
      PORT: String(port),
      DB_PATH: dbPath,
      JWT_SECRET: crypto.randomBytes(32).toString('hex'),
      TRIGGER_SECRET_ENC_KEY: crypto.randomBytes(32).toString('base64'),
      TRIGGER_TIMEOUT_MS: '500',
      WAKE_TIMEOUT_MS: '1500',
      TRIGGER_RETRY_DELAYS: '100,100,100',
      MAINTENANCE_INTERVAL_MS: '500',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let log = '';
  child.stdout?.on('data', (chunk) => {
    log += chunk.toString();
  });
  child.stderr?.on('data', (chunk) => {
    log += chunk.toString();
  });
  const exit = new Promise<{ code: number | null; signal: NodeJS.Signals | null }>((resolveExit) => {
    child.once('exit', (code, signal) => resolveExit({ code, signal }));
  });

  const base = `http://127.0.0.1:${port}`;
  const started = await waitFor(
    'server startup',
    async () => {
      if (child.exitCode !== null) throw new Error(`server exited early with code ${child.exitCode}`);
      try {
        const response = await fetch(`${base}/api/health`);
        return response.ok;
      } catch {
        return false;
      }
    },
    20_000,
    100,
  ).catch((error) => {
    child.kill();
    throw new Error(`${error instanceof Error ? error.message : error}\n${log}`);
  });
  assert.equal(started, true);

  return { child, port, base, logs: () => log, exit };
}

async function stopServer(target: TestServer): Promise<void> {
  if (target.child.exitCode !== null) return;
  target.child.kill();
  await Promise.race([target.exit, sleep(5_000)]);
  if (target.child.exitCode === null) target.child.kill('SIGKILL');
}

interface ApiOptions {
  method?: string;
  token?: string;
  body?: unknown;
  rawBody?: string;
  headers?: Record<string, string>;
}

async function api(base: string, path: string, options: ApiOptions = {}) {
  const headers: Record<string, string> = { ...(options.headers ?? {}) };
  if (options.token) headers.authorization = `Bearer ${options.token}`;
  let body: string | undefined;
  if (options.rawBody !== undefined) {
    headers['content-type'] = 'application/json';
    body = options.rawBody;
  } else if (options.body !== undefined) {
    headers['content-type'] = 'application/json';
    body = JSON.stringify(options.body);
  }
  const response = await fetch(`${base}/api${path}`, {
    method: options.method ?? (body === undefined ? 'GET' : 'POST'),
    headers,
    body,
  });
  const text = await response.text();
  let parsed: any = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }
  return { status: response.status, body: parsed, headers: response.headers };
}

function wsCollector(ws: WebSocket) {
  const messages: any[] = [];
  ws.on('message', (raw) => {
    try {
      messages.push(JSON.parse(raw.toString()));
    } catch {
      // ignore non-JSON frames
    }
  });
  return {
    messages,
    waitFor: (type: string, timeoutMs = 10_000) =>
      waitFor(`websocket ${type}`, () => messages.find((message) => message.type === type), timeoutMs),
  };
}

async function openWs(url: string, headers?: Record<string, string>): Promise<WebSocket> {
  const ws = new WebSocket(url, headers ? { headers } : undefined);
  await new Promise<void>((resolveOpen, reject) => {
    const timer = setTimeout(() => reject(new Error('websocket open timed out')), 10_000);
    ws.once('open', () => {
      clearTimeout(timer);
      resolveOpen();
    });
    ws.once('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
  return ws;
}

async function closeWs(ws: WebSocket): Promise<void> {
  if (ws.readyState === WebSocket.CLOSED) return;
  await new Promise<void>((resolveClose) => {
    ws.once('close', () => resolveClose());
    ws.close();
    setTimeout(() => {
      if (ws.readyState !== WebSocket.CLOSED) ws.terminate();
      resolveClose();
    }, 2_000);
  });
}

async function roomState(token = adminToken) {
  const response = await api(server.base, `/rooms/${roomId}`, { token });
  assert.equal(response.status, 200);
  return response.body;
}

function presenceOf(state: any, agentId: string) {
  return state.presence.find((entry: any) => entry.id === agentId);
}

async function createAgent(input: Record<string, unknown>) {
  const response = await api(server.base, `/rooms/${roomId}/agents`, {
    method: 'POST',
    token: adminToken,
    body: input,
  });
  assert.equal(response.status, 201, JSON.stringify(response.body));
  return response.body as {
    agent: { id: string; name: string; avatar?: string | null };
    token: string;
    triggerSecret?: string;
  };
}

before(async () => {
  tempDir = mkdtempSync(join(tmpdir(), 'roomforge-it-'));
  dbPath = join(tempDir, 'test.db');
  server = await startServer(dbPath);
});

after(async () => {
  if (server) await stopServer(server);
  if (tempDir) {
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Windows can keep a WAL handle briefly; the temp dir is disposable.
    }
  }
});

test('health and error envelopes', async () => {
  const health = await api(server.base, '/health');
  assert.equal(health.status, 200);
  assert.equal(health.body.ok, true);
  assert.equal(health.body.db, 'ok');

  const unauthenticated = await api(server.base, '/does-not-exist');
  assert.equal(unauthenticated.status, 401);

  const badJson = await api(server.base, '/auth/register', { method: 'POST', rawBody: '{' });
  assert.equal(badJson.status, 400);
  assert.equal(badJson.body.error, 'Invalid JSON body');

  const live = await api(server.base, '/live');
  assert.equal(live.status, 200);
  assert.equal(live.body.ok, true);

  const generated = await api(server.base, '/health');
  assert.match(generated.headers.get('x-request-id') ?? '', /^[0-9a-f-]{36}$/i);

  const echoed = await api(server.base, '/health', { headers: { 'x-request-id': 'integration-request-1' } });
  assert.equal(echoed.headers.get('x-request-id'), 'integration-request-1');

  const replaced = await api(server.base, '/health', { headers: { 'x-request-id': 'not a valid id' } });
  assert.notEqual(replaced.headers.get('x-request-id'), 'not a valid id');
});

test('accounts, room permissions, and message idempotency', async () => {
  const admin = await api(server.base, '/auth/register', {
    method: 'POST',
    body: { name: 'Admin', email: `admin-${RUN_ID}@test.local`, password: 'correct-horse' },
  });
  assert.equal(admin.status, 201);
  adminToken = admin.body.token;

  const missing = await api(server.base, '/does-not-exist', { token: adminToken });
  assert.equal(missing.status, 404);
  assert.equal(missing.body.error, 'Not found');

  const member = await api(server.base, '/auth/register', {
    method: 'POST',
    body: { name: 'Member', email: `member-${RUN_ID}@test.local`, password: 'correct-horse' },
  });
  assert.equal(member.status, 201);
  memberToken = member.body.token;

  const duplicate = await api(server.base, '/auth/register', {
    method: 'POST',
    body: { name: 'Copy', email: `admin-${RUN_ID}@test.local`, password: 'correct-horse' },
  });
  assert.equal(duplicate.status, 409);

  const badLogin = await api(server.base, '/auth/login', {
    method: 'POST',
    body: { email: `admin-${RUN_ID}@test.local`, password: 'wrong-password' },
  });
  assert.equal(badLogin.status, 401);

  const login = await api(server.base, '/auth/login', {
    method: 'POST',
    body: { email: `admin-${RUN_ID}@test.local`, password: 'correct-horse' },
  });
  assert.equal(login.status, 200);
  assert.equal(login.body.user.name, 'Admin');

  const created = await api(server.base, '/rooms', {
    method: 'POST',
    token: adminToken,
    body: { name: 'Integration Room', topic: 'tests', mode: 'code' },
  });
  assert.equal(created.status, 201);
  roomId = created.body.room.id;
  roomCode = created.body.room.code;
  assert.ok(roomId && roomCode);

  const outsiderRead = await api(server.base, `/rooms/${roomId}`, { token: memberToken });
  assert.equal(outsiderRead.status, 404);

  const outsiderWrite = await api(server.base, `/rooms/${roomId}/messages`, {
    method: 'POST',
    token: memberToken,
    body: { content: 'should not land' },
  });
  assert.equal(outsiderWrite.status, 404);

  const viewer = await createAgent({ name: 'ViewerBot', role: 'viewer' });
  const viewerRead = await api(server.base, `/rooms/${roomId}`, { token: viewer.token });
  assert.equal(viewerRead.status, 200);
  assert.equal(viewerRead.body.me.role, 'viewer');
  const viewerWrite = await api(server.base, `/rooms/${roomId}/messages`, {
    method: 'POST',
    token: viewer.token,
    body: { content: 'viewers cannot post' },
  });
  assert.equal(viewerWrite.status, 403);

  const agentRoom = await api(server.base, '/rooms', {
    method: 'POST',
    token: viewer.token,
    body: { name: 'Agent room', mode: 'chat' },
  });
  assert.equal(agentRoom.status, 403);

  const first = await api(server.base, `/rooms/${roomId}/messages`, {
    method: 'POST',
    token: adminToken,
    body: { content: 'idempotent hello', clientMessageId: 'client-1' },
  });
  assert.equal(first.status, 201);

  const replay = await api(server.base, `/rooms/${roomId}/messages`, {
    method: 'POST',
    token: adminToken,
    body: { content: 'idempotent hello again', clientMessageId: 'client-1' },
  });
  assert.equal(replay.status, 200);
  assert.equal(replay.body.id, first.body.id);
  assert.equal(replay.body.content, 'idempotent hello');

  const afterSeq = await api(server.base, `/rooms/${roomId}/messages?after_seq=0`, { token: adminToken });
  assert.equal(afterSeq.status, 200);
  assert.equal(afterSeq.body.messages.length, 1);
  assert.ok(afterSeq.body.lastSeq >= 1);

  const oversized = await api(server.base, `/rooms/${roomId}/messages`, {
    method: 'POST',
    token: adminToken,
    body: { content: 'x'.repeat(4001) },
  });
  assert.equal(oversized.status, 400);

  const edited = await api(server.base, `/rooms/${roomId}/messages/${first.body.id}`, {
    method: 'PATCH',
    token: adminToken,
    body: { content: 'edited hello @ViewerBot' },
  });
  assert.equal(edited.status, 200);
  assert.equal(edited.body.content, 'edited hello @ViewerBot');
  assert.ok(edited.body.editedAt);
  assert.deepEqual(edited.body.mentions, [{ type: 'agent', id: viewer.agent.id }]);

  const viewerEdit = await api(server.base, `/rooms/${roomId}/messages/${first.body.id}`, {
    method: 'PATCH',
    token: viewer.token,
    body: { content: 'viewer overwrite' },
  });
  assert.equal(viewerEdit.status, 403);

  const search = await api(
    server.base,
    `/rooms/${roomId}/messages/search?q=${encodeURIComponent('edited hello')}`,
    { token: adminToken },
  );
  assert.equal(search.status, 200);
  assert.equal(search.body.messages.length, 1);
  assert.equal(search.body.messages[0].id, first.body.id);
  assert.ok(search.body.messages[0].editedAt);

  const literalSearch = await api(
    server.base,
    `/rooms/${roomId}/messages/search?q=${encodeURIComponent('%_')}`,
    { token: adminToken },
  );
  assert.equal(literalSearch.status, 200);
  assert.equal(literalSearch.body.messages.length, 0);

  const outsiderSearch = await api(
    server.base,
    `/rooms/${roomId}/messages/search?q=hello`,
    { token: memberToken },
  );
  assert.equal(outsiderSearch.status, 404);

  const ws = await openWs(`${server.base.replace('http', 'ws')}/ws?token=${adminToken}`);
  try {
    const inbox = wsCollector(ws);
    await inbox.waitFor('ready');
    ws.send(JSON.stringify({ type: 'room.join', roomId }));
    await inbox.waitFor('room.state');

    ws.send(JSON.stringify({ type: 'typing.set', roomId, typing: true }));
    const typing = await waitFor('typing indicator', () =>
      inbox.messages.find((message) => message.type === 'typing.update' && message.typing.length === 1),
    );
    assert.equal(typing.roomId, roomId);
    assert.equal(typing.typing[0].name, 'Admin');

    ws.send(JSON.stringify({ type: 'typing.set', roomId, typing: false }));
    await waitFor('typing cleared', () =>
      inbox.messages.find(
        (message) =>
          message.type === 'typing.update' && message.typing.length === 0 && message !== typing,
      ),
    );
  } finally {
    await closeWs(ws);
  }
});

test('browser sessions use an HttpOnly cookie', async () => {
  const registered = await api(server.base, '/auth/register', {
    method: 'POST',
    body: { name: 'CookieUser', email: `cookie-${RUN_ID}@test.local`, password: 'correct-horse' },
  });
  assert.equal(registered.status, 201);

  const setCookie = registered.headers.get('set-cookie') ?? '';
  assert.match(setCookie, /rf_session=/);
  assert.match(setCookie, /HttpOnly/i);
  assert.match(setCookie, /SameSite=Lax/i);
  assert.match(setCookie, /Path=\//);
  const cookie = setCookie.split(';')[0];

  const me = await api(server.base, '/me', { headers: { cookie } });
  assert.equal(me.status, 200);
  assert.equal(me.body.principal.name, 'CookieUser');

  const ws = await openWs(`${server.base.replace('http', 'ws')}/ws`, { cookie });
  try {
    const inbox = wsCollector(ws);
    const ready = await inbox.waitFor('ready');
    assert.equal(ready.principal.name, 'CookieUser');
  } finally {
    await closeWs(ws);
  }

  const logout = await api(server.base, '/auth/logout', { method: 'POST', headers: { cookie } });
  assert.equal(logout.status, 204);
  assert.match(logout.headers.get('set-cookie') ?? '', /Max-Age=0/);
});

test('profile pictures are assigned automatically and can be changed', async () => {
  const initial = await roomState();
  assert.match(String(initial.me.avatar), AVATAR_PATTERN);
  const selfMember = initial.members.find(
    (member: any) => member.type === 'user' && member.id === initial.me.id,
  );
  assert.equal(selfMember?.avatar, initial.me.avatar);

  const created = await createAgent({ name: 'PortraitBot', role: 'member' });
  assert.match(String(created.agent.avatar), AVATAR_PATTERN);
  const agentPrincipal = await api(server.base, '/me', { token: created.token });
  assert.equal(agentPrincipal.status, 200);
  assert.equal(agentPrincipal.body.principal.avatar, created.agent.avatar);

  const withAgent = await roomState();
  const agentMember = withAgent.members.find(
    (member: any) => member.type === 'agent' && member.id === created.agent.id,
  );
  assert.equal(agentMember?.avatar, created.agent.avatar);

  const userAvatar = 'avatar-17';
  const userPatch = await api(server.base, '/me/profile', {
    method: 'PATCH',
    token: adminToken,
    body: { avatar: userAvatar },
  });
  assert.equal(userPatch.status, 200);
  assert.equal(userPatch.body.profile.type, 'user');
  assert.ok(!('password_hash' in userPatch.body.profile));
  assert.equal(userPatch.body.profile.avatar, userAvatar);

  const userProfile = await api(server.base, '/me/profile', { token: adminToken });
  assert.equal(userProfile.body.profile.avatar, userAvatar);
  const publicUser = await api(server.base, `/profiles/users/${userProfile.body.profile.handle}`);
  assert.equal(publicUser.status, 200);
  assert.equal(publicUser.body.profile.avatar, userAvatar);

  const agentAvatar = 'avatar-04';
  const agentPatch = await api(server.base, `/agents/${created.agent.id}/profile`, {
    method: 'PATCH',
    token: adminToken,
    body: { avatar: agentAvatar },
  });
  assert.equal(agentPatch.status, 200);
  assert.equal(agentPatch.body.profile.avatar, agentAvatar);
  const publicAgent = await api(server.base, `/profiles/agents/${agentPatch.body.profile.handle}`);
  assert.equal(publicAgent.status, 200);
  assert.equal(publicAgent.body.profile.avatar, agentAvatar);

  const refreshed = await roomState();
  assert.equal(refreshed.me.avatar, userAvatar);
  const refreshedAgent = refreshed.members.find(
    (member: any) => member.type === 'agent' && member.id === created.agent.id,
  );
  assert.equal(refreshedAgent?.avatar, agentAvatar);

  for (const invalid of ['avatar-00', 'avatar-31', '../avatar-01']) {
    const rejected = await api(server.base, '/me/profile', {
      method: 'PATCH',
      token: adminToken,
      body: { avatar: invalid },
    });
    assert.equal(rejected.status, 400, invalid);
  }
  const rejectedAgent = await api(server.base, `/agents/${created.agent.id}/profile`, {
    method: 'PATCH',
    token: adminToken,
    body: { avatar: 'avatar-31' },
  });
  assert.equal(rejectedAgent.status, 400);
});

test('agent join over REST polling and admin approval', async () => {
  const join = await api(server.base, `/agent/join/${roomCode}`, {
    method: 'POST',
    body: { name: 'JoinBot', description: 'polling agent', deliveryMode: 'socket' },
  });
  assert.equal(join.status, 202);
  assert.equal(join.body.status, 'pending');
  const key = join.body.request.key as string;
  assert.ok(key);

  const pending = await api(server.base, `/agent/join/requests/${key}`);
  assert.equal(pending.status, 200);
  assert.equal(pending.body.status, 'pending');

  const memberList = await api(server.base, `/rooms/${roomId}/join-requests`, { token: memberToken });
  assert.equal(memberList.status, 404);

  const memberApprove = await api(server.base, `/rooms/${roomId}/join-requests/anything/approve`, {
    method: 'POST',
    token: memberToken,
  });
  assert.equal(memberApprove.status, 404);

  const list = await api(server.base, `/rooms/${roomId}/join-requests`, { token: adminToken });
  assert.equal(list.status, 200);
  const request = list.body.requests.find((entry: any) => entry.name === 'JoinBot');
  assert.ok(request, 'pending JoinBot request should be listed');

  const approve = await api(server.base, `/rooms/${roomId}/join-requests/${request.id}/approve`, {
    method: 'POST',
    token: adminToken,
  });
  assert.equal(approve.status, 200);
  assert.equal(approve.body.member.type, 'agent');
  assert.match(approve.body.member.avatar, AVATAR_PATTERN);
  const agentToken = approve.body.token as string;
  assert.match(agentToken, /^rf_/);

  const me = await api(server.base, '/me', { token: agentToken });
  assert.equal(me.status, 200);
  assert.equal(me.body.principal.type, 'agent');
  assert.equal(me.body.principal.name, 'JoinBot');
  assert.equal(me.body.room.id, roomId);

  const approved = await api(server.base, `/agent/join/requests/${key}`);
  assert.equal(approved.status, 200);
  assert.equal(approved.body.status, 'approved');
  assert.equal(approved.body.token, agentToken);
  assert.equal(approved.body.room.id, roomId);
});

test('agent join socket is promoted on approval', async () => {
  const join = await api(server.base, `/agent/join/${roomCode}`, {
    method: 'POST',
    body: { name: 'SocketJoinBot', deliveryMode: 'socket' },
  });
  assert.equal(join.status, 202);
  const key = join.body.request.key as string;

  const ws = await openWs(`${server.base.replace('http', 'ws')}/ws?join=${encodeURIComponent(key)}`);
  const inbox = wsCollector(ws);
  try {
    await inbox.waitFor('join.pending');

    const list = await api(server.base, `/rooms/${roomId}/join-requests`, { token: adminToken });
    const request = list.body.requests.find((entry: any) => entry.name === 'SocketJoinBot');
    assert.ok(request);

    const approve = await api(server.base, `/rooms/${roomId}/join-requests/${request.id}/approve`, {
      method: 'POST',
      token: adminToken,
    });
    assert.equal(approve.status, 200);

    const approved = await inbox.waitFor('join.approved');
    assert.match(approved.token, /^rf_/);
    const ready = await inbox.waitFor('ready');
    assert.equal(ready.principal.name, 'SocketJoinBot');
    const state = await inbox.waitFor('room.state');
    assert.equal(state.state.room.id, roomId);
  } finally {
    await closeWs(ws);
  }
});

test('denied join request reports denied', async () => {
  const join = await api(server.base, `/agent/join/${roomCode}`, {
    method: 'POST',
    body: { name: 'DenyBot', deliveryMode: 'socket' },
  });
  assert.equal(join.status, 202);
  const key = join.body.request.key as string;

  const list = await api(server.base, `/rooms/${roomId}/join-requests`, { token: adminToken });
  const request = list.body.requests.find((entry: any) => entry.name === 'DenyBot');
  assert.ok(request);

  const deny = await api(server.base, `/rooms/${roomId}/join-requests/${request.id}/deny`, {
    method: 'POST',
    token: adminToken,
  });
  assert.equal(deny.status, 200);

  const polled = await api(server.base, `/agent/join/requests/${key}`);
  assert.equal(polled.status, 200);
  assert.equal(polled.body.status, 'denied');
});

test('trigger delivery is signed and leaks neither message text nor token', async () => {
  const captured: { headers: http.IncomingHttpHeaders; raw: string }[] = [];
  const capture = http.createServer((req, res) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
    });
    req.on('end', () => {
      captured.push({ headers: req.headers, raw });
      res.writeHead(202).end('ok');
    });
  });
  await new Promise<void>((resolveListen) => capture.listen(0, '127.0.0.1', resolveListen));
  const capturePort = (capture.address() as AddressInfo).port;

  try {
    const agent = await createAgent({
      name: 'WakeBot',
      role: 'member',
      deliveryMode: 'trigger',
      triggerUrl: `http://127.0.0.1:${capturePort}/wake`,
    });
    assert.match(agent.triggerSecret ?? '', /^ts_/);

    const phrase = `SECRET_TEXT_${crypto.randomBytes(8).toString('hex')}`;
    const posted = await api(server.base, `/rooms/${roomId}/messages`, {
      method: 'POST',
      token: adminToken,
      body: {
        content: `@WakeBot ${phrase}`,
        kind: 'chat',
        mentions: [{ type: 'agent', id: agent.agent.id }],
      },
    });
    assert.equal(posted.status, 201);

    const request = await waitFor('trigger delivery', () => {
      const match = captured.find((entry) => {
        try {
          return JSON.parse(entry.raw).messageId === posted.body.id;
        } catch {
          return false;
        }
      });
      return match;
    });

    const timestamp = Number(request.headers['x-roomforge-timestamp']);
    assert.ok(Number.isInteger(timestamp));
    const expected = `sha256=${crypto
      .createHmac('sha256', agent.triggerSecret!)
      .update(`${timestamp}.${request.raw}`)
      .digest('hex')}`;
    assert.equal(request.headers['x-roomforge-signature'], expected);

    const payload = JSON.parse(request.raw);
    assert.deepEqual(Object.keys(payload).sort(), [
      'agentId',
      'createdAt',
      'eventId',
      'messageId',
      'roomId',
      'seq',
      'type',
    ]);
    assert.equal(payload.type, 'mention');
    assert.equal(payload.roomId, roomId);
    assert.equal(payload.agentId, agent.agent.id);
    assert.equal(payload.messageId, posted.body.id);
    assert.equal(request.headers['x-roomforge-event-id'], payload.eventId);
    assert.ok(!request.raw.includes(phrase), 'message text must not be in the trigger payload');
    assert.ok(!request.raw.includes(agent.token), 'agent token must not be in the trigger payload');
    assert.ok(!('content' in payload) && !('text' in payload));

    await waitFor(
      'waking presence',
      async () => presenceOf(await roomState(), agent.agent.id)?.status === 'waking',
      5_000,
    );

    const expired = await waitFor(
      'wake expiry',
      async () => {
        const state = await roomState();
        const message = state.messages.find((entry: any) =>
          String(entry.content).includes('was woken but did not connect'),
        );
        return presenceOf(state, agent.agent.id)?.status === 'unreachable' && message ? message : false;
      },
      20_000,
      500,
    );
    assert.match(expired.content, /WakeBot was woken but did not connect/);

    const ws = await openWs(
      `${server.base.replace('http', 'ws')}/ws?token=${encodeURIComponent(agent.token)}`,
    );
    const inbox = wsCollector(ws);
    try {
      await inbox.waitFor('ready');
      const before = captured.length;
      const liveMention = await api(server.base, `/rooms/${roomId}/messages`, {
        method: 'POST',
        token: adminToken,
        body: {
          content: '@WakeBot live socket message',
          mentions: [{ type: 'agent', id: agent.agent.id }],
        },
      });
      assert.equal(liveMention.status, 201);
      await sleep(1_600);
      assert.equal(captured.length, before, 'a connected agent must not receive a trigger');
      const state = await roomState();
      assert.equal(presenceOf(state, agent.agent.id)?.status, 'online');
    } finally {
      await closeWs(ws);
    }
  } finally {
    await new Promise<void>((resolveClose) => capture.close(() => resolveClose()));
  }
});

test('failed trigger retries until the agent is unreachable', async () => {
  const closedPort = await freePort();
  const agent = await createAgent({
    name: 'RetryBot',
    role: 'member',
    deliveryMode: 'trigger',
    triggerUrl: `http://127.0.0.1:${closedPort}/wake`,
  });
  retryAgentId = agent.agent.id;

  const posted = await api(server.base, `/rooms/${roomId}/messages`, {
    method: 'POST',
    token: adminToken,
    body: {
      content: '@RetryBot are you there?',
      mentions: [{ type: 'agent', id: agent.agent.id }],
    },
  });
  assert.equal(posted.status, 201);

  const failed = await waitFor(
    'terminal trigger failure',
    async () => {
      const state = await roomState();
      const message = state.messages.find((entry: any) =>
        String(entry.content).includes('RetryBot is unreachable (trigger failed)'),
      );
      return presenceOf(state, agent.agent.id)?.status === 'unreachable' && message ? message : false;
    },
    25_000,
    250,
  );
  assert.match(failed.content, /unreachable/);
});

test('metrics expose trigger queue health', async () => {
  const metrics = await api(server.base, '/metrics');
  assert.equal(metrics.status, 200);
  assert.equal(metrics.body.ok, true);
  assert.ok(metrics.body.requests.total > 0);
  assert.equal(typeof metrics.body.memoryRssMb, 'number');
  assert.ok(metrics.body.trigger, 'trigger stats should be present');
  assert.ok(metrics.body.trigger.delivered24h >= 1);
  assert.ok(metrics.body.trigger.failed >= 1);
  assert.equal(typeof metrics.body.trigger.pending, 'number');
  assert.ok(
    metrics.body.trigger.oldestPendingAt === null ||
      typeof metrics.body.trigger.oldestPendingAt === 'string',
  );
});

test('maintenance prunes terminal events and expires stale join requests', async () => {
  const db = new DatabaseSync(dbPath);
  db.exec('PRAGMA busy_timeout = 5000');
  const old = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
  const fresh = new Date().toISOString();
  const future = '2099-01-01T00:00:00.000Z';
  const eventIds = {
    delivered: `evt_prune_delivered_${RUN_ID}`,
    failed: `evt_prune_failed_${RUN_ID}`,
    pending: `evt_prune_pending_${RUN_ID}`,
  };
  const requestIds = { stale: `jr_stale_${RUN_ID}`, fresh: `jr_fresh_${RUN_ID}` };
  const insertEvent = db.prepare(
    'INSERT INTO trigger_events (id, agent_id, room_id, message_id, seq, status, attempts, next_attempt_at, created_at, delivered_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
  );
  const insertRequest = db.prepare(
    "INSERT INTO room_join_requests (id, room_id, kind, request_key, name, status, created_at) VALUES (?, ?, 'agent', ?, ?, 'pending', ?)",
  );

  try {
    insertEvent.run(
      eventIds.delivered,
      retryAgentId,
      roomId,
      `msg_${RUN_ID}_delivered`,
      900,
      'delivered',
      1,
      future,
      old,
      old,
    );
    insertEvent.run(
      eventIds.failed,
      retryAgentId,
      roomId,
      `msg_${RUN_ID}_failed`,
      901,
      'failed',
      4,
      future,
      old,
      null,
    );
    insertEvent.run(
      eventIds.pending,
      retryAgentId,
      roomId,
      `msg_${RUN_ID}_pending`,
      902,
      'pending',
      0,
      future,
      old,
      null,
    );
    insertRequest.run(requestIds.stale, roomId, requestIds.stale, 'StaleBot', old);
    insertRequest.run(requestIds.fresh, roomId, requestIds.fresh, 'FreshBot', fresh);

    await waitFor(
      'maintenance sweep',
      () => {
        const events = db
          .prepare('SELECT id FROM trigger_events WHERE id IN (?, ?, ?)')
          .all(eventIds.delivered, eventIds.failed, eventIds.pending) as { id: string }[];
        const present = new Set(events.map((row) => row.id));
        const requests = db
          .prepare('SELECT id, status FROM room_join_requests WHERE id IN (?, ?)')
          .all(requestIds.stale, requestIds.fresh) as { id: string; status: string }[];
        const statuses = new Map(requests.map((row) => [row.id, row.status]));
        return (
          !present.has(eventIds.delivered) &&
          !present.has(eventIds.failed) &&
          present.has(eventIds.pending) &&
          statuses.get(requestIds.stale) === 'denied' &&
          statuses.get(requestIds.fresh) === 'pending'
        );
      },
      10_000,
      250,
    );

    await waitFor('maintenance log', () => /"msg":"maintenance"/.test(server.logs()), 5_000, 100);
  } finally {
    db.prepare('DELETE FROM trigger_events WHERE id = ?').run(eventIds.pending);
    db.prepare('DELETE FROM room_join_requests WHERE id IN (?, ?)').run(requestIds.stale, requestIds.fresh);
    db.close();
  }
});

test('production refuses to start without JWT_SECRET', async () => {
  const child = spawn(process.execPath, ['--import', 'tsx', 'src/index.ts'], {
    cwd: serverDir,
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: String(await freePort()),
      DB_PATH: join(tempDir, 'insecure.db'),
      JWT_SECRET: '',
      TRIGGER_SECRET_ENC_KEY: crypto.randomBytes(32).toString('base64'),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let log = '';
  child.stdout?.on('data', (chunk) => {
    log += chunk.toString();
  });
  child.stderr?.on('data', (chunk) => {
    log += chunk.toString();
  });
  const code = await Promise.race([
    new Promise<number | null>((resolveExit) => child.once('exit', (value) => resolveExit(value))),
    sleep(20_000).then(() => {
      child.kill();
      return null;
    }),
  ]);
  assert.notEqual(code, null, 'server should exit instead of listening without a secret');
  assert.notEqual(code, 0);
  assert.match(log, /JWT_SECRET is required in production/);
});

test('login attempts are rate limited', async () => {
  let limited = false;
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const response = await api(server.base, '/auth/login', {
      method: 'POST',
      body: { email: `admin-${RUN_ID}@test.local`, password: 'wrong-password' },
    });
    if (response.status === 429) {
      limited = true;
      break;
    }
    assert.equal(response.status, 401);
  }
  assert.equal(limited, true, 'repeated failed logins should be rate limited');
});

test('SIGTERM shuts the server down cleanly', { skip: process.platform === 'win32' }, async () => {
  const second = await startServer(join(tempDir, 'shutdown.db'));
  try {
    second.child.kill('SIGTERM');
    const result = await Promise.race([
      second.exit,
      sleep(10_000).then(() => {
        throw new Error('server did not exit after SIGTERM');
      }),
    ]);
    assert.equal(result.code, 0);
    assert.match(second.logs(), /Shutting down \(SIGTERM\)/);
  } finally {
    await stopServer(second);
  }
});
