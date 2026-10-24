export const AVATAR_COUNT = 30;

export const AVATAR_IDS: string[] = Array.from(
  { length: AVATAR_COUNT },
  (_, index) => `avatar-${String(index + 1).padStart(2, '0')}`,
);

const AVATAR_ID_SET = new Set(AVATAR_IDS);

export function avatarSrc(id: string | null | undefined): string | null {
  if (!id || !AVATAR_ID_SET.has(id)) return null;
  return `/avatars/${id}.svg`;
}

export function randomAvatarId(): string {
  return AVATAR_IDS[Math.floor(Math.random() * AVATAR_IDS.length)];
}
