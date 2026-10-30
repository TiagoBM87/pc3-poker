import { Clock3, Crown, Eye, Minus } from 'lucide-react';
import { cn, avatarGradient, initials } from '../lib/utils';
import type { Participant, VoteValue } from '../types/poker';
import PlayingCard from './PlayingCard';

interface UserCardProps {
  participant: Participant;
  vote?: VoteValue;
  hasVoted: boolean;
  isRevealed: boolean;
  isCurrentUser: boolean;
  isHost?: boolean;
}

export default function UserCard({
  participant,
  vote,
  hasVoted,
  isRevealed,
  isCurrentUser,
  isHost = false,
}: UserCardProps) {
  const isObserver = participant.role === 'OBSERVER';
  const shouldFlip = isRevealed && !isObserver;
  const showVote = shouldFlip && Boolean(vote);

  return (
    <div className="flex animate-fade-up flex-col items-center gap-3">
      <div className="relative">
        <div className={cn('flip-card h-28 w-20', shouldFlip && 'is-flipped')}>
          <div
            className={cn(
              'flip-face overflow-hidden rounded-xl border-2 shadow-card',
              isObserver
                ? 'border-white/20 bg-felt-800'
                : 'border-[#d9b75c]/80 bg-[#102446]',
            )}
          >
            <div
              className={cn(
                'card-back-pattern absolute inset-1 rounded-[7px]',
                isObserver
                  ? 'border border-white/20 opacity-40 grayscale'
                  : 'border border-chip-gold/45',
              )}
            />

            {!isObserver && (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 flex items-center justify-center font-serif text-6xl leading-none text-chip-gold/20"
              >
                ♠
              </span>
            )}

            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-2">
              {isObserver ? (
                <>
                  <span className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-felt-950/80 text-slate-300">
                    <Eye className="h-5 w-5" />
                  </span>
                  <span className="rounded-full bg-felt-950/80 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider text-slate-300">
                    Observando
                  </span>
                </>
              ) : (
                <>
                  <span
                    className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br text-xs font-bold text-white shadow-inner ring-2 ring-chip-gold/80',
                      avatarGradient(participant.name),
                      !hasVoted && 'opacity-75 grayscale',
                    )}
                  >
                    {initials(participant.name)}
                  </span>
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider shadow',
                      hasVoted
                        ? 'bg-gradient-to-r from-emerald-400 to-emerald-500 text-emerald-950 ring-1 ring-white/30'
                        : 'bg-black/55 text-amber-100 ring-1 ring-chip-gold/35 backdrop-blur',
                    )}
                  >
                    {hasVoted ? (
                      'Votou'
                    ) : (
                      <>
                        <Clock3 className="h-2.5 w-2.5" />
                        Pensando
                      </>
                    )}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flip-face flip-back">
            {showVote && vote ? (
              <PlayingCard value={vote} size="sm" className="h-full w-full rounded-xl" />
            ) : (
              <div className="card-face-texture relative flex h-full w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[#c9b78f] bg-[#fffaf0] text-slate-500 shadow-card">
                <div className="pointer-events-none absolute inset-[4px] rounded-lg border border-chip-gold/20" />
                <Minus className="h-5 w-5" />
                <span className="text-[10px] font-semibold uppercase tracking-wide">Sem voto</span>
              </div>
            )}
          </div>
        </div>

        {hasVoted && !isRevealed && !isObserver && (
          <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex h-3.5 w-3.5 rounded-full border-2 border-felt-950 bg-emerald-400" />
          </span>
        )}

        {isHost && (
          <span
            className="absolute -left-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full border border-amber-300/50 bg-felt-900 text-chip-gold shadow"
            title="Host da sala"
          >
            <Crown className="h-3.5 w-3.5" />
          </span>
        )}
      </div>

      <div className="flex max-w-[7.5rem] flex-col items-center gap-1 text-center">
        <span className="flex items-center gap-1 text-sm font-medium text-slate-200">
          <span className="truncate">{participant.name}</span>
          {isCurrentUser && (
            <span className="shrink-0 rounded-full bg-chip-gold/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-chip-gold">
              você
            </span>
          )}
        </span>
        <span className="text-[10px] uppercase tracking-wider text-slate-500">
          {isObserver ? 'Observador' : isHost ? 'Votante · host' : 'Votante'}
        </span>
      </div>
    </div>
  );
}
