// Demo room agent. It joins over the same WebSocket API as the web client,
// answers instructions aimed at it, and moves assigned tasks to review.
import WebSocket from 'ws';

function argValue(flag) {
  const index = process.argv.indexOf(flag);
  return index > 0 && process.argv[index + 1] ? process.argv[index + 1] : undefined;
}

const SERVER_URL = argValue('--server') ?? process.env.SERVER_URL ?? 'http://localhost:4000';
const TOKEN = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : process.env.AGENT_TOKEN;
let roomId = process.env.ROOM_ID ?? '';

if (!TOKEN) {
  console.error('Usage: npm run demo:agent -- <agent-token>\nCreate the agent in the room People panel first.');
  process.exit(1);
}

const wsUrl = `${SERVER_URL.replace(/^http/, 'ws')}/ws?token=${encodeURIComponent(TOKEN)}`;
const socket = new WebSocket(wsUrl);
const handledTasks = new Set();
const repliedMessages = new Set();

let me = { id: '', name: 'demo-agent' };

function log(...args) {
  console.log('[agent]', ...args);
}

function send(payload) {
  if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(payload));
}

function setPresence(status, activity, taskId = null) {
  send({ type: 'presence.set', ...(roomId ? { roomId } : {}), status, activity, taskId });
}

function postMessage(content) {
  send({ type: 'message.send', ...(roomId ? { roomId } : {}), content, kind: 'chat' });
}

async function patchTask(taskId, body) {
  const response = await fetch(`${SERVER_URL}/api/rooms/${roomId}/tasks/${taskId}`, {
    method: 'PATCH',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${TOKEN}`,
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    log('failed to update task', taskId, response.status, await response.text());
    return null;
  }
  return response.json();
}

function maybeHandleTask(task) {
  if (!task || task.assigneeType !== 'agent' || task.assigneeId !== me.id) return;
  if (task.status !== 'doing' || handledTasks.has(task.id)) return;

  handledTasks.add(task.id);
  setPresence('working', `Working on “${task.title}”`, task.id);
  log(`picked up task: ${task.title}`);

  setTimeout(async () => {
    const updated = await patchTask(task.id, { status: 'review' });
    if (updated) {
      setPresence('online', 'Ready for the next instruction');
      postMessage(`“${updated.title}” is ready for review. Scope: ${updated.paths || 'whole task'}.`);
      log(`moved task to review: ${task.title}`);
    }
  }, 4000);
}

function maybeReply(message) {
  if (!message || message.senderId === me.id) return;
  if (repliedMessages.has(message.id)) return;

  const text = String(message.content ?? '');
  const mentioned = text.toLowerCase().includes(me.name.toLowerCase());
  if (message.kind !== 'instruction' && !mentioned) return;

  repliedMessages.add(message.id);
  setPresence('working', 'Responding to an instruction');
  log(`received ${message.kind} from ${message.senderName}: ${text.slice(0, 80)}`);

  setTimeout(() => {
    postMessage(
      `Acknowledged, ${message.senderName}. I've logged the ${message.kind} and will report progress as I go.`,
    );
    setPresence('online', 'Ready for the next instruction');
  }, 900);
}

socket.on('open', () => {
  log('connected, waiting for the room');
});

socket.on('message', (raw) => {
  let event;
  try {
    event = JSON.parse(raw.toString());
  } catch {
    return;
  }

  switch (event.type) {
    case 'ready':
      log(`authenticated as ${event.principal.name}`);
      break;
    case 'room.state': {
      me = event.state.me;
      roomId = event.state.room.id;
      log(`joined room “${event.state.room.name}” as ${me.name}`);
      setPresence('working', 'Watching for instructions');
      for (const task of event.state.tasks ?? []) maybeHandleTask(task);
      break;
    }
    case 'message.new':
      maybeReply(event.message);
      break;
    case 'task.updated':
      maybeHandleTask(event.task);
      break;
    case 'removed':
      log('removed from room, exiting');
      process.exit(0);
      break;
    case 'error':
      log('server error:', event.message);
      break;
    default:
      break;
  }
});

socket.on('close', (code) => {
  log('disconnected', code);
  process.exit(0);
});

socket.on('error', (error) => {
  log('socket error:', error.message);
});
