import { Router } from 'express';
import type { Request } from 'express';
import { z } from 'zod';
import type { AuthedRequest } from './auth.js';
import { HttpError } from './errors.js';
import * as hub from './hub.js';
import * as mission from './mission.js';
import * as store from './store.js';
import type { DecisionMethod, MissionPhase, Principal, Role } from './types.js';

export const missionRouter = Router();

const MISSION_PHASES: MissionPhase[] = ['frame', 'explore', 'decide', 'build', 'review', 'shipped'];
const DECISION_METHODS: DecisionMethod[] = ['admin', 'consent', 'majority', 'quorum'];

const PHASE_GUIDANCE: Record<MissionPhase, string> = {
  frame: 'Agree on the problem, success criteria, and constraints before proposing solutions.',
  explore: 'Surface options, evidence, and unknowns. Resist converging before the room has them.',
  decide: 'Resolve open questions and decisions using the room decision rule.',
  build: 'Claim work, declare scopes, and report progress against the success criteria.',
  review: 'Verify outcomes against the success criteria and record follow-ups as decisions or tasks.',
  shipped: 'Capture the outcome, the evidence, and what the room learned for the next problem.',
};

function principalOf(req: AuthedRequest): Principal {
  if (!req.principal) throw new HttpError(401, 'Unauthorized');
  return req.principal;
}

function membershipOrThrow(roomId: string, principal: Principal): { role: Role; joinedAt: string } {
  const membership = store.getMembership(roomId, principal);
  if (!membership) throw new HttpError(404, 'Room not found or you are not a member of it');
  return membership;
}

function adminOrThrow(roomId: string, principal: Principal): void {
  if (membershipOrThrow(roomId, principal).role !== 'admin') {
    throw new HttpError(403, 'Only room admins can do that');
  }
}

function writerOrThrow(roomId: string, principal: Principal): Role {
  const { role } = membershipOrThrow(roomId, principal);
  if (role === 'viewer') throw new HttpError(403, 'Viewers have read-only access');
  return role;
}

function isValidPrincipal(roomId: string, type: string | null, id: string | null): boolean {
  if (!type || !id) return false;
  return Boolean(store.getMembership(roomId, { type: type as 'user' | 'agent', id, name: '' }));
}

function mentionContent(names: string[], prefix: string): string {
  const handles = names.map((name) => `@${name}`).join(' ');
  return `${prefix}${handles ? ` ${handles}` : ''}`;
}

function emitMission(roomId: string, value: ReturnType<typeof mission.getMission>): void {
  hub.broadcast(roomId, { type: 'mission.updated', mission: value });
}

function emitQuestions(roomId: string): void {
  hub.broadcast(roomId, { type: 'questions.updated', questions: mission.listQuestions(roomId) });
}

function emitDecisions(roomId: string): void {
  hub.broadcast(roomId, { type: 'decisions.updated', decisions: mission.listDecisions(roomId) });
}

function emitFamily(roomId: string): void {
  hub.broadcast(roomId, { type: 'family.updated', ...mission.getFamilyView(roomId) });
}

function emitFamilyForMutation(roomId: string): void {
  emitFamily(roomId);
  const parentId = store.getRoom(roomId)?.parentRoomId;
  if (parentId) emitFamily(parentId);
  for (const childId of store.listChildRoomIds(roomId)) emitFamily(childId);
}

/* -------------------------------- mission -------------------------------- */

missionRouter.get('/rooms/:roomId/mission', (req, res) => {
  const principal = principalOf(req as AuthedRequest);
  membershipOrThrow(req.params.roomId, principal);
  const value = mission.getMission(req.params.roomId);
  if (!value) throw new HttpError(404, 'Mission not found');
  res.json(value);
});

missionRouter.patch('/rooms/:roomId/mission', (req, res) => {
  const principal = principalOf(req as AuthedRequest);
  adminOrThrow(req.params.roomId, principal);
  const body = z
    .object({
      objective: z.string().max(4000).optional(),
      successCriteria: z.string().max(4000).optional(),
      constraints: z.string().max(4000).optional(),
      phase: z.enum(['frame', 'explore', 'decide', 'build', 'review', 'shipped']).optional(),
      decisionMode: z.enum(['admin', 'consent', 'majority', 'quorum']).optional(),
      quorum: z.number().int().min(1).max(50).optional(),
    })
    .strict()
    .parse(req.body);

  const before = mission.getMission(req.params.roomId);
  if (!before) throw new HttpError(404, 'Mission not found');
  const updated = mission.updateMission(req.params.roomId, body);
  if (!updated) throw new HttpError(404, 'Mission not found');

  let summary = `${principal.name} updated the mission brief.`;
  if (body.phase && body.phase !== before.phase) {
    summary = `${principal.name} moved the mission to ${body.phase}.`;
  } else if (body.decisionMode && body.decisionMode !== before.decisionMode) {
    summary = `${principal.name} set decisions to ${body.decisionMode}.`;
  }
  const activity = store.logActivity(req.params.roomId, principal, 'mission.updated', summary, {
    phase: updated.phase,
  });
  emitMission(req.params.roomId, updated);
  hub.broadcast(req.params.roomId, { type: 'activity.new', activity });
  emitFamilyForMutation(req.params.roomId);
  res.json(updated);
});

/* ------------------------------- workstreams ------------------------------ */

missionRouter.get('/rooms/:roomId/workstreams', (req, res) => {
  const principal = principalOf(req as AuthedRequest);
  membershipOrThrow(req.params.roomId, principal);
  res.json({ workstreams: mission.getFamilyView(req.params.roomId).workstreams });
});

missionRouter.post('/rooms/:roomId/workstreams', (req, res) => {
  const principal = principalOf(req as AuthedRequest);
  adminOrThrow(req.params.roomId, principal);
  const body = z
    .object({
      name: z.string().trim().min(3).max(80),
      topic: z.string().trim().max(400).optional().default(''),
      objective: z.string().trim().max(4000).optional().default(''),
    })
    .strict()
    .parse(req.body);

  const parent = store.getRoom(req.params.roomId);
  if (!parent) throw new HttpError(404, 'Room not found');
  const humanAdmins = store
    .listMembers(parent.id)
    .filter((member) => member.type === 'user' && member.role === 'admin');
  if (humanAdmins.length === 0) {
    throw new HttpError(400, 'Add a human admin before splitting this room into workstreams');
  }

  const child = store.createWorkstreamRoom(
    parent,
    body.name,
    body.topic,
    body.objective,
    principal,
  );
  const parentActivity = store.logActivity(
    parent.id,
    principal,
    'workstream.created',
    `${principal.name} created the workstream “${child.name}”.`,
    { roomId: child.id },
  );
  store.logActivity(
    child.id,
    principal,
    'workstream.linked',
    `Workstream opened from “${parent.name}”.`,
    { roomId: parent.id },
  );
  hub.broadcast(parent.id, { type: 'activity.new', activity: parentActivity });
  emitFamily(parent.id);

  const workstream = mission
    .getFamilyView(parent.id)
    .workstreams.find((candidate) => candidate.id === child.id);
  res.status(201).json({ room: child, workstream });
});

/* ------------------------------- questions ------------------------------- */

missionRouter.get('/rooms/:roomId/questions', (req, res) => {
  const principal = principalOf(req as AuthedRequest);
  membershipOrThrow(req.params.roomId, principal);
  res.json({ questions: mission.listQuestions(req.params.roomId) });
});

const questionCreateSchema = z
  .object({
    title: z.string().trim().min(3).max(160),
    detail: z.string().max(4000).optional().default(''),
    ownerType: z.enum(['user', 'agent']).nullable().optional(),
    ownerId: z.string().min(1).nullable().optional(),
  })
  .strict();

missionRouter.post('/rooms/:roomId/questions', (req, res) => {
  const principal = principalOf(req as AuthedRequest);
  writerOrThrow(req.params.roomId, principal);
  const body = questionCreateSchema.parse(req.body);
  if ((body.ownerType && !body.ownerId) || (!body.ownerType && body.ownerId)) {
    throw new HttpError(400, 'An owner requires both type and id');
  }
  if (body.ownerType && body.ownerId && !isValidPrincipal(req.params.roomId, body.ownerType, body.ownerId)) {
    throw new HttpError(400, 'The owner is not a member of this room');
  }
  const question = mission.createQuestion(
    req.params.roomId,
    {
      title: body.title,
      detail: body.detail,
      ownerType: body.ownerType ?? null,
      ownerId: body.ownerId ?? null,
    },
    principal,
  );
  const activity = store.logActivity(
    req.params.roomId,
    principal,
    'question.created',
    `${principal.name} raised an open question: “${question.title}”.`,
    { questionId: question.id },
  );
  emitQuestions(req.params.roomId);
  hub.broadcast(req.params.roomId, { type: 'activity.new', activity });
  emitFamilyForMutation(req.params.roomId);
  res.status(201).json(question);
});

const questionPatchSchema = z
  .object({
    title: z.string().trim().min(3).max(160).optional(),
    detail: z.string().max(4000).optional(),
    status: z.enum(['open', 'resolved', 'parked']).optional(),
    ownerType: z.enum(['user', 'agent']).nullable().optional(),
    ownerId: z.string().min(1).nullable().optional(),
    resolution: z.string().max(4000).optional(),
  })
  .strict();

missionRouter.patch('/rooms/:roomId/questions/:questionId', (req, res) => {
  const principal = principalOf(req as AuthedRequest);
  writerOrThrow(req.params.roomId, principal);
  const body = questionPatchSchema.parse(req.body);
  const existing = mission.getQuestion(req.params.roomId, req.params.questionId);
  if (!existing) throw new HttpError(404, 'Question not found');

  if (body.ownerType !== undefined || body.ownerId !== undefined) {
    const ownerType = body.ownerType ?? null;
    const ownerId = body.ownerId ?? null;
    if ((ownerType && !ownerId) || (!ownerType && ownerId)) {
      throw new HttpError(400, 'An owner requires both type and id');
    }
    if (ownerType && ownerId && !isValidPrincipal(req.params.roomId, ownerType, ownerId)) {
      throw new HttpError(400, 'The owner is not a member of this room');
    }
  }
  if (body.status === 'resolved' && body.resolution === undefined && !existing.resolution) {
    throw new HttpError(400, 'Add a resolution before resolving the question');
  }

  const updated = mission.updateQuestion(req.params.roomId, existing.id, body);
  if (!updated) throw new HttpError(404, 'Question not found');
  const summary =
    body.status === 'resolved'
      ? `${principal.name} resolved “${updated.title}”.`
      : body.status === 'parked'
        ? `${principal.name} parked “${updated.title}”.`
        : `${principal.name} updated “${updated.title}”.`;
  const activity = store.logActivity(req.params.roomId, principal, 'question.updated', summary, {
    questionId: updated.id,
    status: updated.status,
  });
  emitQuestions(req.params.roomId);
  hub.broadcast(req.params.roomId, { type: 'activity.new', activity });
  emitFamilyForMutation(req.params.roomId);
  res.json(updated);
});

missionRouter.delete('/rooms/:roomId/questions/:questionId', (req, res) => {
  const principal = principalOf(req as AuthedRequest);
  const role = membershipOrThrow(req.params.roomId, principal).role;
  const question = mission.getQuestion(req.params.roomId, req.params.questionId);
  if (!question) throw new HttpError(404, 'Question not found');
  const isCreator = question.createdByType === principal.type && question.createdById === principal.id;
  if (role !== 'admin' && !isCreator) {
    throw new HttpError(403, 'Only a room admin or the author can delete this question');
  }
  mission.deleteQuestion(req.params.roomId, question.id);
  const activity = store.logActivity(
    req.params.roomId,
    principal,
    'question.deleted',
    `${principal.name} deleted the question “${question.title}”.`,
    { questionId: question.id },
  );
  emitQuestions(req.params.roomId);
  hub.broadcast(req.params.roomId, { type: 'activity.new', activity });
  emitFamilyForMutation(req.params.roomId);
  res.json({ ok: true });
});

/* ------------------------------- decisions ------------------------------- */

missionRouter.get('/rooms/:roomId/decisions', (req, res) => {
  const principal = principalOf(req as AuthedRequest);
  membershipOrThrow(req.params.roomId, principal);
  res.json({ decisions: mission.listDecisions(req.params.roomId) });
});

function parseDueAt(raw: string | null | undefined): string | null {
  if (raw === undefined || raw === null || raw === '') return null;
  const time = Date.parse(raw);
  if (Number.isNaN(time)) throw new HttpError(400, 'dueAt must be a valid date');
  return new Date(time).toISOString();
}

const decisionCreateSchema = z
  .object({
    title: z.string().trim().min(3).max(180),
    context: z.string().max(4000).optional().default(''),
    method: z.enum(['admin', 'consent', 'majority', 'quorum']).optional(),
    quorum: z.number().int().min(1).max(50).optional(),
    options: z.array(z.string().trim().min(1).max(200)).min(1).max(8),
    dueAt: z.string().max(60).nullable().optional(),
    notifyAgents: z.boolean().optional().default(true),
    dependsOn: z
      .array(
        z.object({
          roomId: z.string().min(1),
          decisionId: z.string().min(1),
        }),
      )
      .max(5)
      .optional()
      .default([]),
  })
  .strict();

missionRouter.post('/rooms/:roomId/decisions', (req, res) => {
  const principal = principalOf(req as AuthedRequest);
  writerOrThrow(req.params.roomId, principal);
  const body = decisionCreateSchema.parse(req.body);
  const currentMission = mission.getMission(req.params.roomId);
  if (!currentMission) throw new HttpError(404, 'Mission not found');

  const method = body.method ?? currentMission.decisionMode;
  if (!DECISION_METHODS.includes(method)) throw new HttpError(400, 'Invalid decision method');
  const quorum = body.quorum ?? currentMission.quorum;
  if (method === 'consent' && body.options.length !== 1) {
    throw new HttpError(400, 'Consent decisions need exactly one proposal option');
  }
  if (method !== 'consent' && body.options.length < 2) {
    throw new HttpError(400, 'This decision method needs at least two options');
  }

  const dependencies: { roomId: string; decisionId: string }[] = [];
  const seenDependencies = new Set<string>();
  for (const dependency of body.dependsOn) {
    if (!mission.isRelatedRoom(req.params.roomId, dependency.roomId)) {
      throw new HttpError(
        400,
        'Dependencies must live in this room, its parent, or one of its workstreams',
      );
    }
    if (!mission.getDecision(dependency.roomId, dependency.decisionId)) {
      throw new HttpError(400, 'Dependency decision not found');
    }
    const key = `${dependency.roomId}:${dependency.decisionId}`;
    if (seenDependencies.has(key)) continue;
    seenDependencies.add(key);
    dependencies.push(dependency);
  }

  const decision = mission.createDecision(
    req.params.roomId,
    {
      title: body.title,
      context: body.context,
      method,
      quorum,
      options: body.options,
      dueAt: parseDueAt(body.dueAt),
      dependencies,
    },
    principal,
  );
  const activity = store.logActivity(
    req.params.roomId,
    principal,
    'decision.created',
    `${principal.name} opened a ${method} decision: “${decision.title}”.`,
    { decisionId: decision.id },
  );
  emitDecisions(req.params.roomId);
  hub.broadcast(req.params.roomId, { type: 'activity.new', activity });
  emitFamilyForMutation(req.params.roomId);

  if (body.notifyAgents) {
    const agents = store
      .listMembers(req.params.roomId)
      .filter(
        (member) =>
          member.type === 'agent' &&
          member.role !== 'viewer' &&
          !(member.type === principal.type && member.id === principal.id),
      );
    if (agents.length > 0) {
      const due = decision.dueAt ? ` Due ${new Date(decision.dueAt).toLocaleString()}.` : '';
      hub.createSystemNotice(
        req.params.roomId,
        mentionContent(
          agents.map((agent) => agent.name),
          `Decision open: “${decision.title}”.${due} Review the options and vote in the Mission panel.`,
        ),
        agents.map((agent) => ({ type: agent.type, id: agent.id })),
      );
    }
  }

  res.status(201).json(decision);
});

missionRouter.post('/rooms/:roomId/decisions/:decisionId/votes', (req, res) => {
  const principal = principalOf(req as AuthedRequest);
  writerOrThrow(req.params.roomId, principal);
  const body = z
    .object({
      choice: z.string().trim().min(1).max(80),
      comment: z.string().max(1000).optional().default(''),
    })
    .strict()
    .parse(req.body);
  const decision = mission.getDecision(req.params.roomId, req.params.decisionId);
  if (!decision) throw new HttpError(404, 'Decision not found');
  if (decision.status !== 'open') throw new HttpError(409, 'This decision is already closed');
  if (!mission.isValidChoice(decision, body.choice)) {
    throw new HttpError(
      400,
      decision.method === 'consent'
        ? 'Consent votes use consent, objection, or abstain'
        : 'That option does not belong to this decision',
    );
  }
  const updated = mission.castVote(req.params.roomId, decision.id, principal, body.choice, body.comment);
  emitDecisions(req.params.roomId);
  res.json(updated);
});

const decisionCloseSchema = z
  .object({
    status: z.enum(['decided', 'withdrawn']),
    optionId: z.string().min(1).nullable().optional(),
    rationale: z.string().max(4000).optional().default(''),
  })
  .strict();

missionRouter.patch('/rooms/:roomId/decisions/:decisionId', (req, res) => {
  const principal = principalOf(req as AuthedRequest);
  const role = membershipOrThrow(req.params.roomId, principal).role;
  const body = decisionCloseSchema.parse(req.body);
  const decision = mission.getDecision(req.params.roomId, req.params.decisionId);
  if (!decision) throw new HttpError(404, 'Decision not found');
  if (decision.status !== 'open') throw new HttpError(409, 'This decision is already closed');

  const isAdmin = role === 'admin';
  const isCreator = decision.createdByType === principal.type && decision.createdById === principal.id;
  if (!isAdmin && !isCreator) {
    throw new HttpError(403, 'Only a room admin or the decision author can close it');
  }
  const openDependencies = decision.dependencies.filter((dep) => dep.status !== 'decided');
  const isBlocked = openDependencies.length > 0;

  let optionId: string | null = null;
  if (body.status === 'decided') {
    if (decision.method === 'consent') {
      optionId = decision.options[0]?.id ?? null;
      if (body.optionId && body.optionId !== optionId) {
        throw new HttpError(400, 'Consent decisions decide on their single proposal');
      }
    } else {
      optionId = body.optionId ?? null;
      const option = decision.options.find((candidate) => candidate.id === optionId);
      if (!option) throw new HttpError(400, 'Choose one of the decision options');
    }

    if (!isAdmin) {
      if (isBlocked) {
        throw new HttpError(
          409,
          `This decision is blocked by “${openDependencies[0].title}”; an admin can override with a rationale`,
        );
      }
      if (decision.method === 'consent' && decision.tally.objection > 0) {
        throw new HttpError(409, 'The decision has unresolved objections; an admin can decide with a rationale');
      }
      if (!decision.tally.ready) {
        throw new HttpError(
          409,
          'The decision is not ready: quorum or a clear outcome is missing. An admin can decide with a rationale',
        );
      }
      if (
        (decision.method === 'majority' || decision.method === 'quorum') &&
        decision.tally.leadingOptionId &&
        optionId !== decision.tally.leadingOptionId
      ) {
        throw new HttpError(409, 'The author can close only on the leading option; an admin can override');
      }
    }
    const againstOutcome =
      isBlocked ||
      !decision.tally.ready ||
      (decision.method === 'consent' && decision.tally.objection > 0);
    if (isAdmin && againstOutcome && !body.rationale.trim()) {
      throw new HttpError(400, 'A rationale is required when closing against the room outcome');
    }
  }

  const updated = mission.setDecisionOutcome(
    req.params.roomId,
    decision.id,
    { status: body.status, optionId, rationale: body.rationale.trim() },
    principal,
  );
  if (!updated) throw new HttpError(404, 'Decision not found');

  const summary =
    body.status === 'withdrawn'
      ? `${principal.name} withdrew the decision “${updated.title}”.`
      : `${principal.name} decided “${updated.title}”: ${updated.decidedOptionLabel ?? 'no option'}.`;
  const activity = store.logActivity(req.params.roomId, principal, 'decision.closed', summary, {
    decisionId: updated.id,
    status: updated.status,
  });
  emitDecisions(req.params.roomId);
  hub.broadcast(req.params.roomId, { type: 'activity.new', activity });
  emitFamilyForMutation(req.params.roomId);
  if (body.status === 'decided') {
    hub.createSystemNotice(
      req.params.roomId,
      `Decision closed: “${updated.title}” → ${updated.decidedOptionLabel ?? 'no option'}.`,
    );

    const byRoom = new Map<string, { decisionId: string; title: string }[]>();
    for (const dependent of mission.listDependents(decision.id)) {
      if (dependent.status !== 'open') continue;
      const list = byRoom.get(dependent.roomId) ?? [];
      list.push({ decisionId: dependent.decisionId, title: dependent.title });
      byRoom.set(dependent.roomId, list);
    }
    for (const [dependentRoomId, dependentDecisions] of byRoom) {
      const agents = store
        .listMembers(dependentRoomId)
        .filter((member) => member.type === 'agent' && member.role !== 'viewer');
      const titles = dependentDecisions.map((item) => `“${item.title}”`).join(', ');
      hub.createSystemNotice(
        dependentRoomId,
        mentionContent(
          agents.map((agent) => agent.name),
          `Blocking decision decided: “${updated.title}” → ${updated.decidedOptionLabel ?? 'no option'}. ${titles} ${dependentDecisions.length === 1 ? 'is' : 'are'} now unblocked.`,
        ),
        agents.map((agent) => ({ type: agent.type, id: agent.id })),
      );
      emitDecisions(dependentRoomId);
      emitFamily(dependentRoomId);
    }
  }
  res.json(updated);
});

/* ------------------------------ context pack ------------------------------ */

function nextActionsFor(
  roomId: string,
  principal: Principal,
  role: Role,
  missionValue: NonNullable<ReturnType<typeof mission.getMission>>,
  questions: ReturnType<typeof mission.listQuestions>,
  decisions: ReturnType<typeof mission.listDecisions>,
  tasks: ReturnType<typeof store.listTasks>,
): { kind: string; title: string; targetId?: string }[] {
  const actions: { kind: string; title: string; targetId?: string }[] = [];
  const myKey = `${principal.type}:${principal.id}`;

  for (const decision of decisions.filter((candidate) => candidate.status === 'open')) {
    const hasVoted = decision.votes.some(
      (vote) => `${vote.voterType}:${vote.voterId}` === myKey,
    );
    if (!hasVoted && role !== 'viewer') {
      actions.push({ kind: 'decision.vote', title: `Vote on “${decision.title}”`, targetId: decision.id });
      continue;
    }
    const isCreator = decision.createdByType === principal.type && decision.createdById === principal.id;
    const blocked = decision.dependencies.some((dependency) => dependency.status !== 'decided');
    if ((role === 'admin' || isCreator) && decision.tally.ready && (!blocked || role === 'admin')) {
      actions.push({ kind: 'decision.close', title: `Close “${decision.title}”`, targetId: decision.id });
    }
  }

  for (const question of questions.filter((candidate) => candidate.status === 'open')) {
    if (question.ownerType === principal.type && question.ownerId === principal.id) {
      actions.push({ kind: 'question.answer', title: `Answer “${question.title}”`, targetId: question.id });
    }
  }
  const unowned = questions.filter((candidate) => candidate.status === 'open' && !candidate.ownerId);
  for (const question of unowned.slice(0, 2)) {
    actions.push({ kind: 'question.pickup', title: `Take “${question.title}”`, targetId: question.id });
  }

  for (const task of tasks) {
    if (task.status === 'done') continue;
    if (task.assigneeType === principal.type && task.assigneeId === principal.id) {
      actions.push({ kind: 'task.continue', title: `Continue “${task.title}”`, targetId: task.id });
    } else if (!task.assigneeId && role !== 'viewer') {
      actions.push({ kind: 'task.claim', title: `Claim “${task.title}”`, targetId: task.id });
    }
  }

  if (!missionValue.objective.trim()) {
    actions.push({ kind: 'mission.brief', title: 'Write the mission objective and success criteria' });
  } else if (missionValue.phase === 'frame' && questions.length === 0 && decisions.length === 0) {
    actions.push({ kind: 'mission.frame', title: 'Turn unknowns into open questions' });
  }

  return actions.slice(0, 8);
}

missionRouter.get('/rooms/:roomId/context', (req: Request, res) => {
  const principal = principalOf(req as AuthedRequest);
  const role = membershipOrThrow(req.params.roomId, principal).role;
  const query = z
    .object({
      after_seq: z.coerce.number().int().min(0).optional(),
      limit: z.coerce.number().int().min(1).max(100).optional().default(40),
    })
    .parse(req.query);

  const room = store.getRoom(req.params.roomId);
  const missionValue = mission.getMission(req.params.roomId);
  if (!room || !missionValue) throw new HttpError(404, 'Room not found');
  const family = mission.getFamilyView(req.params.roomId);

  const members = store.listMembers(req.params.roomId);
  const presence = new Map(hub.presenceList(req.params.roomId).map((entry) => [`${entry.type}:${entry.id}`, entry]));
  const tasks = store.listTasks(req.params.roomId);
  const questions = mission.listQuestions(req.params.roomId);
  const decisions = mission.listDecisions(req.params.roomId);
  const me = members.find((member) => member.type === principal.type && member.id === principal.id);
  const lastSeq = store.getRoomLastSeq(req.params.roomId);
  const messages =
    query.after_seq !== undefined
      ? store.listMessagesAfter(req.params.roomId, query.after_seq, query.limit)
      : store.listMessages(req.params.roomId, undefined, query.limit);

  res.set('Cache-Control', 'no-store');
  res.json({
    generatedAt: new Date().toISOString(),
    room: {
      id: room.id,
      code: room.code ?? '',
      name: room.name,
      topic: room.topic,
      mode: room.mode,
      visibility: room.visibility,
    },
    me: {
      type: principal.type,
      id: principal.id,
      name: principal.name,
      role,
      handle: me?.handle ?? null,
      capabilities: me?.capabilities ?? [],
    },
    mission: { ...missionValue, guidance: PHASE_GUIDANCE[missionValue.phase] },
    parent: family.parent,
    workstreams: family.workstreams,
    relatedDecisions: family.relatedDecisions,
    team: members.map((member) => {
      const live = presence.get(`${member.type}:${member.id}`);
      return {
        type: member.type,
        id: member.id,
        name: member.name,
        handle: member.handle,
        role: member.role,
        headline: member.headline ?? (member.description ? member.description.slice(0, 140) : null),
        capabilities: member.capabilities,
        presence: live
          ? { status: live.status, activity: live.activity, taskId: live.taskId }
          : { status: 'offline', activity: '', taskId: null },
        openTasks: tasks.filter(
          (task) =>
            task.status !== 'done' &&
            task.assigneeType === member.type &&
            task.assigneeId === member.id,
        ).length,
      };
    }),
    questions: {
      open: questions.filter((question) => question.status === 'open'),
      parked: questions.filter((question) => question.status === 'parked'),
      recentlyResolved: questions.filter((question) => question.status === 'resolved').slice(0, 5),
    },
    decisions: {
      open: decisions.filter((decision) => decision.status === 'open'),
      recentlyDecided: decisions.filter((decision) => decision.status !== 'open').slice(0, 5),
    },
    tasks: {
      open: tasks.filter((task) => task.status !== 'done'),
      mine: tasks.filter(
        (task) =>
          task.status !== 'done' &&
          task.assigneeType === principal.type &&
          task.assigneeId === principal.id,
      ),
    },
    messages: {
      latest: messages,
      afterSeq: query.after_seq ?? null,
      lastSeq,
    },
    nextActions: nextActionsFor(req.params.roomId, principal, role, missionValue, questions, decisions, tasks),
    endpoints: {
      room: `/api/rooms/${room.id}`,
      context: `/api/rooms/${room.id}/context`,
      messages: `/api/rooms/${room.id}/messages`,
      questions: `/api/rooms/${room.id}/questions`,
      decisions: `/api/rooms/${room.id}/decisions`,
      vote: `/api/rooms/${room.id}/decisions/{decisionId}/votes`,
      closeDecision: `/api/rooms/${room.id}/decisions/{decisionId}`,
      workstreams: `/api/rooms/${room.id}/workstreams`,
      tasks: `/api/rooms/${room.id}/tasks`,
      presence: `/api/rooms/${room.id}/presence`,
    },
  });
});
