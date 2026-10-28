import type { Schemas } from "@steamy/api-client";

import { fusion, type Partiel } from "./defauts.ts";
import { COURSE, courseRequest, PARENT_ME, PARENT_PROFILE, type TaxRates } from "./fixtures.ts";

/**
 * Incidents que la fausse API sait provoquer à la demande d'un scénario. Ils rejouent les codes d'erreur du contrat
 * (`ErrorCodeEnum`) que le vrai prestataire ou la vraie base rendent difficiles à obtenir. Chaque écran ajoute les siens.
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

/** Parent de la famille par défaut, demande de parcours en attente à 15 000 F CFA HT, TVA 18 % et AIB 1 %. */
export const BASE: Scenario = {
  me: PARENT_ME,
  request: courseRequest(),
  course: COURSE,
  profile: PARENT_PROFILE,
  address: null,
  rates: { vat: 18, aib: 1 },
  pendingOrder: false,
  faults: {},
};

/**
 * Un scénario ne dit que ce qui le distingue de `BASE` : `scenario({ faults: { outOfStock: true } })`. Les objets
 * imbriqués se fusionnent ; les tableaux et les `null` remplacent.
 */
export function scenario(surcharge: Partiel<Scenario> = {}): Scenario {
  return fusion<Scenario>(BASE, surcharge);
}
