import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'node:crypto';
import { lookup } from 'node:dns/promises';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { HttpError } from './errors.js';
import * as hub from './hub.js';
import * as store from './store.js';
import {
  ALLOW_PRIVATE_TRIGGER_URLS,
  IS_PRODUCTION,
  MAX_TRIGGER_ATTEMPTS,
  TRIGGER_RETRY_DELAYS_MS,
  TRIGGER_TIMEOUT_MS,
  WAKE_TIMEOUT_MS,
} from './wake-config.js';

const here = dirname(fileURLToPath(import.meta.url));
const keyFile = resolve(here, '../data/trigger-secret.key');

function loadEncryptionKey(): Buffer {
  const fromEnv = process.env.TRIGGER_SECRET_ENC_KEY;
  if (fromEnv) {
    const key = Buffer.from(fromEnv, 'base64');
    if (key.length !== 32) {
      throw new Error('TRIGGER_SECRET_ENC_KEY must be 32 bytes, base64 encoded');
    }
    return key;
  }
  if (IS_PRODUCTION) {
    throw new Error('TRIGGER_SECRET_ENC_KEY is required in production');
  }
  try {
    const key = Buffer.from(readFileSync(keyFile, 'utf8').trim(), 'base64');
    if (key.length === 32) return key;
  } catch {
    // generate one below
  }
  const key = randomBytes(32);
  mkdirSync(dirname(keyFile), { recursive: true });
  writeFileSync(keyFile, key.toString('base64'), { mode: 0o600 });
  console.warn(`TRIGGER_SECRET_ENC_KEY not set; using local development key at ${keyFile}`);
  return key;
}

const ENCRYPTION_KEY = loadEncryptionKey();

export function newTriggerSecret(): string {
  return `ts_${randomBytes(32).toString('hex')}`;
}

export function encryptSecret(secret: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  const ciphertext = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1.${iv.toString('base64url')}.${tag.toString('base64url')}.${ciphertext.toString('base64url')}`;
}

export function decryptSecret(payload: string): string | null {
  const parts = payload.split('.');
  if (parts.length !== 4 || parts[0] !== 'v1') return null;
  try {
    const iv = Buffer.from(parts[1], 'base64url');
    const tag = Buffer.from(parts[2], 'base64url');
    const ciphertext = Buffer.from(parts[3], 'base64url');
    const decipher = createDecipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
  } catch {
    return null;
  }
}

function isPrivateAddress(address: string): boolean {
  let value = address.trim().toLowerCase();
  if (value.startsWith('::ffff:')) value = value.slice(7);

  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(value)) {
    const [a, b] = value.split('.').map(Number);
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    if (a >= 224) return true;
    return false;
  }

  if (value === '::1' || value === '::') return true;
  if (value.startsWith('fc') || value.startsWith('fd')) return true;
  if (value.startsWith('fe8') || value.startsWith('fe9') || value.startsWith('fea') || value.startsWith('feb')) {
    return true;
  }
  return false;
}

export async function validateTriggerUrl(raw: string): Promise<string> {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new HttpError(400, 'triggerUrl must be a valid http(s) URL');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new HttpError(400, 'triggerUrl must use http or https');
  }
  if (!IS_PRODUCTION) return url.toString();

  if (url.protocol !== 'https:') {
    throw new HttpError(400, 'triggerUrl must use https in production');
  }
  if (ALLOW_PRIVATE_TRIGGER_URLS) return url.toString();

  const host = url.hostname.toLowerCase();
  if (host === 'localhost' || host.endsWith('.localhost')) {
    throw new HttpError(400, 'triggerUrl must not point at a private or loopback address');
  }
  let addresses: { address: string }[];
  try {
    addresses = await lookup(host, { all: true, verbatim: true });
  } catch {
    throw new HttpError(400, 'triggerUrl host could not be resolved');
  }
  if (!addresses.length || addresses.some((entry) => isPrivateAddress(entry.address))) {
    throw new HttpError(400, 'triggerUrl must not point at a private or loopback address');
  }
  return url.toString();
}

export function signTrigger(secret: string, timestamp: number, rawBody: string): string {
  return `sha256=${createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex')}`;
}

export interface TriggerPayload {
  eventId: string;
  type: 'mention' | 'ping';
  roomId?: string;
  agentId?: string;
  seq?: number;
  messageId?: string;
  createdAt: string;
}

export interface DeliveryResult {
  ok: boolean;
  status: number;
  ms: number;
  error?: string;
}

export async function sendTrigger(url: string, secret: string, payload: TriggerPayload): Promise<DeliveryResult> {
  const rawBody = JSON.stringify(payload);
  const timestamp = Math.floor(Date.now() / 1000);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TRIGGER_TIMEOUT_MS);
  const started = Date.now();
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-roomforge-event-id': payload.eventId,
        'x-roomforge-timestamp': String(timestamp),
        'x-roomforge-signature': signTrigger(secret, timestamp, rawBody),
      },
      body: rawBody,
      signal: controller.signal,
      redirect: 'manual',
    });
    const ms = Date.now() - started;
    const ok = response.status >= 200 && response.status < 300;
    return { ok, status: response.status, ms, ...(ok ? {} : { error: `HTTP ${response.status}` }) };
  } catch (error) {
    const message =
      error instanceof Error && error.name === 'AbortError'
        ? 'timeout'
        : error instanceof Error
          ? error.message
          : 'request failed';
    return { ok: false, status: 0, ms: Date.now() - started, error: message };
  } finally {
    clearTimeout(timer);
  }
}

/* Resolves the trigger config for an agent; the secret is decrypted only here. */
export function triggerConfigFor(agentId: string): { url: string; secret: string; name: string } {
  const agent = store.getAgentTrigger(agentId);
  if (!agent) throw new HttpError(404, 'Agent not found');
  if (!agent.triggerUrl) throw new HttpError(400, 'This agent has no trigger URL');
  if (!agent.triggerSecretEnc) throw new HttpError(400, 'This agent has no trigger secret');
  const secret = decryptSecret(agent.triggerSecretEnc);
  if (!secret) throw new HttpError(500, 'The trigger secret could not be decrypted');
  return { url: agent.triggerUrl, secret, name: agent.name };
}

export async function testTrigger(agentId: string): Promise<DeliveryResult> {
  const config = triggerConfigFor(agentId);
  return sendTrigger(config.url, config.secret, {
    eventId: `evt_${randomBytes(12).toString('hex')}`,
    type: 'ping',
    agentId,
    createdAt: new Date().toISOString(),
  });
}

function postSystemMessage(roomId: string, content: string): void {
  const message = store.insertSystemMessage(roomId, content);
  hub.broadcast(roomId, { type: 'message.new', message });
}

/* Poll the trigger_events queue once a second. SQLite has no SKIP LOCKED, so a
 * single in-process busy flag prevents double delivery. */
let delivering = false;

export async function deliverDueTriggers(): Promise<void> {
  if (delivering) return;
  delivering = true;
  try {
    const due = store.listDueTriggerEvents(new Date().toISOString());
    for (const event of due) {
      const agent = store.getAgentTrigger(event.agent_id);
      if (!agent || !agent.triggerUrl || !agent.triggerSecretEnc) {
        store.markTriggerFailure(event.id, MAX_TRIGGER_ATTEMPTS, null, 'agent has no trigger target');
        continue;
      }
      const secret = decryptSecret(agent.triggerSecretEnc);
      if (!secret) {
        store.markTriggerFailure(event.id, MAX_TRIGGER_ATTEMPTS, null, 'trigger secret could not be decrypted');
        continue;
      }

      const result = await sendTrigger(agent.triggerUrl, secret, {
        eventId: event.id,
        type: 'mention',
        roomId: event.room_id,
        agentId: event.agent_id,
        seq: event.seq,
        messageId: event.message_id,
        createdAt: event.created_at,
      });

      if (result.ok) {
        store.markTriggerDelivered(event.id);
        store.setAgentWakeState(event.agent_id, 'waking');
        hub.broadcastPresence(event.room_id);
        continue;
      }

      const attempts = event.attempts + 1;
      const error = result.error ?? `HTTP ${result.status}`;
      if (attempts >= MAX_TRIGGER_ATTEMPTS) {
        store.markTriggerFailure(event.id, attempts, null, error);
        store.setAgentWakeState(event.agent_id, 'unreachable');
        postSystemMessage(event.room_id, `${agent.name} is unreachable (trigger failed).`);
        hub.broadcastPresence(event.room_id);
      } else {
        const delay = TRIGGER_RETRY_DELAYS_MS[attempts - 1] ?? 30000;
        store.markTriggerFailure(event.id, attempts, new Date(Date.now() + delay).toISOString(), error);
      }
    }
  } finally {
    delivering = false;
  }
}

export function expireStaleWakes(): void {
  const cutoff = new Date(Date.now() - WAKE_TIMEOUT_MS).toISOString();
  for (const agent of store.listAgentsAwaitingSocket(cutoff)) {
    if (hub.isAgentConnected(agent.id)) {
      store.setAgentWakeState(agent.id, null);
      continue;
    }
    store.setAgentWakeState(agent.id, 'unreachable');
    postSystemMessage(agent.room_id, `${agent.name} was woken but did not connect.`);
    hub.broadcastPresence(agent.room_id);
  }
}

export function startTriggerWorkers(): void {
  setInterval(() => {
    void deliverDueTriggers().catch((error) => console.error('trigger delivery failed', error));
  }, 1000).unref();
  setInterval(expireStaleWakes, 5000).unref();
}
