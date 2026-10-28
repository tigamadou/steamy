import type { Schemas } from "@steamy/api-client";

import { accessOrder, fail, once, route, updateOrder, type Behaviour, type Context, type Instance } from "../contexte.ts";
import { apiError, CREATED_AT, DECIDED_AT, payment } from "../fixtures.ts";

// Paiement Mobile Money d'une commande, commun à la demande de paiement, au checkout invité et aux commandes du
// parent : initiation, interrogation du statut et issue (webhook simulé du prestataire).

const SERVER_ERROR = apiError("SERVER_ERROR", "Une erreur est survenue côté serveur.");

/** Règle la demande de paiement (réglée par le paiement, ou close par un autre onglet). */
export function close(instance: Instance, status: Schemas["PaymentRequest"]["status"], order?: Schemas["Order"] | null) {
  const request = instance.request;
  if (!request) return;
  Object.assign(request, {
    status,
    decidedAt: DECIDED_AT,
    pendingOrderReference: null,
    orderReference: status === "paid" ? (order?.reference ?? "CMD-501") : null,
  });
}

/** Comme le faux prestataire de la vraie stack : …01 réussit, …02 échoue, …03 reste en attente. */
export function paymentBehaviour(msisdn: string): Behaviour {
  if (msisdn.endsWith("02")) return "failure";
  if (msisdn.endsWith("03")) return "pending";
  return "success";
}

route("POST", /^\/api\/payments\/orders\/([\w-]+)\/payments\/$/, "invite", (context) => {
  const { instance, body, respond, match } = context;
  const { faults } = instance.scenario;
  const order = accessOrder(context, match[1]);
  if (faults.paymentServerError) return respond(500, SERVER_ERROR);
  if (faults.throttled) {
    return fail(respond, "THROTTLED", "Trop de tentatives.", { "Retry-After": String(faults.throttled) });
  }
  if (faults.paymentInProgress) return fail(respond, "PAYMENT_IN_PROGRESS");
  if (faults.requestClosedOnPay) {
    close(instance, "declined");
    return fail(respond, "PAYMENT_REQUEST_CLOSED", "Cette demande n'est plus en attente.");
  }
  if (once(instance, "order-expired", faults.orderExpiredOnPay)) {
    instance.store.delete(match[1]);
    instance.order = null;
    if (instance.request) instance.request.pendingOrderReference = null;
    return fail(respond, "ORDER_EXPIRED", "Cette commande a expiré.");
  }
  if (once(instance, "order-paid", faults.orderAlreadyPaidOnPay)) {
    close(instance, "paid", order);
    return fail(respond, "ORDER_ALREADY_PAID", "Cette commande est déjà payée.");
  }
  if (!order) return fail(respond, "NOT_FOUND", "Introuvable.");
  const id = 9000 + instance.payments.size + 1;
  const created = payment(id, order, "pending", body as Schemas["PaymentCreateRequest"]);
  instance.payments.set(id, { payment: created, behaviour: paymentBehaviour(String(body?.msisdn ?? "")) });
  respond(201, created);
});

route("GET", /^\/api\/payments\/payments\/(\d+)\/$/, "invite", (context: Context) => {
  const { instance, match, respond } = context;
  const entry = instance.payments.get(Number(match[1]));
  if (!entry || !accessOrder(context, entry.payment.orderReference)) return fail(respond, "NOT_FOUND", "Introuvable.");
  // L'issue arrive à la première interrogation, comme le webhook du prestataire (S9)
  resolve(instance, entry);
  respond(200, entry.payment);
});

/** Applique l'issue du paiement : commande et demande réglées (ou remboursée, paiement tardif), ou échec. */
export function resolve(instance: Instance, entry: { payment: Schemas["Payment"]; behaviour: Behaviour }) {
  const { faults } = instance.scenario;
  if (entry.payment.status !== "pending") return;
  if (entry.behaviour === "success") {
    entry.payment = { ...entry.payment, status: "succeeded", confirmedAt: CREATED_AT };
    const order = instance.store.get(entry.payment.orderReference)?.order;
    if (order) {
      updateOrder(instance, { ...order, status: faults.latePayment ? "refunded" : "paid", paidAt: CREATED_AT });
      close(instance, "paid", order);
    }
  } else if (entry.behaviour === "failure") {
    entry.payment = {
      ...entry.payment,
      status: "failed",
      failureCode: faults.neutralFailure ? "AMOUNT_MISMATCH" : "DECLINED",
      failureReason: "Solde insuffisant.",
    };
  }
}
