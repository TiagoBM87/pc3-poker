import {
  get,
  goOffline,
  onDisconnect,
  onValue,
  ref,
  remove,
  runTransaction,
  set,
  update,
  type Database,
} from 'firebase/database';
import { db, getAppCheckToken, getCachedIdToken } from '../config/firebase';
import type { RoomState } from '../types/poker';
import { resolveHostId } from '../lib/host';
import { buildPresenceDeleteHeaders, buildPresenceDeleteUrl } from '../lib/presence';
import type { RoomService } from './contract';
import { normalizeRoom, toStoredParticipant } from './normalize';

function requireDb(): Database {
  if (!db) {
    throw new Error(
      'Firebase não configurado. Preencha as variáveis VITE_FIREBASE_* no arquivo .env.',
    );
  }
  return db;
}

function roomPath(roomId: string): string {
  return `rooms/${roomId}`;
}

let presenceFlushInstalled = false;
let presenceTarget: { roomId: string; userId: string } | null = null;

const DATABASE_URL = (import.meta.env.VITE_FIREBASE_DATABASE_URL ?? '').replace(/\/+$/, '');

/**
 * Best-effort DELETE of the presence node through the REST API. `keepalive`
 * keeps the request alive while the page is unloading, so presence is cleaned
 * up as soon as the tab closes instead of waiting for the server to notice a
 * dropped long-poll connection (which can take over a minute).
 *
 * Only `participants/{uid}` is removed. The vote is intentionally kept so a
 * reload restores it — the identity (Auth `uid`) is stable across reloads.
 * Votes left behind by a closed tab are ignored by the UI while that
 * participant is absent and are removed on an explicit leave or on reset.
 *
 * The request carries the cached ID token (and the App Check token when F4-T1
 * wires it). Without a token the unload is not blocked and the regular
 * `onDisconnect` cleanup takes over.
 */
function flushPresenceOnUnload(): void {
  const target = presenceTarget;
  const idToken = getCachedIdToken();
  if (!target || !DATABASE_URL || !idToken) return;

  try {
    void fetch(buildPresenceDeleteUrl(DATABASE_URL, target.roomId, target.userId, idToken), {
      method: 'DELETE',
      keepalive: true,
      headers: buildPresenceDeleteHeaders(getAppCheckToken()),
    }).catch(() => undefined);
  } catch {
    // Ignore: the regular onDisconnect cleanup will still run.
  }
}

function installPresenceFlush(): void {
  if (presenceFlushInstalled || typeof window === 'undefined') return;
  presenceFlushInstalled = true;

  window.addEventListener('pagehide', () => {
    flushPresenceOnUnload();
    try {
      // Stop the SDK from trying to reconnect while the page is going away.
      goOffline(requireDb());
    } catch {
      // Firebase not configured: nothing to flush.
    }
  });

  // Restoring from the back/forward cache would show a stale room, because the
  // disconnect cleanup already removed this participant. Reload and rejoin.
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) window.location.reload();
  });
}

/**
 * Registers `onDisconnect` cleanup for presence. The vote is not removed here
 * on purpose: a reload keeps it, and `leaveRoom`/`resetVoting` clean it up.
 */
async function registerPresence(roomId: string, userId: string): Promise<void> {
  const database = requireDb();
  installPresenceFlush();
  presenceTarget = { roomId, userId };
  await onDisconnect(ref(database, `${roomPath(roomId)}/participants/${userId}`)).remove();
}

async function cancelPresence(roomId: string, userId: string): Promise<void> {
  const database = requireDb();
  if (presenceTarget?.roomId === roomId && presenceTarget.userId === userId) {
    presenceTarget = null;
  }
  await onDisconnect(ref(database, `${roomPath(roomId)}/participants/${userId}`)).cancel();
}

/**
 * Moves the host to the expected participant: the owner reclaims whenever it is
 * present, the current host is kept while it exists, and the earliest
 * participant takes over when the seat is empty. Uses a transaction so
 * concurrent joiners cannot both become host.
 */
async function ensureHost(roomId: string, room: RoomState): Promise<void> {
  const database = requireDb();
  const currentHostId = room.metadata.hostId ?? null;
  const nextHostId = resolveHostId(room);
  if (!nextHostId || nextHostId === currentHostId) return;

  await runTransaction(
    ref(database, `${roomPath(roomId)}/metadata/hostId`),
    (current) => {
      const value = typeof current === 'string' ? current : null;
      if (value !== currentHostId) return undefined; // someone else won
      return nextHostId;
    },
  );
}

export const subscribe: RoomService['subscribe'] = (roomId, onChange, onError) => {
  const database = requireDb();
  return onValue(
    ref(database, roomPath(roomId)),
    (snapshot) => onChange(snapshot.exists() ? normalizeRoom(snapshot.val()) : null),
    (error) => onError?.(error),
  );
};

export const getRoom: RoomService['getRoom'] = async (roomId) => {
  const snapshot = await get(ref(requireDb(), roomPath(roomId)));
  return snapshot.exists() ? normalizeRoom(snapshot.val()) : null;
};

export const createRoom: RoomService['createRoom'] = async (roomId, title, participant) => {
  const database = requireDb();
  const existing = await get(ref(database, roomPath(roomId)));
  if (existing.exists()) return false;

  await set(ref(database, roomPath(roomId)), {
    metadata: {
      title,
      createdAt: Date.now(),
      isRevealed: false,
      ownerId: participant.id,
      hostId: participant.id,
    },
    participants: {
      [participant.id]: toStoredParticipant(participant),
    },
    votes: {},
  });

  // Presence is best-effort: a flaky network must not block room creation.
  void registerPresence(roomId, participant.id).catch(() => undefined);
  return true;
};

export const joinRoom: RoomService['joinRoom'] = async (roomId, participant) => {
  const database = requireDb();
  const snapshot = await get(ref(database, roomPath(roomId)));
  if (!snapshot.exists()) return false;

  const room = normalizeRoom(snapshot.val());
  if (!room) return false;

  await set(
    ref(database, `${roomPath(roomId)}/participants/${participant.id}`),
    toStoredParticipant(participant),
  );

  await ensureHost(roomId, {
    ...room,
    participants: { ...room.participants, [participant.id]: participant },
  });
  void registerPresence(roomId, participant.id).catch(() => undefined);
  return true;
};

export const leaveRoom: RoomService['leaveRoom'] = async (roomId, userId) => {
  const database = requireDb();
  void cancelPresence(roomId, userId).catch(() => undefined);

  const snapshot = await get(ref(database, roomPath(roomId)));
  if (!snapshot.exists()) return;

  const room = normalizeRoom(snapshot.val());
  if (!room) return;

  const remaining = Object.values(room.participants)
    .filter((participant) => participant.id !== userId)
    .sort((a, b) => a.joinedAt - b.joinedAt);

  const updates: Record<string, unknown> = {
    [`participants/${userId}`]: null,
    [`votes/${userId}`]: null,
  };

  if ((room.metadata.hostId ?? null) === userId) {
    updates['metadata/hostId'] = remaining[0]?.id ?? null;
  }

  await update(ref(database, roomPath(roomId)), updates);
};

export const claimHost: RoomService['claimHost'] = async (
  roomId,
  userId,
  staleHostId = null,
) => {
  const database = requireDb();
  await runTransaction(
    ref(database, `${roomPath(roomId)}/metadata/hostId`),
    (current) => {
      const value = typeof current === 'string' ? current : null;
      if (value === null || value === staleHostId) return userId;
      return undefined; // a valid host already exists
    },
  );
};

export const castVote: RoomService['castVote'] = async (roomId, userId, value) => {
  const database = requireDb();
  const voteRef = ref(database, `${roomPath(roomId)}/votes/${userId}`);

  if (value === null) {
    await remove(voteRef);
    return;
  }
  await set(voteRef, value);
};

export const setRevealed: RoomService['setRevealed'] = async (roomId, isRevealed) => {
  const database = requireDb();
  await update(ref(database, `${roomPath(roomId)}/metadata`), {
    isRevealed,
    timerEndsAt: null,
  });
};

export const startRoundTimer: RoomService['startRoundTimer'] = async (roomId, endsAt) => {
  const database = requireDb();
  await runTransaction(ref(database, `${roomPath(roomId)}/metadata`), (current) => {
    if (!current || typeof current !== 'object') return current;
    const metadata = current as Record<string, unknown>;
    if (metadata.isRevealed === true) return current;
    return { ...metadata, timerEndsAt: endsAt };
  });
};

export const clearRoundTimer: RoomService['clearRoundTimer'] = async (roomId) => {
  const database = requireDb();
  await update(ref(database, `${roomPath(roomId)}/metadata`), { timerEndsAt: null });
};

export const completeRoundTimer: RoomService['completeRoundTimer'] = async (
  roomId,
  expectedEndsAt,
) => {
  const database = requireDb();
  await runTransaction(ref(database, `${roomPath(roomId)}/metadata`), (current) => {
    if (!current || typeof current !== 'object') return current;
    const metadata = current as Record<string, unknown>;
    if (metadata.isRevealed === true) return current;
    if (metadata.timerEndsAt !== expectedEndsAt) return current;
    if (Date.now() < expectedEndsAt) return current;
    return { ...metadata, isRevealed: true, timerEndsAt: null };
  });
};

export const resetVoting: RoomService['resetVoting'] = async (roomId) => {
  const database = requireDb();
  await update(ref(database, roomPath(roomId)), {
    'metadata/isRevealed': false,
    'metadata/timerEndsAt': null,
    votes: null,
  });
};
