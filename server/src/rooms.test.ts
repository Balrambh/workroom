process.env.DB_PATH = ':memory:';
process.env.JWT_SECRET = 'test-secret-for-roomforge-unit-tests-0123456789';

import assert from 'node:assert/strict';
import test from 'node:test';
import type { Principal } from './types.js';
import { handleFromName, handleValidationError, normalizeHandle } from './handles.js';

const store = await import('./store.js');
const auth = await import('./auth.js');

function userPrincipal(id: string, name: string): Principal {
  return { type: 'user', id, name };
}

function newUser(name: string, email: string) {
  return store.createUser(name, email, auth.hashPassword('password123'));
}

const owner = newUser('Ada Lovelace', 'ada@example.test');
const guest = newUser('Grace Hopper', 'grace@example.test');
const ownerPrincipal = userPrincipal(owner.id, owner.name);
const guestPrincipal = userPrincipal(guest.id, guest.name);

test('handles normalize and validate public profile slugs', () => {
  assert.equal(normalizeHandle('  Ada-Lovelace  '), 'ada-lovelace');
  assert.equal(handleValidationError('ada-lovelace'), null);
  assert.equal(handleValidationError('ada_1'), null);
  assert.ok(handleValidationError('ab'));
  assert.ok(handleValidationError('_ada_'));
  assert.ok(handleValidationError('-ada'));
  assert.ok(handleValidationError('ada-'));
  assert.ok(handleValidationError('ada lovelace'));
  assert.equal(handleFromName("Renée O'Connor", 'user'), 'renee-o-connor');
  assert.ok(handleFromName('', 'agent').length >= 3);
});

test('unlisted rooms stay out of the public directory until published', () => {
  const listed = store.createRoom('Listed room', 'visible', 'chat', ownerPrincipal, 'public');
  const hidden = store.createRoom('Hidden room', 'secret', 'chat', ownerPrincipal, 'unlisted');

  const publicIds = store.listPublicRooms().map((room) => room.id);
  assert.ok(publicIds.includes(listed.id));
  assert.ok(!publicIds.includes(hidden.id));

  store.updateRoom(hidden.id, { visibility: 'public' });
  assert.ok(store.listPublicRooms().some((room) => room.id === hidden.id));

  store.updateRoom(hidden.id, { visibility: 'unlisted', name: 'Renamed room' });
  const updated = store.getRoom(hidden.id);
  assert.equal(updated?.name, 'Renamed room');
  assert.equal(updated?.visibility, 'unlisted');
});

test('unread counts skip the reader and markRoomRead never moves backwards', () => {
  const room = store.createRoom('Unread room', '', 'chat', ownerPrincipal, 'public');
  store.addMember(room.id, guestPrincipal, 'member');

  store.insertMessage(room.id, guestPrincipal, 'member', 'chat', 'first');
  store.insertMessage(room.id, ownerPrincipal, 'admin', 'chat', 'mine');
  store.insertMessage(room.id, guestPrincipal, 'member', 'chat', 'second');

  assert.equal(store.getUnreadCount(room.id, owner.id), 2);
  assert.equal(store.getUnreadCount(room.id, guest.id), 1);

  const lastSeq = store.getRoomLastSeq(room.id);
  store.markRoomRead(room.id, owner.id, lastSeq);
  assert.equal(store.getUnreadCount(room.id, owner.id), 0);

  store.insertMessage(room.id, guestPrincipal, 'member', 'chat', 'third');
  store.markRoomRead(room.id, owner.id, 0);
  assert.equal(store.getUnreadCount(room.id, owner.id), 1);
});

test('history pagination and moderation deletion work by sequence', () => {
  const room = store.createRoom('History room', '', 'code', ownerPrincipal, 'public');
  const created = [1, 2, 3, 4, 5].map((n) =>
    store.insertMessage(room.id, guestPrincipal, 'member', 'chat', `message ${n}`),
  );

  const page = store.listMessagesBeforeSeq(room.id, 4, 2);
  assert.deepEqual(page.map((message) => message.seq), [2, 3]);

  const after = store.listMessagesAfter(room.id, 3, 10);
  assert.deepEqual(after.map((message) => message.seq), [4, 5]);

  const removed = store.deleteMessage(room.id, created[2].id);
  assert.equal(removed?.id, created[2].id);
  assert.equal(store.getMessageById(created[2].id), undefined);
  assert.equal(store.listMessages(room.id, undefined, 10).length, 4);
  assert.equal(store.deleteMessage(room.id, 'missing'), undefined);
});

test('leaving cleans membership and deleting a room cascades its contents', () => {
  const room = store.createRoom('Lifecycle room', '', 'chat', ownerPrincipal, 'public');
  store.addMember(room.id, guestPrincipal, 'member');
  store.insertMessage(room.id, guestPrincipal, 'member', 'chat', 'hello');
  store.markRoomRead(room.id, guest.id, store.getRoomLastSeq(room.id));

  assert.equal(store.countRoomAdmins(room.id), 1);
  store.leaveRoom(room.id, guest.id);
  assert.equal(store.getMembership(room.id, guestPrincipal), undefined);
  assert.equal(store.getMembership(room.id, ownerPrincipal)?.role, 'admin');

  store.deleteRoom(room.id);
  assert.equal(store.getRoom(room.id), undefined);
  assert.equal(store.listMessages(room.id, undefined, 10).length, 0);
});

test('agent connection keys rotate atomically', () => {
  const room = store.createRoom('Agent room', '', 'chat', ownerPrincipal, 'public');
  const firstToken = auth.newAgentToken();
  const agent = store.createAgent(
    room.id,
    'builder-bot',
    'Builds things',
    'member',
    auth.hashAgentToken(firstToken),
    owner.id,
  );

  assert.equal(auth.resolveToken(firstToken)?.id, agent.id);

  const secondToken = auth.newAgentToken();
  assert.equal(store.rotateAgentToken(agent.id, auth.hashAgentToken(secondToken)), true);
  assert.equal(auth.resolveToken(firstToken), null);
  assert.equal(auth.resolveToken(secondToken)?.type, 'agent');
  assert.equal(store.rotateAgentToken('missing-agent', auth.hashAgentToken(secondToken)), false);
});

test('password hashes can be verified and replaced', () => {
  const user = newUser('Password Tester', 'passwords@example.test');
  const original = store.getUserPasswordHash(user.id);
  assert.ok(original);
  assert.equal(auth.verifyPassword('password123', original), true);
  assert.equal(auth.verifyPassword('wrong-password', original), false);

  const nextHash = auth.hashPassword('new-password-456');
  store.updateUserPassword(user.id, nextHash);
  const stored = store.getUserPasswordHash(user.id);
  assert.ok(stored);
  assert.equal(auth.verifyPassword('new-password-456', stored), true);
  assert.equal(auth.verifyPassword('password123', stored), false);
});
