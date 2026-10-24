const HANDLE_PATTERN = /^[a-z0-9][a-z0-9_-]{1,28}[a-z0-9]$/;

export function normalizeHandle(value: string): string {
  return value.trim().toLowerCase();
}

export function handleValidationError(value: string): string | null {
  const handle = normalizeHandle(value);
  if (handle.length < 3) return 'Handle must be at least 3 characters';
  if (handle.length > 30) return 'Handle must be 30 characters or fewer';
  if (!HANDLE_PATTERN.test(handle)) {
    return 'Use lowercase letters, numbers, hyphens, or underscores; start and end with a letter or number';
  }
  return null;
}

export function handleFromName(name: string, fallback: 'user' | 'agent'): string {
  const ascii = name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  let base = ascii
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24);
  if (base.length < 3) base = `${fallback}-${base}`.replace(/-+$/g, '');
  if (base.length < 3) base = fallback;
  return base;
}
