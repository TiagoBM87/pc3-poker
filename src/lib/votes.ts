import type { Participant, VoteValue } from '../types/poker';

/**
 * Votes stay stored when a tab closes so that reloading the page restores the
 * user's own vote (the unload handler only removes presence).
 *
 * A vote without a matching participant belongs to someone who is away, so the
 * UI must not show it nor count it. It is removed on an explicit leave or when
 * the host resets the round.
 *
 * This filter lives here — not in `normalizeRoom` — because the stored vote is
 * intentional state: dropping it while normalizing would make any read/write
 * cycle (for example `localService.joinRoom`) lose it for good.
 */
export function filterVotesByPresence(
  votes: Record<string, VoteValue>,
  participants: Record<string, Participant>,
): Record<string, VoteValue> {
  const present: Record<string, VoteValue> = {};

  for (const [userId, value] of Object.entries(votes)) {
    if (participants[userId]) present[userId] = value;
  }

  return present;
}
