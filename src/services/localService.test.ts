import { beforeAll, describe, expect, it } from 'vitest';
import type { Participant } from '../types/poker';
import * as localService from './localService';

/**
 * Regression test for the reload flow: the unload handler must remove only the
 * participant, keeping the vote so the same tab can restore it after reloading.
 */
const storage = new Map<string, string>();
const pagehideHandlers: Array<() => void> = [];

function installBrowserStubs(): void {
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, String(value));
      },
      removeItem: (key: string) => {
        storage.delete(key);
      },
      clear: () => storage.clear(),
    },
  });

  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      addEventListener: (type: string, handler: () => void) => {
        if (type === 'pagehide') pagehideHandlers.push(handler);
      },
    },
  });
}

const alice: Participant = { id: 'alice', name: 'Alice', role: 'VOTER', joinedAt: 1 };
const roomId = 'room-reload-test';

beforeAll(() => {
  installBrowserStubs();
});

describe('localService unload cleanup', () => {
  it('removes the participant but keeps the vote when the page unloads', async () => {
    await localService.createRoom(roomId, 'Sprint 42', alice);
    await localService.castVote(roomId, alice.id, '5');

    for (const handler of pagehideHandlers) handler();

    const stored = JSON.parse(storage.get(`pp:room:${roomId}`) ?? '{}') as {
      votes?: Record<string, string>;
    };
    expect(stored.votes?.[alice.id]).toBe('5');

    const afterUnload = await localService.getRoom(roomId);
    expect(afterUnload?.participants[alice.id]).toBeUndefined();
    expect(afterUnload?.votes?.[alice.id]).toBe('5');
  });

  it('restores the participant and the vote after reloading', async () => {
    await localService.joinRoom(roomId, { ...alice, joinedAt: 2 });

    const afterReload = await localService.getRoom(roomId);
    expect(afterReload?.participants[alice.id]).toBeDefined();
    expect(afterReload?.votes?.[alice.id]).toBe('5');
  });

  it('removes the vote when the user leaves on purpose', async () => {
    await localService.leaveRoom(roomId, alice.id);

    const afterLeave = await localService.getRoom(roomId);
    expect(afterLeave?.participants[alice.id]).toBeUndefined();
    expect(afterLeave?.votes?.[alice.id]).toBeUndefined();
  });
});
