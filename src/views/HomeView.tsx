import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Eye, KeyRound, Plus, UserRound } from 'lucide-react';
import { backendMode, roomService } from '../services/roomService';
import { cn, createRoomId, describeError, parseRoomId } from '../lib/utils';
import {
  getIdentity,
  markRoomEntryConfirmed,
  saveIdentity,
  toParticipant,
} from '../lib/identity';
import type { UserRole } from '../types/poker';

export default function HomeView() {
  const navigate = useNavigate();
  const [saved] = useState(() => getIdentity());

  const [name, setName] = useState(saved?.name ?? '');
  const [role, setRole] = useState<UserRole>(saved?.role ?? 'VOTER');
  const [title, setTitle] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [busy, setBusy] = useState<'create' | 'join' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const validateName = (): string | null => {
    if (name.trim().length < 2) {
      setError('Informe seu nome (mínimo 2 caracteres).');
      return null;
    }
    setError(null);
    return name.trim();
  };

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validName = validateName();
    if (!validName) return;

    setBusy('create');
    setError(null);
    try {
      const identity = saveIdentity(validName, role);
      const roomTitle = title.trim() || 'Planning Poker';

      let roomId = '';
      let created = false;
      for (let attempt = 0; attempt < 3 && !created; attempt += 1) {
        roomId = createRoomId(roomTitle);
        created = await roomService.createRoom(roomId, roomTitle, toParticipant(identity));
      }
      if (!created) {
        throw new Error('Não foi possível gerar um código de sala. Tente novamente.');
      }

      markRoomEntryConfirmed(roomId);
      navigate(`/room/${roomId}`);
    } catch (createError) {
      setError(describeError(createError));
    } finally {
      setBusy(null);
    }
  };

  const handleJoin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validName = validateName();
    if (!validName) return;

    const roomId = parseRoomId(joinCode);
    if (!roomId) {
      setError('Código ou link inválido. Cole o link da sala ou o código (ex.: sprint-45-a4k9).');
      return;
    }

    setBusy('join');
    setError(null);
    try {
      const room = await roomService.getRoom(roomId);
      if (!room) {
        setError('Sala não encontrada. Confira o código ou peça um novo link ao host.');
        return;
      }

      saveIdentity(validName, role);
      markRoomEntryConfirmed(roomId);
      navigate(`/room/${roomId}`);
    } catch (joinError) {
      setError(describeError(joinError));
    } finally {
      setBusy(null);
    }
  };

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
      <header className="text-center">
        <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-300 to-yellow-600 text-3xl font-bold text-felt-950 shadow-xl shadow-amber-500/20">
          ♠
        </span>
        <h1 className="mt-6 text-4xl font-bold tracking-tight text-white sm:text-5xl">
          Planning Poker
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-sm text-slate-300 sm:text-base">
          Estimativas em tempo real para a sua squad. Sem backend próprio, funciona atrás de VPN
          corporativa e sem cadastro.
        </p>
        {backendMode === 'local' && (
          <p className="mx-auto mt-4 max-w-xl rounded-xl border border-amber-400/20 bg-amber-400/10 px-4 py-2 text-xs text-amber-200">
            Firebase não configurado: rodando em <strong>modo local (demo)</strong>. As salas ficam
            neste navegador e sincronizam entre abas.
          </p>
        )}
      </header>

      <section className="mt-10 rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-card backdrop-blur-xl sm:p-7">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="name" className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Seu nome
            </label>
            <input
              id="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={40}
              placeholder="Ex.: Alex Dev"
              className="mt-2 w-full rounded-xl border border-white/10 bg-felt-950/60 px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:border-chip-gold/50 focus:outline-none focus:ring-2 focus:ring-chip-gold/20"
            />
          </div>

          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Seu papel
            </span>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRole('VOTER')}
                aria-pressed={role === 'VOTER'}
                className={cn(
                  'inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-semibold transition',
                  role === 'VOTER'
                    ? 'border-chip-gold/60 bg-chip-gold/10 text-chip-gold'
                    : 'border-white/10 bg-white/[0.02] text-slate-300 hover:border-white/20',
                )}
              >
                <UserRound className="h-4 w-4" />
                Votante
              </button>
              <button
                type="button"
                onClick={() => setRole('OBSERVER')}
                aria-pressed={role === 'OBSERVER'}
                className={cn(
                  'inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-semibold transition',
                  role === 'OBSERVER'
                    ? 'border-chip-gold/60 bg-chip-gold/10 text-chip-gold'
                    : 'border-white/10 bg-white/[0.02] text-slate-300 hover:border-white/20',
                )}
              >
                <Eye className="h-4 w-4" />
                Observador
              </button>
            </div>
          </div>
        </div>

        {error && (
          <p className="mt-5 rounded-xl border border-rose-400/30 bg-rose-400/10 px-4 py-2.5 text-xs text-rose-200">
            {error}
          </p>
        )}

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <form
            onSubmit={handleCreate}
            className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-felt-950/40 p-4"
          >
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <Plus className="h-4 w-4 text-chip-gold" />
              Criar nova sala
            </div>
            <p className="text-xs text-slate-400">
              Você entra como <strong className="text-slate-200">host</strong> e controla as
              revelações.
            </p>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={60}
              placeholder="Título da sessão (ex.: Refinamento Sprint 45)"
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-chip-gold/50 focus:outline-none focus:ring-2 focus:ring-chip-gold/20"
            />
            <button
              type="submit"
              disabled={busy !== null}
              className="mt-auto inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-300 to-yellow-500 px-4 py-2.5 text-sm font-bold text-felt-950 shadow-lg shadow-amber-500/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy === 'create' ? 'Criando...' : 'Criar sala'}
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <form
            onSubmit={handleJoin}
            className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-felt-950/40 p-4"
          >
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <KeyRound className="h-4 w-4 text-chip-gold" />
              Entrar em uma sala
            </div>
            <p className="text-xs text-slate-400">
              Cole o código da sala ou o link completo compartilhado.
            </p>
            <input
              value={joinCode}
              onChange={(event) => setJoinCode(event.target.value)}
              placeholder="sprint-45-a4k9 ou link completo"
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-chip-gold/50 focus:outline-none focus:ring-2 focus:ring-chip-gold/20"
            />
            <button
              type="submit"
              disabled={busy !== null}
              className="mt-auto inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition hover:border-chip-gold/40 hover:bg-chip-gold/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy === 'join' ? 'Entrando...' : 'Entrar'}
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        </div>
      </section>

      <p className="mt-8 text-center text-[11px] text-slate-500">
        Votos ficam ocultos até o host revelar as cartas. O link da sala é o segredo de acesso —
        compartilhe apenas com a squad.
      </p>
    </main>
  );
}
