/**
 * Panier de l'invité (D38) : dans le `localStorage` du navigateur, **identifiants et quantités seulement**. Les prix,
 * la disponibilité et les totaux sont relus dans l'API à chaque affichage (D37) ; ce stockage n'en garde aucun.
 */

export type GuestLine = { kitSlug: string; quantity: number };

export const GUEST_CART_KEY = "steamy:panier";

const SLUG = /^[-a-z0-9_]+$/i;

function isLine(value: unknown): value is GuestLine {
  if (typeof value !== "object" || value === null) return false;
  const { kitSlug, quantity } = value as Record<string, unknown>;
  return typeof kitSlug === "string" && SLUG.test(kitSlug) && Number.isInteger(quantity) && (quantity as number) > 0;
}

/** Lignes du panier invité ; un contenu illisible ou un stockage indisponible donne un panier vide. */
export function readGuestCart(): GuestLine[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(GUEST_CART_KEY) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    // Une ligne par kit : la première l'emporte
    const seen = new Set<string>();
    return parsed.filter(isLine).filter((line) => !seen.has(line.kitSlug) && seen.add(line.kitSlug));
  } catch {
    return [];
  }
}

/** Remplace le panier invité (vidé s'il n'a plus de ligne). Sans stockage (navigation privée stricte) : sans effet. */
export function writeGuestCart(lines: GuestLine[]): void {
  try {
    if (lines.length === 0) {
      window.localStorage.removeItem(GUEST_CART_KEY);
    } else {
      window.localStorage.setItem(
        GUEST_CART_KEY,
        JSON.stringify(lines.map(({ kitSlug, quantity }) => ({ kitSlug, quantity }))),
      );
    }
  } catch {
    // Stockage plein ou refusé : le panier reste celui de la page
  }
}

/** Ajoute `quantity` exemplaires d'un kit (ajoutés à ceux déjà présents, comme le panier serveur). */
export function addGuestLine(kitSlug: string, quantity: number): void {
  const lines = readGuestCart();
  const line = lines.find((l) => l.kitSlug === kitSlug);
  writeGuestCart(
    line
      ? lines.map((l) => (l.kitSlug === kitSlug ? { kitSlug, quantity: l.quantity + quantity } : l))
      : [...lines, { kitSlug, quantity }],
  );
}

/** Fixe la quantité d'une ligne existante. */
export function setGuestQuantity(kitSlug: string, quantity: number): void {
  writeGuestCart(readGuestCart().map((l) => (l.kitSlug === kitSlug ? { kitSlug, quantity } : l)));
}

/** Retire une ligne. */
export function removeGuestLine(kitSlug: string): void {
  writeGuestCart(readGuestCart().filter((l) => l.kitSlug !== kitSlug));
}
