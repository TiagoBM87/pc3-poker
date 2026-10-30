import { Eye, Lock, RotateCcw, Sparkles } from 'lucide-react';
import { CARD_VALUES, SPECIAL_CARD_LABELS } from '../config/cards';
import { cn } from '../lib/utils';
import type { VoteValue } from '../types/poker';

interface CardDeckProps {
  selected: VoteValue | null;
  /** True when the current user is an observer. */
  disabled: boolean;
  isRevealed: boolean;
  votedCount: number;
  votersCount: number;
  /** Only the host can reveal/reset. */
  canModerate: boolean;
  hostName: string | null;
  onSelect: (value: VoteValue | null) => void;
  onReveal: () => void;
  onReset: () => void;
}

export default function CardDeck({
  selected,
  disabled,
  isRevealed,
  votedCount,
  votersCount,
  canModerate,
  hostName,
  onSelect,
  onReveal,
  onReset,
}: CardDeckProps) {
  const canReveal = canModerate && votedCount > 0 && !isRevealed;
  const canReset = canModerate && (votedCount > 0 || isRevealed);

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-felt-950/95 backdrop-blur-xl">
      <div className="mx-auto max-w-6xl px-4 pb-4 pt-3 sm:px-6">
        {disabled ? (
          <div className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-3 text-xs text-slate-400">
            <Eye className="h-4 w-4 text-slate-500" />
            Você entrou como <span className="font-semibold text-slate-200">observador</span> e não
            participa da votação.
          </div>
        ) : (
          <div className="-mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-1 sm:justify-center lg:pt-2">
            {CARD_VALUES.map((value) => {
              const active = selected === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => onSelect(active ? null : value)}
                  aria-pressed={active}
                  title={SPECIAL_CARD_LABELS[value] ?? `Estimar em ${value}`}
                  className={cn(
                    'group relative flex h-16 w-12 shrink-0 flex-col items-center justify-center rounded-xl border text-lg font-bold transition-all duration-200 sm:h-20 sm:w-14 sm:text-xl',
                    active
                      ? '-translate-y-1 border-amber-200 bg-gradient-to-br from-amber-300 to-yellow-500 text-felt-950 shadow-lg shadow-amber-500/30'
                      : 'border-white/10 bg-white/[0.04] text-slate-300 hover:-translate-y-0.5 hover:border-chip-gold/40 hover:bg-chip-gold/10 hover:text-white',
                  )}
                >
                  {value}
                  {SPECIAL_CARD_LABELS[value] && (
                    <span
                      className={cn(
                        'mt-0.5 text-[8px] font-semibold uppercase tracking-wider',
                        active ? 'text-felt-900' : 'text-slate-500 group-hover:text-amber-200',
                      )}
                    >
                      {SPECIAL_CARD_LABELS[value]}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="hidden items-center gap-1 text-[11px] text-slate-500 sm:flex">
            {disabled ? (
              'Assista à rodada em tempo real.'
            ) : selected ? (
              'Clique na carta selecionada para limpar seu voto.'
            ) : (
              'Escolha uma carta para votar.'
            )}
            <span className="ml-2 text-slate-600">
              {votedCount}/{votersCount} votos
            </span>
            {!canModerate && (
              <span className="ml-3 inline-flex items-center gap-1 text-amber-300/80">
                <Lock className="h-3 w-3" />
                Só o host{hostName ? ` (${hostName})` : ''} revela ou reinicia
              </span>
            )}
          </p>

          <div className="flex w-full gap-2 sm:w-auto">
            <button
              type="button"
              onClick={onReset}
              disabled={!canReset}
              title={canModerate ? 'Iniciar nova rodada' : 'Apenas o host pode iniciar nova rodada'}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none"
            >
              <RotateCcw className="h-4 w-4" />
              Nova rodada
            </button>
            <button
              type="button"
              onClick={onReveal}
              disabled={!canReveal}
              title={canModerate ? 'Revelar cartas' : 'Apenas o host pode revelar as cartas'}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-300 to-yellow-500 px-4 py-2.5 text-sm font-bold text-felt-950 shadow-lg shadow-amber-500/25 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none sm:flex-none"
            >
              <Sparkles className="h-4 w-4" />
              Revelar cartas
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
