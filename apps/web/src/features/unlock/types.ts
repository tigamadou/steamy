import type { Schemas } from "@steamy/api-client";

import { formatPrice } from "@/lib/format";

/**
 * Statuts d'une demande de paiement (`PaymentRequest.Status` de l'API, C4). Le schéma OpenAPI les type à tort avec
 * l'énumération des paiements (`PaymentStatusEnum`, collision de noms de drf-spectacular) : ce type les rétablit.
 */
export type RequestStatus = "pending" | "paid" | "declined" | "expired" | "cancelled";

export type PaymentRequest = Omit<Schemas["PaymentRequest"], "status"> & { status: RequestStatus };

/** Demande lue dans l'API, avec ses vrais statuts. */
export function asRequest(data: Schemas["PaymentRequest"]): PaymentRequest {
  return data as unknown as PaymentRequest;
}

/** Libellé de ce qui est demandé : le parcours, ou les kits du panier (« Steamy Bot v1 × 2, Pack Électronique »). */
export function requestTitle(request: Pick<PaymentRequest, "course" | "items">): string {
  if (request.course) return request.course.title;
  return request.items.map((item) => (item.quantity > 1 ? `${item.title} × ${item.quantity}` : item.title)).join(", ");
}

/** Montant demandé, calculé par le serveur (hors livraison pour un kit, C10). */
export function requestAmount(request: Pick<PaymentRequest, "amount">): string {
  return formatPrice(request.amount);
}

/** Statut d'une demande, au tutoiement (WA02, WD14). */
export const REQUEST_STATUS_LABELS: Record<RequestStatus, string> = {
  pending: "En attente de ton parent",
  paid: "Réglée par ton parent",
  declined: "Refusée par ton parent",
  expired: "Expirée",
  cancelled: "Annulée",
};

/** Paramètre de WC06a qui affiche le toast « Parcours débloqué » après un Kit Code valide (WA01). */
export const UNLOCKED_PARAM = "debloque";
