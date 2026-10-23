import type { Schemas } from "@steamy/api-client";

import { formatPrice, quantityLabel } from "@/lib/format";

/** Statuts d'une demande de paiement (`PaymentRequestStatusEnum` du schéma OpenAPI, C4). */
export type RequestStatus = Schemas["PaymentRequestStatusEnum"];

export type PaymentRequest = Schemas["PaymentRequest"];

/** Libellé de ce qui est demandé : le parcours, ou les kits du panier (« Steamy Bot v1 × 2, Pack Électronique »). */
export function requestTitle(request: Pick<PaymentRequest, "course" | "items">): string {
  if (request.course) return request.course.title;
  return request.items.map((item) => quantityLabel(item.title, item.quantity)).join(", ");
}

/** Montant demandé, taxes comprises, calculé par le serveur (hors livraison pour un kit, C10, C25). */
export function requestAmount(request: Pick<PaymentRequest, "total">): string {
  return formatPrice(request.total);
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
