import {
  get,
  onDisconnect,
  onValue,
  ref,
  remove,
  runTransaction,
  set,
  update,
  type Database,
} from 'firebase/database';
import { db } from '../config/firebase';
import type { RoomState } from '../types/poker';
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

/**
 * Registers `onDisconnect` cleanup so a participant (and their vote) disappears
 * when the tab is closed or the connection drops.
 */
async function registerPresence(roomId: string, userId: string): Promise<void> {
  const database = requireDb();
  await Promise.all([
    onDisconnect(ref(database, `${roomPath(roomId)}/participants/${userId}`)).remove(),
    onDisconnect(ref(database, `${roomPath(roomId)}/votes/${userId}`)).remove(),
  ]);
}

async function cancelPresence(roomId: string, userId: string): Promise<void> {
  const database = requireDb();
  await Promise.all([
    onDisconnect(ref(database, `${roomPath(roomId)}/participants/${userId}`)).cancel(),
    onDisconnect(ref(database, `${roomPath(roomId)}/votes/${userId}`)).cancel(),
  ]);
}

/**
 * Assigns the host to the earliest participant when the room has no valid host.
 * Uses a transaction so concurrent joiners cannot both become host.
 */
async function ensureHost(roomId: string, room: RoomState): Promise<void> {
  const database = requireDb();
  const currentHostId = room.metadata.hostId ?? null;
  if (currentHostId && room.participants[currentHostId]) return;

  const earliest = Object.values(room.participants).sort(
    (a, b) => a.joinedAt - b.joinedAt,
  )[0];
  if (!earliest) return;

  await runTransaction(
    ref(database, `${roomPath(roomId)}/metadata/hostId`),
    (current) => {
      const value = typeof current === 'string' ? current : null;
      if (value !== null && value !== currentHostId) return undefined; // someone else won
      return earliest.id;
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
  await update(ref(database, `${roomPath(roomId)}/metadata`), { isRevealed });
};

export const resetVoting: RoomService['resetVoting'] = async (roomId) => {
  const database = requireDb();
  await update(ref(database, roomPath(roomId)), {
    'metadata/isRevealed': false,
    votes: null,
  });
};
