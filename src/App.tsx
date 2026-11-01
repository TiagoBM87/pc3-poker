import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { AlertTriangle, Loader2 } from 'lucide-react';
import HomeView from './views/HomeView';
import RoomView from './views/RoomView';
import { ensureAnonymousAuth } from './config/firebase';
import { backendMode } from './services/roomService';

type AuthStatus = 'loading' | 'ready' | 'error';

const AUTH_FALLBACK_ERROR = 'Não foi possível iniciar a sessão anônima. Tente novamente.';

/**
 * Blocks the room flows until Firebase has restored or created the anonymous
 * session. Local demo mode never touches Firebase and renders immediately.
 */
function AuthGate({ children }: { children: ReactNode }) {
  const requiresAuth = backendMode === 'firebase';
  const [status, setStatus] = useState<AuthStatus>(requiresAuth ? 'loading' : 'ready');
  const [error, setError] = useState<string | null>(null);

  const start = useCallback(() => {
    if (!requiresAuth) {
      setStatus('ready');
      return;
    }

    setStatus('loading');
    setError(null);

    ensureAnonymousAuth()
      .then(() => setStatus('ready'))
      .catch((authError: unknown) => {
        setError(authError instanceof Error && authError.message ? authError.message : AUTH_FALLBACK_ERROR);
        setStatus('error');
      });
  }, [requiresAuth]);

  useEffect(() => {
    start();
  }, [start]);

  if (status === 'loading') {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <div className="flex flex-col items-center gap-4 text-center" role="status" aria-live="polite">
          <Loader2 className="h-8 w-8 animate-spin text-chip-gold" aria-hidden="true" />
          <p className="text-sm text-slate-300">Preparando sua sessão…</p>
        </div>
      </main>
    );
  }

  if (status === 'error') {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 py-10">
        <section className="w-full max-w-md rounded-3xl border border-rose-400/20 bg-rose-400/5 p-6 text-center shadow-card backdrop-blur-xl">
          <AlertTriangle className="mx-auto h-8 w-8 text-rose-300" aria-hidden="true" />
          <h1 className="mt-4 text-lg font-semibold text-white">Não foi possível iniciar</h1>
          <p className="mt-3 text-sm text-slate-300">{error}</p>
          <button
            type="button"
            onClick={start}
            className="mt-6 inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] px-5 py-2.5 text-sm font-semibold text-white transition hover:border-chip-gold/40 hover:text-chip-gold"
          >
            Tentar novamente
          </button>
        </section>
      </main>
    );
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <HashRouter>
      <AuthGate>
        <Routes>
          <Route path="/" element={<HomeView />} />
          <Route path="/room/:roomId" element={<RoomView />} />
          <Route path="*" element={<HomeView />} />
        </Routes>
      </AuthGate>
    </HashRouter>
  );
}
