import type { Schemas } from "@steamy/api-client";

import { BASE, scenario, type Scenario } from "../base.ts";
import { fail, once, onInstance, putOrder, route, sleep, type Context, type Instance } from "../contexte.ts";
import {
  apiError,
  COURSE_WITH_KIT,
  courseOrder,
  courseRequest,
  DECIDED_AT,
  kitOrder,
  kitRequest,
  LEARNER_ME,
  MOBILE_MONEY,
  PARENT_PROFILE,
  REQUEST_ID,
  SAVED_ADDRESS,
  ZONES,
} from "../fixtures.ts";
import { close } from "./paiement.ts";

// Demande de paiement du parent (`/parent/demandes/[id]`) : lecture, refus, création de la commande de la demande.

const SERVER_ERROR = apiError("SERVER_ERROR", "Une erreur est survenue côté serveur.");

route("GET", /^\/api\/catalog\/courses\/([\w-]+)\/$/, true, ({ instance, respond }) =>
  respond(200, instance.scenario.course),
);

route("GET", /^\/api\/payments\/payment-requests\/(\d+)\/$/, true, async ({ instance, match, respond }) => {
  const { faults } = instance.scenario;
  if (faults.readDelayMs) await sleep(faults.readDelayMs);
  if (faults.readServerError) return respond(500, SERVER_ERROR);
  if (!instance.request || Number(match[1]) !== REQUEST_ID) {
    return fail(respond, "NOT_FOUND", "Demande introuvable.");
  }
  respond(200, instance.request);
});

route("POST", /^\/api\/payments\/payment-requests\/(\d+)\/decline\/$/, true, ({ instance, body, respond }) => {
  const { faults } = instance.scenario;
  if (faults.declineServerError) return respond(500, SERVER_ERROR);
  if (!instance.request) return fail(respond, "NOT_FOUND", "Demande introuvable.");
  if (faults.declineClosed || instance.request.status !== "pending") {
    close(instance, "cancelled");
    return fail(respond, "PAYMENT_REQUEST_CLOSED", "Cette demande n'est plus en attente.");
  }
  close(instance, "declined");
  instance.request.declineReason = String(body?.reason ?? "");
  respond(200, instance.request);
});

/** Création de la commande d'une demande de paiement (`POST payments/orders/` avec `paymentRequestId`). */
export function createOrderOfRequest({ instance, body, respond }: Context) {
  const { faults } = instance.scenario;
  if (!instance.request || instance.request.status !== "pending") {
    return fail(respond, "PAYMENT_REQUEST_CLOSED", "Cette demande n'est plus en attente.");
  }
  if (once(instance, "request-closed", faults.requestClosedOnOrder)) {
    close(instance, "paid");
    return fail(respond, "PAYMENT_REQUEST_CLOSED", "Cette demande n'est plus en attente.");
  }
  if (faults.outOfStock) return fail(respond, "OUT_OF_STOCK", "Ce kit n'est plus disponible.");
  if (faults.zoneUnavailable) {
    return fail(respond, "DELIVERY_ZONE_UNAVAILABLE", "Cette zone n'est plus desservie.");
  }
  respond(201, orderOfRequest(instance, body?.deliveryAddress));
}

function orderOfRequest(instance: Instance, address?: Schemas["DeliveryAddressInputRequest"]): Schemas["OrderCreated"] {
  const { request, scenario: current } = instance;
  instance.orders += 1;
  const reference = `CMD-501-${instance.orders}`;
  const zone = ZONES.find((candidate) => candidate.id === address?.zoneId) ?? ZONES[0];
  const order =
    request?.kind === "kit" && address
      ? kitOrder(reference, zone, address, current.rates)
      : courseOrder(reference, current.rates);
  putOrder(instance, order);
  if (request) request.pendingOrderReference = reference;
  return { ...order, guestToken: null };
}

// Une demande qui a déjà une commande en attente (reprise du paiement) en démarre avec elle
onInstance((instance) => {
  const { scenario: current, request, address } = instance;
  if (!current.pendingOrder || !request) return;
  putOrder(
    instance,
    request.kind === "kit"
      ? kitOrder("CMD-501", ZONES[0], address ?? { zoneId: 1, recipientName: "Marie Adjovi", city: "Cotonou", district: "Fidjrossè", addressLine: "Rue 12, villa verte" }, current.rates)
      : courseOrder("CMD-501", current.rates),
  );
});

const closed = (status: Schemas["PaymentRequest"]["status"], overrides: Partial<Schemas["PaymentRequest"]> = {}) =>
  courseRequest({ status, decidedAt: status === "expired" ? null : DECIDED_AT, ...overrides });

const TAXES_OFF = { vat: null, aib: null };

/** Fixtures de l'écran : le nom dit l'état, un scénario ne change qu'un point par rapport à `BASE`. */
export const SCENARIOS_DEMANDE_PAIEMENT = {
  // Demande en attente : objets
  "parcours-en-attente": BASE,
  "parcours-avec-kit-requis": scenario({ course: COURSE_WITH_KIT }),
  "parcours-paiement-prefere": scenario({ profile: { ...PARENT_PROFILE, mobileMoney: MOBILE_MONEY } }),
  "parcours-sans-taxes": scenario({ request: courseRequest({}, TAXES_OFF), rates: TAXES_OFF }),
  "kit-adresse-a-saisir": scenario({ request: kitRequest() }),
  "kit-sans-taxes": scenario({ request: kitRequest({}, TAXES_OFF), rates: TAXES_OFF }),
  "kit-adresse-enregistree": scenario({ request: kitRequest(), address: SAVED_ADDRESS }),
  "kit-commande-en-attente": scenario({ request: kitRequest({ pendingOrderReference: "CMD-501" }), pendingOrder: true }),
  "evenement-en-attente": scenario({
    request: courseRequest({
      kind: "event",
      course: null,
      items: [{ kitSlug: "", title: "Défi robots de Cotonou", unitPrice: 5000, quantity: 1 }],
    }),
  }),
  // Demande close (lecture seule)
  "demande-payee": scenario({ request: closed("paid", { orderReference: "CMD-501" }) }),
  "demande-payee-kit": scenario({
    request: kitRequest({ status: "paid", decidedAt: DECIDED_AT, orderReference: "CMD-501" }),
    orders: [{ order: kitOrder("CMD-501", ZONES[0], SAVED_ADDRESS, undefined, { status: "paid", paidAt: DECIDED_AT }) }],
  }),
  "demande-refusee": scenario({ request: closed("declined", { declineReason: "On en reparle après les examens." }) }),
  "demande-refusee-sans-motif": scenario({ request: closed("declined") }),
  "demande-expiree": scenario({ request: closed("expired") }),
  "demande-annulee": scenario({ request: closed("cancelled") }),
  "demande-kit-expiree": scenario({ request: kitRequest({ status: "expired" }) }),
  // Accès
  "autre-famille": scenario({ request: null }),
  "session-apprenant": scenario({ me: LEARNER_ME }),
  "erreur-serveur": scenario({ faults: { readServerError: true } }),
  "chargement-lent": scenario({ faults: { readDelayMs: 2500 } }),
  // Incidents à la commande et au paiement
  "kit-rupture-de-stock": scenario({ request: kitRequest(), faults: { outOfStock: true } }),
  "kit-zone-indisponible": scenario({ request: kitRequest(), faults: { zoneUnavailable: true } }),
  "kit-reservation-depassee": scenario({
    request: kitRequest({ pendingOrderReference: "CMD-501" }),
    pendingOrder: true,
    faults: { orderExpiredOnPay: true },
  }),
  "kit-commande-deja-payee": scenario({
    request: kitRequest({ pendingOrderReference: "CMD-501" }),
    pendingOrder: true,
    faults: { orderAlreadyPaidOnPay: true },
  }),
  "kit-demande-close-a-la-commande": scenario({ request: kitRequest(), faults: { requestClosedOnOrder: true } }),
  "paiement-deja-en-cours": scenario({ faults: { paymentInProgress: true } }),
  "paiement-trop-de-tentatives": scenario({ faults: { throttled: 45 } }),
  "paiement-erreur-serveur": scenario({ faults: { paymentServerError: true } }),
  "paiement-demande-close": scenario({ faults: { requestClosedOnOrder: true } }),
  "paiement-demande-close-au-paiement": scenario({ faults: { requestClosedOnPay: true } }),
  "paiement-tardif-rembourse": scenario({
    request: kitRequest({ pendingOrderReference: "CMD-501" }),
    pendingOrder: true,
    faults: { latePayment: true },
  }),
  "echec-sans-certitude-de-debit": scenario({ faults: { neutralFailure: true } }),
  "refus-demande-close": scenario({ faults: { declineClosed: true } }),
  "refus-erreur-serveur": scenario({ faults: { declineServerError: true } }),
  "reseaux-indisponibles": scenario({ faults: { networksError: true } }),
} satisfies Record<string, Scenario>;
