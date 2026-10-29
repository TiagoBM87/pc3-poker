import { initializeApp, type FirebaseApp } from 'firebase/app';
import { forceLongPolling, getDatabase, type Database } from 'firebase/database';

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

if (isFirebaseConfigured) {
  app = initializeApp(firebaseConfig);

  // Force HTTPS long-polling to bypass corporate firewalls/proxies that block
  // WebSocket upgrades. Must be called before the database connection is created.
  forceLongPolling();

  database = getDatabase(app, firebaseConfig.databaseURL);
}

export const db = database;
