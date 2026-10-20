import type { Schemas } from "@steamy/api-client";

import { apiCall, type ApiResult } from "@/lib/api-call";

import { addGuestLine, noteDroppedLines, readGuestCart, writeGuestCart } from "./guest-cart";

// Appels de la boutique par le client navigateur (CSRF automatique) : panier serveur, fiche kit relue au moment
// d'afficher le panier invité, alerte de réassort, fusion du panier invité à la connexion (D38).

/** Qui regarde la boutique : l'invité garde son panier dans le navigateur, l'apprenant et le parent sur le serveur. */
export type Shopper = "guest" | "learner" | "parent";

/**
 * Lit la session côté navigateur (`GET accounts/me/`), sans rendre dynamique la page publique qui l'appelle.
 * Sans session, ou pour un compte sans panier (enseignant, personnel), le visiteur est traité en invité.
 */
export async function probeShopper(): Promise<Shopper> {
  const me = await apiCall((api) => api.GET("/api/accounts/me/"));
  if (!me.ok) return "guest";
  return me.data.role === "learner" || me.data.role === "parent" ? me.data.role : "guest";
}

export function getCart(): Promise<ApiResult<Schemas["Cart"]>> {
  return apiCall((api) => api.GET("/api/shop/cart/"));
}

/** Ajoute des exemplaires d'un kit (ajoutés à la quantité déjà présente). */
export function addCartItem(kitSlug: string, quantity = 1): Promise<ApiResult<Schemas["Cart"]>> {
  return apiCall((api) => api.POST("/api/shop/cart/items/", { body: { kitSlug, quantity } }));
}

export function updateCartItem(id: number, quantity: number): Promise<ApiResult<Schemas["Cart"]>> {
  return apiCall((api) => api.PATCH("/api/shop/cart/items/{id}/", { params: { path: { id } }, body: { quantity } }));
}

/**
 * Retire une ligne. L'API renvoie le panier (200), mais le schéma OpenAPI annonce un 204 sans corps : sans panier dans
 * la réponse, il est relu.
 */
export async function removeCartItem(id: number): Promise<ApiResult<Schemas["Cart"]>> {
  const result: ApiResult<Schemas["Cart"] | undefined> = await apiCall((api) =>
    api.DELETE("/api/shop/cart/items/{id}/", { params: { path: { id } } }),
  );
  if (!result.ok) return result;
  return result.data ? { ok: true, data: result.data } : getCart();
}

/** Fiche d'un kit, relue pour le prix et la disponibilité du moment (D37). */
export function getKitDetail(slug: string): Promise<ApiResult<Schemas["KitDetail"]>> {
  return apiCall((api) => api.GET("/api/shop/kits/{slug}/", { params: { path: { slug } } }));
}

/**
 * Alerte de réassort (WK11, D38) : l'invité donne son numéro ; un compte connecté n'envoie rien (SMS au parent sur
 * son numéro, notification dans l'application pour l'apprenant, D30).
 */
export function requestRestockAlert(slug: string, phone?: string): Promise<ApiResult<{ ok: boolean }>> {
  return apiCall((api) =>
    api.POST("/api/shop/kits/{slug}/restock-alerts/", {
      params: { path: { slug } },
      ...(phone ? { body: { phone } } : {}),
    }),
  );
}

/**
 * « Ajouter » (WK01, WK02) : dans le panier serveur pour un compte connecté (qui refuse un kit épuisé), sinon dans le
 * panier invité après avoir relu la fiche, la page publique étant en cache (prix et stock relus au moment d'ajouter).
 */
export async function addToCart(
  context: "learner" | "public",
  kitSlug: string,
  quantity = 1,
): Promise<ApiResult<{ shopper: Shopper }>> {
  const shopper = context === "learner" ? "learner" : await probeShopper();
  if (shopper !== "guest") {
    const result = await addCartItem(kitSlug, quantity);
    return result.ok ? { ok: true, data: { shopper } } : result;
  }
  const kit = await getKitDetail(kitSlug);
  if (!kit.ok) return kit;
  if (!kit.data.available) return { ok: false, code: "OUT_OF_STOCK", message: "", fields: {} };
  addGuestLine(kitSlug, quantity);
  return { ok: true, data: { shopper } };
}

/** Échecs passagers (réseau, panne, plafond) : la ligne reste dans le stockage et sera versée au prochain essai. */
const TRANSIENT = new Set(["NETWORK_UNAVAILABLE", "SERVER_ERROR", "THROTTLED"]);

/**
 * Verse le panier invité dans le panier serveur, au retour de la connexion (W16, `?next=`), puis vide le stockage
 * local. Chaque ligne versée, ou refusée pour de bon (kit retiré, épuisé, quantité ou accès refusés), quitte aussitôt
 * le stockage : une coupure en cours de route ne la versera pas deux fois, et une ligne refusée n'est pas réessayée à
 * chaque affichage. Les lignes refusées sont comptées pour que le panier le signale. Renvoie le nombre de lignes
 * versées.
 */
export async function mergeGuestCart(): Promise<number> {
  let merged = 0;
  let dropped = 0;
  for (const line of readGuestCart()) {
    const result = await addCartItem(line.kitSlug, line.quantity);
    if (!result.ok && TRANSIENT.has(result.code)) continue;
    if (result.ok) merged += 1;
    else dropped += 1;
    writeGuestCart(readGuestCart().filter((l) => l.kitSlug !== line.kitSlug));
  }
  if (dropped > 0) noteDroppedLines(dropped);
  return merged;
}
