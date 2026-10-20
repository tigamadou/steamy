"use client";

import { useRouter } from "next/navigation";
import { useActionState } from "react";

import { apiCall, errorMessage } from "@/lib/api-call";

export type AcceptState = { attempt: number; error?: string };

/** Demande close entre-temps : l'écran est relu et passe en lecture seule. */
const CLOSED = new Set(["CONSENT_ALREADY_RESOLVED", "CONSENT_REQUEST_EXPIRED"]);

/**
 * Acceptation d'une demande de consentement, commune à WP05 (inscription du parent) et WPD05 (espace parent) :
 * `POST consent-requests/{id}/accept/`, puis `onAccepted` ; une demande close relit l'écran ; l'erreur est rendue au
 * vouvoiement. Renvoie l'état, l'action de formulaire et l'indicateur d'envoi de `useActionState`.
 */
export function useAcceptConsent(id: number, onAccepted: () => void) {
  const router = useRouter();
  return useActionState(
    async (previous: AcceptState): Promise<AcceptState> => {
      const attempt = previous.attempt + 1;
      const result = await apiCall((api) =>
        api.POST("/api/accounts/consent-requests/{id}/accept/", { params: { path: { id: String(id) } } }),
      );
      if (result.ok) {
        onAccepted();
        return { attempt };
      }
      if (CLOSED.has(result.code)) router.refresh();
      return { attempt, error: errorMessage(result, "vous") };
    },
    { attempt: 0 },
  );
}
