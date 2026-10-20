/**
 * État du tunnel invité (WK04 → WK06, D12) dans le `sessionStorage` de l'onglet : coordonnées, adresse, puis
 * référence de la commande créée. **Aucun montant** n'y est gardé : le total est relu dans la commande (D37).
 * Le jeton d'accès de la commande invitée (C10) est rangé à part, par référence, et n'est jamais journalisé.
 */

export type GuestInfo = {
  firstName: string;
  lastName: string;
  /** Numéro E.164 (suivi par SMS). */
  phone: string;
  /** Pays et numéro national saisis, pour préremplir le champ au retour. */
  phoneCountry: string;
  phoneNational: string;
};

export type DeliveryInfo = {
  country: string;
  zoneId: number;
  district: string;
  addressLine: string;
};

export type CheckoutState = { guest?: GuestInfo; delivery?: DeliveryInfo; reference?: string };

export const CHECKOUT_KEY = "steamy:commande";
const TOKEN_PREFIX = "steamy:suivi:";

function session(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function readCheckout(): CheckoutState {
  try {
    const parsed: unknown = JSON.parse(session()?.getItem(CHECKOUT_KEY) ?? "{}");
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed) ? (parsed as CheckoutState) : {};
  } catch {
    return {};
  }
}

/** Fusionne `patch` dans l'état du tunnel. */
export function updateCheckout(patch: Partial<CheckoutState>): void {
  try {
    session()?.setItem(CHECKOUT_KEY, JSON.stringify({ ...readCheckout(), ...patch }));
  } catch {
    // Stockage refusé : le tunnel redemandera les informations
  }
}

/** Fin du tunnel (commande payée) : coordonnées et adresse oubliées. */
export function clearCheckout(): void {
  session()?.removeItem(CHECKOUT_KEY);
}

/** Jeton d'accès d'une commande invitée, remis une seule fois par l'API ou lu dans le lien SMS. */
export function readOrderToken(reference: string): string | null {
  return session()?.getItem(TOKEN_PREFIX + reference) ?? null;
}

export function saveOrderToken(reference: string, token: string): void {
  try {
    session()?.setItem(TOKEN_PREFIX + reference, token);
  } catch {
    // Sans stockage, le lien du SMS reste le moyen de suivre la commande
  }
}
