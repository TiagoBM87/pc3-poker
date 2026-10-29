import { CARD_VALUES } from '../config/cards';
import type { Participant, RoomState, UserRole, VoteValue } from '../types/poker';

const VALID_VOTES = new Set<string>(CARD_VALUES);
const VALID_ROLES = new Set<string>(['VOTER', 'OBSERVER']);

interface RawParticipant {
  name?: unknown;
  role?: unknown;
  joinedAt?: unknown;
}

interface RawRoom {
  metadata?: {
    title?: unknown;
    createdAt?: unknown;
    isRevealed?: unknown;
    hostId?: unknown;
  };
  participants?: Record<string, RawParticipant>;
  votes?: Record<string, unknown>;
}

/** Converts whatever Firebase/localStorage returned into a safe RoomState. */
export function normalizeRoom(raw: unknown): RoomState | null {
  if (!raw || typeof raw !== 'object') return null;
  const data = raw as RawRoom;
  if (!data.metadata) return null;

  const participants: Record<string, Participant> = {};
  for (const [id, value] of Object.entries(data.participants ?? {})) {
    if (!value || typeof value !== 'object' || typeof value.name !== 'string') continue;
    const role: UserRole = VALID_ROLES.has(String(value.role)) ? (value.role as UserRole) : 'VOTER';
    participants[id] = {
      id,
      name: value.name.slice(0, 40),
      role,
      joinedAt: typeof value.joinedAt === 'number' ? value.joinedAt : 0,
    };
  }

  const votes: Record<string, VoteValue> = {};
  for (const [userId, value] of Object.entries(data.votes ?? {})) {
    if (typeof value === 'string' && VALID_VOTES.has(value) && participants[userId]) {
      votes[userId] = value as VoteValue;
    }
  }

  // Keep the stored host id even when that participant is already gone: the
  // clients need it to detect an abandoned host and claim ownership safely.
  const hostId = typeof data.metadata.hostId === 'string' ? data.metadata.hostId : null;

  return {
    metadata: {
      title: typeof data.metadata.title === 'string' ? data.metadata.title : 'Planning Poker',
      createdAt: typeof data.metadata.createdAt === 'number' ? data.metadata.createdAt : 0,
      isRevealed: data.metadata.isRevealed === true,
      hostId,
    },
    participants,
    votes,
  };
}

/** Participants are stored keyed by id, so the id field is not persisted. */
export function toStoredParticipant(participant: Participant) {
  return {
    name: participant.name,
    role: participant.role,
    joinedAt: participant.joinedAt,
  };
}
