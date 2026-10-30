import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, Crown, Eye, Loader2, X } from 'lucide-react';
import Header from '../components/Header';
import CardDeck from '../components/CardDeck';
import RoundTimer from '../components/RoundTimer';
import VoteTable from '../components/VoteTable';
import StatsPanel from '../components/StatsPanel';
import JoinGate from '../components/JoinGate';
import CreditFooter from '../components/CreditFooter';
import { usePokerRoom } from '../hooks/usePokerRoom';
import { buildRoomLink, cn } from '../lib/utils';
import {
  clearRoomEntryConfirmation,
  getIdentity,
  isRoomEntryConfirmed,
  markRoomEntryConfirmed,
  saveIdentity,
} from '../lib/identity';
import type { Identity, UserRole } from '../types/poker';

function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text);
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  try {
    document.execCommand('copy');
    return Promise.resolve();
  } finally {
    document.body.removeChild(textarea);
  }
}

export default function RoomView() {
  const { roomId: rawRoomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const roomId = (rawRoomId ?? '').trim().toLowerCase();

  const [savedIdentity] = useState(() => getIdentity());
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [entryChecked, setEntryChecked] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setEntryChecked(false);
    const stored = getIdentity();
    setIdentity(isRoomEntryConfirmed(roomId) ? stored : null);
    setEntryChecked(true);
  }, [roomId]);

  const poker = usePokerRoom(roomId, identity, entryChecked && Boolean(identity));

  const handleJoin = (name: string, role: UserRole) => {
    const nextIdentity = saveIdentity(name, role);
    markRoomEntryConfirmed(roomId);
    setIdentity(nextIdentity);
  };

  const handleLeave = () => {
    clearRoomEntryConfirmation(roomId);
    navigate('/');
  };

  const handleCopy = async () => {
    try {
      await copyToClipboard(buildRoomLink(roomId));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  if (!roomId) {
    return (
      <ErrorScreen
        title="Sala inválida"
        description="O link não contém um código de sala válido."
        onBack={() => navigate('/')}
      />
    );
  }

  if (!entryChecked) {
    return <LoadingScreen label="Preparando a mesa..." />;
  }

  if (!identity) {
    return (
      <JoinGate
        roomId={roomId}
        defaultName={savedIdentity?.name}
        defaultRole={savedIdentity?.role}
        onJoin={handleJoin}
      />
    );
  }

  if (poker.loading) {
    return <LoadingScreen label="Conectando à sala..." />;
  }

  if (poker.error) {
    return (
      <ErrorScreen
        title="Não foi possível abrir a sala"
        description={poker.error}
        onBack={handleLeave}
      />
    );
  }

  if (poker.notFound || !poker.room) {
    return (
      <ErrorScreen
        title="Sala não encontrada"
        description="O código pode estar incorreto ou a sala ainda não foi criada. Peça um novo link ao host."
        onBack={handleLeave}
      />
    );
  }

  const room = poker.room;
  const revealed = room.metadata.isRevealed;
  const votes = room.votes ?? {};
  const hasVoted = Object.fromEntries(poker.votedUserIds.map((id) => [id, true]));
  const votersCount = poker.voters.length;
  const votedCount = poker.voters.filter((voter) => hasVoted[voter.id]).length;
  const allVoted = votersCount > 0 && votedCount === votersCount;

  return (
    <div className="min-h-screen pb-48">
      <Header
        title={room.metadata.title}
        roomId={roomId}
        participantCount={poker.participants.length}
        copied={copied}
        onCopy={handleCopy}
        onLeave={handleLeave}
      />

      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-white">
              {revealed ? 'Cartas reveladas' : allVoted ? 'Todos votaram!' : 'Rodada em andamento'}
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              {revealed
                ? 'Confira o resultado e inicie uma nova rodada quando quiser.'
                : allVoted
                  ? poker.timerActive
                    ? 'Todos votaram! O timer revela as cartas automaticamente no fim.'
                    : 'O host já pode revelar as cartas.'
                  : `${votedCount} de ${votersCount} votantes já escolheram.`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {poker.timerActive && poker.timerRemainingMs !== null && (
              <RoundTimer remainingMs={poker.timerRemainingMs} />
            )}
            {poker.isHost ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-chip-gold/40 bg-chip-gold/10 px-3 py-1 text-xs font-semibold text-chip-gold">
                <Crown className="h-3.5 w-3.5" />
                Você é o host
              </span>
            ) : (
              poker.hostName && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-300">
                  <Crown className="h-3.5 w-3.5 text-chip-gold/80" />
                  Host: {poker.hostName}
                </span>
              )
            )}
            {poker.isObserver && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-300">
                <Eye className="h-3.5 w-3.5" />
                Observador
              </span>
            )}
          </div>
        </div>

        {poker.actionError && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-xs text-rose-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p className="flex-1">{poker.actionError}</p>
            <button
              type="button"
              onClick={poker.clearActionError}
              aria-label="Fechar aviso"
              className="rounded p-0.5 transition hover:bg-white/10"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <div
          className={cn(
            'mt-6 gap-6',
            revealed && poker.stats && 'lg:grid lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start',
          )}
        >
          <div
            className={cn(
              'casino-table relative overflow-hidden rounded-[2rem] border border-chip-gold/25 p-5 sm:p-8',
              revealed && 'border-chip-gold/45',
            )}
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 flex items-center justify-center"
            >
              <div className="flex select-none items-center gap-5 font-serif text-[5.5rem] leading-none text-white/[0.025] sm:gap-8 sm:text-[9rem]">
                <span>♠</span>
                <span className="text-rose-200/[0.04]">♥</span>
                <span className="text-rose-200/[0.04]">♦</span>
                <span>♣</span>
              </div>
            </div>

            <div className="relative">
              <VoteTable
                participants={poker.participants}
                votes={votes}
                hasVoted={hasVoted}
                isRevealed={revealed}
                currentUserId={identity.id}
                hostId={room.metadata.hostId}
              />
            </div>
          </div>

          {revealed && poker.stats && (
            <div className="mt-6 lg:sticky lg:top-24 lg:mt-0">
              <StatsPanel stats={poker.stats} isRevealed={revealed} voteCount={votedCount} />
            </div>
          )}
        </div>
      </main>

      <CreditFooter className="mx-auto mt-2 px-4 pb-2" />

      <CardDeck
        selected={poker.myVote}
        disabled={poker.isObserver}
        isRevealed={revealed}
        votedCount={votedCount}
        votersCount={votersCount}
        canModerate={poker.isHost}
        hostName={poker.hostName}
        timerActive={poker.timerActive}
        onSelect={poker.castVote}
        onReveal={poker.revealCards}
        onReset={poker.resetRound}
        onStartTimer={poker.startTimer}
        onCancelTimer={poker.cancelTimer}
      />
    </div>
  );
}

function LoadingScreen({ label }: { label: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="flex items-center gap-3 text-sm text-slate-400">
        <Loader2 className="h-5 w-5 animate-spin text-chip-gold" />
        {label}
      </div>
    </main>
  );
}

function ErrorScreen({
  title,
  description,
  onBack,
}: {
  title: string;
  description: string;
  onBack: () => void;
}) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col items-center justify-center gap-5 px-6 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-rose-400/30 bg-rose-400/10 text-rose-300">
        <AlertTriangle className="h-6 w-6" />
      </span>
      <div>
        <h1 className="text-2xl font-bold text-white">{title}</h1>
        <p className="mt-2 text-sm text-slate-400">{description}</p>
      </div>
      <button
        type="button"
        onClick={onBack}
        className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-chip-gold/40 hover:bg-chip-gold/10"
      >
        Voltar ao início
      </button>
    </main>
  );
}
