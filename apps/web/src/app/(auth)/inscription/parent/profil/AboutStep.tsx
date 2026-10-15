"use client";

import { useActionState } from "react";

import { Button } from "@/components/ds/Button";
import { ChoiceCardGroup } from "@/components/ds/ChoiceCard";
import { ErrorSummary } from "@/components/ds/ErrorSummary";
import { Field } from "@/components/ds/Field";
import { Input } from "@/components/ds/Input";
import { ReferentialSelect } from "@/components/ds/ReferentialSelect";
import { errorMessage } from "@/lib/api-call";
import { submitWith } from "@/lib/form";
import { useReferential } from "@/lib/use-referential";

import { useParentProfileSave } from "./useParentProfileSave";

const GENDERS = [
  { value: "female", emoji: "👩", label: "Femme" },
  { value: "male", emoji: "👨", label: "Homme" },
  { value: "other", emoji: "🌟", label: "Autre" },
];

type State = { attempt: number; error?: string };

/** WP08 · Profil 2/3 : genre, situation de handicap, profession, tout facultatif (finalité D6). */
export function AboutStep() {
  const save = useParentProfileSave();
  const disabilities = useReferential("disabilities");

  const [state, action, pending] = useActionState(async (previous: State, form: FormData): Promise<State> => {
    const attempt = previous.attempt + 1;
    const gender = form.get("gender");
    const disability = form.get("disability");
    const failure = await save(
      {
        gender: gender ? (String(gender) as "female" | "male" | "other") : null,
        disability: disability ? String(disability) : null,
        profession: String(form.get("profession")).trim(),
      },
      "/inscription/parent/profil/enfants",
    );
    return failure ? { attempt, error: errorMessage(failure, "vous") } : { attempt };
  }, { attempt: 0 });

  return (
    <form onSubmit={submitWith(action)} noValidate className="flex flex-col gap-5">
      <ErrorSummary
        title="Enregistrement impossible :"
        errors={state.error ? [{ message: state.error }] : []}
        focusKey={state.attempt}
      />
      <ChoiceCardGroup legend="Vous êtes (facultatif)" name="gender" options={GENDERS} />
      <Field label="Situation de handicap (facultatif)" id="parent-handicap">
        <ReferentialSelect
          name="disability"
          items={disabilities.items}
          status={disabilities.status === "idle" ? "loading" : disabilities.status}
          onRetry={disabilities.retry}
          placeholder="Aucune, ou je préfère ne pas répondre"
        />
      </Field>
      <Field label="Profession (facultatif)" id="parent-profession">
        <Input name="profession" autoComplete="organization-title" placeholder="Infirmière, commerçant, ingénieure…" />
      </Field>
      <p className="flex items-start gap-2.5 rounded-lg bg-info-50 p-3.5 text-sm font-bold text-info-700">
        <span aria-hidden>🔒</span>
        Ces informations sont facultatives. Elles servent seulement à adapter l&apos;accompagnement et à mesurer, de
        façon anonyme, si Steamy profite à toutes les familles.
      </p>
      <Button type="submit" block size="lg" loading={pending} iconRight="arrow-right" className="mt-2">
        Suivant
      </Button>
    </form>
  );
}
