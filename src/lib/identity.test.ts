import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getIdentity,
  getOrCreateLocalUserId,
  IdentityUnavailableError,
  parseStoredIdentity,
  resolveUserId,
  saveIdentity,
} from './identity';

const state = vi.hoisted(() => ({
  mode: 'firebase' as 'firebase' | 'local',
  uid: 'uid-real' as string | null,
}));

vi.mock('../config/firebase', () => ({
  getAuthUid: () => state.uid,
}));

vi.mock('../services/roomService', () => ({
  get backendMode() {
    return state.mode;
  },
}));

function memoryStorage(initial: Record<string, string> = {}): Storage {
  const map = new Map(Object.entries(initial));
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (key: string) => map.get(key) ?? null,
    key: (index: number) => [...map.keys()][index] ?? null,
    removeItem: (key: string) => {
      map.delete(key);
    },
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
  } as Storage;
}

let localStorageStub: Storage;

function useStorage(local: Storage, session: Storage): void {
  localStorageStub = local;
  (globalThis as unknown as { window: unknown }).window = {
    localStorage: local,
    sessionStorage: session,
  };
}

beforeEach(() => {
  state.mode = 'firebase';
  state.uid = 'uid-real';
  useStorage(memoryStorage(), memoryStorage());
});

describe('parseStoredIdentity', () => {
  it('returns null when there is nothing usable', () => {
    expect(parseStoredIdentity(null)).toBeNull();
    expect(parseStoredIdentity('')).toBeNull();
    expect(parseStoredIdentity('not json')).toBeNull();
    expect(parseStoredIdentity('{}')).toBeNull();
    expect(parseStoredIdentity('{"name":"Ana","role":"ADMIN"}')).toBeNull();
    expect(parseStoredIdentity('{"name":"   ","role":"VOTER"}')).toBeNull();
  });

  it('trims the name and ignores a legacy id', () => {
    expect(parseStoredIdentity('{"id":"forged","name":"  Ana  ","role":"VOTER"}')).toEqual({
      name: 'Ana',
      role: 'VOTER',
    });
  });
});

describe('Firebase mode', () => {
  it('uses the authenticated uid instead of the stored id', () => {
    localStorageStub.setItem(
      'pp:identity',
      JSON.stringify({ id: 'forged-id', name: 'Ana', role: 'VOTER' }),
    );

    expect(getIdentity()).toEqual({ id: 'uid-real', name: 'Ana', role: 'VOTER' });
  });

  it('does not persist the id in the browser', () => {
    localStorageStub.setItem('pp:user-id', 'legacy-uuid');
    const identity = saveIdentity('  Ana  ', 'OBSERVER');

    expect(identity).toEqual({ id: 'uid-real', name: 'Ana', role: 'OBSERVER' });
    expect(JSON.parse(localStorageStub.getItem('pp:identity') ?? '{}')).toEqual({
      name: 'Ana',
      role: 'OBSERVER',
    });
    expect(localStorageStub.getItem('pp:user-id')).toBeNull();
  });

  it('follows the session when the uid changes', () => {
    saveIdentity('Ana', 'VOTER');
    state.uid = 'uid-next';

    expect(getIdentity()).toEqual({ id: 'uid-next', name: 'Ana', role: 'VOTER' });
  });

  it('refuses to build an identity before the session is ready', () => {
    state.uid = null;
    localStorageStub.setItem(
      'pp:identity',
      JSON.stringify({ name: 'Ana', role: 'VOTER' }),
    );

    expect(resolveUserId()).toBeNull();
    expect(getIdentity()).toBeNull();
    expect(() => saveIdentity('Ana', 'VOTER')).toThrow(IdentityUnavailableError);
  });
});

describe('Local demo mode', () => {
  it('generates a different id per tab and keeps it across reloads', () => {
    state.mode = 'local';

    const tabA = memoryStorage();
    const tabB = memoryStorage();
    useStorage(memoryStorage(), tabA);
    const idA = getOrCreateLocalUserId();
    expect(getOrCreateLocalUserId()).toBe(idA);

    useStorage(memoryStorage(), tabB);
    const idB = getOrCreateLocalUserId();

    expect(idA).not.toBe(idB);
    expect(tabA.getItem('pp:user-id')).toBe(idA);
  });

  it('keeps the profile per tab in sessionStorage', () => {
    state.mode = 'local';
    const local = memoryStorage();
    const session = memoryStorage();
    useStorage(local, session);

    const identity = saveIdentity('Bruno', 'VOTER');

    expect(identity.id).toBe(session.getItem('pp:user-id'));
    expect(session.getItem('pp:identity')).toContain('Bruno');
    expect(local.getItem('pp:identity')).toBeNull();
    expect(getIdentity()).toEqual({ id: identity.id, name: 'Bruno', role: 'VOTER' });
  });
});
