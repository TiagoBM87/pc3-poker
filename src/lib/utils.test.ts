import { describe, expect, it } from 'vitest';
import {
  createRoomId,
  parseRoomId,
  ROOM_ID_ALPHABET,
  ROOM_ID_LENGTH,
} from './utils';

describe('createRoomId', () => {
  it('generates ids with the expected length', () => {
    expect(createRoomId()).toHaveLength(ROOM_ID_LENGTH);
    expect(ROOM_ID_LENGTH).toBe(26);
  });

  it('only uses the base32 alphabet', () => {
    const alphabet = new Set(ROOM_ID_ALPHABET.split(''));

    for (let i = 0; i < 200; i += 1) {
      for (const char of createRoomId()) {
        expect(alphabet.has(char)).toBe(true);
      }
    }
  });

  it('does not reuse ids', () => {
    const ids = new Set(Array.from({ length: 1000 }, () => createRoomId()));
    expect(ids.size).toBe(1000);
  });

  it('does not contain look-alike characters', () => {
    for (const char of ['l', 'o', '0', '1']) {
      expect(ROOM_ID_ALPHABET).not.toContain(char);
    }
  });
});

describe('parseRoomId', () => {
  const id = 'k7m2q9x4t8b3n6v5c2z9w4r7p8';

  it('round-trips a freshly generated id', () => {
    const generated = createRoomId();
    expect(parseRoomId(generated)).toBe(generated);
    expect(parseRoomId(`#/room/${generated}`)).toBe(generated);
  });

  it('accepts a raw room code', () => {
    expect(parseRoomId(id)).toBe(id);
  });

  it('accepts a hash url', () => {
    expect(parseRoomId(`#/room/${id}`)).toBe(id);
  });

  it('accepts a full url', () => {
    expect(parseRoomId(`https://example.com/pc3-poker/#/room/${id}`)).toBe(id);
  });

  it('accepts a query string url', () => {
    expect(parseRoomId(`https://example.com/?room=${id}`)).toBe(id);
  });

  it('keeps legacy slug ids working', () => {
    expect(parseRoomId('sprint-planning-a4k9')).toBe('sprint-planning-a4k9');
    expect(parseRoomId('#/room/sprint-planning-a4k9')).toBe('sprint-planning-a4k9');
  });

  it('normalizes to lowercase', () => {
    expect(parseRoomId('SPRINT-PLANNING-A4K9')).toBe('sprint-planning-a4k9');
  });

  it('rejects empty, short or invalid input', () => {
    expect(parseRoomId('')).toBeNull();
    expect(parseRoomId('   ')).toBeNull();
    expect(parseRoomId('ab')).toBeNull();
    expect(parseRoomId('sala com espaços')).toBeNull();
    expect(parseRoomId('sala/../outra')).toBeNull();
    expect(parseRoomId('a'.repeat(65))).toBeNull();
  });
});
