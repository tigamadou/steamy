import type { Schemas } from "@steamy/api-client";

import type { BadgeTone } from "@/components/ds";

type OrderStatus = Schemas["OrderStatusEnum"];

/** Filtres de WPD07 dans l'URL (`?statut=`) → statut de commande de l'API (4 états, D37) ; « Toutes » sans paramètre. */
export const ORDER_FILTERS = {
  payees: { label: "Payées", status: "paid" },
  "en-attente": { label: "En attente", status: "pending" },
  annulees: { label: "Annulées", status: "cancelled" },
  remboursees: { label: "Remboursées", status: "refunded" },
} as const satisfies Record<string, { label: string; status: OrderStatus }>;

export type OrderFilter = keyof typeof ORDER_FILTERS;

/** Filtre lu dans l'URL ; une valeur inconnue revient à « Toutes ». */
export function parseOrderFilter(value: string | string[] | undefined): OrderFilter | null {
  const filter = Array.isArray(value) ? value[0] : value;
  return filter && filter in ORDER_FILTERS ? (filter as OrderFilter) : null;
}

/** Statut d'une commande, au vouvoiement. */
export const ORDER_STATUS: Record<OrderStatus, { label: string; tone: BadgeTone }> = {
  paid: { label: "Payée", tone: "success" },
  pending: { label: "En attente de paiement", tone: "amber" },
  cancelled: { label: "Annulée", tone: "neutral" },
  refunded: { label: "Remboursée", tone: "info" },
};

/** Pictogramme d'une commande selon son `kind`, jamais selon son libellé (D37). */
export const KIND_ICONS: Record<Schemas["OrderKindEnum"], { icon: string; label: string }> = {
  course: { icon: "📚", label: "Parcours" },
  kit: { icon: "📦", label: "Kit" },
  event: { icon: "🎟️", label: "Événement" },
};

export const SHIPPING_LABELS: Record<Schemas["ShippingStatusEnum"], string> = {
  preparing: "En préparation",
  shipped: "Expédiée",
  delivered: "Livrée",
};
