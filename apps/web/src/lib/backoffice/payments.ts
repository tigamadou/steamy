import type { Schemas } from "@steamy/api-client";

import { routes } from "@/lib/routes";

import type { StatusTone } from "@/components/backoffice/StatusBadge";

export type PaymentStatus = Schemas["PaymentStatusEnum"];
export type OrderKind = "course" | "kit" | "event";

/** Statut Steamy d'un paiement → libellé et ton de la pastille (la couleur ne sert qu'aux statuts). */
export const PAYMENT_STATUS: Record<PaymentStatus, { label: string; tone: StatusTone }> = {
  initiated: { label: "Initié", tone: "neutral" },
  pending: { label: "En attente", tone: "amber" },
  succeeded: { label: "Réussi", tone: "success" },
  failed: { label: "Échoué", tone: "error" },
};

/** Motifs d'échec (`Payment.FailureCode`) ; un code inconnu s'affiche tel quel. */
export const FAILURE_LABELS: Record<Schemas["PaymentFailureCodeEnum"], string> = {
  PROVIDER_UNAVAILABLE: "Prestataire indisponible",
  PROVIDER_REFUSED: "Initiation refusée par le prestataire",
  INITIATION_LOST: "Initiation jamais aboutie",
  AMOUNT_MISMATCH: "Montant ou devise incohérents",
  DECLINED: "Paiement refusé",
  EXPIRED: "Paiement expiré",
};

export function failureLabel(code: string): string {
  if (code === "") return "—";
  return (FAILURE_LABELS as Record<string, string>)[code] ?? code;
}

export const ORDER_KIND: Record<OrderKind, string> = { course: "Parcours", kit: "Kit", event: "Événement" };

export type RefundTab = "a-traiter" | "traites";

/** Onglets de la liste des remboursements → filtre `processed` de l'API. */
export const REFUND_TABS: Record<RefundTab, { label: string; processed: boolean }> = {
  "a-traiter": { label: "À traiter", processed: false },
  traites: { label: "Traités", processed: true },
};

export type PaymentFilters = {
  status?: PaymentStatus;
  network?: string;
  country?: string;
  kind?: OrderKind;
  from?: string;
  to?: string;
  q?: string;
  page: number;
};

type SearchParams = Record<string, string | string[] | undefined>;

const first = (value: string | string[] | undefined): string | undefined => (Array.isArray(value) ? value[0] : value);

const DATE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

function parsePage(value: string | string[] | undefined): number {
  const page = Number(first(value));
  return Number.isInteger(page) && page >= 1 ? page : 1;
}

/** Filtres lus dans l'URL de la page : une valeur inconnue ou mal formée est ignorée, la page vaut au moins 1. */
export function parsePaymentFilters(params: SearchParams): PaymentFilters {
  const status = first(params.statut);
  const network = first(params.reseau);
  const country = first(params.pays);
  const kind = first(params.type);
  const from = first(params.du);
  const to = first(params.au);
  const q = first(params.q)?.trim();
  const filters: PaymentFilters = { page: parsePage(params.page) };
  if (status !== undefined && status in PAYMENT_STATUS) filters.status = status as PaymentStatus;
  if (network !== undefined && /^[a-z0-9_-]{1,32}$/.test(network)) filters.network = network;
  if (country !== undefined && /^[A-Z]{2}$/.test(country)) filters.country = country;
  if (kind !== undefined && kind in ORDER_KIND) filters.kind = kind as OrderKind;
  if (from !== undefined && DATE.test(from)) filters.from = from;
  if (to !== undefined && DATE.test(to)) filters.to = to;
  if (q) filters.q = q.slice(0, 100);
  return filters;
}

/** URL de la liste des paiements pour ces filtres (paramètres français, vides omis). */
export function paymentsHref(filters: PaymentFilters): string {
  const query = new URLSearchParams();
  if (filters.status) query.set("statut", filters.status);
  if (filters.network) query.set("reseau", filters.network);
  if (filters.country) query.set("pays", filters.country);
  if (filters.kind) query.set("type", filters.kind);
  if (filters.from) query.set("du", filters.from);
  if (filters.to) query.set("au", filters.to);
  if (filters.q) query.set("q", filters.q);
  if (filters.page > 1) query.set("page", String(filters.page));
  const text = query.toString();
  return text ? `${routes.backoffice.payments}?${text}` : routes.backoffice.payments;
}

/** Filtres de l'URL traduits en paramètres de `GET /api/backoffice/payments/`. */
export function apiQuery(filters: PaymentFilters) {
  const { status, network, country, kind, from, to, q, page } = filters;
  return {
    ...(status && { status }),
    ...(network && { network }),
    ...(country && { country }),
    ...(kind && { kind }),
    ...(from && { from }),
    ...(to && { to }),
    ...(q && { q }),
    page,
  };
}

/** Onglet et page de la liste des remboursements lus dans l'URL (onglet inconnu → « À traiter »). */
export function parseRefundsTab(params: SearchParams): { tab: RefundTab; page: number } {
  const tab = first(params.onglet);
  return { tab: tab === "traites" ? "traites" : "a-traiter", page: parsePage(params.page) };
}

/** URL d'un onglet des remboursements (l'onglet par défaut et la page 1 n'ajoutent aucun paramètre). */
export function refundsHref(tab: RefundTab, page: number): string {
  const query = new URLSearchParams();
  if (tab === "traites") query.set("onglet", "traites");
  if (page > 1) query.set("page", String(page));
  const text = query.toString();
  return text ? `${routes.backoffice.refunds}?${text}` : routes.backoffice.refunds;
}
