import { randomUUID } from 'node:crypto';
import { db } from './db.js';
import type {
  Decision,
  DecisionDependency,
  DecisionMethod,
  DecisionOption,
  DecisionStatus,
  DecisionTally,
  DecisionVote,
  FamilyParent,
  FamilyView,
  Mission,
  MissionPhase,
  MissionQuestion,
  Principal,
  PrincipalType,
  QuestionStatus,
  RelatedDecision,
  WorkstreamSummary,
} from './types.js';

type Row = Record<string, any>;

const nowIso = () => new Date().toISOString();

/* ------------------------------- missions -------------------------------- */

function mapMission(row: Row): Mission {
  return {
    roomId: row.room_id,
    objective: row.objective,
    successCriteria: row.success_criteria,
    constraints: row.constraints,
    phase: row.phase as MissionPhase,
    decisionMode: row.decision_mode as DecisionMethod,
    quorum: Number(row.quorum),
    createdByType: row.created_by_type as PrincipalType,
    createdById: row.created_by_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function getMission(roomId: string): Mission | undefined {
  const row = db.prepare('SELECT * FROM missions WHERE room_id = ?').get(roomId) as Row | undefined;
  return row ? mapMission(row) : undefined;
}

export function ensureMission(roomId: string, creator: Principal): Mission {
  const timestamp = nowIso();
  db.prepare(
    `INSERT OR IGNORE INTO missions
       (room_id, objective, success_criteria, constraints, phase, decision_mode, quorum,
        created_by_type, created_by_id, created_at, updated_at)
     VALUES (?, '', '', '', 'frame', 'consent', 2, ?, ?, ?, ?)`,
  ).run(roomId, creator.type, creator.id, timestamp, timestamp);
  return getMission(roomId)!;
}

export function updateMission(
  roomId: string,
  patch: Partial<{
    objective: string;
    successCriteria: string;
    constraints: string;
    phase: MissionPhase;
    decisionMode: DecisionMethod;
    quorum: number;
  }>,
): Mission | undefined {
  const columns: Record<string, string> = {
    objective: 'objective',
    successCriteria: 'success_criteria',
    constraints: 'constraints',
    phase: 'phase',
    decisionMode: 'decision_mode',
    quorum: 'quorum',
  };
  const sets: string[] = [];
  const values: (string | number)[] = [];
  for (const [key, column] of Object.entries(columns)) {
    if (Object.prototype.hasOwnProperty.call(patch, key)) {
      sets.push(`${column} = ?`);
      const value = (patch as Record<string, unknown>)[key];
      values.push(typeof value === 'number' ? value : String(value ?? ''));
    }
  }
  if (sets.length) {
    sets.push('updated_at = ?');
    values.push(nowIso());
    db.prepare(`UPDATE missions SET ${sets.join(', ')} WHERE room_id = ?`).run(...values, roomId);
  }
  return getMission(roomId);
}

/* ------------------------------- questions ------------------------------- */

function memberName(roomId: string, type: string, id: string): string | null {
  const row = db
    .prepare(
      `SELECT COALESCE(u.name, a.name) AS name
       FROM room_members rm
       LEFT JOIN users u ON rm.principal_type = 'user' AND u.id = rm.principal_id
       LEFT JOIN agents a ON rm.principal_type = 'agent' AND a.id = rm.principal_id
       WHERE rm.room_id = ? AND rm.principal_type = ? AND rm.principal_id = ?`,
    )
    .get(roomId, type, id) as Row | undefined;
  return row?.name ?? null;
}

function mapQuestion(row: Row): MissionQuestion {
  return {
    id: row.id,
    roomId: row.room_id,
    title: row.title,
    detail: row.detail,
    status: row.status as QuestionStatus,
    ownerType: (row.owner_type as PrincipalType | null) ?? null,
    ownerId: row.owner_id ?? null,
    ownerName: row.owner_name ?? null,
    createdByType: row.created_by_type as PrincipalType,
    createdById: row.created_by_id,
    createdByName: row.created_by_name,
    resolution: row.resolution,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    resolvedAt: row.resolved_at ?? null,
  };
}

export function listQuestions(roomId: string): MissionQuestion[] {
  const rows = db
    .prepare(
      `SELECT * FROM mission_questions
       WHERE room_id = ?
       ORDER BY CASE status WHEN 'open' THEN 0 WHEN 'parked' THEN 1 ELSE 2 END,
                created_at DESC`,
    )
    .all(roomId) as Row[];
  return rows.map(mapQuestion);
}

export function getQuestion(roomId: string, questionId: string): MissionQuestion | undefined {
  const row = db
    .prepare('SELECT * FROM mission_questions WHERE room_id = ? AND id = ?')
    .get(roomId, questionId) as Row | undefined;
  return row ? mapQuestion(row) : undefined;
}

export interface NewQuestionInput {
  title: string;
  detail: string;
  ownerType?: PrincipalType | null;
  ownerId?: string | null;
}

export function createQuestion(
  roomId: string,
  input: NewQuestionInput,
  creator: Principal,
): MissionQuestion {
  const id = randomUUID();
  const timestamp = nowIso();
  const ownerName =
    input.ownerType && input.ownerId ? memberName(roomId, input.ownerType, input.ownerId) : null;
  db.prepare(
    `INSERT INTO mission_questions
       (id, room_id, title, detail, status, owner_type, owner_id, owner_name,
        created_by_type, created_by_id, created_by_name, resolution, created_at, updated_at, resolved_at)
     VALUES (?, ?, ?, ?, 'open', ?, ?, ?, ?, ?, ?, '', ?, ?, NULL)`,
  ).run(
    id,
    roomId,
    input.title,
    input.detail,
    input.ownerType ?? null,
    input.ownerId ?? null,
    ownerName,
    creator.type,
    creator.id,
    creator.name,
    timestamp,
    timestamp,
  );
  return getQuestion(roomId, id)!;
}

export interface QuestionPatch {
  title?: string;
  detail?: string;
  status?: QuestionStatus;
  ownerType?: PrincipalType | null;
  ownerId?: string | null;
  resolution?: string;
}

export function updateQuestion(
  roomId: string,
  questionId: string,
  patch: QuestionPatch,
): MissionQuestion | undefined {
  const existing = getQuestion(roomId, questionId);
  if (!existing) return undefined;

  const sets: string[] = [];
  const values: (string | null)[] = [];
  if (patch.title !== undefined) {
    sets.push('title = ?');
    values.push(patch.title);
  }
  if (patch.detail !== undefined) {
    sets.push('detail = ?');
    values.push(patch.detail);
  }
  if (patch.resolution !== undefined) {
    sets.push('resolution = ?');
    values.push(patch.resolution);
  }
  if (patch.ownerType !== undefined || patch.ownerId !== undefined) {
    const ownerType = patch.ownerType ?? null;
    const ownerId = patch.ownerId ?? null;
    const ownerName = ownerType && ownerId ? memberName(roomId, ownerType, ownerId) : null;
    sets.push('owner_type = ?', 'owner_id = ?', 'owner_name = ?');
    values.push(ownerType, ownerId, ownerName);
  }
  if (patch.status !== undefined) {
    sets.push('status = ?');
    values.push(patch.status);
    sets.push('resolved_at = ?');
    values.push(patch.status === 'resolved' ? nowIso() : null);
  }
  if (sets.length) {
    sets.push('updated_at = ?');
    values.push(nowIso());
    db.prepare(`UPDATE mission_questions SET ${sets.join(', ')} WHERE room_id = ? AND id = ?`).run(
      ...values,
      roomId,
      questionId,
    );
  }
  return getQuestion(roomId, questionId);
}

export function deleteQuestion(roomId: string, questionId: string): boolean {
  const result = db
    .prepare('DELETE FROM mission_questions WHERE room_id = ? AND id = ?')
    .run(roomId, questionId);
  return Number(result.changes) > 0;
}

/* ------------------------------- decisions ------------------------------- */

const CONSENT_CHOICES = new Set(['consent', 'objection', 'abstain']);

function parseOptions(raw: string): DecisionOption[] {
  try {
    const parsed = JSON.parse(raw) as DecisionOption[];
    return Array.isArray(parsed)
      ? parsed.filter((option) => option && typeof option.id === 'string' && typeof option.label === 'string')
      : [];
  } catch {
    return [];
  }
}

function mapVote(row: Row): DecisionVote {
  return {
    voterType: row.voter_type as PrincipalType,
    voterId: row.voter_id,
    voterName: row.voter_name,
    choice: row.choice,
    comment: row.comment,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function tallyDecision(
  decision: Pick<Decision, 'method' | 'quorum' | 'options' | 'votes'>,
): DecisionTally {
  const byOption: Record<string, number> = Object.fromEntries(
    decision.options.map((option) => [option.id, 0]),
  );
  let support = 0;
  let consent = 0;
  let objection = 0;
  let abstain = 0;

  for (const vote of decision.votes) {
    if (Object.prototype.hasOwnProperty.call(byOption, vote.choice)) {
      byOption[vote.choice] += 1;
      support += 1;
    } else if (vote.choice === 'consent') {
      consent += 1;
    } else if (vote.choice === 'objection') {
      objection += 1;
    } else if (vote.choice === 'abstain') {
      abstain += 1;
    }
  }

  const ranked = decision.options
    .map((option) => ({ id: option.id, count: byOption[option.id] ?? 0 }))
    .sort((left, right) => right.count - left.count);
  const leadingOptionId =
    ranked.length > 0 && ranked[0].count > 0 && (ranked.length === 1 || ranked[0].count > ranked[1].count)
      ? ranked[0].id
      : null;

  const votes = decision.votes.length;
  const quorumMet = votes >= decision.quorum;
  let ready: boolean;
  if (decision.method === 'consent') {
    ready = quorumMet && consent > 0 && objection === 0;
  } else if (decision.method === 'admin') {
    ready = quorumMet;
  } else {
    ready = quorumMet && leadingOptionId !== null;
  }

  return {
    votes,
    support,
    consent,
    objection,
    abstain,
    byOption,
    leadingOptionId,
    quorumMet,
    ready,
  };
}

function mapDecision(row: Row, votes: DecisionVote[], dependencies: DecisionDependency[]): Decision {
  const options = parseOptions(row.options);
  const base = {
    id: row.id,
    roomId: row.room_id,
    title: row.title,
    context: row.context,
    method: row.method as DecisionMethod,
    quorum: Number(row.quorum),
    status: row.status as DecisionStatus,
    options,
    votes,
    dependencies,
    dueAt: row.due_at ?? null,
    createdByType: row.created_by_type as PrincipalType,
    createdById: row.created_by_id,
    createdByName: row.created_by_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    decidedOptionId: row.decided_option_id ?? null,
    decidedOptionLabel: row.decided_option_label ?? null,
    rationale: row.rationale,
    decidedByType: (row.decided_by_type as PrincipalType | null) ?? null,
    decidedById: row.decided_by_id ?? null,
    decidedByName: row.decided_by_name ?? null,
    decidedAt: row.decided_at ?? null,
  };
  return { ...base, tally: tallyDecision(base) };
}

function dependenciesFor(decisionIds: string[]): Map<string, DecisionDependency[]> {
  const grouped = new Map<string, DecisionDependency[]>();
  if (decisionIds.length === 0) return grouped;
  const placeholders = decisionIds.map(() => '?').join(', ');
  const rows = db
    .prepare(
      `SELECT dd.decision_id,
              target.id AS target_decision_id, target.room_id AS target_room_id,
              target.title AS target_title, target.status AS target_status,
              target.decided_option_label AS target_option_label,
              r.name AS room_name, r.code AS room_code
       FROM decision_dependencies dd
       JOIN decisions target ON target.id = dd.depends_on_decision_id
       JOIN rooms r ON r.id = target.room_id
       WHERE dd.decision_id IN (${placeholders})
       ORDER BY dd.created_at ASC`,
    )
    .all(...decisionIds) as Row[];
  for (const row of rows) {
    const list = grouped.get(row.decision_id) ?? [];
    list.push({
      decisionId: row.target_decision_id,
      roomId: row.target_room_id,
      roomName: row.room_name,
      roomCode: row.room_code ?? undefined,
      title: row.target_title,
      status: row.target_status as DecisionStatus,
      decidedOptionLabel: row.target_option_label ?? null,
    });
    grouped.set(row.decision_id, list);
  }
  return grouped;
}

function votesForRoom(roomId: string): Map<string, DecisionVote[]> {
  const rows = db
    .prepare(
      `SELECT v.* FROM decision_votes v
       JOIN decisions d ON d.id = v.decision_id
       WHERE d.room_id = ?
       ORDER BY v.updated_at ASC`,
    )
    .all(roomId) as Row[];
  const grouped = new Map<string, DecisionVote[]>();
  for (const row of rows) {
    const list = grouped.get(row.decision_id) ?? [];
    list.push(mapVote(row));
    grouped.set(row.decision_id, list);
  }
  return grouped;
}

export function listDecisions(roomId: string): Decision[] {
  const rows = db
    .prepare(
      `SELECT * FROM decisions
       WHERE room_id = ?
       ORDER BY CASE status WHEN 'open' THEN 0 ELSE 1 END,
                created_at DESC`,
    )
    .all(roomId) as Row[];
  const votes = votesForRoom(roomId);
  const dependencies = dependenciesFor(rows.map((row) => row.id));
  return rows.map((row) =>
    mapDecision(row, votes.get(row.id) ?? [], dependencies.get(row.id) ?? []),
  );
}

export function getDecision(roomId: string, decisionId: string): Decision | undefined {
  const row = db
    .prepare('SELECT * FROM decisions WHERE room_id = ? AND id = ?')
    .get(roomId, decisionId) as Row | undefined;
  if (!row) return undefined;
  const votes = db
    .prepare('SELECT * FROM decision_votes WHERE decision_id = ? ORDER BY updated_at ASC')
    .all(decisionId) as Row[];
  return mapDecision(row, votes.map(mapVote), dependenciesFor([decisionId]).get(decisionId) ?? []);
}

export interface NewDecisionInput {
  title: string;
  context: string;
  method: DecisionMethod;
  quorum: number;
  options: string[];
  dueAt: string | null;
  dependencies?: { roomId: string; decisionId: string }[];
}

export function createDecision(
  roomId: string,
  input: NewDecisionInput,
  creator: Principal,
): Decision {
  const id = randomUUID();
  const timestamp = nowIso();
  const options: DecisionOption[] = input.options.map((label) => ({
    id: randomUUID(),
    label,
  }));
  db.prepare(
    `INSERT INTO decisions
       (id, room_id, title, context, method, quorum, status, options, due_at,
        created_by_type, created_by_id, created_by_name, created_at, updated_at,
        decided_option_id, decided_option_label, rationale, decided_by_type, decided_by_id,
        decided_by_name, decided_at)
     VALUES (?, ?, ?, ?, ?, ?, 'open', ?, ?, ?, ?, ?, ?, ?, NULL, NULL, '', NULL, NULL, NULL, NULL)`,
  ).run(
    id,
    roomId,
    input.title,
    input.context,
    input.method,
    input.quorum,
    JSON.stringify(options),
    input.dueAt,
    creator.type,
    creator.id,
    creator.name,
    timestamp,
    timestamp,
  );
  const insertDependency = db.prepare(
    `INSERT OR IGNORE INTO decision_dependencies
       (decision_id, depends_on_decision_id, depends_on_room_id, created_at)
     VALUES (?, ?, ?, ?)`,
  );
  for (const dependency of input.dependencies ?? []) {
    insertDependency.run(id, dependency.decisionId, dependency.roomId, timestamp);
  }
  return getDecision(roomId, id)!;
}

export interface DecisionOutcomeInput {
  status: Extract<DecisionStatus, 'decided' | 'withdrawn'>;
  optionId: string | null;
  rationale: string;
}

export function setDecisionOutcome(
  roomId: string,
  decisionId: string,
  input: DecisionOutcomeInput,
  decider: Principal,
): Decision | undefined {
  const decision = getDecision(roomId, decisionId);
  if (!decision) return undefined;
  const option =
    input.status === 'decided' && input.optionId
      ? decision.options.find((candidate) => candidate.id === input.optionId)
      : undefined;
  const timestamp = nowIso();
  db.prepare(
    `UPDATE decisions
     SET status = ?, decided_option_id = ?, decided_option_label = ?, rationale = ?,
         decided_by_type = ?, decided_by_id = ?, decided_by_name = ?, decided_at = ?, updated_at = ?
     WHERE room_id = ? AND id = ?`,
  ).run(
    input.status,
    option?.id ?? null,
    option?.label ?? null,
    input.rationale,
    decider.type,
    decider.id,
    decider.name,
    timestamp,
    timestamp,
    roomId,
    decisionId,
  );
  return getDecision(roomId, decisionId);
}

export function castVote(
  roomId: string,
  decisionId: string,
  voter: Principal,
  choice: string,
  comment: string,
): Decision | undefined {
  const decision = getDecision(roomId, decisionId);
  if (!decision) return undefined;
  const timestamp = nowIso();
  db.prepare(
    `INSERT INTO decision_votes
       (decision_id, voter_type, voter_id, voter_name, choice, comment, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (decision_id, voter_type, voter_id)
     DO UPDATE SET choice = excluded.choice, comment = excluded.comment,
                   voter_name = excluded.voter_name, updated_at = excluded.updated_at`,
  ).run(decisionId, voter.type, voter.id, voter.name, choice, comment, timestamp, timestamp);
  return getDecision(roomId, decisionId);
}

export function isValidChoice(decision: Decision, choice: string): boolean {
  if (decision.method === 'consent') return CONSENT_CHOICES.has(choice);
  return choice === 'abstain' || decision.options.some((option) => option.id === choice);
}

/* ------------------------------- workstreams ------------------------------ */

function parentSummary(roomId: string): FamilyParent | null {
  const row = db
    .prepare(
      `SELECT r.id, r.name, r.topic, r.code,
              m.phase, m.objective, m.decision_mode, m.quorum
       FROM rooms r
       LEFT JOIN missions m ON m.room_id = r.id
       WHERE r.id = ?`,
    )
    .get(roomId) as Row | undefined;
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    topic: row.topic,
    code: row.code ?? undefined,
    phase: (row.phase as MissionPhase | null) ?? 'frame',
    objective: row.objective ?? '',
    decisionMode: (row.decision_mode as DecisionMethod | null) ?? 'consent',
    quorum: Number(row.quorum ?? 2),
  };
}

function workstreamSummaries(parentId: string): WorkstreamSummary[] {
  const rows = db
    .prepare(
      `SELECT r.id, r.name, r.topic, r.code,
              COALESCE(m.phase, 'frame') AS phase,
              COALESCE(m.objective, '') AS objective,
              COALESCE(m.updated_at, r.created_at) AS updated_at,
              (SELECT COUNT(*) FROM mission_questions q
                 WHERE q.room_id = r.id AND q.status = 'open') AS open_questions,
              (SELECT COUNT(*) FROM decisions d
                 WHERE d.room_id = r.id AND d.status = 'open') AS open_decisions,
              (SELECT COUNT(*) FROM room_members rm WHERE rm.room_id = r.id) AS member_count
       FROM rooms r
       LEFT JOIN missions m ON m.room_id = r.id
       WHERE r.parent_room_id = ?
       ORDER BY r.created_at ASC`,
    )
    .all(parentId) as Row[];
  if (rows.length === 0) return [];

  const ids = rows.map((row) => row.id);
  const placeholders = ids.map(() => '?').join(', ');
  const blockedRows = db
    .prepare(
      `SELECT d.room_id, COUNT(DISTINCT d.id) AS blocked
       FROM decisions d
       JOIN decision_dependencies dd ON dd.decision_id = d.id
       JOIN decisions target ON target.id = dd.depends_on_decision_id
       WHERE d.status = 'open' AND target.status <> 'decided'
         AND d.room_id IN (${placeholders})
       GROUP BY d.room_id`,
    )
    .all(...ids) as Row[];
  const blocked = new Map(blockedRows.map((row) => [row.room_id as string, Number(row.blocked)]));

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    topic: row.topic,
    code: row.code ?? undefined,
    phase: row.phase as MissionPhase,
    objective: row.objective,
    openQuestions: Number(row.open_questions),
    openDecisions: Number(row.open_decisions),
    blockedDecisions: blocked.get(row.id) ?? 0,
    memberCount: Number(row.member_count),
    updatedAt: row.updated_at,
  }));
}

function relatedDecisionsFor(
  roomId: string,
  parentRoomId: string | null,
  childRoomIds: string[],
): RelatedDecision[] {
  const scope = [...(parentRoomId ? [parentRoomId] : []), ...childRoomIds].filter(
    (id) => id !== roomId,
  );
  if (scope.length === 0) return [];
  const placeholders = scope.map(() => '?').join(', ');
  const rows = db
    .prepare(
      `SELECT d.id, d.room_id, d.title, d.method, d.status, d.decided_option_label, d.due_at,
              r.name AS room_name, r.code AS room_code
       FROM decisions d
       JOIN rooms r ON r.id = d.room_id
       WHERE d.status = 'open' AND d.room_id IN (${placeholders})
       ORDER BY d.created_at DESC
       LIMIT 50`,
    )
    .all(...scope) as Row[];
  return rows.map((row) => ({
    id: row.id,
    roomId: row.room_id,
    roomName: row.room_name,
    roomCode: row.room_code ?? undefined,
    title: row.title,
    method: row.method as DecisionMethod,
    status: row.status as DecisionStatus,
    decidedOptionLabel: row.decided_option_label ?? null,
    dueAt: row.due_at ?? null,
  }));
}

export function getFamilyView(roomId: string): FamilyView {
  const room = db
    .prepare('SELECT id, parent_room_id FROM rooms WHERE id = ?')
    .get(roomId) as Row | undefined;
  if (!room) return { parent: null, workstreams: [], relatedDecisions: [] };
  const parentRoomId = (room.parent_room_id as string | null) ?? null;
  const children = db
    .prepare('SELECT id FROM rooms WHERE parent_room_id = ? ORDER BY created_at ASC')
    .all(roomId) as Row[];
  const childRoomIds = children.map((row) => row.id as string);
  return {
    parent: parentRoomId ? parentSummary(parentRoomId) : null,
    workstreams: workstreamSummaries(roomId),
    relatedDecisions: relatedDecisionsFor(roomId, parentRoomId, childRoomIds),
  };
}

export function isRelatedRoom(roomId: string, otherRoomId: string): boolean {
  if (roomId === otherRoomId) return true;
  const current = db
    .prepare('SELECT parent_room_id FROM rooms WHERE id = ?')
    .get(roomId) as Row | undefined;
  if (current?.parent_room_id === otherRoomId) return true;
  const other = db
    .prepare('SELECT parent_room_id FROM rooms WHERE id = ?')
    .get(otherRoomId) as Row | undefined;
  return other?.parent_room_id === roomId;
}

export function listDependents(decisionId: string): {
  decisionId: string;
  roomId: string;
  title: string;
  status: DecisionStatus;
}[] {
  const rows = db
    .prepare(
      `SELECT dd.decision_id, d.room_id, d.title, d.status
       FROM decision_dependencies dd
       JOIN decisions d ON d.id = dd.decision_id
       WHERE dd.depends_on_decision_id = ?`,
    )
    .all(decisionId) as Row[];
  return rows.map((row) => ({
    decisionId: row.decision_id,
    roomId: row.room_id,
    title: row.title,
    status: row.status as DecisionStatus,
  }));
}
