import type { VoteValue } from '../types/poker';

export const CARD_VALUES: VoteValue[] = ['1', '2', '3', '5', '8', '13', '21', '?', '☕'];

export const SPECIAL_CARD_LABELS: Partial<Record<VoteValue, string>> = {
  '?': 'Não sei',
  '☕': 'Pausa'
};

export function isNumericVote(value: VoteValue): boolean {
  return value !== '?' && value !== '☕';
}
