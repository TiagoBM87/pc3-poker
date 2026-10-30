import type { RoomState } from '../types/poker';
import type { RoomService } from './contract';
import { normalizeRoom, toStoredParticipant } from './normalize';

/**
 * Local demo backend. Rooms live in localStorage and updates are broadcast to
 * other tabs of the same browser, which is enough to try the full flow without
 * a Firebase project.
 */
const ROOM_PREFIX = 'pp:room:';
const CHANNEL_NAME = 'pp:rooms';

const listeners = new Map<string, Set<() => void>>();
const presenceKeys = new Set<string>();
let channel: BroadcastChannel | null = null;
let globalListenersReady = false;

function storageKey(roomId: string) {
  return `${ROOM_PREFIX}${roomId}`;
}

function notify(roomId: string) {
  listeners.get(roomId)?.forEach((listener) => listener());
}

function ensureGlobalListeners() {
  if (globalListenersReady || typeof window === 'undefined') return;
  globalListenersReady = true;

  window.addEventListener('storage', (event) => {
    if (!event.key?.startsWith(ROOM_PREFIX)) return;
    notify(event.key.slice(ROOM_PREFIX.length));
  });

  if ('BroadcastChannel' in window) {
    channel = new BroadcastChannel(CHANNEL_NAME);
    channel.onmessage = (event: MessageEvent<{ roomId?: string }>) => {
      if (event.data?.roomId) notify(event.data.roomId);
    };
  }
}

function readRoom(roomId: string): RoomState | null {
  try {
    const raw = localStorage.getItem(storageKey(roomId));
    if (!raw) return null;
    return normalizeRoom(JSON.parse(raw));
  } catch {
    return null;
  }
}

function writeRoom(roomId: string, room: RoomState) {
  const payload = {
    metadata: room.metadata,
    participants: Object.fromEntries(
      Object.entries(room.participants).map(([id, participant]) => [
        id,
        toStoredParticipant(participant),
      ]),
    ),
    votes: room.votes ?? {},
  };
  localStorage.setItem(storageKey(roomId), JSON.stringify(payload));
  notify(roomId);
  channel?.postMessage({ roomId });
}

function earliestParticipantId(room: RoomState): string | null {
  const earliest = Object.values(room.participants).sort(
    (a, b) => a.joinedAt - b.joinedAt,
  )[0];
  return earliest?.id ?? null;
}

function registerPageExitCleanup(roomId: string, userId: string) {
  const key = `${roomId}:${userId}`;
  if (presenceKeys.has(key)) return;
  presenceKeys.add(key);

  const cleanup = () => {
    const room = readRoom(roomId);
    if (!room) return;

    delete room.participants[userId];
    if (room.votes) delete room.votes[userId];

    if ((room.metadata.hostId ?? null) === userId) {
      room.metadata.hostId = earliestParticipantId(room);
    }

    writeRoom(roomId, room);
  };

  window.addEventListener('pagehide', cleanup);
}

export const subscribe: RoomService['subscribe'] = (roomId, onChange, onError) => {
  try {
    ensureGlobalListeners();
    const listener = () => onChange(readRoom(roomId));
    const roomListeners = listeners.get(roomId) ?? new Set<() => void>();
    roomListeners.add(listener);
    listeners.set(roomId, roomListeners);
    listener();

    return () => {
      roomListeners.delete(listener);
      if (roomListeners.size === 0) listeners.delete(roomId);
    };
  } catch (error) {
    onError?.(error instanceof Error ? error : new Error(String(error)));
    return () => undefined;
  }
};

export const getRoom: RoomService['getRoom'] = async (roomId) => readRoom(roomId);

export const createRoom: RoomService['createRoom'] = async (roomId, title, participant) => {
  if (readRoom(roomId)) return false;

  writeRoom(roomId, {
    metadata: {
      title,
      createdAt: Date.now(),
      isRevealed: false,
      hostId: participant.id,
    },
    participants: {
      [participant.id]: participant,
    },
    votes: {},
  });

  registerPageExitCleanup(roomId, participant.id);
  return true;
};

export const joinRoom: RoomService['joinRoom'] = async (roomId, participant) => {
  const room = readRoom(roomId);
  if (!room) return false;

  const existing = room.participants[participant.id];
  room.participants[participant.id] = existing
    ? { ...existing, name: participant.name, role: participant.role }
    : participant;

  const hostId = room.metadata.hostId ?? null;
  if (!hostId || !room.participants[hostId]) {
    room.metadata.hostId = earliestParticipantId(room);
  }

  writeRoom(roomId, room);
  registerPageExitCleanup(roomId, participant.id);
  return true;
};

export const leaveRoom: RoomService['leaveRoom'] = async (roomId, userId) => {
  const room = readRoom(roomId);
  if (!room) return;

  delete room.participants[userId];
  if (room.votes) delete room.votes[userId];

  if ((room.metadata.hostId ?? null) === userId) {
    room.metadata.hostId = earliestParticipantId(room);
  }

  writeRoom(roomId, room);
};

export const claimHost: RoomService['claimHost'] = async (roomId, userId, staleHostId = null) => {
  const room = readRoom(roomId);
  if (!room) return;

  const hostId = room.metadata.hostId ?? null;
  if (hostId !== null && hostId !== staleHostId) return;

  room.metadata.hostId = userId;
  writeRoom(roomId, room);
};

export const castVote: RoomService['castVote'] = async (roomId, userId, value) => {
  const room = readRoom(roomId);
  if (!room) return;

  const votes = room.votes ?? {};
  if (value === null) {
    delete votes[userId];
  } else {
    votes[userId] = value;
  }
  room.votes = votes;
  writeRoom(roomId, room);
};

export const setRevealed: RoomService['setRevealed'] = async (roomId, isRevealed) => {
  const room = readRoom(roomId);
  if (!room) return;
  room.metadata.isRevealed = isRevealed;
  room.metadata.timerEndsAt = null;
  writeRoom(roomId, room);
};

export const startRoundTimer: RoomService['startRoundTimer'] = async (roomId, endsAt) => {
  const room = readRoom(roomId);
  if (!room || room.metadata.isRevealed) return;
  room.metadata.timerEndsAt = endsAt;
  writeRoom(roomId, room);
};

export const clearRoundTimer: RoomService['clearRoundTimer'] = async (roomId) => {
  const room = readRoom(roomId);
  if (!room || room.metadata.timerEndsAt == null) return;
  room.metadata.timerEndsAt = null;
  writeRoom(roomId, room);
};

export const completeRoundTimer: RoomService['completeRoundTimer'] = async (
  roomId,
  expectedEndsAt,
) => {
  const room = readRoom(roomId);
  if (!room || room.metadata.isRevealed) return;
  if (room.metadata.timerEndsAt !== expectedEndsAt) return;
  if (Date.now() < expectedEndsAt) return;

  room.metadata.isRevealed = true;
  room.metadata.timerEndsAt = null;
  writeRoom(roomId, room);
};

export const resetVoting: RoomService['resetVoting'] = async (roomId) => {
  const room = readRoom(roomId);
  if (!room) return;
  room.metadata.isRevealed = false;
  room.metadata.timerEndsAt = null;
  room.votes = {};
  writeRoom(roomId, room);
};
