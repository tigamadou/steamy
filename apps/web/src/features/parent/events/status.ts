import type { Schemas } from "@steamy/api-client";

import type { BadgeTone } from "@/components/ds";
import { errorMessage, type ApiFailure } from "@/lib/api-call";

export type ApplicationStatus = Schemas["ApplicationStatusEnum"];

/** Statut d'une candidature de l'enfant, vu par le parent (C3, D53), au vouvoiement. */
export const PARENT_APPLICATION_STATUS: Record<ApplicationStatus, { label: string; tone: BadgeTone }> = {
  pending_parent: { label: "À examiner", tone: "amber" },
  pending_payment: { label: "Paiement en attente", tone: "info" },
  accepted: { label: "Acceptée", tone: "success" },
  refused: { label: "Refusée", tone: "error" },
  cancelled: { label: "Annulée", tone: "neutral" },
};

/** Erreurs d'une candidature ou d'un accord, au vouvoiement (`EVENT_FULL`, `EVENT_CLOSED`, `ALREADY_APPLIED`…). */
export function applicationErrorMessage(failure: ApiFailure): string {
  switch (failure.code) {
    case "EVENT_FULL":
      return "Cet événement est complet : il n'y a plus de place.";
    case "EVENT_CLOSED":
      return "Les candidatures à cet événement sont closes.";
    case "ALREADY_APPLIED":
      return "Votre enfant est déjà inscrit ou candidat à cet événement.";
    case "APPLICATION_ALREADY_RESOLVED":
      return "Cette candidature a déjà été traitée.";
    default:
      return errorMessage(failure, "vous");
  }
}
