"use client";

import { useRouter } from "next/navigation";

import { Button } from "@/components/ds/Button";
import { ErrorSummary } from "@/components/ds/ErrorSummary";
import { useAcceptConsent } from "@/features/consent/use-accept-consent";
import { submitWith } from "@/lib/form";

/** Actions de WP05 : « Accepter la demande » (WP06) ou « Refuser » (WP11, avec confirmation). */
export function AcceptForm({ id }: { id: number }) {
  const router = useRouter();
  const [state, action, pending] = useAcceptConsent(id, () =>
    router.replace(`/inscription/parent/demande/${id}/acceptee`),
  );

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
