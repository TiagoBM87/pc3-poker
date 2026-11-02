import type { RoomState } from '../types/poker';

/**
 * Who should be the host given the participants currently in the room:
 *
 * 1. the owner (the user that created the room) whenever it is present, so a
 *    temporary hand-over never keeps the host away from its creator;
 * 2. otherwise the current host, as long as that participant still exists;
 * 3. otherwise the earliest participant, so the room stays operable while the
 *    owner is away.
 */
export function resolveHostId(room: RoomState): string | null {
  const ownerId = room.metadata.ownerId ?? null;
  if (ownerId && room.participants[ownerId]) return ownerId;

  const hostId = room.metadata.hostId ?? null;
  if (hostId && room.participants[hostId]) return hostId;

  const earliest = Object.values(room.participants).sort(
    (a, b) => a.joinedAt - b.joinedAt,
  )[0];

  return earliest?.id ?? null;
}

/** True when `userId` created the room. */
export function isRoomOwner(room: RoomState, userId: string | null | undefined): boolean {
  if (!userId) return false;
  return (room.metadata.ownerId ?? null) === userId;
}
