import { describe, expect, it } from 'vitest';
import { buildPresenceDeleteHeaders, buildPresenceDeleteUrl } from './presence';

const DATABASE_URL = 'https://pc3-poker.firebaseio.com';

describe('buildPresenceDeleteUrl', () => {
  it('targets only the participant node', () => {
    expect(buildPresenceDeleteUrl(DATABASE_URL, 'room123', 'uid-1', null)).toBe(
      'https://pc3-poker.firebaseio.com/rooms/room123/participants/uid-1.json',
    );
  });

  it('adds the encoded ID token as the auth query parameter', () => {
    const url = buildPresenceDeleteUrl(DATABASE_URL, 'room123', 'uid-1', 'token/with+chars=');

    expect(url).toBe(
      'https://pc3-poker.firebaseio.com/rooms/room123/participants/uid-1.json?auth=token%2Fwith%2Bchars%3D',
    );
  });

  it('normalizes trailing slashes in the database url', () => {
    expect(buildPresenceDeleteUrl(`${DATABASE_URL}///`, 'room123', 'uid-1', null)).toBe(
      'https://pc3-poker.firebaseio.com/rooms/room123/participants/uid-1.json',
    );
  });

  it('never includes the vote node', () => {
    expect(buildPresenceDeleteUrl(DATABASE_URL, 'room123', 'uid-1', null)).not.toContain('/votes/');
  });
});

describe('buildPresenceDeleteHeaders', () => {
  it('is empty without an App Check token', () => {
    expect(buildPresenceDeleteHeaders(null)).toEqual({});
  });

  it('sends the App Check token in its own header', () => {
    expect(buildPresenceDeleteHeaders('app-check-token')).toEqual({
      'X-Firebase-AppCheck': 'app-check-token',
    });
  });
});
