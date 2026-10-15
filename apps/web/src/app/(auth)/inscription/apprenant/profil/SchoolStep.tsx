"use client";

import { useActionState } from "react";

import { Button } from "@/components/ds/Button";
import { ChoiceCardGroup } from "@/components/ds/ChoiceCard";
import { ErrorSummary } from "@/components/ds/ErrorSummary";
import { Field } from "@/components/ds/Field";
import { ReferentialSelect } from "@/components/ds/ReferentialSelect";
import { errorMessage } from "@/lib/api-call";
import { submitWith } from "@/lib/form";
import { useReferential } from "@/lib/use-referential";

import { useLearnerProfileSave } from "./useProfileSave";

const GENDERS = [
  { value: "female", emoji: "👧", label: "Fille" },
  { value: "male", emoji: "👦", label: "Garçon" },
  { value: "other", emoji: "🌟", label: "Autre" },
];

type State = { attempt: number; grade?: string; error?: string };

/**
 * W12 · Profil 2/4 : classe (ordre scolaire servi par l'API), genre et situation de handicap facultatifs, avec la
 * mention de leur finalité (D6). Ils alimentent les indicateurs d'inclusion (D75).
 */
export function SchoolStep() {
  const save = useLearnerProfileSave();
  const grades = useReferential("school-grades");
  const disabilities = useReferential("disabilities");

  const [state, action, pending] = useActionState(async (previous: State, form: FormData): Promise<State> => {
    const attempt = previous.attempt + 1;
    const schoolGrade = String(form.get("schoolGrade") ?? "");
    if (!schoolGrade) return { attempt, grade: "Choisis ta classe." };
    const gender = form.get("gender");
    const disability = form.get("disability");
    const failure = await save({
      schoolGrade,
      gender: gender ? (String(gender) as "female" | "male" | "other") : null,
      disability: disability ? String(disability) : null,
    });
    if (!failure) return { attempt };
    if (failure.fields.schoolGrade) return { attempt, grade: failure.fields.schoolGrade };
    return { attempt, error: errorMessage(failure, "tu") };
  }, { attempt: 0 });

  const errors = [state.grade && { field: "classe", message: state.grade }, state.error && { message: state.error }].filter(
    (item) => !!item,
  );

  return (
    <form onSubmit={submitWith(action)} noValidate className="flex flex-col gap-5">
      <ErrorSummary errors={errors} focusKey={state.attempt} />
      <Field label="Ta classe" id="classe" required error={state.grade}>
        <ReferentialSelect
          name="schoolGrade"
          items={grades.items}
          status={grades.status === "idle" ? "loading" : grades.status}
          onRetry={grades.retry}
        />
      </Field>
      <ChoiceCardGroup legend="Tu es (facultatif)" name="gender" options={GENDERS} />
      <Field label="Situation de handicap (facultatif)" id="handicap">
        <ReferentialSelect
          name="disability"
          items={disabilities.items}
          status={disabilities.status === "idle" ? "loading" : disabilities.status}
          onRetry={disabilities.retry}
          placeholder="Aucune, ou je préfère ne pas répondre"
        />
      </Field>
      <p className="flex items-start gap-2.5 rounded-lg bg-info-50 p-3.5 text-sm font-bold text-info-700">
        <span aria-hidden>🔒</span>
        Le genre et la situation de handicap sont facultatifs. Ils servent seulement à adapter tes parcours et à
        mesurer, de façon anonyme, si Steamy profite à tous. Ils ne sont jamais vendus ni montrés aux autres.
      </p>
      <Button type="submit" block size="lg" loading={pending} iconRight="arrow-right" className="mt-2">
        Suivant
      </Button>
    </form>
  );
}
