import type { Schemas } from "@steamy/api-client";

import { scenario, type Scenario } from "../base.ts";
import { route } from "../contexte.ts";
import type { Partiel } from "../defauts.ts";
import { KITS, SAVED_ADDRESS, type TaxRates } from "../fixtures.ts";
import { kitEnAttente } from "./commandes-parent.ts";

// Achat direct de kits par le parent (`/parent/boutique`, `/parent/boutique/panier`, `/parent/boutique/commande`) : panier
// serveur, adresse par défaut, bénéficiaire facultatif, commande qui réserve le stock, paiement Mobile Money.
// Les routes du panier sont celles de `boutique.ts`, celles de la commande et du paiement `commandes.ts` et `paiement.ts`.

route("GET", /^\/api\/accounts\/children\/$/, true, ({ instance, respond }) => {
  const results = instance.scenario.children;
  respond(200, { count: results.length, next: null, previous: null, results } satisfies Schemas["PaginatedChildList"]);
});

const TAXES_OFF: TaxRates = { vat: null, aib: null };
const PACK = KITS["pack-electronique"].slug;
const BOT = KITS["steamy-bot-v1"].slug;
const ONE = [{ kitSlug: PACK, quantity: 1 }];

/** Parent avec un panier d'un kit, sans adresse par défaut, un enfant bénéficiaire possible. */
const achat = (surcharge: Partiel<Scenario> = {}) => scenario({ request: null, cart: ONE, ...surcharge });
const enAttente = (reference = "CMD-K2") => ({ order: { ...kitEnAttente(), reference } });

export const SCENARIOS_ACHAT_KITS = {
  "achat-panier-vide": achat({ cart: [] }),
  "achat-panier": achat({ cart: [{ kitSlug: PACK, quantity: 2 }, { kitSlug: BOT, quantity: 1 }] }),
  "achat-panier-sans-taxes": achat({ cart: ONE, rates: TAXES_OFF }),
  "achat-panier-kit-indisponible": achat({ soldOut: [PACK] }),
  "achat-panier-erreur": achat({ faults: { cartReadError: true } }),
  "achat-panier-erreur-ecriture": achat({ faults: { cartWriteError: true } }),
  "achat-ajout-epuise": achat({ cart: [], faults: { cartOutOfStock: true } }),
  "achat-adresse-enregistree": achat({ address: SAVED_ADDRESS }),
  "achat-sans-enfant": achat({ children: [] }),
  "achat-rupture-a-la-commande": achat({ address: SAVED_ADDRESS, faults: { outOfStock: true } }),
  "achat-zone-indisponible": achat({ address: SAVED_ADDRESS, faults: { zoneUnavailable: true } }),
  "achat-commande-erreur-serveur": achat({ address: SAVED_ADDRESS, faults: { orderServerError: true } }),
  "achat-reservation-depassee": achat({ address: SAVED_ADDRESS, faults: { orderExpiredOnPay: true } }),
  "achat-commande-deja-payee": achat({ address: SAVED_ADDRESS, faults: { orderAlreadyPaidOnPay: true } }),
  "achat-commande-en-attente": achat({ orders: [enAttente()] }),
} satisfies Record<string, Scenario>;
