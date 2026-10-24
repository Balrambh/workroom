import { randomInt } from 'node:crypto';

export const AVATAR_COUNT = 30;

const AVATAR_PATTERN = /^avatar-(0[1-9]|[12][0-9]|30)$/;
const CUSTOM_AVATAR_PATTERN = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/;

export const MAX_AVATAR_LENGTH = 120_000;

export function isAvatarId(value: string): boolean {
  return AVATAR_PATTERN.test(value);
}

export function isCustomAvatar(value: string): boolean {
  return value.length <= MAX_AVATAR_LENGTH && CUSTOM_AVATAR_PATTERN.test(value);
}

export function isAvatarValue(value: string): boolean {
  return isAvatarId(value) || isCustomAvatar(value);
}

export function pickAvatar(): string {
  return `avatar-${String(randomInt(1, AVATAR_COUNT + 1)).padStart(2, '0')}`;
}
