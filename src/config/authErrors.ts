/**
 * Auth error copy.
 *
 * The site is public, so the messages shown to visitors never mention the
 * stack, environment variables or Console steps. The actionable detail goes to
 * the browser console through `authTechnicalHint` (no secrets included).
 */

export const AUTH_SERVICE_UNAVAILABLE =
  'O serviço está temporariamente indisponível. Tente novamente em instantes.';

/** Short, neutral message that is safe to render to any visitor. */
export function authErrorMessage(code: string): string {
  switch (code) {
    case 'auth/network-request-failed':
      return 'Não foi possível conectar. Verifique sua rede/VPN e tente novamente.';
    case 'auth/timeout':
      return 'A conexão está demorando mais que o esperado. Verifique sua rede e tente novamente.';
    case 'auth/too-many-requests':
      return 'Muitas tentativas de acesso. Aguarde alguns minutos e tente novamente.';
    default:
      return AUTH_SERVICE_UNAVAILABLE;
  }
}

/** Developer-facing hint, meant for `console.error` only. Contains no secrets. */
export function authTechnicalHint(code: string): string | null {
  switch (code) {
    case 'auth/operation-not-allowed':
    case 'auth/admin-restricted-operation':
      return 'Anonymous sign-in is disabled. Enable it in Console → Authentication → Sign-in method → Anonymous.';
    case 'auth/configuration-not-found':
      return 'Firebase Authentication is not initialized. Console → Authentication → Get started → Anonymous.';
    case 'auth/unauthorized-domain':
      return 'This domain is not listed in Authentication → Settings → Authorized domains.';
    case 'auth/api-key-not-valid':
    case 'auth/invalid-api-key':
      return 'The API key was rejected. Check the VITE_FIREBASE_* variables.';
    case 'auth/not-configured':
      return 'Missing VITE_FIREBASE_* variables, so Firebase was never initialized.';
    case 'auth/network-request-failed':
      return 'Auth request failed at the network level (proxy, VPN or offline).';
    case 'auth/timeout':
      return 'Auth did not resolve within the timeout window.';
    default:
      return null;
  }
}
