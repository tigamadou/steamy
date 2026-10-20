import { routes } from "@/lib/routes";

import type { Shopper } from "./api";

/** Boutique affichée : espace apprenant, espace parent (achat direct, C10) ou site public. */
export type ShopContext = "learner" | "parent" | "public";

/** Routes de la boutique d'un contexte : catalogue, fiche d'un kit, panier, fiche d'un parcours compatible. */
export function shopRoutes(context: ShopContext) {
  if (context === "learner") {
    const l = routes.learner;
    return { shop: l.shop, shopKit: l.shopKit, cart: l.cart, course: l.catalogCourse };
  }
  if (context === "parent") {
    const p = routes.parent;
    return { shop: p.shop, shopKit: p.shopKit, cart: p.cart, course: routes.course };
  }
  return { shop: routes.shop, shopKit: routes.shopKit, cart: routes.cart, course: routes.course };
}

/** Panier de qui regarde : celui de son espace pour l'apprenant et le parent, sinon celui de la boutique publique. */
export function cartHref(shopper: Shopper): string {
  if (shopper === "learner") return routes.learner.cart;
  return shopper === "parent" ? routes.parent.cart : routes.cart;
}
