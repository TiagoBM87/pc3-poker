import { Clock3, Crown, Eye, Minus } from 'lucide-react';
import { cn, avatarGradient, initials } from '../lib/utils';
import type { Participant, VoteValue } from '../types/poker';

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
  const showVote = isRevealed && Boolean(vote);
  const showEmptyResult = isRevealed && !vote;

  return (
    <div className="flex animate-fade-up flex-col items-center gap-3">
      <div className="relative">
        <div className={cn('flip-card h-28 w-20', showVote && 'is-flipped')}>
          <div
            className={cn(
              'flip-face flex flex-col items-center justify-center gap-2 rounded-2xl border p-2',
              isObserver
                ? 'border-dashed border-white/15 bg-white/[0.03]'
                : hasVoted
                  ? 'border-emerald-400/40 bg-gradient-to-br from-emerald-500/25 via-emerald-400/10 to-felt-900 shadow-lg shadow-emerald-950/40'
                  : 'border-dashed border-white/15 bg-white/[0.03]',
            )}
          >
            {isObserver ? (
              <>
                <Eye className="h-5 w-5 text-slate-500" />
                <span className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
                  Observando
                </span>
              </>
            ) : showEmptyResult ? (
              <>
                <Minus className="h-5 w-5 text-slate-600" />
                <span className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
                  Sem voto
                </span>
              </>
            ) : (
              <>
                <span
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br text-xs font-bold text-white shadow-inner',
                    avatarGradient(participant.name),
                    !hasVoted && 'opacity-70 grayscale',
                  )}
                >
                  {initials(participant.name)}
                </span>
                {hasVoted ? (
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-emerald-200">
                    Votou
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500">
                    <Clock3 className="h-3 w-3" />
                    Pensando
                  </span>
                )}
              </>
            )}
          </div>

          <div className="flip-face flip-back flex flex-col items-center justify-center rounded-2xl border border-amber-200/60 bg-gradient-to-br from-white to-slate-100 shadow-xl shadow-black/40">
            <span className="text-3xl font-extrabold text-felt-950">{vote}</span>
            <span className="mt-1 text-[9px] font-semibold uppercase tracking-widest text-slate-400">
              voto
            </span>
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
