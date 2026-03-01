type EventAccessConfig = {
  documentId: string;
  registrationMode?: 'open' | 'invite_only';
  allowedRegistrationUsers?: string | null;
  start?: string;
  allowPostStartRegistration?: boolean;
};

type UserIdentity = {
  id?: number;
  documentId?: string;
  username?: string;
  email?: string;
};

const splitIdentifiers = (value?: string | null) => {
  if (!value) {
    return [];
  }

  return value
    .split(/[\n,;]+/)
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
};

export const normalizeComparableIdentifiers = (user?: UserIdentity) => {
  if (!user) {
    return [];
  }

  const candidates = [
    user.documentId,
    user.username,
    user.email,
    typeof user.id === 'number' ? String(user.id) : undefined,
  ]
    .filter(Boolean)
    .map((value) => String(value).trim().toLowerCase());

  return Array.from(new Set(candidates));
};

export const isUserAllowedForInviteOnly = (
  user: UserIdentity | undefined,
  allowedRegistrationUsers: string | null | undefined,
) => {
  const allowed = splitIdentifiers(allowedRegistrationUsers);
  if (allowed.length === 0) {
    return false;
  }

  const userIds = normalizeComparableIdentifiers(user);
  return userIds.some((identifier) => allowed.includes(identifier));
};

export const canUserRegisterForEvent = (
  event: EventAccessConfig,
  user: UserIdentity | undefined,
) => {
  const mode = event.registrationMode || 'open';

  if (mode === 'open') {
    return true;
  }

  return isUserAllowedForInviteOnly(user, event.allowedRegistrationUsers);
};

export const isRegistrationOpenNow = (event: EventAccessConfig, nowMs = Date.now()) => {
  if (event.allowPostStartRegistration) {
    return true;
  }

  if (!event.start) {
    return true;
  }

  const startMs = new Date(event.start).getTime();
  if (Number.isNaN(startMs)) {
    return true;
  }

  return nowMs < startMs;
};

export const canUserRegisterNow = (
  event: EventAccessConfig,
  user: UserIdentity | undefined,
  nowMs = Date.now(),
) => canUserRegisterForEvent(event, user) && isRegistrationOpenNow(event, nowMs);

export const canUserSeeInviteOnlyEvent = (
  event: EventAccessConfig,
  user: UserIdentity | undefined,
  isRegistered: boolean,
) => {
  const mode = event.registrationMode || 'open';

  if (mode === 'open') {
    return true;
  }

  if (isRegistered) {
    return true;
  }

  return isUserAllowedForInviteOnly(user, event.allowedRegistrationUsers);
};
