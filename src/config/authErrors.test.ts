import { describe, expect, it } from 'vitest';
import { AUTH_SERVICE_UNAVAILABLE, authErrorMessage, authTechnicalHint } from './authErrors';

const CODES = [
  'auth/operation-not-allowed',
  'auth/admin-restricted-operation',
  'auth/configuration-not-found',
  'auth/network-request-failed',
  'auth/timeout',
  'auth/too-many-requests',
  'auth/unauthorized-domain',
  'auth/api-key-not-valid',
  'auth/invalid-api-key',
  'auth/not-configured',
  'auth/something-new',
];

describe('authErrorMessage', () => {
  it('never exposes stack, console steps or env var names to visitors', () => {
    for (const code of CODES) {
      expect(authErrorMessage(code)).not.toMatch(/firebase|console|vite_|authentication|api key/i);
    }
  });

  it('falls back to a neutral message for configuration problems', () => {
    expect(authErrorMessage('auth/configuration-not-found')).toBe(AUTH_SERVICE_UNAVAILABLE);
    expect(authErrorMessage('auth/not-configured')).toBe(AUTH_SERVICE_UNAVAILABLE);
    expect(authErrorMessage('auth/invalid-api-key')).toBe(AUTH_SERVICE_UNAVAILABLE);
    expect(authErrorMessage('auth/unknown')).toBe(AUTH_SERVICE_UNAVAILABLE);
  });

  it('keeps actionable messages for visitor-side failures', () => {
    expect(authErrorMessage('auth/network-request-failed')).toContain('rede');
    expect(authErrorMessage('auth/timeout')).toContain('demorando');
    expect(authErrorMessage('auth/too-many-requests')).toContain('Aguarde');
  });
});

describe('authTechnicalHint', () => {
  it('explains what a maintainer has to do', () => {
    expect(authTechnicalHint('auth/configuration-not-found')).toContain('Console');
    expect(authTechnicalHint('auth/operation-not-allowed')).toContain('Anonymous');
    expect(authTechnicalHint('auth/not-configured')).toContain('VITE_FIREBASE_');
  });

  it('returns null when there is nothing actionable', () => {
    expect(authTechnicalHint('auth/unknown')).toBeNull();
    expect(authTechnicalHint('auth/too-many-requests')).toBeNull();
  });
});
