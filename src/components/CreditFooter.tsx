import { cn } from '../lib/utils';

export default function CreditFooter({ className }: { className?: string }) {
  return (
    <footer className={cn('text-center text-[10px] tracking-wide text-slate-600', className)}>
      Desenvolvido por:{' '}
      <a
        href="https://github.com/TiagoBM87"
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-slate-500 underline decoration-slate-700/80 underline-offset-2 transition hover:text-chip-gold/80 hover:decoration-chip-gold/40"
      >
        github.com/TiagoBM87
      </a>
    </footer>
  );
}
