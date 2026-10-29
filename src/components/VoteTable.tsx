import UserCard from './UserCard';
import type { Participant, VoteValue } from '../types/poker';

interface VoteTableProps {
  participants: Participant[];
  votes: Record<string, VoteValue>;
  hasVoted: Record<string, boolean>;
  isRevealed: boolean;
  currentUserId?: string;
  hostId?: string | null;
}

export default function VoteTable({
  participants,
  votes,
  hasVoted,
  isRevealed,
  currentUserId,
  hostId,
}: VoteTableProps) {
  if (participants.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-16 text-center">
        <p className="text-sm font-medium text-slate-300">Ninguém na mesa ainda.</p>
        <p className="mt-1 text-xs text-slate-500">
          Compartilhe o link da sala para a squad entrar.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
      {participants.map((participant) => (
        <UserCard
          key={participant.id}
          participant={participant}
          vote={votes[participant.id]}
          hasVoted={Boolean(hasVoted[participant.id])}
          isRevealed={isRevealed}
          isCurrentUser={participant.id === currentUserId}
          isHost={Boolean(hostId && participant.id === hostId)}
        />
      ))}
    </div>
  );
}
