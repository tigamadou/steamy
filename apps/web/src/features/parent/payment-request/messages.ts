import type { BadgeTone } from "@/components/ds";
import { errorMessage, type ApiFailure } from "@/lib/api-call";
import type { RequestStatus } from "@/features/unlock/types";

/** États affichés par WPD15 : statuts de la demande (API) et états propres au paiement en cours. */
export type ScreenState = RequestStatus | "confirming" | "failed" | "outofstock";

/** Pastille d'état de la demande (maquette de 4.0, `WPDACStatusBadge`). */
export const STATE_BADGES: Record<ScreenState, { tone: BadgeTone; label: string }> = {
  pending: { tone: "amber", label: "À payer" },
  confirming: { tone: "info", label: "Confirmation…" },
  paid: { tone: "success", label: "Payée" },
  failed: { tone: "error", label: "Échec" },
  declined: { tone: "neutral", label: "Refusée" },
  expired: { tone: "neutral", label: "Expirée" },
  cancelled: { tone: "neutral", label: "Annulée" },
  outofstock: { tone: "amber", label: "Rupture" },
};

/**
 * Codes d'erreur du paiement traduits pour le parent (WPD15) ; les autres passent par `errorMessage` (réseau, plafond,
 * panne, puis message de l'API).
 */
export function paymentErrorMessage(failure: ApiFailure): string {
  switch (failure.code) {
    case "OUT_OF_STOCK":
      return "Ce kit n'est plus disponible pour le moment : le paiement est impossible.";
    case "ORDER_EXPIRED":
      return "Le délai de la commande est dépassé. Relancez le paiement : une nouvelle commande sera créée.";
    case "ORDER_ALREADY_PAID":
      return "Cette commande est déjà payée.";
    case "PAYMENT_IN_PROGRESS":
      return "Un paiement de cette commande est déjà en cours : validez-le sur votre téléphone, ou réessayez dans quelques minutes.";
    case "PAYMENT_FAILED":
      return "Le prestataire Mobile Money a refusé le paiement. Vérifiez votre numéro et votre solde, puis réessayez.";
    case "PAYMENT_REQUEST_CLOSED":
      return "Cette demande n'est plus en attente : elle a été réglée, refusée, annulée ou a expiré.";
    default:
      return errorMessage(failure, "vous");
  }
}

/** Le même échec, avec le message traduit (affiché par `PaymentForm`). */
export function translated(failure: ApiFailure): ApiFailure {
  return { ...failure, message: paymentErrorMessage(failure) };
}
