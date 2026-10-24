import { randomInt } from 'node:crypto';

export const AVATAR_COUNT = 30;

const AVATAR_PATTERN = /^avatar-(0[1-9]|[12][0-9]|30)$/;

export function isAvatarId(value: string): boolean {
  return AVATAR_PATTERN.test(value);
}

export function pickAvatar(): string {
  return `avatar-${String(randomInt(1, AVATAR_COUNT + 1)).padStart(2, '0')}`;
}
