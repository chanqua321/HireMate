const PLACEHOLDER_NAMES = new Set([
  'người dùng google',
  'người dùng',
  'ứng viên',
  'ứng viên hiremate',
]);

const decodeJwtPayload = (token: string): Record<string, unknown> | null => {
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    const base64 = part.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
};

const isPlaceholderDisplayName = (name?: string) => {
  const trimmed = name?.trim();
  if (!trimmed) return true;
  return PLACEHOLDER_NAMES.has(trimmed.toLowerCase());
};

export const resolveAuthDisplayName = (authData: any, idToken?: string) => {
  const candidates = [authData?.fullName, authData?.user?.fullName, authData?.name];
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim() && !isPlaceholderDisplayName(candidate)) {
      return candidate.trim();
    }
  }

  if (idToken) {
    const payload = decodeJwtPayload(idToken);
    const googleName = typeof payload?.name === 'string' ? payload.name.trim() : '';
    if (googleName) return googleName;
    const given = typeof payload?.given_name === 'string' ? payload.given_name.trim() : '';
    const family = typeof payload?.family_name === 'string' ? payload.family_name.trim() : '';
    const combined = [given, family].filter(Boolean).join(' ').trim();
    if (combined) return combined;
    const tokenEmail = typeof payload?.email === 'string' ? payload.email : '';
    const tokenLocal = tokenEmail.split('@')[0];
    if (tokenLocal) return tokenLocal;
  }

  const email = authData?.email || authData?.user?.email || '';
  const local = String(email).split('@')[0];
  return local || 'Người dùng';
};
