"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";

import type { OtpChallenge } from "@/components/auth/OtpForm";
import { Button } from "@/components/ds/Button";
import { Checkbox } from "@/components/ds/Checkbox";
import { ErrorSummary } from "@/components/ds/ErrorSummary";
import { Field } from "@/components/ds/Field";
import { Input } from "@/components/ds/Input";
import { PhoneInput } from "@/components/ds/PhoneInput";
import { apiCall, errorMessage } from "@/lib/api-call";
import { readFlow, writeFlow } from "@/lib/auth/flow-storage";
import { submitWith } from "@/lib/form";
import { routes } from "@/lib/routes";
import { useReferential } from "@/lib/use-referential";

type State = {
  attempt: number;
  firstName?: string;
  lastName?: string;
  phone?: string;
  privacy?: string;
  error?: string;
};

/**
 * WP01 · Créer un compte parent : un code est envoyé par SMS. La réponse est la même que le numéro soit déjà
 * inscrit ou non (C13). Arrivé par le lien SMS de l'enfant, le parent voit le numéro destinataire (masqué).
 */
export function ParentSignupForm() {
  const router = useRouter();
  const { items: countries = [] } = useReferential("countries");
  const [expectedPhone, setExpectedPhone] = useState<string>();

  useEffect(() => {
    const token = readFlow<string>("consentToken");
    if (!token) return;
    let current = true;
    void apiCall((api) => api.POST("/api/accounts/consent-requests/preview/", { body: { token } })).then(
      (result) => current && result.ok && setExpectedPhone(result.data.parentPhoneMasked),
    );
    return () => {
      current = false;
    };
  }, []);

  const [state, action, pending] = useActionState(async (previous: State, form: FormData): Promise<State> => {
    const attempt = previous.attempt + 1;
    const firstName = String(form.get("firstName")).trim();
    const lastName = String(form.get("lastName")).trim();
    const phone = String(form.get("phone"));
    const privacyAccepted = form.get("privacy") === "on";
    const errors: State = { attempt };
    if (!firstName) errors.firstName = "Indiquez votre prénom.";
    if (!lastName) errors.lastName = "Indiquez votre nom.";
    if (!phone) errors.phone = "Indiquez un numéro de téléphone valide.";
    if (!privacyAccepted) errors.privacy = "Acceptez les conditions d'utilisation pour continuer.";
    if (errors.firstName || errors.lastName || errors.phone || errors.privacy) return errors;

    const result = await apiCall((api) =>
      api.POST("/api/auth/parent-signup/", { body: { firstName, lastName, phone, privacyAccepted } }),
    );
    if (result.ok) {
      writeFlow("parentChallenge", result.data satisfies OtpChallenge);
      router.push("/inscription/parent/code");
      return { attempt };
    }
    if (result.fields.phone || result.code === "PHONE_INVALID") return { attempt, phone: result.fields.phone ?? result.message };
    return { attempt, error: errorMessage(result, "vous") };
  }, { attempt: 0 });

  const errors = [
    state.firstName && { field: "parent-prenom", message: state.firstName },
    state.lastName && { field: "parent-nom", message: state.lastName },
    state.phone && { field: "parent-telephone", message: state.phone },
    state.privacy && { field: "parent-cgu", message: state.privacy },
    state.error && { message: state.error },
  ].filter((item) => !!item);

  return (
    <form onSubmit={submitWith(action)} noValidate className="flex flex-col gap-4">
      <ErrorSummary title="Corrigez les erreurs suivantes :" errors={errors} focusKey={state.attempt} />
      {expectedPhone && (
        <p role="status" className="rounded-lg bg-info-50 p-4 text-sm font-bold text-info-700">
          Votre enfant a envoyé sa demande au {expectedPhone} : inscrivez-vous avec ce numéro pour la voir.
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Prénom" id="parent-prenom" required error={state.firstName}>
          <Input name="firstName" autoComplete="given-name" />
        </Field>
        <Field label="Nom" id="parent-nom" required error={state.lastName}>
          <Input name="lastName" autoComplete="family-name" />
        </Field>
      </div>
      <Field label="Numéro de téléphone" id="parent-telephone" required error={state.phone}>
        <PhoneInput countries={countries} name="phone" />
      </Field>
      <Checkbox
        id="parent-cgu"
        name="privacy"
        error={state.privacy}
        label={
          <>
            J&apos;accepte les{" "}
            <Link href={routes.legal("cgu")} className="font-bold text-primary-600 underline">
              conditions d&apos;utilisation
            </Link>{" "}
            et la{" "}
            <Link href={routes.legal("confidentialite")} className="font-bold text-primary-600 underline">
              politique de confidentialité
            </Link>
            .
          </>
        }
      />
      <div className="mt-3 flex flex-col gap-3">
        <Button type="submit" block size="lg" loading={pending}>
          Recevoir mon code par SMS
        </Button>
        <p className="text-center text-sm font-bold text-ink-600">
          Déjà un compte ?{" "}
          <Link href={routes.login()} className="font-black text-primary-600 underline">
            Connectez-vous
          </Link>
        </p>
      </div>
    </form>
  );
}
