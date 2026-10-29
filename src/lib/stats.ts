import { isNumericVote } from '../config/cards';
import type { RoomStats, VoteValue } from '../types/poker';

/**
 * Statistics only make sense after the reveal, and only numeric cards feed
 * average/min/max. Consensus requires at least two numeric votes and all of
 * them to be identical.
 */
export function calculateStats(votes: Record<string, VoteValue>): RoomStats {
  const values = Object.values(votes);
  const numericValues = values.filter(isNumericVote).map(Number);

  if (numericValues.length === 0) {
    return { average: null, mode: null, min: null, max: null, hasConsensus: false };
  }

  const sum = numericValues.reduce((total, value) => total + value, 0);

  const counts = new Map<VoteValue, number>();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  const highestCount = Math.max(...counts.values());
  const mode = [...counts.entries()]
    .filter(([, count]) => count === highestCount)
    .map(([value]) => value);

  const hasConsensus =
    numericValues.length >= 2 &&
    numericValues.length === values.length &&
    numericValues.every((value) => value === numericValues[0]);

  return {
    average: sum / numericValues.length,
    mode,
    min: Math.min(...numericValues),
    max: Math.max(...numericValues),
    hasConsensus
  };
}
