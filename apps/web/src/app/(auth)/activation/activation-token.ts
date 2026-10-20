/**
 * Jeton de l'invitation enseignant (C6). Le lien de l'email le porte dans le fragment (`/activation#jeton=…`), que
 * le navigateur n'envoie jamais au serveur : il reste hors des journaux d'accès et de l'en-tête Referer. Lu une fois,
 * il est retiré de l'adresse et gardé dans l'onglet (`sessionStorage`), pour survivre à un rechargement.
 */

const FRAGMENT = /^#jeton=([\w-]+)$/;
export const ACTIVATION_TOKEN_KEY = "steamy:activation";

function session(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

/** Jeton du lien (retiré de l'adresse aussitôt), sinon celui déjà lu dans cet onglet. */
export function takeActivationToken(): string | null {
  const match = FRAGMENT.exec(window.location.hash);
  if (match) {
    window.history.replaceState(window.history.state, "", window.location.pathname);
    try {
      session()?.setItem(ACTIVATION_TOKEN_KEY, match[1]);
    } catch {
      // Stockage refusé : un rechargement demandera de rouvrir le lien
    }
    return match[1];
  }
  return session()?.getItem(ACTIVATION_TOKEN_KEY) ?? null;
}

/** Compte activé ou lien refusé : le jeton n'a plus d'usage dans l'onglet. */
export function forgetActivationToken(): void {
  session()?.removeItem(ACTIVATION_TOKEN_KEY);
}
