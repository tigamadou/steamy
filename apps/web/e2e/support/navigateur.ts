import type { Page } from "@playwright/test";

// État que le front garde dans le navigateur de l'invité : panier (`localStorage`), tunnel de commande et jeton de la
// commande (`sessionStorage`). Les tests le posent avant d'ouvrir l'écran, comme si l'invité venait de l'étape
// précédente, au lieu de rejouer tout le tunnel.

export type GuestLine = { kitSlug: string; quantity: number };
export type GuestCheckout = {
  guest?: { firstName: string; lastName: string; phone: string; phoneCountry: string; phoneNational: string };
  delivery?: { country: string; zoneId: number; district: string; addressLine: string };
  reference?: string;
};

export const GUEST = {
  firstName: "Awa",
  lastName: "Invitée",
  phone: "+2290197123402",
  phoneCountry: "BJ",
  phoneNational: "0197123402",
} as const;

export const DELIVERY = { country: "BJ", zoneId: 2, district: "Ouando", addressLine: "Près du marché" } as const;

type Seed = { cart?: GuestLine[]; checkout?: GuestCheckout; tokens?: Record<string, string> };

/**
 * Pose l'état du navigateur sur l'origine du front (page statique sans appel à l'API) ; à appeler avant d'ouvrir
 * l'écran sous test. Le stockage d'un onglet neuf est vide : un test sans appel ne part de rien.
 */
export async function seedBrowser(page: Page, { cart, checkout, tokens = {} }: Seed): Promise<void> {
  await page.goto("/robots.txt");
  await page.evaluate(
    ({ cart, checkout, tokens }) => {
      if (cart) window.localStorage.setItem("steamy:panier", JSON.stringify(cart));
      if (checkout) window.sessionStorage.setItem("steamy:commande", JSON.stringify(checkout));
      for (const [reference, token] of Object.entries(tokens)) window.sessionStorage.setItem(`steamy:suivi:${reference}`, token);
    },
    { cart, checkout, tokens },
  );
}

export const storedCart = (page: Page) =>
  page.evaluate(() => JSON.parse(window.localStorage.getItem("steamy:panier") ?? "[]") as GuestLine[]);
export const storedCheckout = (page: Page) =>
  page.evaluate(() => JSON.parse(window.sessionStorage.getItem("steamy:commande") ?? "{}") as GuestCheckout & { reference?: string });
