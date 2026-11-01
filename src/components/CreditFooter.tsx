import { cn } from '../lib/utils';
import { APP_COMMIT, APP_VERSION_LABEL } from '../config/version';

export default function CreditFooter({ className }: { className?: string }) {
  return (
    <footer
      className={cn(
        'flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 text-center text-[10px] tracking-wide text-slate-600',
        className,
      )}
    >
      <span>
        Desenvolvido por:{' '}
        <a
          href="https://github.com/TiagoBM87"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-slate-500 underline decoration-slate-700/80 underline-offset-2 transition hover:text-chip-gold/80 hover:decoration-chip-gold/40"
        >
          github.com/TiagoBM87
        </a>
      </span>
      <span aria-hidden="true" className="text-slate-700">
        ·
      </span>
      <span
        title={APP_COMMIT ? `Build ${APP_COMMIT}` : 'Build local'}
        className="font-mono text-slate-600"
      >
        {APP_VERSION_LABEL}
      </span>
    </footer>
  );
}
