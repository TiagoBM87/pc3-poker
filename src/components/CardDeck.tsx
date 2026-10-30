import { Check, Eye, Lock, RotateCcw, Sparkles, Timer, TimerOff } from 'lucide-react';
import { CARD_VALUES, SPECIAL_CARD_LABELS } from '../config/cards';
import { cn } from '../lib/utils';
import type { VoteValue } from '../types/poker';
import PlayingCard from './PlayingCard';

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
  timerActive: boolean;
  onSelect: (value: VoteValue | null) => void;
  onReveal: () => void;
  onReset: () => void;
  onStartTimer: () => void;
  onCancelTimer: () => void;
}

export default function CardDeck({
  selected,
  disabled,
  isRevealed,
  votedCount,
  votersCount,
  canModerate,
  hostName,
  timerActive,
  onSelect,
  onReveal,
  onReset,
  onStartTimer,
  onCancelTimer,
}: CardDeckProps) {
  const canReveal = canModerate && votedCount > 0 && !isRevealed;
  const canReset = canModerate && (votedCount > 0 || isRevealed);

  return (
    <div className="casino-rail fixed inset-x-0 bottom-0 z-40 border-t border-chip-gold/35">
      <div className="mx-auto max-w-6xl px-4 pb-4 pt-3 sm:px-6">
        {disabled ? (
          <div className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-chip-gold/20 bg-black/20 px-4 py-3 text-xs text-slate-400">
            <Eye className="h-4 w-4 text-slate-500" />
            Você entrou como <span className="font-semibold text-slate-200">observador</span> e não
            participa da votação.
          </div>
        ) : (
          <div className="-mx-1 flex items-end gap-1.5 overflow-x-auto px-1 pb-2 pt-3 sm:justify-center sm:gap-2">
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
                    'group relative shrink-0 rounded-[12px] transition-transform duration-200',
                    active ? '-translate-y-2' : 'hover:-translate-y-1',
                  )}
                >
                  <PlayingCard
                    value={value}
                    className={cn(
                      'h-20 w-14 transition-shadow sm:h-24 sm:w-[4.25rem]',
                      active
                        ? 'ring-2 ring-amber-300 shadow-[0_18px_32px_-10px_rgba(231,182,75,0.6)]'
                        : 'group-hover:ring-2 group-hover:ring-chip-gold/60 group-hover:shadow-[0_18px_28px_-12px_rgba(0,0,0,0.9)]',
                    )}
                  />
                  {active && (
                    <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-felt-950 bg-amber-300 text-felt-950 shadow">
                      <Check className="h-3 w-3" strokeWidth={3} />
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
            <span className="ml-2 text-chip-gold/60">
              {votedCount}/{votersCount} votos
            </span>
            {!canModerate && (
              <span className="ml-3 inline-flex items-center gap-1 text-amber-300/80">
                <Lock className="h-3 w-3" />
                Só o host{hostName ? ` (${hostName})` : ''} revela, reinicia ou controla o timer
              </span>
            )}
          </p>

          <div className="flex w-full gap-2 sm:w-auto">
            {canModerate && !isRevealed && (
              <button
                type="button"
                onClick={timerActive ? onCancelTimer : onStartTimer}
                title={
                  timerActive
                    ? 'Cancelar o timer desta rodada'
                    : 'Iniciar timer de 30 segundos e revelar as cartas no final'
                }
                className="inline-flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-chip-gold/25 bg-black/25 px-2 py-2.5 text-[11px] font-semibold text-amber-100/90 transition hover:border-chip-gold/50 hover:bg-chip-gold/10 sm:flex-none sm:gap-2 sm:px-4 sm:text-sm"
              >
                {timerActive ? (
                  <TimerOff className="h-4 w-4" />
                ) : (
                  <Timer className="h-4 w-4" />
                )}
                <span className="sm:hidden">{timerActive ? 'Cancelar' : 'Timer'}</span>
                <span className="hidden sm:inline">
                  {timerActive ? 'Cancelar timer' : 'Timer 30s'}
                </span>
              </button>
            )}
            <button
              type="button"
              onClick={onReset}
              disabled={!canReset}
              title={canModerate ? 'Iniciar nova rodada' : 'Apenas o host pode iniciar nova rodada'}
              className="inline-flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-chip-gold/20 bg-black/25 px-2 py-2.5 text-[11px] font-semibold text-amber-50/90 transition hover:border-chip-gold/45 hover:bg-chip-gold/10 disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none sm:gap-2 sm:px-4 sm:text-sm"
            >
              <RotateCcw className="h-4 w-4" />
              <span className="sm:hidden">Reiniciar</span>
              <span className="hidden sm:inline">Nova rodada</span>
            </button>
            <button
              type="button"
              onClick={onReveal}
              disabled={!canReveal}
              title={canModerate ? 'Revelar cartas' : 'Apenas o host pode revelar as cartas'}
              className="inline-flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-gradient-to-r from-amber-300 to-yellow-500 px-2 py-2.5 text-[11px] font-bold text-felt-950 shadow-lg shadow-amber-500/25 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none sm:flex-none sm:gap-2 sm:px-4 sm:text-sm"
            >
              <Sparkles className="h-4 w-4" />
              <span className="sm:hidden">Revelar</span>
              <span className="hidden sm:inline">Revelar cartas</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
