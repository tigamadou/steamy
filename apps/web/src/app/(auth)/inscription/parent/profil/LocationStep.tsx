"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ds/Button";
import { ErrorSummary } from "@/components/ds/ErrorSummary";
import { Field } from "@/components/ds/Field";
import { Input } from "@/components/ds/Input";
import { ReferentialSelect } from "@/components/ds/ReferentialSelect";
import { errorMessage } from "@/lib/api-call";
import { submitWith } from "@/lib/form";
import { useReferential } from "@/lib/use-referential";

import { useParentProfileSave } from "./useParentProfileSave";

type State = { attempt: number; locality?: string; email?: string; error?: string };

/** WP07 · Profil 1/3 : pays, localité, email facultatif (factures, suivi). */
export function LocationStep() {
  const save = useParentProfileSave();
  const countries = useReferential("countries");
  const [country, setCountry] = useState("BJ");
  const localities = useReferential("localities", { country });

  const [state, action, pending] = useActionState(async (previous: State, form: FormData): Promise<State> => {
    const attempt = previous.attempt + 1;
    const locality = String(form.get("locality") ?? "");
    const email = String(form.get("email")).trim();
    if (!locality) return { attempt, locality: "Choisissez votre ville ou votre quartier." };
    const failure = await save(
      { locality: Number(locality), email: email || null },
      "/inscription/parent/profil/a-propos",
    );
    if (!failure) return { attempt };
    if (failure.fields.email) return { attempt, email: failure.fields.email };
    if (failure.fields.locality) return { attempt, locality: failure.fields.locality };
    return { attempt, error: errorMessage(failure, "vous") };
  }, { attempt: 0 });

  const errors = [
    state.locality && { field: "parent-localite", message: state.locality },
    state.email && { field: "parent-email", message: state.email },
    state.error && { message: state.error },
  ].filter((item) => !!item);

  const localityItems = localities.items?.map((locality) => ({
    id: locality.id,
    code: String(locality.id),
    label: locality.district ? `${locality.city} · ${locality.district}` : locality.city,
  }));

  return (
    <form onSubmit={submitWith(action)} noValidate className="flex flex-col gap-4">
      <ErrorSummary title="Corrigez les erreurs suivantes :" errors={errors} focusKey={state.attempt} />
      <Field label="Pays de résidence" id="parent-pays" required>
        <ReferentialSelect
          items={countries.items}
          status={countries.status === "idle" ? "loading" : countries.status}
          onRetry={countries.retry}
          value={country}
          onChange={setCountry}
          placeholder="Choisissez…"
        />
      </Field>
      <Field label="Localité (ville / quartier)" id="parent-localite" required error={state.locality}>
        <ReferentialSelect
          key={country}
          name="locality"
          items={localityItems}
          status={localities.status === "idle" ? "loading" : localities.status}
          onRetry={localities.retry}
          placeholder="Choisissez…"
        />
      </Field>
      <Field
        label="Email"
        id="parent-email"
        hint="Facultatif : pour les factures et le suivi de votre enfant."
        error={state.email}
      >
        <Input type="email" name="email" autoComplete="email" inputMode="email" />
      </Field>
      <Button type="submit" block size="lg" loading={pending} iconRight="arrow-right" className="mt-3">
        Suivant
      </Button>
    </form>
  );
}
