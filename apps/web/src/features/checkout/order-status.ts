import type { Schemas } from "@steamy/api-client";

/**
 * Titre et message d'une commande selon son statut (D37), partagés par le suivi de l'invité (WK07) et celui du parent
 * (4.5). `refunded` reste neutre : le Support rembourse aussi des commandes payées (6.4), et l'API n'expose pas le
 * motif du remboursement (paiement tardif C17 ou geste du Support).
 */
export const ORDER_STATUS_MESSAGES: Record<Schemas["OrderStatusEnum"], { title: string; body: string }> = {
  paid: {
    title: "Merci, c'est commandé !",
    body: "un reçu vous a été envoyé par SMS. Vous êtes prévenu à chaque étape de la livraison.",
  },
  pending: { title: "Paiement en attente", body: "le paiement n'est pas encore confirmé." },
  cancelled: { title: "Commande annulée", body: "elle n'a pas été payée à temps et le stock a été libéré." },
  refunded: { title: "Commande remboursée", body: "elle vous a été remboursée." },
};

/** Phrase d'état d'une commande close (annulée ou remboursée) : « Commande annulée : elle n'a pas été payée… ». */
export function closedOrderNote(status: "cancelled" | "refunded"): string {
  const { title, body } = ORDER_STATUS_MESSAGES[status];
  return `${title} : ${body}`;
}
