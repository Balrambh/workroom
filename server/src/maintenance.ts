import * as store from './store.js';

const DAY_MS = 24 * 60 * 60 * 1000;

function positiveNumber(raw: string | undefined, fallback: number, minimum: number): number {
  const value = Number(raw);
  return Number.isFinite(value) && value >= minimum ? value : fallback;
}

const intervalMs = positiveNumber(process.env.MAINTENANCE_INTERVAL_MS, DAY_MS, 250);
const triggerRetentionDays = positiveNumber(process.env.TRIGGER_EVENT_RETENTION_DAYS, 7, 1);
const joinRequestTtlDays = positiveNumber(process.env.JOIN_REQUEST_TTL_DAYS, 7, 1);

function runMaintenance(): void {
  const now = Date.now();
  try {
    const triggerEventsPruned = store.pruneTriggerEvents(
      new Date(now - triggerRetentionDays * DAY_MS).toISOString(),
    );
    const joinRequestsExpired = store.expireStaleJoinRequests(
      new Date(now - joinRequestTtlDays * DAY_MS).toISOString(),
    );
    if (triggerEventsPruned || joinRequestsExpired) {
      console.log(
        JSON.stringify({
          level: 'info',
          msg: 'maintenance',
          triggerEventsPruned,
          joinRequestsExpired,
        }),
      );
    }
  } catch (error) {
    console.error(
      JSON.stringify({
        level: 'error',
        msg: 'maintenance.failed',
        error: error instanceof Error ? error.message : String(error),
      }),
    );
  }
}

let timer: ReturnType<typeof setInterval> | null = null;

export function startMaintenance(): void {
  if (timer) return;
  runMaintenance();
  timer = setInterval(runMaintenance, intervalMs);
  timer.unref();
}

export function stopMaintenance(): void {
  if (!timer) return;
  clearInterval(timer);
  timer = null;
}
