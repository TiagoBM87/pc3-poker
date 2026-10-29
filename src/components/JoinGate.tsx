import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Eye, UserRound } from 'lucide-react';
import { cn } from '../lib/utils';
import type { UserRole } from '../types/poker';

interface JoinGateProps {
  roomId: string;
  defaultName?: string;
  defaultRole?: UserRole;
  onJoin: (name: string, role: UserRole) => void;
}

/**
 * Shown whenever someone opens a shared room link. Name and role are always
 * confirmed before entering, even if a previous identity is stored.
 */
export default function JoinGate({
  roomId,
  defaultName = '',
  defaultRole = 'VOTER',
  onJoin,
}: JoinGateProps) {
  const [name, setName] = useState(defaultName);
  const [role, setRole] = useState<UserRole>(defaultRole);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setError('Informe seu nome (mínimo 2 caracteres).');
      return;
    }
    setError(null);
    onJoin(trimmed, role);
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center px-6 py-12">
      <Link
        to="/"
        className="mb-8 inline-flex items-center gap-2 self-start text-xs font-medium text-slate-400 transition hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar ao início
      </Link>

      <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-card backdrop-blur-xl sm:p-8">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-300 to-yellow-600 text-xl font-bold text-felt-950">
            ♠
          </span>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-chip-gold/80">
              Entrar na sala
            </p>
            <h1 className="font-mono text-lg font-semibold text-white">#{roomId}</h1>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-7 space-y-5">
          <div>
            <label htmlFor="gate-name" className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Seu nome
            </label>
            <input
              id="gate-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={40}
              autoFocus
              placeholder="Ex.: Alex Dev"
              className="mt-2 w-full rounded-xl border border-white/10 bg-felt-950/60 px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:border-chip-gold/50 focus:outline-none focus:ring-2 focus:ring-chip-gold/20"
            />
          </div>

          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Seu papel
            </span>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <RoleButton
                active={role === 'VOTER'}
                onClick={() => setRole('VOTER')}
                icon={<UserRound className="h-4 w-4" />}
                title="Votante"
                description="Participa da votação"
              />
              <RoleButton
                active={role === 'OBSERVER'}
                onClick={() => setRole('OBSERVER')}
                icon={<Eye className="h-4 w-4" />}
                title="Observador"
                description="Apenas acompanha"
              />
            </div>
          </div>

          {error && (
            <p className="rounded-xl border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-xs text-rose-200">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="w-full rounded-xl bg-gradient-to-r from-amber-300 to-yellow-500 px-4 py-3 text-sm font-bold text-felt-950 shadow-lg shadow-amber-500/20 transition hover:brightness-110"
          >
            Entrar na sala
          </button>
        </form>
      </div>
    </main>
  );
}

interface RoleButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  description: string;
}

function RoleButton({ active, onClick, icon, title, description }: RoleButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'flex flex-col items-start gap-1 rounded-xl border px-3 py-3 text-left transition',
        active
          ? 'border-chip-gold/60 bg-chip-gold/10 text-white'
          : 'border-white/10 bg-white/[0.02] text-slate-300 hover:border-white/20 hover:bg-white/[0.05]',
      )}
    >
      <span className={cn('flex items-center gap-2 text-sm font-semibold', active && 'text-chip-gold')}>
        {icon}
        {title}
      </span>
      <span className="text-[11px] text-slate-500">{description}</span>
    </button>
  );
}
