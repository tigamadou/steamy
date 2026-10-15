import { FLOW_STORAGE_PREFIX } from "./logout";

/**
 * Valeurs de parcours gardées dans l'onglet (`sessionStorage`), jamais dans l'URL ni dans `localStorage`
 * (LOT-2-AUTH, « État multi-étapes ») : défi OTP de l'inscription parent (WP01 → WP02, effacé à WP03) et jeton du
 * lien SMS de consentement en attente de connexion. Purgées en fin de flux et à la déconnexion.
 */
export const FLOW_KEYS = {
  parentChallenge: `${FLOW_STORAGE_PREFIX}parentChallenge`,
  consentToken: `${FLOW_STORAGE_PREFIX}consentToken`,
} as const;

export type FlowKey = keyof typeof FLOW_KEYS;

/** Valeur JSON de l'onglet, `null` si absente, illisible ou si le stockage est indisponible. */
export function readFlow<T>(key: FlowKey): T | null {
  try {
    const raw = sessionStorage.getItem(FLOW_KEYS[key]);
    return raw === null ? null : (JSON.parse(raw) as T);
  } catch {
    return null;
  }
}

export function writeFlow(key: FlowKey, value: unknown): void {
  try {
    sessionStorage.setItem(FLOW_KEYS[key], JSON.stringify(value));
  } catch {
    // Stockage indisponible : le parcours reprendra à son début après un rechargement
  }
}

export function clearFlow(key: FlowKey): void {
  try {
    sessionStorage.removeItem(FLOW_KEYS[key]);
  } catch {
    // Rien à effacer
  }
}
