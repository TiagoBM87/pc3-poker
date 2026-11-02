/**
 * Helpers for the presence DELETE fired while the page is unloading.
 *
 * `pagehide` cannot await anything, so the request is sent with `keepalive` and
 * every value needed to build it must already be in memory (see the token cache
 * in `src/config/firebase.ts`).
 */
const APP_CHECK_HEADER = 'X-Firebase-AppCheck';

/**
 * Builds `{databaseUrl}/rooms/{roomId}/participants/{userId}.json`, adding the
 * `auth` query parameter when an ID token is available.
 */
export function buildPresenceDeleteUrl(
  databaseUrl: string,
  roomId: string,
  userId: string,
  idToken: string | null,
): string {
  const base = databaseUrl.replace(/\/+$/, '');
  const path = `rooms/${encodeURIComponent(roomId)}/participants/${encodeURIComponent(userId)}.json`;
  const url = `${base}/${path}`;

  return idToken ? `${url}?auth=${encodeURIComponent(idToken)}` : url;
}

/**
 * App Check header for the unload request. The token is optional until F4-T1
 * starts feeding it from `onTokenChanged`.
 */
export function buildPresenceDeleteHeaders(
  appCheckToken: string | null,
): Record<string, string> {
  return appCheckToken ? { [APP_CHECK_HEADER]: appCheckToken } : {};
}
