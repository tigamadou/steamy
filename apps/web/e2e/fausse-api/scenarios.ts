import type { Schemas } from "@steamy/api-client";

import {
  COURSE,
  COURSE_WITH_KIT,
  courseRequest,
  DECIDED_AT,
  kitRequest,
  LEARNER_ME,
  MOBILE_MONEY,
  PARENT_ME,
  PARENT_PROFILE,
  SAVED_ADDRESS,
  type TaxRates,
} from "./fixtures.ts";

/**
 * Incidents que la fausse API sait provoquer à la demande d'un scénario. Ils rejouent les codes d'erreur du contrat
 * (`ErrorCodeEnum`) que le vrai prestataire ou la vraie base rendent difficiles à obtenir.
 */
export type Faults = {
  /** Lecture de la demande : 500. */
  readServerError?: boolean;
  /** Lecture de la demande : réponse lente (millisecondes), pour voir le squelette. */
  readDelayMs?: number;
  /** Création de la commande : `OUT_OF_STOCK`. */
  outOfStock?: boolean;
  /** Création de la commande : `DELIVERY_ZONE_UNAVAILABLE`. */
  zoneUnavailable?: boolean;
  /** Création de la commande : `PAYMENT_REQUEST_CLOSED` (la demande est alors réglée dans un autre onglet), une fois. */
  requestClosedOnOrder?: boolean;
  /** Premier paiement : `ORDER_EXPIRED` (réservation du kit dépassée). */
  orderExpiredOnPay?: boolean;
  /** Premier paiement : `ORDER_ALREADY_PAID` (commande réglée dans un autre onglet). */
  orderAlreadyPaidOnPay?: boolean;
  /** Paiement : `PAYMENT_IN_PROGRESS`. */
  paymentInProgress?: boolean;
  /** Paiement : `THROTTLED` avec `Retry-After`. */
  throttled?: number;
  /** Paiement : 500. */
  paymentServerError?: boolean;
  /** Paiement : `PAYMENT_REQUEST_CLOSED` (demande refusée dans un autre onglet). */
  requestClosedOnPay?: boolean;
  /** Paiement réussi, mais commande relue « remboursée » : paiement arrivé après le délai (C17). */
  latePayment?: boolean;
  /** Échec du paiement sans code qui établisse l'absence de débit : texte neutre. */
  neutralFailure?: boolean;
  /** Refus de la demande : `PAYMENT_REQUEST_CLOSED` (réglée ou annulée entre-temps). */
  declineClosed?: boolean;
  /** Refus de la demande : 500. */
  declineServerError?: boolean;
  /** Référentiel des réseaux Mobile Money : 500 à la première lecture seulement. */
  networksError?: boolean;
};

export type Scenario = {
  /** Utilisateur connecté (parent de la famille par défaut). */
  me: Schemas["Me"];
  /** Demande servie à `/parent/demandes/501`, ou `null` (404 : demande d'une autre famille). */
  request: Schemas["PaymentRequest"] | null;
  course: Schemas["CourseDetail"];
  profile: Schemas["ParentProfile"];
  /** Adresse de livraison enregistrée du parent, `null` si aucune. */
  address: Schemas["DeliveryAddress"] | null;
  rates: TaxRates;
  /** La demande a déjà une commande en attente (reprise du paiement). */
  pendingOrder: boolean;
  faults: Faults;
};

const BASE: Scenario = {
  me: PARENT_ME,
  request: courseRequest(),
  course: COURSE,
  profile: PARENT_PROFILE,
  address: null,
  rates: { vat: 18, aib: 1 },
  pendingOrder: false,
  faults: {},
};

const closed = (status: Schemas["PaymentRequest"]["status"], overrides: Partial<Schemas["PaymentRequest"]> = {}) =>
  courseRequest({ status, decidedAt: status === "expired" ? null : DECIDED_AT, ...overrides });

/**
 * Catalogue des scénarios : le nom est la fixture dont part chaque test (docs/tests/FIXTURES-FAUSSE-API.md). Un
 * scénario ne change qu'un point par rapport à `BASE`, pour que la fixture se lise d'un coup d'œil.
 */
export const SCENARIOS = {
  // Demande en attente : objets
  "parcours-en-attente": BASE,
  "parcours-avec-kit-requis": { ...BASE, course: COURSE_WITH_KIT },
  "parcours-paiement-prefere": { ...BASE, profile: { ...PARENT_PROFILE, mobileMoney: MOBILE_MONEY } },
  "parcours-sans-taxes": { ...BASE, request: courseRequest({}, { vat: null, aib: null }), rates: { vat: null, aib: null } },
  "kit-adresse-a-saisir": { ...BASE, request: kitRequest() },
  "kit-sans-taxes": { ...BASE, request: kitRequest({}, { vat: null, aib: null }), rates: { vat: null, aib: null } },
  "kit-adresse-enregistree": { ...BASE, request: kitRequest(), address: SAVED_ADDRESS },
  "kit-commande-en-attente": {
    ...BASE,
    request: kitRequest({ pendingOrderReference: "CMD-501" }),
    pendingOrder: true,
  },
  "evenement-en-attente": {
    ...BASE,
    request: courseRequest({
      kind: "event",
      course: null,
      items: [{ kitSlug: "", title: "Défi robots de Cotonou", unitPrice: 5000, quantity: 1 }],
    }),
  },
  // Demande close (lecture seule)
  "demande-payee": { ...BASE, request: closed("paid", { orderReference: "CMD-501" }) },
  "demande-payee-kit": { ...BASE, request: kitRequest({ status: "paid", decidedAt: DECIDED_AT, orderReference: "CMD-501" }) },
  "demande-refusee": { ...BASE, request: closed("declined", { declineReason: "On en reparle après les examens." }) },
  "demande-refusee-sans-motif": { ...BASE, request: closed("declined") },
  "demande-expiree": { ...BASE, request: closed("expired") },
  "demande-annulee": { ...BASE, request: closed("cancelled") },
  "demande-kit-expiree": { ...BASE, request: kitRequest({ status: "expired" }) },
  // Accès
  "autre-famille": { ...BASE, request: null },
  "session-apprenant": { ...BASE, me: LEARNER_ME },
  "erreur-serveur": { ...BASE, faults: { readServerError: true } },
  "chargement-lent": { ...BASE, faults: { readDelayMs: 2500 } },
  // Incidents à la commande et au paiement
  "kit-rupture-de-stock": { ...BASE, request: kitRequest(), faults: { outOfStock: true } },
  "kit-zone-indisponible": { ...BASE, request: kitRequest(), faults: { zoneUnavailable: true } },
  "kit-reservation-depassee": {
    ...BASE,
    request: kitRequest({ pendingOrderReference: "CMD-501" }),
    pendingOrder: true,
    faults: { orderExpiredOnPay: true },
  },
  "kit-commande-deja-payee": {
    ...BASE,
    request: kitRequest({ pendingOrderReference: "CMD-501" }),
    pendingOrder: true,
    faults: { orderAlreadyPaidOnPay: true },
  },
  "kit-demande-close-a-la-commande": { ...BASE, request: kitRequest(), faults: { requestClosedOnOrder: true } },
  "paiement-deja-en-cours": { ...BASE, faults: { paymentInProgress: true } },
  "paiement-trop-de-tentatives": { ...BASE, faults: { throttled: 45 } },
  "paiement-erreur-serveur": { ...BASE, faults: { paymentServerError: true } },
  "paiement-demande-close": { ...BASE, faults: { requestClosedOnOrder: true } },
  "paiement-demande-close-au-paiement": { ...BASE, faults: { requestClosedOnPay: true } },
  "paiement-tardif-rembourse": {
    ...BASE,
    request: kitRequest({ pendingOrderReference: "CMD-501" }),
    pendingOrder: true,
    faults: { latePayment: true },
  },
  "echec-sans-certitude-de-debit": { ...BASE, faults: { neutralFailure: true } },
  "refus-demande-close": { ...BASE, faults: { declineClosed: true } },
  "refus-erreur-serveur": { ...BASE, faults: { declineServerError: true } },
  "reseaux-indisponibles": { ...BASE, faults: { networksError: true } },
} satisfies Record<string, Scenario>;

export type ScenarioName = keyof typeof SCENARIOS;

export function isScenario(name: string): name is ScenarioName {
  return name in SCENARIOS;
}
