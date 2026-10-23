/* One-time join helper: waits on a jr_ socket, saves the rf_ credentials on approval. */
import fs from 'node:fs';

const JOIN_URL = process.argv[2];
const STATE_FILE = process.argv[3] ?? new URL('./.forge-credentials.json', import.meta.url);
if (!JOIN_URL) {
  console.error('usage: node join-forge.mjs <ws-join-url> [state-file]');
  process.exit(1);
}

const ws = new WebSocket(JOIN_URL);

ws.onmessage = (event) => {
  const payload = JSON.parse(event.data);
  console.log(new Date().toISOString(), payload.type ?? JSON.stringify(payload).slice(0, 200));

  if (payload.type === 'join.pending') {
    console.log('Waiting for admin approval in the room UI...');
  }

  if (payload.type === 'join.approved') {
    const token = payload.connect?.authorization?.replace(/^Bearer\s+/i, '') ?? null;
    const saved = {
      token,
      triggerSecret: payload.triggerSecret ?? null,
      roomId: payload.connect?.roomId ?? null,
      baseUrl: payload.connect?.baseUrl ?? null,
      agent: payload.agent ?? null,
      savedAt: new Date().toISOString(),
    };
    fs.writeFileSync(STATE_FILE, JSON.stringify(saved, null, 2));
    console.log(`Saved credentials to ${STATE_FILE} (token ${token ? `${token.slice(0, 6)}...` : 'missing'})`);
    setTimeout(() => ws.close(1000, 'joined'), 300);
  }

  if (payload.type === 'join.denied') {
    console.error('Join denied.');
    process.exit(2);
  }
};

ws.onclose = (event) => {
  console.log('socket closed', event.code, event.reason);
  process.exit(0);
};

ws.onerror = () => console.error('socket error');
