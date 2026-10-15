"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ds/Button";
import { ErrorSummary } from "@/components/ds/ErrorSummary";
import { Field } from "@/components/ds/Field";
import { Input } from "@/components/ds/Input";
import { ReferentialSelect } from "@/components/ds/ReferentialSelect";
import { errorMessage } from "@/lib/api-call";
import { useReferential } from "@/lib/use-referential";

import { useLearnerProfileSave } from "./useProfileSave";

type State = { attempt: number; birthDate?: string; locality?: string; email?: string; error?: string };

/** W11 · Profil 1/4 : date de naissance (cohérente avec l'âge de W05, D23), pays, localité, email facultatif. */
export function InfoStep() {
  const save = useLearnerProfileSave();
  const countries = useReferential("countries");
  const [country, setCountry] = useState("BJ");
  const localities = useReferential("localities", { country });

  const [state, action, pending] = useActionState(async (previous: State, form: FormData): Promise<State> => {
    const attempt = previous.attempt + 1;
    const birthDate = String(form.get("birthDate"));
    const locality = String(form.get("locality") ?? "");
    const email = String(form.get("email")).trim();
    const errors: State = { attempt };
    if (!birthDate) errors.birthDate = "Indique ta date de naissance.";
    if (!locality) errors.locality = "Choisis ta ville ou ton quartier.";
    if (errors.birthDate || errors.locality) return errors;

    const failure = await save({ birthDate, locality: Number(locality), email: email || null });
    if (!failure) return { attempt };
    if (failure.code === "BIRTHDATE_AGE_MISMATCH" || failure.code === "AGE_OUT_OF_RANGE" || failure.fields.birthDate) {
      return {
        attempt,
        birthDate:
          failure.code === "BIRTHDATE_AGE_MISMATCH"
            ? "Cette date ne correspond pas à l'âge indiqué au début de ton inscription."
            : (failure.fields.birthDate ?? "Steamy est fait pour les 10 à 17 ans."),
      };
    }
    if (failure.fields.email) return { attempt, email: failure.fields.email };
    if (failure.fields.locality) return { attempt, locality: failure.fields.locality };
    return { attempt, error: errorMessage(failure, "tu") };
  }, { attempt: 0 });

  const errors = [
    state.birthDate && { field: "naissance", message: state.birthDate },
    state.locality && { field: "localite", message: state.locality },
    state.email && { field: "email", message: state.email },
    state.error && { message: state.error },
  ].filter((item) => !!item);

  const localityItems = localities.items?.map((locality) => ({
    id: locality.id,
    code: String(locality.id),
    label: locality.district ? `${locality.city} · ${locality.district}` : locality.city,
  }));

  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      <ErrorSummary errors={errors} focusKey={state.attempt} />
      <Field label="Date de naissance" id="naissance" required error={state.birthDate}>
        <Input type="date" name="birthDate" autoComplete="bday" />
      </Field>
      <Field label="Pays de résidence" id="pays" required>
        <ReferentialSelect
          items={countries.items}
          status={countries.status === "idle" ? "loading" : countries.status}
          onRetry={countries.retry}
          value={country}
          onChange={setCountry}
        />
      </Field>
      <Field label="Localité (ville / quartier)" id="localite" required error={state.locality}>
        <ReferentialSelect
          key={country}
          name="locality"
          items={localityItems}
          status={localities.status === "idle" ? "loading" : localities.status}
          onRetry={localities.retry}
        />
      </Field>
      <Field label="Email" id="email" hint="Facultatif : pour tes factures et les nouvelles de Steamy." error={state.email}>
        <Input type="email" name="email" autoComplete="email" inputMode="email" />
      </Field>
      <Button type="submit" block size="lg" loading={pending} iconRight="arrow-right" className="mt-3">
        Suivant
      </Button>
    </form>
  );
}
