"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ds/Button";
import { ErrorSummary } from "@/components/ds/ErrorSummary";
import { GoalChipGroup } from "@/components/ds/GoalChip";
import { Loader } from "@/components/ds/Loader";
import { errorMessage } from "@/lib/api-call";
import { submitWith } from "@/lib/form";
import { useReferential } from "@/lib/use-referential";

import { useLearnerProfileSave } from "./useProfileSave";

/** Au moins deux objectifs (W13), règle aussi vérifiée par l'API. */
const MIN_GOALS = 2;

type State = { attempt: number; error?: string };

/** W13 · Objectifs : choix multiple dans le référentiel, « Suivant » désactivé sous 2. */
export function GoalsStep() {
  const save = useLearnerProfileSave();
  const goals = useReferential("goals");
  const [selected, setSelected] = useState<string[]>([]);

  const [state, action, pending] = useActionState(async (previous: State): Promise<State> => {
    const attempt = previous.attempt + 1;
    const failure = await save({ goals: selected });
    return failure ? { attempt, error: failure.fields.goals ?? errorMessage(failure, "tu") } : { attempt };
  }, { attempt: 0 });

  if (goals.status === "error") {
    return (
      <div className="flex flex-col items-start gap-3">
        <p role="alert" className="font-bold text-error-600">
          Impossible de charger les objectifs.
        </p>
        <Button variant="outline" onClick={goals.retry}>
          Réessayer
        </Button>
      </div>
    );
  }
  if (!goals.items) return <Loader label="Chargement des objectifs…" />;

  return (
    <form onSubmit={submitWith(action)} noValidate className="flex flex-col gap-6">
      <ErrorSummary errors={state.error ? [{ message: state.error }] : []} focusKey={state.attempt} />
      <GoalChipGroup
        legend="Tes objectifs"
        legendHidden
        name="goals"
        min={MIN_GOALS}
        options={goals.items.map((goal) => ({ value: goal.code, label: goal.label, emoji: goal.emoji }))}
        value={selected}
        onChange={setSelected}
      />
      <Button
        type="submit"
        block
        size="lg"
        loading={pending}
        disabled={selected.length < MIN_GOALS}
        iconRight="arrow-right"
      >
        {`Suivant · ${selected.length} sélectionné${selected.length > 1 ? "s" : ""}`}
      </Button>
    </form>
  );
}
