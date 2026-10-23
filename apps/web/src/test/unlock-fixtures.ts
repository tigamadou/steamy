import type { Schemas } from "@steamy/api-client";

import type { PaymentRequest } from "@/features/unlock/types";

/** Demande de paiement de Léa à Marie, au format de `payments/payment-requests/{id}/` (statuts rétablis). */
export function paymentRequest(overrides: Partial<PaymentRequest> = {}): PaymentRequest {
  return {
    id: 12,
    kind: "course",
    status: "pending",
    course: { slug: "capteurs-electroniques", title: "Capteurs électroniques" },
    items: [],
    amount: 18000,
    taxes: [],
    total: 18000,
    learner: { id: 3, firstName: "Léa" },
    parentFirstName: "Marie",
    createdAt: "2026-10-13T09:00:00Z",
    expiresAt: "2026-10-20T09:00:00Z",
    lastSentAt: "2026-10-13T09:00:00Z",
    nextResendAt: "2026-10-14T09:00:00Z",
    decidedAt: null,
    declineReason: "",
    orderReference: null,
    pendingOrderReference: null,
    ...overrides,
  };
}

/** Commande vue par l'apprenant bénéficiaire (WD14). */
export function order(overrides: Partial<Schemas["Order"]> = {}): Schemas["Order"] {
  return {
    reference: "STM-7K2Q9",
    kind: "course",
    status: "paid",
    shippingStatus: "preparing",
    subtotal: 18000,
    shippingFee: 0,
    taxes: [],
    total: 18000,
    currency: "XOF",
    items: [
      {
        id: 1,
        title: "Capteurs électroniques",
        courseSlug: "capteurs-electroniques",
        kitSlug: "",
        eventSlug: "",
        unitPrice: 18000,
        quantity: 1,
        total: 18000,
      },
    ],
    beneficiary: { id: 3, firstName: "Léa" },
    deliveryZone: null,
    expiresAt: "2026-10-13T09:30:00Z",
    paidAt: "2026-10-13T09:05:00Z",
    createdAt: "2026-10-13T09:00:00Z",
    deliveryAddress: null,
    kitCodes: [],
    invoice: null,
    ...overrides,
  };
}

export function ok<T>(data: T) {
  return { data, error: undefined, response: new Response(null, { status: 200 }) };
}
