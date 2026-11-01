/**
 * Visible build identity. The version comes from package.json at build time;
 * the commit hash comes from the CI env var (VITE_APP_COMMIT).
 *
 * It is intentionally discreet: it only proves which build is deployed, and
 * never exposes tokens, environment values or user data.
 */
export function formatVersionLabel(version: string, commit?: string): string {
  const shortCommit = (commit ?? '').trim().slice(0, 7);
  return shortCommit ? `v${version} · ${shortCommit}` : `v${version}`;
}

export const APP_VERSION = __APP_VERSION__;
export const APP_COMMIT = (import.meta.env.VITE_APP_COMMIT ?? '').trim();
export const APP_VERSION_LABEL = formatVersionLabel(APP_VERSION, APP_COMMIT);
