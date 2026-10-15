"use client";

import { useRouter } from "next/navigation";
import { useActionState } from "react";

import { Button } from "@/components/ds/Button";
import { ErrorSummary } from "@/components/ds/ErrorSummary";
import { Field } from "@/components/ds/Field";
import { PhoneInput } from "@/components/ds/PhoneInput";
import { ReferentialSelect } from "@/components/ds/ReferentialSelect";
import { apiCall, errorMessage } from "@/lib/api-call";
import { submitWith } from "@/lib/form";
import { useReferential } from "@/lib/use-referential";

type State = { attempt: number; phone?: string; relationship?: string; error?: string };

/**
 * W06 · Numéro d'un parent : le serveur crée la demande de consentement et envoie le SMS au parent (lien à jeton).
 * Une nouvelle demande au même numéro annule la précédente (C14).
 */
export function ParentForm() {
  const router = useRouter();
  const countries = useReferential("countries");
  const relationships = useReferential("relationships");

  const [state, action, pending] = useActionState(async (previous: State, form: FormData): Promise<State> => {
    const attempt = previous.attempt + 1;
    const parentPhone = String(form.get("parentPhone"));
    const relationship = String(form.get("relationship") ?? "");
    const errors: State = { attempt };
    if (!parentPhone) errors.phone = "Indique un numéro de téléphone valide.";
    if (!relationship) errors.relationship = "Choisis ton lien avec ce parent.";
    if (errors.phone || errors.relationship) return errors;

    const result = await apiCall((api) =>
      api.POST("/api/accounts/consent-requests/", { body: { parentPhone, relationship } }),
    );
    if (result.ok) {
      router.replace("/inscription/apprenant/attente");
      return { attempt };
    }
    if (result.code === "CONSENT_COOLDOWN") {
      // C9 : le délai de 30 jours suit le refus de ce numéro ; l'API ne donne pas la date exacte
      return {
        attempt,
        phone: "Ce parent a refusé une demande il y a moins de 30 jours. Tu pourras lui en refaire une 30 jours après son refus.",
      };
    }
    if (result.fields.parentPhone || result.code === "PHONE_INVALID") {
      return { attempt, phone: result.fields.parentPhone ?? result.message };
    }
    if (result.fields.relationship) return { attempt, relationship: result.fields.relationship };
    return { attempt, error: errorMessage(result, "tu") };
  }, { attempt: 0 });

  const summary = [
    state.phone && { field: "telephone-parent", message: state.phone },
    state.relationship && { field: "lien-parente", message: state.relationship },
    state.error && { message: state.error },
  ].filter((item) => !!item);

  return (
    <form onSubmit={submitWith(action)} noValidate className="flex flex-col gap-4">
      <ErrorSummary errors={summary} focusKey={state.attempt} />
      <Field
        label="Numéro de téléphone du parent"
        id="telephone-parent"
        required
        hint="Maman, papa, tutrice, oncle… une personne adulte qui s'occupe de toi."
        error={state.phone}
      >
        <PhoneInput countries={countries.items ?? []} name="parentPhone" />
      </Field>
      <Field label="Lien de parenté" id="lien-parente" required error={state.relationship}>
        <ReferentialSelect
          name="relationship"
          items={relationships.items}
          status={relationships.status === "idle" ? "loading" : relationships.status}
          onRetry={relationships.retry}
        />
      </Field>
      <p className="flex items-start gap-2.5 rounded-lg bg-info-50 p-3.5 text-sm font-bold text-info-700">
        <span aria-hidden>🔒</span>
        Tes données ne servent qu&apos;à valider ton inscription, jamais à de la publicité.
      </p>
      <Button type="submit" block size="lg" loading={pending} className="mt-3">
        Envoyer la demande au parent
      </Button>
    </form>
  );
}
