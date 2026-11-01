import { initializeApp, type FirebaseApp } from 'firebase/app';
import { forceLongPolling, getDatabase, type Database } from 'firebase/database';
import {
  getAuth,
  onAuthStateChanged,
  signInAnonymously,
  type Auth,
  type User,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

/** Minimum variables needed to open a Realtime Database connection. */
export const REQUIRED_FIREBASE_ENV_VARS = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_DATABASE_URL',
  'VITE_FIREBASE_PROJECT_ID',
] as const;

const requiredChecks: Array<{ env: (typeof REQUIRED_FIREBASE_ENV_VARS)[number]; value: string | undefined }> = [
  { env: 'VITE_FIREBASE_API_KEY', value: firebaseConfig.apiKey },
  { env: 'VITE_FIREBASE_DATABASE_URL', value: firebaseConfig.databaseURL },
  { env: 'VITE_FIREBASE_PROJECT_ID', value: firebaseConfig.projectId },
];

export const missingFirebaseEnvVars: string[] = requiredChecks
  .filter(({ value }) => !value || value.trim().length === 0)
  .map(({ env }) => env);

export const isFirebaseConfigured = missingFirebaseEnvVars.length === 0;

let app: FirebaseApp | null = null;
let database: Database | null = null;
let auth: Auth | null = null;

if (isFirebaseConfigured) {
  app = initializeApp(firebaseConfig);

  // Force HTTPS long-polling to bypass corporate firewalls/proxies that block
  // WebSocket upgrades. Must be called before the database connection is created.
  forceLongPolling();

  database = getDatabase(app, firebaseConfig.databaseURL);

  // Anonymous Auth is the identity source; no sign-in screen is shown.
  // `ensureAnonymousAuth()` waits for the persisted session before signing in.
  auth = getAuth(app);
}

export const db = database;
export const firebaseAuth = auth;

/** Error with a Firebase auth code and a message that is safe to show. */
export class AnonymousAuthError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'AnonymousAuthError';
    this.code = code;
  }
}

function authErrorMessage(code: string): string {
  switch (code) {
    case 'auth/operation-not-allowed':
    case 'auth/admin-restricted-operation':
      return 'O login anônimo está desativado no Firebase. Ative em Authentication → Sign-in method → Anonymous e recarregue a página.';
    case 'auth/configuration-not-found':
      return 'O Firebase Authentication ainda não foi configurado neste projeto. Abra o Console → Authentication, clique em "Vamos começar" e ative o método Anonymous.';
    case 'auth/network-request-failed':
      return 'Não foi possível conectar ao Firebase para iniciar a sessão. Verifique sua rede/VPN e tente novamente.';
    case 'auth/timeout':
      return 'A autenticação está demorando mais que o esperado. Verifique sua conexão e tente novamente.';
    case 'auth/too-many-requests':
      return 'Muitas tentativas de acesso. Aguarde alguns minutos e tente novamente.';
    case 'auth/unauthorized-domain':
      return 'Este domínio não está autorizado no Firebase Authentication.';
    case 'auth/api-key-not-valid':
    case 'auth/invalid-api-key':
      return 'Configuração do Firebase inválida (API key). Confira as variáveis VITE_FIREBASE_*.';
    case 'auth/not-configured':
      return 'Firebase não configurado. Preencha as variáveis VITE_FIREBASE_* no arquivo .env.';
    default:
      return 'Não foi possível iniciar a sessão anônima. Tente novamente.';
  }
}

function toAnonymousAuthError(error: unknown): AnonymousAuthError {
  if (error instanceof AnonymousAuthError) return error;
  const code = (error as { code?: unknown } | null)?.code;
  const normalized = typeof code === 'string' && code.length > 0 ? code : 'auth/unknown';
  return new AnonymousAuthError(normalized, authErrorMessage(normalized));
}

/**
 * Resolves the current anonymous user after Firebase finishes restoring the
 * persisted session (`onAuthStateChanged` fires once with the restored user).
 * This avoids creating a new uid on every reload.
 */
function waitForInitialUser(firebaseAuth: Auth): Promise<User | null> {
  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(
      firebaseAuth,
      (user) => {
        unsubscribe();
        resolve(user);
      },
      (error) => {
        unsubscribe();
        reject(error);
      },
    );
  });
}

/** Upper bound so a stalled request never leaves the app on an endless spinner. */
const AUTH_TIMEOUT_MS = 20_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      const code = 'auth/timeout';
      reject(new AnonymousAuthError(code, authErrorMessage(code)));
    }, ms);

    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

let authPromise: Promise<string> | null = null;

/**
 * Returns the anonymous `uid`, signing in on first use. The promise is
 * memoized so concurrent callers share a single sign-in attempt, and it is
 * reset on failure so the UI can retry.
 *
 * Never logs tokens or user data.
 */
export function ensureAnonymousAuth(): Promise<string> {
  if (!auth) {
    const code = 'auth/not-configured';
    return Promise.reject(new AnonymousAuthError(code, authErrorMessage(code)));
  }

  const firebaseAuth = auth;
  const current = firebaseAuth.currentUser;
  if (current?.uid) return Promise.resolve(current.uid);

  if (!authPromise) {
    authPromise = withTimeout(
      waitForInitialUser(firebaseAuth).then((user) => {
        if (user?.uid) return user.uid;
        return signInAnonymously(firebaseAuth).then((credential) => credential.user.uid);
      }),
      AUTH_TIMEOUT_MS,
    ).catch((error: unknown) => {
      authPromise = null;
      throw toAnonymousAuthError(error);
    });
  }

  return authPromise;
}
