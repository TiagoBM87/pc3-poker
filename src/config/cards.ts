import type { VoteValue } from '../types/poker';

export const CARD_VALUES: VoteValue[] = ['1', '2', '3', '5', '8', '13', '21', '?', '☕'];

export const SPECIAL_CARD_LABELS: Partial<Record<VoteValue, string>> = {
  '?': 'Não sei',
  '☕': 'Pausa'
};

const NUMERIC_SUITS = [
  { symbol: '♠', tone: 'black' },
  { symbol: '♥', tone: 'red' },
  { symbol: '♦', tone: 'red' },
  { symbol: '♣', tone: 'black' },
] as const;

export interface CardAppearance {
  /** Value shown in the corners and in the centre of the card. */
  rank: string;
  /** Big symbol shown under the rank (suits, joker star, coffee cup). */
  symbol: string;
  /** Colour family used to paint the card's ink. */
  tone: 'black' | 'red' | 'gold' | 'violet';
  /** Extra caption for special cards. */
  label?: string;
  isSpecial: boolean;
}

/**
 * Gives every deck value a playing-card identity. Numeric cards rotate through
 * the four suits, while the two special cards become a joker and a break card.
 */
export function getCardAppearance(value: VoteValue): CardAppearance {
  if (value === '?') {
    return { rank: '?', symbol: '★', tone: 'violet', label: 'Não sei', isSpecial: true };
  }
  if (value === '☕') {
    return { rank: '☕', symbol: '★', tone: 'gold', label: 'Pausa', isSpecial: true };
  }

  const index = Math.max(0, CARD_VALUES.indexOf(value));
  const suit = NUMERIC_SUITS[index % NUMERIC_SUITS.length];

  return {
    rank: value,
    symbol: suit.symbol,
    tone: suit.tone,
    isSpecial: false,
  };
}

export function isNumericVote(value: VoteValue): boolean {
  return value !== '?' && value !== '☕';
}
