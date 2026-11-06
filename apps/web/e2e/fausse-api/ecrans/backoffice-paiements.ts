import type { Schemas } from "@steamy/api-client";

import { scenario, type Scenario } from "../base.ts";
import { fail, onInstance, route, type Context, type Instance } from "../contexte.ts";
import type { Partiel } from "../defauts.ts";
import { apiError, backofficePayment, backofficeRefund, STAFF } from "../fixtures.ts";

// Back-office Finance : paiements, remboursements et « À traiter » de la vue d'ensemble (`/backoffice/paiements`,
// `/backoffice/paiements/[id]`, `/backoffice/remboursements`). Les montants, statuts et totaux sont calculés ici, comme
// l'API les renvoie : le front n'en calcule aucun. État par instance : un remboursement demandé apparaît ensuite dans
// la liste, un remboursement marqué fait passe en « traités », une revérification d'un paiement en attente le règle.

const PAGE_SIZE = 25;
const FINANCE_GROUPS = ["Finance", "Super-admin"];

type Payment = Schemas["PaymentDetail"];
type Refund = Schemas["BackofficeRefund"];
type State = { payments: Payment[]; refunds: Refund[]; audit: number; nextRefund: number };

const states = new WeakMap<Instance, State>();

onInstance((instance) => {
  const { payments, refunds } = instance.scenario.backoffice;
  states.set(instance, {
    payments: structuredClone(payments),
    refunds: structuredClone(refunds),
    audit: 1000,
    nextRefund: refunds.reduce((max, refund) => Math.max(max, refund.id), 0) + 1,
  });
});

const state = (instance: Instance): State => states.get(instance) as State;
const sum = (refunds: Refund[]) => refunds.reduce((total, refund) => total + refund.amount, 0);

/** L'API refait le contrôle du groupe à chaque requête : Finance et Super-admin seulement. */
function finance({ instance, respond }: Context): boolean {
  const groups = instance.scenario.me?.staffGroups ?? [];
  if (groups.some((group) => FINANCE_GROUPS.includes(group))) return true;
  fail(respond, "PERMISSION_DENIED", "Vous n'avez pas la permission d'effectuer cette action.");
  return false;
}

function detail(current: State, payment: Payment): Payment {
  const refunds = current.refunds.filter((refund) => refund.paymentId === payment.id);
  return {
    ...payment,
    refundable: payment.status === "succeeded" ? Math.max(payment.amount - sum(refunds), 0) : 0,
    attempts: current.payments
      .filter((other) => other.orderReference === payment.orderReference && other.id !== payment.id)
      .map(({ id, createdAt, merchantReference, providerTransactionId, status, providerStatus, failureCode, amount }) => ({
        id,
        createdAt,
        merchantReference,
        providerTransactionId,
        status,
        providerStatus,
        failureCode,
        amount,
      })),
    refunds: refunds.map(({ id, createdAt, amount, reason, processed, processedAt, processedBy, reference }) => ({
      id,
      createdAt,
      amount,
      reason,
      processed,
      processedAt,
      processedBy,
      reference,
    })),
    auditLog: [...payment.auditLog].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
  };
}

function row(payment: Payment): Schemas["PaymentRow"] {
  const { id, createdAt, orderReference, merchantReference, providerTransactionId, payer, beneficiary, kind, country, network } = payment;
  const { maskedMsisdn, amount, currency, status, providerStatus, failureCode, failureReason } = payment;
  return { id, createdAt, orderReference, merchantReference, providerTransactionId, payer, beneficiary, kind, country, network, maskedMsisdn, amount, currency, status, providerStatus, failureCode, failureReason };
}

function totals(payments: Payment[]): Schemas["PaymentTotals"] {
  const succeeded = payments.filter((payment) => payment.status === "succeeded");
  const failed = payments.filter((payment) => payment.status === "failed").length;
  const settled = succeeded.length + failed;
  return {
    volume: succeeded.reduce((total, payment) => total + payment.amount, 0),
    count: payments.length,
    succeeded: succeeded.length,
    failed,
    failureRate: settled === 0 ? null : Math.round((failed / settled) * 1000) / 10,
  };
}

/** Page de résultats au format de l'API ; une page au-delà de la dernière : 404. */
function paginate<T>({ url, respond }: Context, items: T[]) {
  const page = Number(url.searchParams.get("page") ?? 1);
  const pageSize = Number(url.searchParams.get("pageSize") ?? PAGE_SIZE);
  const results = items.slice((page - 1) * pageSize, page * pageSize);
  if (results.length === 0 && page > 1) {
    fail(respond, "NOT_FOUND", "Page inconnue.");
    return null;
  }
  const link = (target: number) => `${url.origin}${url.pathname}?page=${target}`;
  return {
    count: items.length,
    next: page * pageSize < items.length ? link(page + 1) : null,
    previous: page > 1 ? link(page - 1) : null,
    results,
  };
}

const day = (iso: string) => iso.slice(0, 10);

route("GET", /^\/api\/backoffice\/payments\/$/, true, (context) => {
  const { instance, url, respond } = context;
  if (!finance(context)) return;
  if (instance.scenario.faults.backofficeServerError) {
    return respond(500, apiError("SERVER_ERROR", "Une erreur est survenue côté serveur."));
  }
  const get = (name: string) => url.searchParams.get(name);
  const q = get("q")?.toLowerCase();
  const filtered = state(instance)
    .payments.filter((payment) => !get("status") || payment.status === get("status"))
    .filter((payment) => !get("network") || payment.network === get("network"))
    .filter((payment) => !get("country") || payment.country === get("country"))
    .filter((payment) => !get("kind") || payment.kind === get("kind"))
    .filter((payment) => !get("from") || day(payment.createdAt) >= (get("from") as string))
    .filter((payment) => !get("to") || day(payment.createdAt) <= (get("to") as string))
    .filter(
      (payment) =>
        !q ||
        [payment.orderReference, payment.merchantReference, payment.providerTransactionId ?? ""].some((value) => value.toLowerCase().includes(q)),
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const page = paginate(context, filtered.map(row));
  if (page) respond(200, { ...page, totals: totals(filtered) } satisfies Schemas["PaymentPage"]);
});

function find(context: Context): Payment | null {
  const payment = state(context.instance).payments.find((candidate) => candidate.id === Number(context.match[1]));
  if (!payment) fail(context.respond, "NOT_FOUND", "Introuvable.");
  return payment ?? null;
}

route("GET", /^\/api\/backoffice\/payments\/(\d+)\/$/, true, (context) => {
  if (!finance(context)) return;
  const payment = find(context);
  if (payment) context.respond(200, detail(state(context.instance), payment) satisfies Schemas["PaymentDetail"]);
});

function audit(current: State, payment: Payment, action: string, actor: string | null, data: Record<string, unknown> = {}) {
  payment.auditLog.push({ id: ++current.audit, createdAt: new Date().toISOString(), action, actor, target: "payment", data });
}

route("POST", /^\/api\/backoffice\/payments\/(\d+)\/recheck\/$/, true, (context) => {
  const { instance, respond } = context;
  if (!finance(context)) return;
  const payment = find(context);
  if (!payment) return;
  if (instance.scenario.faults.recheckProviderDown) {
    return respond(502, apiError("SERVER_ERROR", "Le prestataire de paiement n'a pas répondu : réessayez dans quelques instants."));
  }
  const current = state(instance);
  const before = payment.status;
  if (payment.status === "pending") {
    payment.status = "succeeded";
    payment.providerStatus = "approved";
    payment.confirmedAt = new Date().toISOString();
  }
  payment.checkedAt = new Date().toISOString();
  audit(current, payment, "payment.rechecked", `${STAFF.firstName} ${STAFF.lastName}`, { before, after: payment.status });
  respond(200, detail(current, payment) satisfies Schemas["PaymentDetail"]);
});

const fieldError = (name: string, message: string) => ({
  code: "VALIDATION_ERROR" as const,
  message: "Certaines valeurs sont invalides.",
  fields: { [name]: [{ code: "invalid", message }] },
});

route("POST", /^\/api\/backoffice\/payments\/(\d+)\/refunds\/$/, true, (context) => {
  const { instance, body, respond } = context;
  if (!finance(context)) return;
  const payment = find(context);
  if (!payment) return;
  const current = state(instance);
  const { amount, reason } = body as Partial<Schemas["RefundRequestRequest"]>;
  if (!Number.isInteger(amount)) return respond(400, fieldError("amount", "Un nombre entier est attendu."));
  if (typeof reason !== "string" || reason.trim() === "") return respond(400, fieldError("reason", "Ce champ est obligatoire."));
  const { refundable } = detail(current, payment);
  if (payment.status !== "succeeded") return respond(409, apiError("VALIDATION_ERROR", "Seul un paiement réussi se rembourse."));
  if ((amount as number) <= 0 || (amount as number) > refundable) {
    return respond(409, apiError("VALIDATION_ERROR", `Montant remboursable : ${refundable} FCFA au plus.`));
  }
  const refund = backofficeRefund({
    id: current.nextRefund++,
    createdAt: new Date().toISOString(),
    amount: amount as number,
    reason: reason.trim(),
    paymentId: payment.id,
    orderReference: payment.orderReference,
    merchantReference: payment.merchantReference,
    providerTransactionId: payment.providerTransactionId,
    network: payment.network,
    maskedMsisdn: payment.maskedMsisdn,
    paymentAmount: payment.amount,
    payer: payment.payer,
    beneficiary: payment.beneficiary,
  });
  current.refunds.push(refund);
  audit(current, payment, "refund.requested", `${STAFF.firstName} ${STAFF.lastName}`, { refund: refund.id, amount: refund.amount });
  respond(201, refund satisfies Schemas["BackofficeRefund"]);
});

route("GET", /^\/api\/backoffice\/refunds\/$/, true, (context) => {
  const { instance, url, respond } = context;
  if (!finance(context)) return;
  const processed = url.searchParams.get("processed") === "true";
  const refunds = state(instance)
    .refunds.filter((refund) => refund.processed === processed)
    .sort((a, b) => (processed ? (b.processedAt ?? "").localeCompare(a.processedAt ?? "") : a.createdAt.localeCompare(b.createdAt)));
  const page = paginate(context, refunds);
  if (page) respond(200, page satisfies Schemas["RefundPage"]);
});

route("POST", /^\/api\/backoffice\/refunds\/(\d+)\/process\/$/, true, (context) => {
  const { instance, match, body, respond } = context;
  if (!finance(context)) return;
  const current = state(instance);
  const refund = current.refunds.find((candidate) => candidate.id === Number(match[1]));
  if (!refund) return fail(respond, "NOT_FOUND", "Introuvable.");
  const reference = (body as Partial<Schemas["ProcessRefundRequest"]>).reference;
  if (typeof reference !== "string" || reference.trim() === "") return respond(400, fieldError("reference", "Ce champ est obligatoire."));
  const { faults } = instance.scenario;
  if (refund.processed || faults.refundAlreadyProcessed) {
    refund.processed = true;
    refund.processedAt ??= new Date().toISOString();
    return respond(409, apiError("VALIDATION_ERROR", "Ce remboursement est déjà marqué comme fait."));
  }
  refund.processed = true;
  refund.processedAt = new Date().toISOString();
  (refund as { processedBy: string | null }).processedBy = `${STAFF.firstName} ${STAFF.lastName}`;
  refund.reference = reference.trim();
  const payment = current.payments.find((candidate) => candidate.id === refund.paymentId);
  if (payment) audit(current, payment, "refund.processed", `${STAFF.firstName} ${STAFF.lastName}`, { refund: refund.id, reference: refund.reference });
  respond(200, { refund, orderRefunded: false } satisfies Schemas["RefundProcessResult"]);
});

/** Vue d'ensemble : « À traiter » porte les chemins web des paiements échoués et des remboursements à traiter. */
route("GET", /^\/api\/backoffice\/overview\/$/, true, ({ instance, respond }) => {
  const current = state(instance);
  const groups = instance.scenario.me?.staffGroups ?? [];
  const isFinance = groups.some((group) => FINANCE_GROUPS.includes(group));
  const failed = current.payments.filter((payment) => payment.status === "failed").length;
  const pending = current.refunds.filter((refund) => !refund.processed).length;
  const todo: Schemas["Todo"][] = [];
  if (isFinance && failed > 0) {
    todo.push({
      kind: "payments_failed",
      label: "Paiements échoués",
      count: failed,
      path: "/backoffice/paiements?statut=failed",
      adminPath: "/admin/payments/payment/?status__exact=failed",
    });
  }
  if (isFinance && pending > 0) {
    todo.push({
      kind: "refunds_pending",
      label: "Remboursements à traiter",
      count: pending,
      path: "/backoffice/remboursements",
      adminPath: "/admin/payments/refund/?processed__exact=0",
    });
  }
  respond(200, {
    period: { key: "2026-11", label: "Novembre 2026", start: "2026-11-01", end: "2026-11-30" },
    highlight: {
      code: "na",
      label: "Nouveaux apprenants",
      value: 12,
      target: 200,
      status: { status: "off_target", tone: "error", label: "Hors-cible" },
    },
    stats: { users: 40, activeLearners: 12, salesMonth: null, completionRate: null },
    report: { period: "2026-t4", label: "T4 2026", dueDate: "2027-01-15", status: "draft", entered: 0, total: 12 },
    todo,
  } satisfies Schemas["Overview"]);
});

const at = (iso: string) => new Date(iso).toISOString();
const by = "Fatou Kouassi";

const PAYMENTS: Payment[] = [
  backofficePayment({
    auditLog: [{ id: 1, createdAt: at("2026-11-03T10:16:00+01:00"), action: "payment.confirmed", actor: null, target: "payment", data: {} }],
  }),
  backofficePayment({
    id: 2,
    createdAt: at("2026-11-04T08:30:00+01:00"),
    orderReference: "CMD-7002",
    merchantReference: "STY-7002-2",
    providerTransactionId: "4810002",
    payer: "Koffi Mensah",
    beneficiary: null,
    kind: "course",
    network: "moov",
    maskedMsisdn: "01 ** ** ** 02",
    amount: 15000,
    status: "failed",
    providerStatus: "declined",
    failureCode: "DECLINED",
    failureReason: "Solde insuffisant",
    providerFees: null,
    confirmedAt: null,
    refundable: 0,
    order: { id: 7002, reference: "CMD-7002", kind: "course", status: "pending", total: 15000, currency: "XOF", payer: "Koffi Mensah", beneficiary: null },
  }),
  backofficePayment({
    id: 3,
    createdAt: at("2026-11-04T11:00:00+01:00"),
    orderReference: "CMD-7003",
    merchantReference: "STY-7003-1",
    providerTransactionId: "4810003",
    payer: "Awa Dossou",
    beneficiary: "Yao Dossou",
    kind: "event",
    maskedMsisdn: "01 ** ** ** 03",
    amount: 25000,
    status: "pending",
    providerStatus: "pending",
    providerFees: null,
    confirmedAt: null,
    checkedAt: null,
    refundable: 0,
    order: { id: 7003, reference: "CMD-7003", kind: "event", status: "pending", total: 25000, currency: "XOF", payer: "Awa Dossou", beneficiary: "Yao Dossou" },
  }),
  backofficePayment({
    id: 4,
    createdAt: at("2026-10-28T15:00:00+01:00"),
    orderReference: "CMD-7004",
    merchantReference: "STY-7004-1",
    providerTransactionId: "4810004",
    payer: "Sika Agbodjan",
    beneficiary: "Kossi Agbodjan",
    kind: "course",
    country: "TG",
    network: "tmoney",
    maskedMsisdn: "90 ** ** 04",
    amount: 30000,
    providerFees: 300,
    refundable: 0,
    order: { id: 7004, reference: "CMD-7004", kind: "course", status: "refunded", total: 30000, currency: "XOF", payer: "Sika Agbodjan", beneficiary: "Kossi Agbodjan" },
  }),
  backofficePayment({
    id: 5,
    createdAt: at("2026-11-04T07:45:00+01:00"),
    orderReference: "CMD-7002",
    merchantReference: "STY-7002-1",
    providerTransactionId: "4810005",
    payer: "Koffi Mensah",
    beneficiary: null,
    kind: "course",
    network: "moov",
    maskedMsisdn: "01 ** ** ** 02",
    amount: 15000,
    status: "failed",
    providerStatus: "expired",
    failureCode: "EXPIRED",
    failureReason: "",
    providerFees: null,
    confirmedAt: null,
    refundable: 0,
    order: { id: 7002, reference: "CMD-7002", kind: "course", status: "pending", total: 15000, currency: "XOF", payer: "Koffi Mensah", beneficiary: null },
  }),
];

const REFUNDS: Refund[] = [
  backofficeRefund(),
  backofficeRefund({
    id: 2,
    createdAt: at("2026-10-30T09:00:00+01:00"),
    amount: 30000,
    reason: "Parcours acheté deux fois",
    processed: true,
    processedAt: at("2026-10-31T14:00:00+01:00"),
    processedBy: by,
    reference: "FDP-REM-0042",
    paymentId: 4,
    orderReference: "CMD-7004",
    merchantReference: "STY-7004-1",
    providerTransactionId: "4810004",
    network: "tmoney",
    maskedMsisdn: "90 ** ** 04",
    paymentAmount: 30000,
    payer: "Sika Agbodjan",
    beneficiary: "Kossi Agbodjan",
  }),
];

const finances = (surcharge: Partiel<Scenario> = {}) =>
  scenario({ me: STAFF, request: null, backoffice: { payments: PAYMENTS, refunds: REFUNDS }, ...surcharge });

export const SCENARIOS_BACKOFFICE_PAIEMENTS = {
  "backoffice-finance": finances(),
  "backoffice-finance-vide": finances({ backoffice: { payments: [], refunds: [] } }),
  "backoffice-support": finances({ me: { ...STAFF, staffGroups: ["Support"] } }),
  "backoffice-reverification-impossible": finances({ faults: { recheckProviderDown: true } }),
  "backoffice-remboursement-deja-fait": finances({ faults: { refundAlreadyProcessed: true } }),
  "backoffice-erreur-serveur": finances({ faults: { backofficeServerError: true } }),
} satisfies Record<string, Scenario>;
