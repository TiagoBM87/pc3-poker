import { backendMode } from '../services/roomService';
import type { Identity, Participant, UserRole } from '../types/poker';

const IDENTITY_KEY = 'pp:identity';
const USER_ID_KEY = 'pp:user-id';
const ENTRY_PREFIX = 'pp:entry:';

/**
 * Firebase users keep their identity in localStorage (survives new tabs).
 * The local demo backend uses sessionStorage instead, so each tab can act as
 * a different participant when testing the room with multiple peers.
 */
function getStorage(): Storage | null {
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

/** Stable anonymous id for this browser (kept even if the name changes). */
export function getOrCreateUserId(): string {
  const storage = getStorage();
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

export function getIdentity(): Identity | null {
  try {
    const raw = getStorage()?.getItem(IDENTITY_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Identity>;
    if (!parsed.id || !parsed.name || (parsed.role !== 'VOTER' && parsed.role !== 'OBSERVER')) {
      return null;
    }
    return { id: parsed.id, name: parsed.name, role: parsed.role };
  } catch {
    return null;
  }
}

export function saveIdentity(name: string, role: UserRole): Identity {
  const identity: Identity = {
    id: getOrCreateUserId(),
    name: name.trim(),
    role,
  };
  try {
    getStorage()?.setItem(IDENTITY_KEY, JSON.stringify(identity));
  } catch {
    // Storage may be unavailable (private mode / strict corporate policies).
  }
  return identity;
}

export function clearIdentity(): void {
  try {
    getStorage()?.removeItem(IDENTITY_KEY);
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
