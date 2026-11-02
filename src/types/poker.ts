export type VoteValue = '1' | '2' | '3' | '5' | '8' | '13' | '21' | '?' | '☕';
export type UserRole = 'VOTER' | 'OBSERVER';

export interface Participant {
  id: string;
  name: string;
  role: UserRole;
  joinedAt: number;
}

export interface RoomMetadata {
  title: string;
  createdAt: number;
  isRevealed: boolean;
  /**
   * Absolute timestamp (ms) when the optional round timer expires. While set,
   * every client counts down and the first one to reach zero reveals the cards.
   */
  timerEndsAt?: number | null;
  /**
   * Participant that created the room. It is always the host while present,
   * even after a temporary hand-over while it was away.
   */
  ownerId?: string | null;
  /**
   * Participant allowed to reveal/reset the round. It is the owner while the
   * owner is present and is handed over to the earliest remaining participant
   * while the owner is away.
   */
  hostId?: string | null;
}

export interface RoomState {
  metadata: RoomMetadata;
  participants: Record<string, Participant>;
  votes?: Record<string, VoteValue>;
}

export interface RoomStats {
  average: number | null;
  mode: VoteValue[] | null;
  min: number | null;
  max: number | null;
  hasConsensus: boolean;
}

/** Anonymous identity of the person using this browser/tab. */
export interface Identity {
  id: string;
  name: string;
  role: UserRole;
}

/** @deprecated kept as an alias so both naming styles stay valid. */
export type RoomIdentity = Identity;
