"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";

import { Button } from "@/components/ds/Button";
import { ErrorSummary } from "@/components/ds/ErrorSummary";
import { apiCall, errorMessage } from "@/lib/api-call";
import { submitWith } from "@/lib/form";
import { routes } from "@/lib/routes";

import { RefuseConsentDialog } from "./RefuseConsentDialog";

type State = { attempt: number; error?: string };

/**
 * Actions de WPD05 sur une demande en attente : « Accepter la demande » (retour à WPD01 avec la confirmation) ou
 * « Refuser » (modale de refus). Une demande close entre-temps relit l'écran, qui passe en lecture seule.
 */
export function ConsentDecision({ id, firstName }: { id: number; firstName: string }) {
  const router = useRouter();
  const [refusing, setRefusing] = useState(false);
  const [state, action, pending] = useActionState(async (previous: State): Promise<State> => {
    const attempt = previous.attempt + 1;
    const result = await apiCall((api) =>
      api.POST("/api/accounts/consent-requests/{id}/accept/", { params: { path: { id: String(id) } } }),
    );
    if (result.ok) {
      router.push(routes.parent.consentAccepted(id));
      return { attempt };
    }
    if (result.code === "CONSENT_ALREADY_RESOLVED" || result.code === "CONSENT_REQUEST_EXPIRED") router.refresh();
    return { attempt, error: errorMessage(result, "vous") };
  }, { attempt: 0 });

  // Modale hors du formulaire : son propre envoi ne doit pas remonter (arbre React) jusqu'à l'acceptation
  return (
    <>
      <form onSubmit={submitWith(action)} className="flex flex-col gap-3">
        <ErrorSummary
          title="Réponse impossible :"
          errors={state.error ? [{ message: state.error }] : []}
          focusKey={state.attempt}
        />
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button type="submit" variant="secondary" block loading={pending} icon="check">
            Accepter la demande
          </Button>
          <Button variant="outline" block onClick={() => setRefusing(true)}>
            Refuser
          </Button>
        </div>
      </form>
      <RefuseConsentDialog id={id} firstName={firstName} open={refusing} onClose={() => setRefusing(false)} />
    </>
  );
}
