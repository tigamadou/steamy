import type { Schemas } from "@steamy/api-client";

import { scenario, type Scenario } from "../base.ts";
import { fail, route, sleep } from "../contexte.ts";
import type { Partiel } from "../defauts.ts";
import {
  apiError,
  courseOrder,
  eventOrder,
  KITS,
  kitsOrder,
  MOBILE_MONEY,
  PARENT_PROFILE,
  RESERVATION_ACTIVE,
  SAVED_ADDRESS,
  ZONES,
  type TaxRates,
} from "../fixtures.ts";

// Commandes du parent (`/parent/commandes`, `/parent/commandes/[reference]`) : liste filtrée et paginée, suivi, facture.
// Les routes de lecture d'une commande et de la facture sont celles de `commandes.ts` ; ici la liste et les scénarios.

const PAGE_SIZE = 10;

route("GET", /^\/api\/payments\/orders\/$/, true, async ({ instance, url, respond }) => {
  const { faults } = instance.scenario;
  if (faults.ordersListDelayMs) await sleep(faults.ordersListDelayMs);
  if (faults.ordersListError) return respond(500, apiError("SERVER_ERROR", "Une erreur est survenue côté serveur."));
  const status = url.searchParams.get("status");
  const page = Number(url.searchParams.get("page") ?? 1);
  const pageSize = Number(url.searchParams.get("pageSize") ?? PAGE_SIZE);
  // Les commandes du payeur seulement : ni celles d'une autre famille, ni celles d'un invité
  const owned = [...instance.store.values()].filter((entry) => !entry.foreign && entry.token === null).map((entry) => entry.order);
  const matching = owned.filter((order) => !status || order.status === status);
  const results = matching.slice((page - 1) * pageSize, page * pageSize);
  if (results.length === 0 && page > 1) return fail(respond, "NOT_FOUND", "Page inconnue.");
  respond(200, {
    count: matching.length,
    next: page * pageSize < matching.length ? `${url.origin}${url.pathname}?page=${page + 1}` : null,
    previous: page > 1 ? `${url.origin}${url.pathname}?page=${page - 1}` : null,
    results,
  } satisfies Schemas["PaginatedOrderList"]);
});

const RATES: TaxRates = { vat: 18, aib: 1 };
const TAXES_OFF: TaxRates = { vat: null, aib: null };
const PACK = KITS["pack-electronique"];
const day = (iso: string) => ({ createdAt: new Date(iso).toISOString() });
const paidAt = (iso: string) => ({ status: "paid" as const, paidAt: new Date(iso).toISOString() });
const INVOICE_READY = { number: "FAC-2026-000011", pdfStatus: "ready" as const };

/** Commande de kit de Léa, payée, avec ses trois Kit Codes (à utiliser, utilisé, révoqué). */
export const kitPayee = (overrides: Partiel<Schemas["Order"]> = {}, rates: TaxRates = RATES) =>
  kitsOrder("CMD-K1", [{ kit: PACK, quantity: 1 }], ZONES[0], SAVED_ADDRESS, rates, {
    ...day("2026-10-18T10:00:00+01:00"),
    ...paidAt("2026-10-18T10:05:00+01:00"),
    invoice: INVOICE_READY,
    kitCodes: [
      { code: "STEAMY-AB12-CD34", kitSlug: PACK.slug, redeemed: false, revoked: false },
      { code: "STEAMY-EF56-GH78", kitSlug: PACK.slug, redeemed: true, revoked: false },
      { code: "STEAMY-JK90-LM12", kitSlug: PACK.slug, redeemed: false, revoked: true },
    ],
    ...overrides,
  });
export const parcoursPaye = (overrides: Partiel<Schemas["Order"]> = {}, rates: TaxRates = RATES) =>
  courseOrder("CMD-C1", rates, { ...day("2026-10-15T09:00:00+01:00"), ...paidAt("2026-10-15T09:03:00+01:00"), invoice: { number: "FAC-2026-000009", pdfStatus: "ready" }, ...overrides });
export const evenementPaye = (overrides: Partiel<Schemas["Order"]> = {}, rates: TaxRates = RATES) =>
  eventOrder("CMD-E1", rates, { ...day("2026-10-12T16:00:00+01:00"), ...paidAt("2026-10-12T16:02:00+01:00"), invoice: { number: "FAC-2026-000007", pdfStatus: "ready" }, ...overrides });
export const kitEnAttente = (overrides: Partiel<Schemas["Order"]> = {}, rates: TaxRates = RATES) =>
  kitsOrder("CMD-K2", [{ kit: PACK, quantity: 1 }], ZONES[0], SAVED_ADDRESS, rates, { ...day("2026-10-20T08:50:00+01:00"), expiresAt: RESERVATION_ACTIVE, ...overrides });
export const kitAnnule = () =>
  kitsOrder("CMD-K3", [{ kit: PACK, quantity: 1 }], ZONES[0], SAVED_ADDRESS, RATES, { ...day("2026-10-10T08:00:00+01:00"), status: "cancelled" });
export const parcoursRembourse = () =>
  courseOrder("CMD-C2", RATES, { ...day("2026-10-08T08:00:00+01:00"), ...paidAt("2026-10-08T08:04:00+01:00"), status: "refunded" });
/** Commande payée par un autre parent : jamais listée ni lisible. */
export const COMMANDE_AUTRE_FAMILLE = "CMD-AUTRE";
const autreFamille = () => kitsOrder(COMMANDE_AUTRE_FAMILLE, [{ kit: PACK, quantity: 1 }], ZONES[0], SAVED_ADDRESS, RATES, { ...paidAt("2026-10-11T08:04:00+01:00"), invoice: INVOICE_READY });

const owned = (...orders: Schemas["Order"][]) => orders.map((order) => ({ order }));
const toutes = [kitPayee(), parcoursPaye(), evenementPaye(), kitEnAttente(), kitAnnule(), parcoursRembourse()];

const parent = (surcharge: Partiel<Scenario> = {}) =>
  scenario({ request: null, address: SAVED_ADDRESS, orders: [...owned(...toutes), { order: autreFamille(), foreign: true }], ...surcharge });

/** Douze commandes de parcours payées (plus récentes d'abord), pour la pagination par dix. */
const nombreuses = Array.from({ length: 12 }, (_, index) => {
  const n = String(index + 1).padStart(2, "0");
  return courseOrder(`CMD-N${n}`, RATES, { ...day(`2026-09-${String(index + 1).padStart(2, "0")}T09:00:00+01:00`), ...paidAt(`2026-09-${String(index + 1).padStart(2, "0")}T09:03:00+01:00`) });
}).reverse();

export const SCENARIOS_COMMANDES_PARENT = {
  "commandes-parent": parent(),
  "commandes-vide": parent({ orders: [] }),
  "commandes-nombreuses": parent({ orders: owned(...nombreuses) }),
  "commandes-chargement-lent": parent({ faults: { ordersListDelayMs: 2500 } }),
  "commandes-erreur-serveur": parent({ faults: { ordersListError: true } }),
  "commandes-facture-en-preparation": parent({ orders: owned(kitPayee({ invoice: { number: "FAC-2026-000011", pdfStatus: "pending" } })) }),
  "commandes-sans-taxes": parent({ rates: TAXES_OFF, orders: owned(kitPayee({}, TAXES_OFF), parcoursPaye({}, TAXES_OFF)) }),
  "commande-kit-expediee": parent({ orders: owned(kitPayee({ shippingStatus: "shipped" })) }),
  "commande-kit-livree": parent({ orders: owned(kitPayee({ shippingStatus: "delivered" })) }),
  "commande-sans-code": parent({ orders: owned(kitPayee({ kitCodes: [] })) }),
  "commande-en-attente-paiement-prefere": parent({ profile: { ...PARENT_PROFILE, mobileMoney: MOBILE_MONEY }, orders: owned(kitEnAttente()) }),
  "commande-en-attente-trop-de-tentatives": parent({ orders: owned(kitEnAttente()), faults: { throttled: 45 } }),
  "commande-en-attente-tardive": parent({ orders: owned(kitEnAttente()), faults: { latePayment: true } }),
  "commande-chargement-lent": parent({ faults: { orderReadDelayMs: 2500 } }),
  "commande-erreur-lecture": parent({ faults: { orderReadError: true } }),
} satisfies Record<string, Scenario>;
