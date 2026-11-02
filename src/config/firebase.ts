import { initializeApp, type FirebaseApp } from 'firebase/app';
import { forceLongPolling, getDatabase, type Database } from 'firebase/database';
import {
  getAuth,
  onAuthStateChanged,
  onIdTokenChanged,
  signInAnonymously,
  type Auth,
  type User,
} from 'firebase/auth';
import { authErrorMessage, authTechnicalHint } from './authErrors';

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

/**
 * Last ID token seen by the SDK, cached in memory. The presence DELETE runs in
 * `pagehide`, where nothing can be awaited, so the token must already be here.
 */
let cachedIdToken: string | null = null;

/**
 * App Check token cached in memory. F4-T1 feeds it from `onTokenChanged`;
 * until then it stays null and the header is simply omitted.
 */
let cachedAppCheckToken: string | null = null;

if (auth) {
  onIdTokenChanged(auth, (user) => {
    if (!user) {
      cachedIdToken = null;
      return;
    }

    // Resolves from cache when the SDK already refreshed the token.
    void user
      .getIdToken()
      .then((token) => {
        cachedIdToken = token;
      })
      .catch(() => {
        cachedIdToken = null;
      });
  });
}

/**
 * Current authenticated `uid`, or `null` before the session is restored.
 * Used as the only trustworthy identity source in Firebase mode — a value
 * stored by the browser is never trusted.
 */
export function getAuthUid(): string | null {
  return auth?.currentUser?.uid ?? null;
}

/** In-memory ID token used by the unload presence DELETE. */
export function getCachedIdToken(): string | null {
  return cachedIdToken;
}

/** Wired by F4-T1 so the unload request can carry `X-Firebase-AppCheck`. */
export function setAppCheckToken(token: string | null): void {
  cachedAppCheckToken = token;
}

export function getAppCheckToken(): string | null {
  return cachedAppCheckToken;
}

/** Error with a Firebase auth code and a message that is safe to show. */
export class AnonymousAuthError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'AnonymousAuthError';
    this.code = code;
  }
}

/**
 * Builds the error shown by the UI and logs the actionable hint for whoever is
 * debugging. Tokens, uids and environment values are never logged.
 */
function newAuthError(code: string): AnonymousAuthError {
  const hint = authTechnicalHint(code);
  if (hint) console.error(`[auth] ${code}: ${hint}`);
  return new AnonymousAuthError(code, authErrorMessage(code));
}

function toAnonymousAuthError(error: unknown): AnonymousAuthError {
  if (error instanceof AnonymousAuthError) return error;
  const code = (error as { code?: unknown } | null)?.code;
  const normalized = typeof code === 'string' && code.length > 0 ? code : 'auth/unknown';
  return newAuthError(normalized);
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
      reject(newAuthError(code));
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
    return Promise.reject(newAuthError(code));
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
