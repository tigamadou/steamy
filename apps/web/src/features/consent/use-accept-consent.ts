"use client";

import type { Schemas } from "@steamy/api-client";
import { useRouter } from "next/navigation";
import { useActionState } from "react";

import { apiCall, errorMessage } from "@/lib/api-call";

export type AcceptState = { attempt: number; error?: string; fields?: Record<string, string> };

/** Corps de l'acceptation (invitation d'un enseignant, C11), ou erreurs relevées avant tout appel. */
export type AcceptPreparation = { body?: Schemas["AcceptRequest"]; fields?: Record<string, string> };

/** Demande close entre-temps : l'écran est relu et passe en lecture seule. */
const CLOSED = new Set(["CONSENT_ALREADY_RESOLVED", "CONSENT_REQUEST_EXPIRED"]);

/**
 * Acceptation d'une demande de consentement, commune à WP05 (inscription du parent) et WPD05 (espace parent) :
 * `POST consent-requests/{id}/accept/`, puis `onAccepted` ; une demande close relit l'écran ; l'erreur est rendue au
 * vouvoiement. `prepare` lit le formulaire d'une invitation d'enseignant (identifiant et mot de passe, ou enfant
 * existant) ; ses erreurs, comme celles de l'API, reviennent par champ. Renvoie l'état, l'action de formulaire et
 * l'indicateur d'envoi de `useActionState`.
 */
export function useAcceptConsent(
  id: number,
  onAccepted: () => void,
  prepare?: (form: FormData) => AcceptPreparation | Promise<AcceptPreparation>,
) {
  const router = useRouter();
  return useActionState(
    async (previous: AcceptState, form?: FormData): Promise<AcceptState> => {
      const attempt = previous.attempt + 1;
      const prepared = prepare && form ? await prepare(form) : {};
      if (prepared.fields && Object.keys(prepared.fields).length > 0) return { attempt, fields: prepared.fields };
      const result = await apiCall((api) =>
        api.POST("/api/accounts/consent-requests/{id}/accept/", {
          params: { path: { id: String(id) } },
          ...(prepared.body ? { body: prepared.body } : {}),
        }),
      );
      if (result.ok) {
        onAccepted();
        return { attempt };
      }
      if (CLOSED.has(result.code)) router.refresh();
      // Formulaire d'invitation : erreurs de l'API sous leur champ ; sinon un message unique
      if (prepare && Object.keys(result.fields).length > 0) return { attempt, fields: result.fields };
      return { attempt, error: errorMessage(result, "vous") };
    },
    { attempt: 0 },
  );
}
