export const IS_PRODUCTION = process.env.NODE_ENV === 'production';
export const TRIGGER_TIMEOUT_MS = Number(process.env.TRIGGER_TIMEOUT_MS ?? 5000);
export const WAKE_TIMEOUT_MS = Number(process.env.WAKE_TIMEOUT_MS ?? 60000);
export const ALLOW_PRIVATE_TRIGGER_URLS = process.env.ALLOW_PRIVATE_TRIGGER_URLS === 'true';

const retryOverride = (process.env.TRIGGER_RETRY_DELAYS ?? '')
  .split(',')
  .map((value) => Number(value.trim()))
  .filter((value) => Number.isFinite(value) && value >= 0);
export const TRIGGER_RETRY_DELAYS_MS = retryOverride.length ? retryOverride : [2000, 10000, 30000];
export const MAX_TRIGGER_ATTEMPTS = TRIGGER_RETRY_DELAYS_MS.length + 1;
