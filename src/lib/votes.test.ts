import { describe, expect, it } from 'vitest';
import type { Participant, VoteValue } from '../types/poker';
import { filterVotesByPresence } from './votes';

function participant(id: string, joinedAt = 1): Participant {
  return { id, name: id.toUpperCase(), role: 'VOTER', joinedAt };
}

describe('filterVotesByPresence', () => {
  const participants = {
    alice: participant('alice', 1),
    bob: participant('bob', 2),
  };

  it('keeps votes from participants that are still in the room', () => {
    const votes: Record<string, VoteValue> = { alice: '5', bob: '8' };

    expect(filterVotesByPresence(votes, participants)).toEqual({ alice: '5', bob: '8' });
  });

  it('drops votes from participants that are away', () => {
    const votes: Record<string, VoteValue> = { alice: '5', ghost: '13' };

    expect(filterVotesByPresence(votes, participants)).toEqual({ alice: '5' });
  });

  it('returns an empty object when nobody voted', () => {
    expect(filterVotesByPresence({}, participants)).toEqual({});
  });

  it('returns an empty object when every vote is stale', () => {
    expect(filterVotesByPresence({ ghost: '?' }, participants)).toEqual({});
  });
});
