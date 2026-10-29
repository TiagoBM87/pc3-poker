import type { Participant, RoomState, VoteValue } from '../types/poker';

export type Unsubscribe = () => void;

/**
 * Transport-agnostic contract. `firebaseService` implements it against the
 * Realtime Database and `localService` implements it with localStorage so the
 * app can be developed/demoed without credentials.
 */
export interface RoomService {
  subscribe(
    roomId: string,
    onChange: (room: RoomState | null) => void,
    onError?: (error: Error) => void,
  ): Unsubscribe;

  getRoom(roomId: string): Promise<RoomState | null>;

  /** Returns false when the room id is already taken. */
  createRoom(roomId: string, title: string, participant: Participant): Promise<boolean>;

  /** Returns false when the room does not exist. */
  joinRoom(roomId: string, participant: Participant): Promise<boolean>;

  leaveRoom(roomId: string, userId: string): Promise<void>;

  /**
   * Claims host ownership when the room has no host or when `staleHostId`
   * (the host that abandoned the room) no longer exists. The operation must be
   * atomic so only one participant wins the race.
   */
  claimHost(roomId: string, userId: string, staleHostId?: string | null): Promise<void>;

  castVote(roomId: string, userId: string, value: VoteValue | null): Promise<void>;

  setRevealed(roomId: string, isRevealed: boolean): Promise<void>;

  resetVoting(roomId: string): Promise<void>;
}
