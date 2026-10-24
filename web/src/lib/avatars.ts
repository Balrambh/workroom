export const AVATAR_COUNT = 30;

export const AVATAR_IDS: string[] = Array.from(
  { length: AVATAR_COUNT },
  (_, index) => `avatar-${String(index + 1).padStart(2, '0')}`,
);

const AVATAR_ID_SET = new Set(AVATAR_IDS);

const AVATAR_UPLOAD_SIDE = 320;
const AVATAR_UPLOAD_LIMIT = 110_000;
const AVATAR_UPLOAD_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);

export function isCustomAvatar(value: string | null | undefined): value is string {
  return Boolean(value && value.startsWith('data:image/'));
}

export function avatarSrc(id: string | null | undefined): string | null {
  if (!id) return null;
  if (isCustomAvatar(id)) return id;
  if (!AVATAR_ID_SET.has(id)) return null;
  return `/avatars/${id}.svg`;
}

export function randomAvatarId(): string {
  return AVATAR_IDS[Math.floor(Math.random() * AVATAR_IDS.length)];
}

interface ImageSource {
  image: CanvasImageSource;
  width: number;
  height: number;
  dispose: () => void;
}

async function loadImageSource(file: File): Promise<ImageSource> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file);
      return {
        image: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        dispose: () => bitmap.close(),
      };
    } catch {
      // Fall through to the <img> decoder.
    }
  }
  const url = URL.createObjectURL(file);
  const image = new Image();
  image.src = url;
  try {
    await image.decode();
  } catch {
    URL.revokeObjectURL(url);
    throw new Error('Could not read that image');
  }
  return {
    image,
    width: image.naturalWidth,
    height: image.naturalHeight,
    dispose: () => URL.revokeObjectURL(url),
  };
}

export async function fileToAvatar(file: File): Promise<string> {
  if (!AVATAR_UPLOAD_TYPES.has(file.type)) {
    throw new Error('Choose a PNG, JPEG, or WebP image');
  }
  if (file.size > 8 * 1024 * 1024) {
    throw new Error('That image is over 8 MB. Try a smaller one.');
  }
  const source = await loadImageSource(file);
  try {
    const side = Math.min(source.width, source.height);
    if (!side) throw new Error('That image looks empty');
    const sx = Math.round((source.width - side) / 2);
    const sy = Math.round((source.height - side) / 2);
    let dimension = AVATAR_UPLOAD_SIDE;
    let quality = 0.86;
    for (let attempt = 0; attempt < 7; attempt += 1) {
      const canvas = document.createElement('canvas');
      canvas.width = dimension;
      canvas.height = dimension;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Could not process this image');
      context.fillStyle = '#f4efe6';
      context.fillRect(0, 0, dimension, dimension);
      context.drawImage(source.image, sx, sy, side, side, 0, 0, dimension, dimension);
      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      if (dataUrl.length <= AVATAR_UPLOAD_LIMIT) return dataUrl;
      if (quality > 0.6) quality -= 0.12;
      else dimension = Math.max(160, Math.round(dimension * 0.8));
    }
    throw new Error('Could not shrink that image enough. Try a smaller one.');
  } finally {
    source.dispose();
  }
}
