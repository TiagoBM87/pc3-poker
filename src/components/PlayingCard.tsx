import { getCardAppearance } from '../config/cards';
import { cn } from '../lib/utils';
import type { VoteValue } from '../types/poker';

type PlayingCardSize = 'sm' | 'md';

interface PlayingCardProps {
  value: VoteValue;
  size?: PlayingCardSize;
  className?: string;
}

const TONE_CLASS = {
  black: 'text-slate-900',
  red: 'text-rose-700',
  gold: 'text-amber-600',
  violet: 'text-violet-700',
} as const;

const SIZE_CLASS = {
  sm: {
    corner: 'text-[11px]',
    cornerSymbol: 'text-[9px]',
    center: 'text-4xl',
    symbol: 'text-lg',
    label: 'text-[6px] tracking-[0.2em]',
  },
  md: {
    corner: 'text-xs',
    cornerSymbol: 'text-[10px]',
    center: 'text-3xl',
    symbol: 'text-base',
    label: 'text-[7px] tracking-[0.2em]',
  },
} as const;

/**
 * A playing-card face. The parent controls the physical size (width/height);
 * this component only paints the paper, the corner indices and the centre.
 */
export default function PlayingCard({ value, size = 'md', className }: PlayingCardProps) {
  const appearance = getCardAppearance(value);
  const sizing = SIZE_CLASS[size];
  const tone = TONE_CLASS[appearance.tone];
  const corner = cn('flex flex-col items-center font-extrabold leading-none', tone, sizing.corner);
  const cornerSymbol = cn('mt-[1px] leading-none', sizing.cornerSymbol);

  return (
    <div
      className={cn(
        'card-face-texture relative overflow-hidden rounded-[10px] border border-[#d9c9a3] bg-[#fffaf0] shadow-[0_18px_34px_-14px_rgba(0,0,0,0.9)] ring-1 ring-white/60',
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/75 via-transparent to-amber-950/[0.06]" />
      <div className="pointer-events-none absolute inset-[3px] rounded-[7px] border border-chip-gold/35" />
      <div className="pointer-events-none absolute inset-[5px] rounded-[5px] border border-chip-gold/15" />

      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 flex items-center justify-center text-5xl font-serif leading-none text-slate-900/[0.04]"
      >
        {appearance.isSpecial ? '♦' : appearance.symbol}
      </span>

      <div className={cn('absolute left-1 top-1 font-serif', corner)}>
        <span>{appearance.rank}</span>
        <span className={cornerSymbol}>{appearance.symbol}</span>
      </div>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className={cn(
            'font-serif font-black leading-none tracking-tight',
            tone,
            appearance.isSpecial ? 'text-4xl' : sizing.center,
          )}
        >
          {appearance.rank}
        </span>
        {appearance.isSpecial ? (
          <>
            <span className={cn('mt-0.5 leading-none', tone, sizing.symbol)}>
              {appearance.symbol}
            </span>
            <span className={cn('mt-1 font-bold uppercase leading-none', tone, sizing.label)}>
              {appearance.label}
            </span>
          </>
        ) : (
          <span className={cn('mt-1 leading-none', tone, sizing.symbol)}>{appearance.symbol}</span>
        )}
      </div>

      <div className={cn('absolute bottom-1 right-1 rotate-180 font-serif', corner)}>
        <span>{appearance.rank}</span>
        <span className={cornerSymbol}>{appearance.symbol}</span>
      </div>
    </div>
  );
}
