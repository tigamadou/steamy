import type { Schemas } from "@steamy/api-client";

import { scenario, type Scenario } from "../base.ts";
import { KITS, kitsOrder, LEARNER_ME, RESERVATION_ACTIVE, ZONES } from "../fixtures.ts";
import type { Partiel } from "../defauts.ts";

// Checkout de l'invité (`/boutique/panier`, `/boutique/commande/…`, `/boutique/commandes/<référence>`) : visiteur sans
// compte (`me: null`), panier dans son navigateur (le test le pose), commande lue avec le jeton de son lien SMS.
// Les routes sont celles de `commandes.ts`, `paiement.ts` et `boutique.ts`.

/** Jeton d'accès de la commande de départ des scénarios « commande en attente / payée… ». */
export const GUEST_TOKEN = "jeton-invite-test";
export const GUEST_ORDER = "CMD-INV-1";

const TAXES_OFF = { vat: null, aib: null };
const TOKEN = { token: GUEST_TOKEN };

/** Adresse de la commande de départ : celle que l'invité a saisie à la livraison. */
const ADDRESS = { zoneId: 2, recipientName: "Awa Invitée", phone: "+22901971234002", city: "Porto-Novo", district: "Ouando", addressLine: "Près du marché" };

/** Commande de kits de l'invité (Pack Électronique × 1, Porto-Novo), en attente et réservée sauf surcharge. */
export function guestOrder(overrides: Partiel<Schemas["Order"]> = {}, rates = { vat: 18 as number | null, aib: 1 as number | null }): Schemas["Order"] {
  return kitsOrder(GUEST_ORDER, [{ kit: KITS["pack-electronique"], quantity: 1 }], ZONES[1], ADDRESS, rates, {
    beneficiary: null,
    expiresAt: RESERVATION_ACTIVE,
    ...overrides,
  });
}

export const paidGuestOrder = (overrides: Partiel<Schemas["Order"]> = {}) =>
  guestOrder({ status: "paid", paidAt: "2026-10-20T08:15:00.000Z", invoice: { number: "FAC-2026-000001", pdfStatus: "ready" }, ...overrides });

/** Visiteur sans compte, panier prêt à commander. */
const invite = (surcharge: Partiel<Scenario> = {}) => scenario({ me: null, request: null, ...surcharge });
/** Invité qui a atteint le paiement : sa commande est en attente et réservée. */
const enAttente = (surcharge: Partiel<Scenario> = {}) => invite({ orders: [{ order: guestOrder(), ...TOKEN }], ...surcharge });
const avecCommande = (order: Schemas["Order"], surcharge: Partiel<Scenario> = {}) =>
  invite({ orders: [{ order, ...TOKEN }], ...surcharge });

export const SCENARIOS_CHECKOUT_INVITE = {
  // Panier et coordonnées
  "invite-panier": invite(),
  "invite-kit-indisponible": invite({ soldOut: ["pack-electronique"] }),
  "invite-kit-retire": invite({ withdrawn: ["steamy-bot-v1"] }),
  "invite-kits-retires": invite({ withdrawn: ["pack-electronique", "steamy-bot-v1"] }),
  "invite-erreur-lecture-kit": invite({ faults: { kitReadError: true } }),
  "invite-session-apprenant": invite({ me: LEARNER_ME }),
  // Livraison
  "invite-zones-erreur": invite({ faults: { zonesError: true } }),
  "invite-adresse-refusee": invite({ faults: { deliveryAddressRefused: "Cette zone n'est pas desservie pour cette adresse." } }),
  "invite-rupture-a-la-commande": invite({ faults: { outOfStock: true } }),
  "invite-zone-indisponible": invite({ faults: { zoneUnavailable: true } }),
  "invite-erreur-commande": invite({ faults: { orderServerError: true } }),
  // Paiement
  "invite-commande-en-attente": enAttente(),
  "invite-commande-sans-taxes": avecCommande(guestOrder({}, TAXES_OFF), { rates: TAXES_OFF }),
  "invite-commande-introuvable": invite(),
  "invite-commande-deja-payee": avecCommande(paidGuestOrder()),
  "invite-commande-expiree": avecCommande(guestOrder({ status: "cancelled" })),
  "invite-paiement-erreur-lecture": enAttente({ faults: { orderReadError: true } }),
  "invite-paiement-lent": enAttente({ faults: { orderReadDelayMs: 2500 } }),
  "invite-reseaux-indisponibles": enAttente({ faults: { networksError: true } }),
  "invite-paiement-reservation-depassee": enAttente({ faults: { orderExpiredOnPay: true } }),
  "invite-paiement-deja-paye": enAttente({ faults: { orderAlreadyPaidOnPay: true } }),
  "invite-paiement-trop-de-tentatives": enAttente({ faults: { throttled: 45 } }),
  "invite-paiement-erreur-serveur": enAttente({ faults: { paymentServerError: true } }),
  "invite-paiement-deja-en-cours": enAttente({ faults: { paymentInProgress: true } }),
  "invite-paiement-tardif-rembourse": enAttente({ faults: { latePayment: true } }),
  "invite-echec-sans-certitude-de-debit": enAttente({ faults: { neutralFailure: true } }),
  // Confirmation et suivi
  "invite-commande-payee": avecCommande(paidGuestOrder()),
  "invite-commande-payee-sans-taxes": avecCommande(paidGuestOrder({ taxes: [], total: 25000 }), { rates: TAXES_OFF }),
  "invite-commande-expediee": avecCommande(paidGuestOrder({ shippingStatus: "shipped" })),
  "invite-commande-livree": avecCommande(paidGuestOrder({ shippingStatus: "delivered" })),
  "invite-recu-pas-pret": avecCommande(paidGuestOrder({ invoice: { number: "FAC-2026-000001", pdfStatus: "pending" } }), { faults: { invoiceNotReady: true } }),
  "invite-recu-erreur": avecCommande(paidGuestOrder(), { faults: { invoiceServerError: true } }),
  "invite-sans-facture": avecCommande(paidGuestOrder({ invoice: null })),
  "invite-commande-annulee": avecCommande(guestOrder({ status: "cancelled" })),
  "invite-commande-remboursee": avecCommande(paidGuestOrder({ status: "refunded" })),
  "invite-suivi-erreur": avecCommande(paidGuestOrder(), { faults: { orderReadError: true } }),
  "invite-suivi-lent": avecCommande(paidGuestOrder(), { faults: { orderReadDelayMs: 2500 } }),
} satisfies Record<string, Scenario>;
