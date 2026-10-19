import type { Schemas } from "@steamy/api-client";

import type { PaymentRequest } from "@/features/unlock/types";

// Données factices de WPD15 (formes du client généré), d'après le jeu D2 : Léa Adjovi demande à Marie.

export const CHILD = {
  firstName: "Léa",
  lastName: "Adjovi",
  age: 13,
  schoolGrade: { id: 4, code: "4e", label: "4ᵉ" },
  avatar: { id: 1, code: "renard", label: "Renard", emoji: "🦊", color: "primary-500" },
};

export function paymentRequest(overrides: Partial<PaymentRequest> = {}): PaymentRequest {
  return {
    id: 12,
    kind: "course",
    status: "pending",
    course: { slug: "capteurs-electroniques", title: "Capteurs électroniques" },
    items: [],
    amount: 18000,
    learner: { id: 7, firstName: "Léa" },
    parentFirstName: "Marie",
    createdAt: "2026-10-13T08:00:00Z",
    expiresAt: "2026-10-20T08:00:00Z",
    lastSentAt: "2026-10-13T08:00:00Z",
    nextResendAt: null,
    decidedAt: null,
    declineReason: "",
    orderReference: null,
    pendingOrderReference: null,
    ...overrides,
  };
}

export const KIT_REQUEST = paymentRequest({
  kind: "kit",
  course: null,
  items: [
    { kitSlug: "steamy-bot", title: "Steamy Bot v1", unitPrice: 35000, quantity: 1 },
    { kitSlug: "capteurs", title: "Pack capteurs", unitPrice: 5000, quantity: 2 },
  ],
  amount: 45000,
});

export function order(overrides: Partial<Schemas["Order"]> = {}): Schemas["Order"] {
  return {
    reference: "CMD-ABC123",
    kind: "kit",
    status: "pending",
    shippingStatus: "preparing",
    subtotal: 45000,
    shippingFee: 1500,
    total: 46500,
    currency: "XOF",
    items: [
      {
        id: 1,
        title: "Steamy Bot v1",
        courseSlug: "",
        kitSlug: "steamy-bot",
        eventSlug: "",
        unitPrice: 35000,
        quantity: 1,
        total: 35000,
      },
    ],
    beneficiary: { id: 7, firstName: "Léa" },
    deliveryZone: { id: 2, name: "Cotonou", delayLabel: "3 à 5 jours" },
    expiresAt: "2026-10-19T09:30:00Z",
    paidAt: null,
    createdAt: "2026-10-19T09:00:00Z",
    deliveryAddress: {
      recipientName: "Marie Adjovi",
      phone: "",
      country: "BJ",
      zone: "Cotonou",
      city: "Cotonou",
      district: "Cocotomey",
      addressLine: "Rue 12.045",
    },
    kitCodes: [],
    invoice: null,
    ...overrides,
  };
}

export function payment(overrides: Partial<Schemas["Payment"]> = {}): Schemas["Payment"] {
  return {
    id: 31,
    orderReference: "CMD-ABC123",
    status: "pending",
    country: "BJ",
    network: "mtn",
    msisdnMasked: "+229 01 •• •• 01",
    amount: 18000,
    currency: "XOF",
    failureCode: "",
    failureReason: "",
    createdAt: "2026-10-19T09:00:00Z",
    confirmedAt: null,
    ...overrides,
  } as Schemas["Payment"];
}

export const ADDRESS: Schemas["DeliveryAddress"] = {
  zoneId: 2,
  zone: { id: 2, country: "BJ", name: "Cotonou", fee: 1500, delayLabel: "3 à 5 jours" },
  recipientName: "Marie Adjovi",
  city: "Cotonou",
  district: "Cocotomey",
  addressLine: "Rue 12.045",
};

export const COUNTRIES = [
  { code: "BJ", label: "Bénin", dialCode: "229", phoneFormat: "XX XX XX XX XX", phoneRegex: "^01[0-9]{8}$" },
];

export const NETWORKS = [
  { id: 1, code: "mtn", label: "MTN Mobile Money", country: "BJ" },
  { id: 2, code: "moov", label: "Moov Money", country: "BJ" },
];
