import { useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { Equal, Sparkles, TrendingDown, TrendingUp } from 'lucide-react';
import { formatAverage } from '../lib/utils';
import type { RoomStats } from '../types/poker';

interface StatsPanelProps {
  stats: RoomStats;
  isRevealed: boolean;
  voteCount: number;
}

export default function StatsPanel({ stats, isRevealed, voteCount }: StatsPanelProps) {
  const lastCelebration = useRef<string | null>(null);

  useEffect(() => {
    if (!isRevealed || !stats.hasConsensus) {
      lastCelebration.current = null;
      return;
    }

    const signature = `${stats.average}-${stats.min}-${stats.max}-${stats.mode?.join(',')}`;
    if (lastCelebration.current === signature) return;
    lastCelebration.current = signature;

    void confetti({
      particleCount: 140,
      spread: 85,
      startVelocity: 38,
      origin: { y: 0.72 },
      colors: ['#e7b64b', '#fbbf24', '#34d399', '#a7f3d0', '#f8fafc'],
      disableForReducedMotion: true,
    });
  }, [isRevealed, stats]);

  const items = [
    { label: 'Média', value: formatAverage(stats.average), icon: Equal },
    { label: 'Maior', value: stats.max ?? '—', icon: TrendingUp },
    { label: 'Menor', value: stats.min ?? '—', icon: TrendingDown },
  ];

  return (
    <section className="animate-fade-up rounded-3xl border border-chip-gold/20 bg-gradient-to-br from-felt-900/80 to-felt-950/90 p-5 shadow-card backdrop-blur-xl sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-white">Resultado da rodada</h2>
          <p className="mt-0.5 text-xs text-slate-400">
            {voteCount} {voteCount === 1 ? 'voto computado' : 'votos computados'} · apenas cartas
            numéricas entram na média
          </p>
        </div>
        <span
          className={
            stats.hasConsensus
              ? 'inline-flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300'
              : 'inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-300'
          }
        >
          <Sparkles className="h-3.5 w-3.5" />
          {stats.hasConsensus ? 'Consenso!' : 'Sem consenso'}
        </span>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {items.map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className="rounded-2xl border border-chip-gold/15 bg-black/30 p-4 lg:p-3"
          >
            <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              <Icon className="h-3.5 w-3.5" />
              {label}
            </span>
            <p className="mt-2 text-3xl font-extrabold text-white lg:text-2xl">{value}</p>
          </div>
        ))}
        <div className="col-span-2 rounded-2xl border border-chip-gold/15 bg-black/30 p-4 sm:col-span-1 lg:p-3">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Moda
          </span>
          <p className="mt-2 truncate text-3xl font-extrabold text-white lg:text-2xl">
            {stats.mode && stats.mode.length > 0 ? stats.mode.join(' · ') : '—'}
          </p>
        </div>
      </div>
    </section>
  );
}
