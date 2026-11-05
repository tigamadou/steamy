import type { Schemas } from "@steamy/api-client";

// Données typées par le contrat (`Schemas`) des tests de composants et de pages du back-office Finance. Les numéros y
// sont déjà masqués, comme l'API les renvoie : aucun numéro complet dans ces fixtures.

export const PAYMENT_ROW: Schemas["PaymentRow"] = {
  id: 1,
  createdAt: "2026-11-03T09:15:00Z",
  orderReference: "CMD-7001",
  merchantReference: "STY-7001-1",
  providerTransactionId: "4810001",
  payer: "Marie Adjovi",
  beneficiary: "Léa Adjovi",
  kind: "kit",
  country: "BJ",
  network: "mtn",
  maskedMsisdn: "01 ** ** ** 01",
  amount: 44000,
  currency: "XOF",
  status: "succeeded",
  providerStatus: "approved",
  failureCode: "",
  failureReason: "",
};

export const FAILED_ROW: Schemas["PaymentRow"] = {
  ...PAYMENT_ROW,
  id: 2,
  createdAt: "2026-11-04T07:30:00Z",
  orderReference: "CMD-7002",
  merchantReference: "STY-7002-2",
  providerTransactionId: null,
  payer: "Koffi Mensah",
  beneficiary: null,
  kind: "course",
  network: "moov",
  maskedMsisdn: "01 ** ** ** 02",
  amount: 15000,
  status: "failed",
  providerStatus: "",
  failureCode: "DECLINED",
  failureReason: "Solde insuffisant",
};

export const TOTALS: Schemas["PaymentTotals"] = { volume: 74000, count: 5, succeeded: 2, failed: 2, failureRate: 50 };

export function paymentPage(over: Partial<Schemas["PaymentPage"]> = {}): Schemas["PaymentPage"] {
  return { count: 2, next: null, previous: null, results: [PAYMENT_ROW, FAILED_ROW], totals: TOTALS, ...over };
}

export const COUNTRY_LIST: Schemas["Country"][] = [
  { id: 1, code: "BJ", label: "Bénin", flag: "🇧🇯", dialCode: "229", phoneFormat: "XX XX XX XX XX", phoneRegex: "^01[0-9]{8}$" },
  { id: 2, code: "TG", label: "Togo", flag: "🇹🇬", dialCode: "228", phoneFormat: "XX XX XX XX", phoneRegex: "^[0-9]{8}$" },
];

export const NETWORK_LIST: Schemas["PaymentNetwork"][] = [
  { id: 1, code: "mtn", label: "MTN Mobile Money", country: "BJ" },
  { id: 2, code: "moov", label: "Moov Money", country: "BJ" },
  { id: 3, code: "moov", label: "Moov Money", country: "TG" },
];

export const REFUND_SUMMARY_PENDING: Schemas["RefundSummary"] = {
  id: 1,
  createdAt: "2026-11-04T08:00:00Z",
  amount: 10000,
  reason: "Kit reçu défectueux",
  processed: false,
  processedAt: null,
  processedBy: null,
  reference: "",
};

export const REFUND_SUMMARY_DONE: Schemas["RefundSummary"] = {
  ...REFUND_SUMMARY_PENDING,
  id: 2,
  amount: 5000,
  reason: "Doublon",
  processed: true,
  processedAt: "2026-11-05T13:32:00Z",
  processedBy: "Fatou Kouassi",
  reference: "FDP-REM-0042",
};

export function paymentDetail(over: Partial<Schemas["PaymentDetail"]> = {}): Schemas["PaymentDetail"] {
  return {
    id: 1,
    createdAt: "2026-11-03T09:15:00Z",
    orderReference: "CMD-7001",
    merchantReference: "STY-7001-1",
    providerTransactionId: "4810001",
    payer: "Marie Adjovi",
    beneficiary: "Léa Adjovi",
    kind: "kit",
    country: "BJ",
    network: "mtn",
    maskedMsisdn: "01 ** ** ** 01",
    amount: 44000,
    currency: "XOF",
    status: "succeeded",
    providerStatus: "approved",
    failureCode: "",
    failureReason: "",
    provider: "fedapay",
    providerFees: 440,
    checkedAt: "2026-11-03T09:16:00Z",
    confirmedAt: "2026-11-03T09:16:00Z",
    refundable: 34000,
    order: {
      id: 7001,
      reference: "CMD-7001",
      kind: "kit",
      status: "paid",
      total: 44000,
      currency: "XOF",
      payer: "Marie Adjovi",
      beneficiary: "Léa Adjovi",
    },
    attempts: [],
    refunds: [REFUND_SUMMARY_PENDING],
    auditLog: [
      { id: 1, createdAt: "2026-11-03T09:16:00Z", action: "payment.confirmed", actor: null, target: "payment", data: {} },
      { id: 2, createdAt: "2026-11-04T08:00:00Z", action: "refund.requested", actor: "Fatou Kouassi", target: "payment", data: {} },
    ],
    ...over,
  };
}

export function backofficeRefund(over: Partial<Schemas["BackofficeRefund"]> = {}): Schemas["BackofficeRefund"] {
  return {
    id: 1,
    createdAt: "2026-11-04T08:00:00Z",
    amount: 10000,
    reason: "Kit reçu défectueux",
    processed: false,
    processedAt: null,
    processedBy: null,
    reference: "",
    paymentId: 1,
    orderReference: "CMD-7001",
    merchantReference: "STY-7001-1",
    providerTransactionId: "4810001",
    network: "mtn",
    maskedMsisdn: "01 ** ** ** 01",
    paymentAmount: 44000,
    payer: "Marie Adjovi",
    beneficiary: "Léa Adjovi",
    ...over,
  };
}

export function refundPage(over: Partial<Schemas["RefundPage"]> = {}): Schemas["RefundPage"] {
  return { count: 1, next: null, previous: null, results: [backofficeRefund()], ...over };
}
