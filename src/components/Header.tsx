import { Check, Link2, LogOut, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { backendMode } from '../services/roomService';
import { cn } from '../lib/utils';

interface HeaderProps {
  title: string;
  roomId: string;
  participantCount: number;
  copied: boolean;
  onCopy: () => void;
  onLeave: () => void;
}

export default function Header({
  title,
  roomId,
  participantCount,
  copied,
  onCopy,
  onLeave,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-chip-gold/20 bg-felt-950/90 shadow-[0_10px_30px_-18px_rgba(0,0,0,0.95)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
        <Link
          to="/"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-300 to-yellow-600 text-xl font-bold text-felt-950 shadow-lg shadow-amber-500/20 transition hover:brightness-110"
          aria-label="Voltar ao início"
        >
          ♠
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-sm font-semibold text-white sm:text-base">{title}</h1>
            {backendMode === 'local' && (
              <span className="hidden rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-300 sm:inline">
                Modo local
              </span>
            )}
          </div>
          <p className="flex items-center gap-2 truncate text-xs text-slate-400">
            <span className="font-mono text-chip-gold">#{roomId}</span>
            <span className="text-slate-600">·</span>
            <span className="inline-flex items-center gap-1">
              <Users className="h-3 w-3" />
              {participantCount} {participantCount === 1 ? 'pessoa' : 'pessoas'}
            </span>
          </p>
        </div>

        <button
          type="button"
          onClick={onCopy}
          className={cn(
            'inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition',
            copied
              ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300'
              : 'border-white/10 bg-white/5 text-slate-200 hover:border-white/20 hover:bg-white/10',
          )}
        >
          {copied ? <Check className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
          <span className="hidden sm:inline">{copied ? 'Link copiado' : 'Copiar link'}</span>
        </button>

        <button
          type="button"
          onClick={onLeave}
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-rose-400/30 hover:bg-rose-400/10 hover:text-rose-200"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Sair</span>
        </button>
      </div>
    </header>
  );
}
