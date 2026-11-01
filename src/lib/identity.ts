import { getAuthUid } from '../config/firebase';
import { backendMode } from '../services/roomService';
import type { Identity, Participant, UserRole } from '../types/poker';

const IDENTITY_KEY = 'pp:identity';
const USER_ID_KEY = 'pp:user-id';
const ENTRY_PREFIX = 'pp:entry:';

/** Name and role only. The id is never persisted — it is always derived. */
export interface StoredIdentity {
  name: string;
  role: UserRole;
}

/** Thrown when the identity is requested before the Firebase session is ready. */
export class IdentityUnavailableError extends Error {
  constructor() {
    super('Sua sessão ainda não está pronta. Recarregue a página e tente novamente.');
    this.name = 'IdentityUnavailableError';
  }
}

/**
 * Firebase users keep name/role in localStorage (survives new tabs).
 * The local demo backend uses sessionStorage instead, so each tab can act as
 * a different participant when testing the room with multiple peers.
 */
function getProfileStorage(): Storage | null {
  try {
    return backendMode === 'local' ? window.sessionStorage : window.localStorage;
  } catch {
    return null;
  }
}

/**
 * Room-entry confirmation is always per tab (sessionStorage), which is what
 * makes a freshly opened shared link ask for name/role before joining.
 */
function getEntryStorage(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `u_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Stable id for the local demo backend only (one per tab). Firebase mode never
 * uses it: the authenticated `uid` is the identity.
 */
export function getOrCreateLocalUserId(): string {
  const storage = getProfileStorage();
  try {
    const existing = storage?.getItem(USER_ID_KEY);
    if (existing) return existing;
    const created = newId();
    storage?.setItem(USER_ID_KEY, created);
    return created;
  } catch {
    return newId();
  }
}

/**
 * Identity id used in the room paths (`participants/{id}`, `votes/{id}`).
 *
 * In Firebase mode it is always `auth.currentUser.uid`; anything stored by the
 * browser is ignored, so a visitor cannot impersonate another participant by
 * editing localStorage. Returns `null` while the session is not ready.
 */
export function resolveUserId(): string | null {
  if (backendMode === 'firebase') return getAuthUid();
  return getOrCreateLocalUserId();
}

/** Parses the stored profile, ignoring any legacy `id` field. */
export function parseStoredIdentity(raw: string | null): StoredIdentity | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<StoredIdentity> | null;
    if (!parsed || typeof parsed.name !== 'string') return null;
    if (parsed.role !== 'VOTER' && parsed.role !== 'OBSERVER') return null;

    const name = parsed.name.trim();
    if (!name) return null;

    return { name, role: parsed.role };
  } catch {
    return null;
  }
}

/** Reads the stored profile, tolerating unavailable storage. */
function readStoredIdentity(): StoredIdentity | null {
  try {
    return parseStoredIdentity(getProfileStorage()?.getItem(IDENTITY_KEY) ?? null);
  } catch {
    return null;
  }
}

export function getIdentity(): Identity | null {
  const userId = resolveUserId();
  if (!userId) return null;

  const stored = readStoredIdentity();
  if (!stored) return null;

  return { id: userId, name: stored.name, role: stored.role };
}

export function saveIdentity(name: string, role: UserRole): Identity {
  const userId = resolveUserId();
  if (!userId) throw new IdentityUnavailableError();

  const identity: Identity = { id: userId, name: name.trim(), role };
  try {
    const storage = getProfileStorage();
    storage?.setItem(
      IDENTITY_KEY,
      JSON.stringify({ name: identity.name, role: identity.role }),
    );
    if (backendMode === 'firebase') {
      // Older versions stored a forgeable UUID here; drop it once migrated.
      storage?.removeItem(USER_ID_KEY);
    }
  } catch {
    // Storage may be unavailable (private mode / strict corporate policies).
  }
  return identity;
}

export function clearIdentity(): void {
  try {
    getProfileStorage()?.removeItem(IDENTITY_KEY);
  } catch {
    // Storage may be unavailable (private mode / strict corporate policies).
  }
}

export function toParticipant(identity: Identity, joinedAt = Date.now()): Participant {
  return { ...identity, joinedAt };
}

export function markRoomEntryConfirmed(roomId: string): void {
  try {
    getEntryStorage()?.setItem(`${ENTRY_PREFIX}${roomId}`, '1');
  } catch {
    // Ignore: the gate will simply ask again.
  }
}

export function isRoomEntryConfirmed(roomId: string): boolean {
  try {
    return getEntryStorage()?.getItem(`${ENTRY_PREFIX}${roomId}`) === '1';
  } catch {
    return false;
  }
}

export function clearRoomEntryConfirmation(roomId: string): void {
  try {
    getEntryStorage()?.removeItem(`${ENTRY_PREFIX}${roomId}`);
  } catch {
    // Ignore.
  }
}
