import { Timer } from 'lucide-react';
import { ROUND_TIMER_MS } from '../config/round';
import { cn } from '../lib/utils';

interface RoundTimerProps {
  remainingMs: number;
  totalMs?: number;
}

/** Compact countdown badge shown while the round's auto-reveal timer is active. */
export default function RoundTimer({ remainingMs, totalMs = ROUND_TIMER_MS }: RoundTimerProps) {
  const remaining = Math.max(0, Math.min(totalMs, remainingMs));
  const seconds = Math.ceil(remaining / 1000);
  const progress = Math.max(0, Math.min(100, (remaining / totalMs) * 100));
  const urgent = remaining <= 10_000;
  const label = `00:${String(seconds).padStart(2, '0')}`;

  return (
    <span
      role="timer"
      aria-live="off"
      aria-label={`Revelação automática em ${seconds} segundos`}
      className={cn(
        'relative inline-flex items-center gap-2 overflow-hidden rounded-full border px-3 py-1 text-xs font-semibold shadow-lg',
        urgent
          ? 'border-rose-400/50 bg-rose-500/15 text-rose-200 shadow-rose-950/40'
          : 'border-chip-gold/40 bg-chip-gold/10 text-chip-gold shadow-black/40',
      )}
    >
      <Timer className={cn('h-3.5 w-3.5', urgent && 'animate-pulse')} />
      <span className="font-mono tabular-nums tracking-wide">{label}</span>
      <span className="hidden text-[9px] font-bold uppercase tracking-[0.18em] opacity-70 sm:inline">
        auto revelar
      </span>
      <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-0.5 bg-black/30">
        <span
          className={cn(
            'block h-full transition-[width] duration-200 ease-linear',
            urgent ? 'bg-rose-300' : 'bg-chip-gold',
          )}
          style={{ width: `${progress}%` }}
        />
      </span>
    </span>
  );
}
