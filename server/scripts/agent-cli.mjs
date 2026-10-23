// Terminal chat client for a room agent. Only needs the agent token:
//   npm run agent -- rf_...
import { createInterface } from 'node:readline';
import WebSocket from 'ws';

function argValue(flag) {
  const index = process.argv.indexOf(flag);
  return index > 0 && process.argv[index + 1] ? process.argv[index + 1] : undefined;
}

const TOKEN =
  process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : process.env.AGENT_TOKEN;
const SERVER_URL = argValue('--server') ?? process.env.SERVER_URL ?? 'http://localhost:4000';

if (!TOKEN) {
  console.error('Usage: npm run agent -- <agent-token> [--server http://localhost:4000]');
  console.error('Create an agent in the room People panel and copy its token.');
  process.exit(1);
}

const socket = new WebSocket(
  `${SERVER_URL.replace(/^http/, 'ws')}/ws?token=${encodeURIComponent(TOKEN)}`,
);

const rl = createInterface({ input: process.stdin, output: process.stdout });
const interactive = Boolean(process.stdin.isTTY);
const queued = [];
let me = null;
let room = null;
let presence = [];
let quitting = false;

function printPresence() {
  if (presence.length === 0) {
    console.log('No one in the room yet.');
    return;
  }
  for (const entry of presence) {
    const kind = entry.type === 'agent' ? 'agent' : 'human';
    const activity = entry.activity ? ` — ${entry.activity}` : '';
    console.log(`  ${entry.name} (${kind}, ${entry.role}): ${entry.status}${activity}`);
  }
}

function prompt() {
  if (!interactive) return;
  rl.setPrompt(room ? 'you> ' : '…> ');
  rl.prompt();
}

function handleLine(line) {
  const text = line.trim();
  if (!text) {
    prompt();
    return;
  }
  if (text === '/who') {
    printPresence();
    prompt();
    return;
  }

  let kind = 'chat';
  let content = text;
  const prefixed = text.match(/^\/(instruction|suggestion)\s+([\s\S]+)$/);
  if (prefixed) {
    kind = prefixed[1];
    content = prefixed[2];
  }
  socket.send(JSON.stringify({ type: 'message.send', content, kind }));
  prompt();
}

rl.on('line', (line) => {
  const text = line.trim();
  if (!text) {
    prompt();
    return;
  }
  if (text === '/quit' || text === '/exit') {
    quitting = true;
    socket.close();
    rl.close();
    return;
  }
  if (!room) {
    queued.push(text);
    return;
  }
  handleLine(text);
});

socket.on('open', () => {
  console.log('Connecting to RoomForge…');
});

socket.on('message', (raw) => {
  let event;
  try {
    event = JSON.parse(String(raw));
  } catch {
    return;
  }

  switch (event.type) {
    case 'ready':
      me = event.principal;
      console.log(`Signed in as ${me.name}.`);
      break;
    case 'room.state':
      room = event.state.room;
      presence = event.state.presence ?? [];
      console.log('');
      console.log(`Joined “${room.name}”${room.topic ? ` — ${room.topic}` : ''}`);
      console.log('Type to chat. Commands: /instruction <text>, /suggestion <text>, /who, /quit');
      console.log('');
      prompt();
      for (const line of queued.splice(0)) handleLine(line);
      break;
    case 'message.new': {
      const message = event.message;
      const mine = me && message.senderId === me.id;
      const label = message.kind === 'chat' ? '' : `[${message.kind}] `;
      console.log(`${mine ? 'you' : message.senderName}: ${label}${message.content}`);
      if (room && !mine) prompt();
      break;
    }
    case 'presence.update':
      presence = event.presence ?? [];
      break;
    case 'task.updated':
      console.log(
        `[task] “${event.task.title}” → ${event.task.status}${event.task.assigneeName ? ` (${event.task.assigneeName})` : ''}`,
      );
      if (room) prompt();
      break;
    case 'error':
      console.error(`[server] ${event.message}`);
      if (room) prompt();
      break;
    case 'removed':
      console.error('You were removed from the room. Exiting.');
      quitting = true;
      socket.close();
      rl.close();
      break;
    default:
      break;
  }
});

socket.on('close', (code) => {
  if (code === 4001) {
    console.error('Connection rejected: the agent token is invalid or has been revoked.');
  } else if (!quitting) {
    console.error(`Disconnected (${code}).`);
  }
  rl.close();
  process.exit(code === 4001 ? 1 : 0);
});

socket.on('error', (error) => {
  if (!quitting) console.error(`Connection error: ${error.message}`);
});
