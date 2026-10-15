"use client";

import { useRouter } from "next/navigation";
import { useActionState } from "react";

import { Button } from "@/components/ds/Button";
import { ErrorSummary } from "@/components/ds/ErrorSummary";
import { apiCall, errorMessage } from "@/lib/api-call";
import { submitWith } from "@/lib/form";

type State = { attempt: number; error?: string };

/** Actions de WP05 : « Accepter la demande » (WP06) ou « Refuser » (WP11, avec confirmation). */
export function AcceptForm({ id }: { id: number }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(async (previous: State): Promise<State> => {
    const attempt = previous.attempt + 1;
    const result = await apiCall((api) =>
      api.POST("/api/accounts/consent-requests/{id}/accept/", { params: { path: { id: String(id) } } }),
    );
    if (result.ok) {
      router.replace(`/inscription/parent/demande/${id}/acceptee`);
      return { attempt };
    }
    if (result.code === "CONSENT_ALREADY_RESOLVED" || result.code === "CONSENT_REQUEST_EXPIRED") {
      router.refresh();
    }
    return { attempt, error: errorMessage(result, "vous") };
  }, { attempt: 0 });

  return (
    <form onSubmit={submitWith(action)} className="flex flex-col gap-3">
      <ErrorSummary
        title="Réponse impossible :"
        errors={state.error ? [{ message: state.error }] : []}
        focusKey={state.attempt}
      />
      <Button type="submit" variant="secondary" block size="lg" loading={pending} icon="check">
        Accepter la demande
      </Button>
      <Button href={`/inscription/parent/demande/${id}/refus`} variant="outline" block>
        Refuser
      </Button>
    </form>
  );
}
