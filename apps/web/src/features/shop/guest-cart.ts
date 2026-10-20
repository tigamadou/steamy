/**
 * Panier de l'invité (D38) : dans le `localStorage` du navigateur, **identifiants et quantités seulement**. Les prix,
 * la disponibilité et les totaux sont relus dans l'API à chaque affichage (D37) ; ce stockage n'en garde aucun.
 */

export type GuestLine = { kitSlug: string; quantity: number };

export const GUEST_CART_KEY = "steamy:panier";

/** Nombre de lignes écartées à la fusion du panier invité, affiché une fois par le panier qui suit (onglet courant). */
export const DROPPED_LINES_KEY = "steamy:panier-ecartes";

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

/** Retient des lignes écartées à la fusion (cumulées) pour que le panier le signale. */
export function noteDroppedLines(count: number): void {
  try {
    const previous = Number(window.sessionStorage.getItem(DROPPED_LINES_KEY)) || 0;
    window.sessionStorage.setItem(DROPPED_LINES_KEY, String(previous + count));
  } catch {
    // Stockage refusé : le panier ne signalera pas les lignes écartées
  }
}

/** Lignes écartées à la fusion depuis le dernier affichage du panier (0 sinon) ; le compteur est remis à zéro. */
export function takeDroppedLines(): number {
  try {
    const count = Number(window.sessionStorage.getItem(DROPPED_LINES_KEY)) || 0;
    window.sessionStorage.removeItem(DROPPED_LINES_KEY);
    return count;
  } catch {
    return 0;
  }
}
