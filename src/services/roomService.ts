import { isFirebaseConfigured } from '../config/firebase';
import type { RoomService } from './contract';
import * as firebaseService from './firebaseService';
import * as localService from './localService';

export type BackendMode = 'firebase' | 'local';

export const backendMode: BackendMode = isFirebaseConfigured ? 'firebase' : 'local';

/**
 * Single entry point used by the app. When Firebase env vars are missing the
 * app automatically runs against the local demo backend instead of crashing.
 */
export const roomService: RoomService = isFirebaseConfigured ? firebaseService : localService;
