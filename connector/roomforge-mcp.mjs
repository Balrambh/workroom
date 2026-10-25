#!/usr/bin/env node
/* RoomForge MCP bridge: exposes one room to any MCP-capable agent runtime.
 *
 * Transport: newline-delimited JSON-RPC 2.0 over stdio (MCP stdio transport).
 * Auth:      ROOMFORGE_TOKEN (an agent or user API token, never logged).
 * Endpoint:  ROOMFORGE_URL (default http://localhost:3000).
 * Room:      ROOMFORGE_ROOM_ID, or resolved from /api/me for agent tokens.
 *
 * The bridge is intentionally dependency-free so it can run inside any host
 * that can spawn `node connector/roomforge-mcp.mjs`.
 */

const VERSION = '0.1.0';
const FALLBACK_PROTOCOL = '2025-06-18';
const REQUEST_TIMEOUT_MS = 30_000;

function cliValue(flag) {
  const index = process.argv.indexOf(flag);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

const baseUrl = (process.env.ROOMFORGE_URL || cliValue('--url') || 'http://localhost:3000').replace(/\/+$/, '');
const token = process.env.ROOMFORGE_TOKEN || cliValue('--token') || '';
const configuredRoomId = process.env.ROOMFORGE_ROOM_ID || cliValue('--room') || '';

if (!token) {
  process.stderr.write(
    '[roomforge-mcp] ROOMFORGE_TOKEN is not set. Tool calls will fail until it is provided.\n',
  );
}

class BridgeError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'BridgeError';
    this.status = status;
  }
}

async function api(path, options = {}) {
  if (!token) {
    throw new BridgeError(
      'ROOMFORGE_TOKEN is not configured for this MCP server. Add it to the server environment and restart the MCP client.',
    );
  }
  const url = new URL(`${baseUrl}/api${path}`);
  for (const [key, value] of Object.entries(options.query ?? {})) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  }
  const headers = {
    authorization: `Bearer ${token}`,
    accept: 'application/json',
  };
  let body;
  if (options.body !== undefined) {
    headers['content-type'] = 'application/json';
    body = JSON.stringify(options.body);
  }

  let response;
  try {
    response = await fetch(url, {
      method: options.method ?? (body === undefined ? 'GET' : 'POST'),
      headers,
      body,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new BridgeError(`Could not reach RoomForge at ${baseUrl}: ${reason}`);
  }

  const text = await response.text();
  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }
  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && typeof payload.error === 'string'
        ? payload.error
        : `RoomForge returned HTTP ${response.status}`;
    throw new BridgeError(message, response.status);
  }
  return payload;
}

let identityPromise = null;
async function identity() {
  if (!identityPromise) {
    identityPromise = api('/me').catch((error) => {
      identityPromise = null;
      throw error;
    });
  }
  return identityPromise;
}

let resolvedRoomId = configuredRoomId;
async function roomId() {
  if (resolvedRoomId) return resolvedRoomId;
  const me = await identity();
  if (me?.room?.id) {
    resolvedRoomId = me.room.id;
    return resolvedRoomId;
  }
  throw new BridgeError(
    'This token is not attached to a single room. Set ROOMFORGE_ROOM_ID (or pass --room) to the room id this bridge should use.',
  );
}

async function getContext(query = {}) {
  return api(`/rooms/${encodeURIComponent(await roomId())}/context`, { query });
}

async function resolveMentions(names) {
  if (!names?.length) return [];
  const context = await getContext({ limit: 1 });
  const team = Array.isArray(context?.team) ? context.team : [];
  const resolved = [];
  const missing = [];
  for (const raw of names) {
    const needle = String(raw).replace(/^@/, '').trim().toLowerCase();
    if (!needle) continue;
    const match = team.find(
      (member) =>
        member.type === 'agent' &&
        (String(member.name).toLowerCase() === needle ||
          (member.handle && String(member.handle).toLowerCase() === needle)),
    );
    if (match) resolved.push({ type: match.type, id: match.id });
    else missing.push(raw);
  }
  if (missing.length) {
    throw new BridgeError(
      `Could not resolve agent mention${missing.length === 1 ? '' : 's'}: ${missing.join(', ')}. Use an exact agent name or handle from roomforge_context.`,
    );
  }
  return resolved;
}

/* ------------------------------- tools ---------------------------------- */

async function sendMessage(args) {
  const mentions = [
    ...(Array.isArray(args.mentions) ? args.mentions : []),
    ...(await resolveMentions(args.mentionNames)),
  ];
  const deduped = [...new Map(mentions.map((m) => [`${m.type}:${m.id}`, m])).values()];
  return api(`/rooms/${encodeURIComponent(await roomId())}/messages`, {
    method: 'POST',
    body: {
      content: args.content,
      ...(args.kind ? { kind: args.kind } : {}),
      ...(args.clientMessageId ? { clientMessageId: args.clientMessageId } : {}),
      ...(deduped.length ? { mentions: deduped } : {}),
    },
  });
}

async function readMessages(args) {
  const room = encodeURIComponent(await roomId());
  if (args.search) {
    return api(`/rooms/${room}/messages/search`, {
      query: { q: args.search, limit: args.limit },
    });
  }
  return api(`/rooms/${room}/messages`, {
    query: { after_seq: args.afterSeq, limit: args.limit ?? 40 },
  });
}

async function setPresence(args) {
  return api(`/rooms/${encodeURIComponent(await roomId())}/presence`, {
    method: 'PATCH',
    body: {
      ...(args.status ? { status: args.status } : {}),
      ...(args.activity !== undefined ? { activity: args.activity } : {}),
      ...(args.taskId !== undefined ? { taskId: args.taskId } : {}),
    },
  });
}

async function createQuestion(args) {
  const me = (await identity()).principal;
  const claim = args.claimSelf !== false;
  return api(`/rooms/${encodeURIComponent(await roomId())}/questions`, {
    method: 'POST',
    body: {
      title: args.title,
      detail: args.detail ?? '',
      ...(claim ? { ownerType: me.type, ownerId: me.id } : {}),
    },
  });
}

async function updateQuestion(args) {
  if (args.claimSelf && args.release) {
    throw new BridgeError('claimSelf and release cannot both be true.');
  }
  const me = (await identity()).principal;
  const body = {
    ...(args.status ? { status: args.status } : {}),
    ...(args.resolution !== undefined ? { resolution: args.resolution } : {}),
    ...(args.title ? { title: args.title } : {}),
    ...(args.detail !== undefined ? { detail: args.detail } : {}),
    ...(args.claimSelf ? { ownerType: me.type, ownerId: me.id } : {}),
    ...(args.release ? { ownerType: null, ownerId: null } : {}),
  };
  if (Object.keys(body).length === 0) {
    throw new BridgeError('Provide at least one field to update.');
  }
  return api(
    `/rooms/${encodeURIComponent(await roomId())}/questions/${encodeURIComponent(args.questionId)}`,
    { method: 'PATCH', body },
  );
}

async function openDecision(args) {
  return api(`/rooms/${encodeURIComponent(await roomId())}/decisions`, {
    method: 'POST',
    body: {
      title: args.title,
      context: args.context ?? '',
      options: args.options,
      ...(args.method ? { method: args.method } : {}),
      ...(args.quorum !== undefined ? { quorum: args.quorum } : {}),
      ...(args.dueAt !== undefined ? { dueAt: args.dueAt } : {}),
      ...(args.notifyAgents !== undefined ? { notifyAgents: args.notifyAgents } : {}),
      ...(args.dependsOn !== undefined ? { dependsOn: args.dependsOn } : {}),
    },
  });
}

async function voteDecision(args) {
  return api(
    `/rooms/${encodeURIComponent(await roomId())}/decisions/${encodeURIComponent(args.decisionId)}/votes`,
    {
      method: 'POST',
      body: {
        choice: args.choice,
        ...(args.comment !== undefined ? { comment: args.comment } : {}),
      },
    },
  );
}

async function closeDecision(args) {
  return api(
    `/rooms/${encodeURIComponent(await roomId())}/decisions/${encodeURIComponent(args.decisionId)}`,
    {
      method: 'PATCH',
      body: {
        status: args.withdraw ? 'withdrawn' : 'decided',
        ...(args.optionId !== undefined ? { optionId: args.optionId } : {}),
        ...(args.rationale !== undefined ? { rationale: args.rationale } : {}),
      },
    },
  );
}

async function updateTask(args) {
  return api(
    `/rooms/${encodeURIComponent(await roomId())}/tasks/${encodeURIComponent(args.taskId)}`,
    {
      method: 'PATCH',
      body: {
        ...(args.status ? { status: args.status } : {}),
        ...(args.paths !== undefined ? { paths: args.paths } : {}),
        ...(args.claim ? { assigneeType: (await identity()).principal.type, assigneeId: (await identity()).principal.id } : {}),
      },
    },
  );
}

async function createTask(args) {
  return api(`/rooms/${encodeURIComponent(await roomId())}/tasks`, {
    method: 'POST',
    body: {
      title: args.title,
      ...(args.description !== undefined ? { description: args.description } : {}),
      ...(args.paths !== undefined ? { paths: args.paths } : {}),
      ...(args.branch !== undefined ? { branch: args.branch } : {}),
      ...(args.repoId !== undefined ? { repoId: args.repoId } : {}),
      ...(args.assignSelf ? { assigneeType: (await identity()).principal.type, assigneeId: (await identity()).principal.id } : {}),
    },
  });
}

async function updateMission(args) {
  return api(`/rooms/${encodeURIComponent(await roomId())}/mission`, {
    method: 'PATCH',
    body: Object.fromEntries(
      Object.entries({
        objective: args.objective,
        successCriteria: args.successCriteria,
        constraints: args.constraints,
        phase: args.phase,
        decisionMode: args.decisionMode,
        quorum: args.quorum,
      }).filter(([, value]) => value !== undefined),
    ),
  });
}

async function createWorkstream(args) {
  return api(`/rooms/${encodeURIComponent(await roomId())}/workstreams`, {
    method: 'POST',
    body: {
      name: args.name,
      ...(args.topic !== undefined ? { topic: args.topic } : {}),
      ...(args.objective !== undefined ? { objective: args.objective } : {}),
    },
  });
}

const TOOLS = [
  {
    name: 'roomforge_context',
    description:
      'Read the room context pack: mission and phase guidance, team capabilities and presence, open questions, open decisions, tasks, recent messages, and nextActions. Call this first when you wake or join.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        afterSeq: { type: 'integer', minimum: 0, description: 'Only return messages with a sequence greater than this cursor.' },
        limit: { type: 'integer', minimum: 1, maximum: 100, description: 'Maximum recent messages to include.' },
      },
      additionalProperties: false,
    },
    handler: (args) => getContext({ after_seq: args.afterSeq, limit: args.limit }),
  },
  {
    name: 'roomforge_whoami',
    description: 'Return the authenticated principal and the room this bridge is attached to.',
    annotations: { readOnlyHint: true },
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    handler: async () => ({ ...(await identity()), roomId: await roomId() }),
  },
  {
    name: 'roomforge_read_messages',
    description: 'Read room messages, optionally after a sequence cursor or matching a search query.',
    annotations: { readOnlyHint: true },
    inputSchema: {
      type: 'object',
      properties: {
        afterSeq: { type: 'integer', minimum: 0 },
        limit: { type: 'integer', minimum: 1, maximum: 100 },
        search: { type: 'string', minLength: 2, maxLength: 100 },
      },
      additionalProperties: false,
    },
    handler: readMessages,
  },
  {
    name: 'roomforge_send_message',
    description:
      'Post a message to the room. Tags keep the message inside the room. Use mentionNames to wake sleeping agents by exact name or handle.',
    inputSchema: {
      type: 'object',
      properties: {
        content: { type: 'string', minLength: 1, maxLength: 4000 },
        kind: { type: 'string', enum: ['chat', 'instruction', 'suggestion'] },
        clientMessageId: { type: 'string', maxLength: 100, description: 'Idempotency key; replaying the same key returns the original message.' },
        mentionNames: { type: 'array', items: { type: 'string' }, maxItems: 20 },
        mentions: {
          type: 'array',
          maxItems: 20,
          items: {
            type: 'object',
            properties: {
              type: { type: 'string', enum: ['user', 'agent'] },
              id: { type: 'string' },
            },
            required: ['type', 'id'],
            additionalProperties: false,
          },
        },
      },
      required: ['content'],
      additionalProperties: false,
    },
    handler: sendMessage,
  },
  {
    name: 'roomforge_set_presence',
    description: 'Publish what you are doing so humans and other agents can see your live state.',
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['online', 'working', 'reviewing', 'away'] },
        activity: { type: 'string', maxLength: 160 },
        taskId: { type: ['string', 'null'] },
      },
      additionalProperties: false,
    },
    handler: setPresence,
  },
  {
    name: 'roomforge_create_question',
    description:
      'Raise an open question during framing. Claim it by default so the room can see who is investigating; it can be resolved later with what was learned.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', minLength: 3, maxLength: 160 },
        detail: { type: 'string', maxLength: 4000 },
        claimSelf: { type: 'boolean', description: 'Take ownership of the question. Defaults to true.' },
      },
      required: ['title'],
      additionalProperties: false,
    },
    handler: createQuestion,
  },
  {
    name: 'roomforge_update_question',
    description: 'Claim, release, park, or resolve an open question. Resolving requires a resolution that captures what the room learned.',
    inputSchema: {
      type: 'object',
      properties: {
        questionId: { type: 'string' },
        status: { type: 'string', enum: ['open', 'resolved', 'parked'] },
        resolution: { type: 'string', maxLength: 4000 },
        title: { type: 'string', minLength: 3, maxLength: 160 },
        detail: { type: 'string', maxLength: 4000 },
        claimSelf: { type: 'boolean' },
        release: { type: 'boolean' },
      },
      required: ['questionId'],
      additionalProperties: false,
    },
    handler: updateQuestion,
  },
  {
    name: 'roomforge_open_decision',
    description:
      'Open a structured decision. Consent needs exactly one proposal option; majority, quorum, and admin call need at least two. Agents are woken by mention unless notifyAgents is false.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', minLength: 3, maxLength: 180 },
        context: { type: 'string', maxLength: 4000 },
        options: { type: 'array', items: { type: 'string', minLength: 1, maxLength: 200 }, minItems: 1, maxItems: 8 },
        method: { type: 'string', enum: ['admin', 'consent', 'majority', 'quorum'] },
        quorum: { type: 'integer', minimum: 1, maximum: 50 },
        dueAt: { type: ['string', 'null'], description: 'ISO 8601 timestamp.' },
        notifyAgents: { type: 'boolean' },
        dependsOn: {
          type: 'array',
          maxItems: 5,
          description:
            'Decisions this one is blocked by. Targets must be in this room, its parent, or one of its workstreams.',
          items: {
            type: 'object',
            properties: {
              roomId: { type: 'string' },
              decisionId: { type: 'string' },
            },
            required: ['roomId', 'decisionId'],
            additionalProperties: false,
          },
        },
      },
      required: ['title', 'options'],
      additionalProperties: false,
    },
    handler: openDecision,
  },
  {
    name: 'roomforge_vote',
    description:
      'Cast or change your vote on an open decision. Consent decisions use consent, objection, or abstain; other methods use an option id from roomforge_context.',
    inputSchema: {
      type: 'object',
      properties: {
        decisionId: { type: 'string' },
        choice: { type: 'string', minLength: 1, maxLength: 80 },
        comment: { type: 'string', maxLength: 1000 },
      },
      required: ['decisionId', 'choice'],
      additionalProperties: false,
    },
    handler: voteDecision,
  },
  {
    name: 'roomforge_close_decision',
    description:
      'Close an open decision. Non-admins can close only when the room outcome is ready and every dependency is decided; admins can override with a rationale. Set withdraw to discard the decision instead.',
    inputSchema: {
      type: 'object',
      properties: {
        decisionId: { type: 'string' },
        optionId: { type: 'string' },
        rationale: { type: 'string', maxLength: 4000 },
        withdraw: { type: 'boolean' },
      },
      required: ['decisionId'],
      additionalProperties: false,
    },
    handler: closeDecision,
  },
  {
    name: 'roomforge_create_task',
    description: 'Create an execution task once the room has decided. Use roomforge_context to see existing work first.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', minLength: 1, maxLength: 200 },
        description: { type: 'string', maxLength: 4000 },
        paths: { type: 'string', description: 'Comma-separated repository paths in scope.' },
        branch: { type: 'string', maxLength: 80 },
        repoId: { type: ['string', 'null'] },
        assignSelf: { type: 'boolean' },
      },
      required: ['title'],
      additionalProperties: false,
    },
    handler: createTask,
  },
  {
    name: 'roomforge_update_task',
    description:
      'Claim an unassigned task or move your task to another status. Only the creator or an admin can edit task details.',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: { type: 'string' },
        status: { type: 'string', enum: ['todo', 'doing', 'review', 'done'] },
        paths: { type: 'string' },
        claim: { type: 'boolean' },
      },
      required: ['taskId'],
      additionalProperties: false,
    },
    handler: updateTask,
  },
  {
    name: 'roomforge_update_mission',
    description:
      'Update the mission brief, phase, decision rule, or quorum. Admin only. Humans usually own this; use it only when the room has explicitly asked you to.',
    inputSchema: {
      type: 'object',
      properties: {
        objective: { type: 'string', maxLength: 4000 },
        successCriteria: { type: 'string', maxLength: 4000 },
        constraints: { type: 'string', maxLength: 4000 },
        phase: { type: 'string', enum: ['frame', 'explore', 'decide', 'build', 'review', 'shipped'] },
        decisionMode: { type: 'string', enum: ['admin', 'consent', 'majority', 'quorum'] },
        quorum: { type: 'integer', minimum: 1, maximum: 50 },
      },
      additionalProperties: false,
    },
    handler: updateMission,
  },
  {
    name: 'roomforge_create_workstream',
    description:
      'Split this room into a child workstream with its own mission, questions, and decisions. Admin only. Human members are copied with their roles; room-scoped agents must join the new room separately.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', minLength: 3, maxLength: 80 },
        topic: { type: 'string', maxLength: 400 },
        objective: { type: 'string', maxLength: 4000 },
      },
      required: ['name'],
      additionalProperties: false,
    },
    handler: createWorkstream,
  },
];

const TOOL_MAP = new Map(TOOLS.map((tool) => [tool.name, tool]));

/* ----------------------------- JSON-RPC core ----------------------------- */

function write(message) {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

function reply(id, result) {
  write({ jsonrpc: '2.0', id, result });
}

function replyError(id, code, message, data) {
  write({ jsonrpc: '2.0', id, error: { code, message, ...(data ? { data } : {}) } });
}

const INSTRUCTIONS = [
  'You are participating in a RoomForge room alongside humans and other agents.',
  'Call roomforge_context first. It returns the mission phase, open questions, open decisions, team capabilities, tasks, and nextActions.',
  'Work early: raise and claim questions while the room is still framing, before tasks exist.',
  'Use structured decisions instead of asserting consensus in chat. Vote with an option id; close only when the room outcome is ready. Record cross-room blockers with dependsOn instead of assuming another workstream agreed.',
  'If the problem is too large for one room, an admin can split it with roomforge_create_workstream; each child room keeps its own context small.',
  'Write durable context into questions, decisions, and tasks rather than only into messages.',
].join(' ');

async function handleToolsCall(id, params) {
  const name = params?.name;
  const tool = TOOL_MAP.get(name);
  if (!tool) {
    replyError(id, -32602, `Unknown tool: ${name}`);
    return;
  }
  const args =
    params?.arguments && typeof params.arguments === 'object' ? params.arguments : {};
  try {
    const result = await tool.handler(args);
    reply(id, {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      isError: false,
    });
  } catch (error) {
    const message =
      error instanceof BridgeError
        ? error.message
        : error instanceof Error
          ? error.message
          : 'Tool call failed';
    process.stderr.write(`[roomforge-mcp] ${name} failed: ${message}\n`);
    reply(id, {
      content: [{ type: 'text', text: `Error: ${message}` }],
      isError: true,
    });
  }
}

async function handleResourcesRead(id, params) {
  const uri = params?.uri;
  try {
    let value;
    if (uri === 'roomforge://context') {
      value = await getContext({ limit: 40 });
    } else if (uri === 'roomforge://mission') {
      const context = await getContext({ limit: 1 });
      value = context?.mission ?? null;
    } else if (uri === 'roomforge://decisions') {
      const context = await getContext({ limit: 1 });
      value = context?.decisions ?? null;
    } else if (uri === 'roomforge://questions') {
      const context = await getContext({ limit: 1 });
      value = context?.questions ?? null;
    } else if (uri === 'roomforge://workstreams') {
      const context = await getContext({ limit: 1 });
      value = {
        parent: context?.parent ?? null,
        workstreams: context?.workstreams ?? [],
        relatedDecisions: context?.relatedDecisions ?? [],
      };
    } else {
      replyError(id, -32602, `Unknown resource: ${uri}`);
      return;
    }
    reply(id, {
      contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(value, null, 2) }],
    });
  } catch (error) {
    replyError(id, -32603, error instanceof Error ? error.message : 'Resource read failed');
  }
}

async function handle(message) {
  if (!message || typeof message !== 'object' || message.jsonrpc !== '2.0') {
    replyError(message?.id ?? null, -32600, 'Invalid Request');
    return;
  }
  const isNotification = message.id === undefined || message.id === null;

  switch (message.method) {
    case 'initialize':
      reply(message.id, {
        protocolVersion: message.params?.protocolVersion || FALLBACK_PROTOCOL,
        capabilities: {
          tools: { listChanged: false },
          resources: { subscribe: false, listChanged: false },
        },
        serverInfo: { name: 'roomforge', title: 'RoomForge', version: VERSION },
        instructions: INSTRUCTIONS,
      });
      return;
    case 'notifications/initialized':
    case 'notifications/cancelled':
    case 'notifications/roots/list_changed':
      return;
    case 'ping':
      if (!isNotification) reply(message.id, {});
      return;
    case 'tools/list':
      reply(message.id, {
        tools: TOOLS.map(({ name, description, inputSchema, annotations }) => ({
          name,
          description,
          inputSchema,
          ...(annotations ? { annotations } : {}),
        })),
      });
      return;
    case 'tools/call':
      if (isNotification) return;
      await handleToolsCall(message.id, message.params);
      return;
    case 'resources/list':
      reply(message.id, {
        resources: [
          { uri: 'roomforge://context', name: 'Room context pack', mimeType: 'application/json', description: 'Mission, team, questions, decisions, tasks, and recent messages.' },
          { uri: 'roomforge://mission', name: 'Mission', mimeType: 'application/json' },
          { uri: 'roomforge://questions', name: 'Questions', mimeType: 'application/json' },
          { uri: 'roomforge://decisions', name: 'Decisions', mimeType: 'application/json' },
          { uri: 'roomforge://workstreams', name: 'Workstreams', mimeType: 'application/json', description: 'Parent brief, child workstreams, and related decisions for dependency links.' },
        ],
      });
      return;
    case 'resources/read':
      if (isNotification) return;
      await handleResourcesRead(message.id, message.params);
      return;
    case 'prompts/list':
      reply(message.id, { prompts: [] });
      return;
    case 'completions/complete':
      reply(message.id, { completion: { values: [] } });
      return;
    default:
      if (!isNotification) replyError(message.id, -32601, `Method not found: ${message.method}`);
  }
}

let buffer = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  buffer += chunk;
  let newline = buffer.indexOf('\n');
  while (newline !== -1) {
    const line = buffer.slice(0, newline).trim();
    buffer = buffer.slice(newline + 1);
    if (line) {
      let message;
      try {
        message = JSON.parse(line);
      } catch {
        replyError(null, -32700, 'Parse error');
        newline = buffer.indexOf('\n');
        continue;
      }
      if (Array.isArray(message)) {
        for (const entry of message) handle(entry);
      } else {
        handle(message);
      }
    }
    newline = buffer.indexOf('\n');
  }
});

process.stdin.on('end', () => {
  process.exit(0);
});

process.stderr.write(
  `[roomforge-mcp] ready · ${baseUrl}${resolvedRoomId ? ` · room ${resolvedRoomId}` : ' · room resolved from token'}\n`,
);
