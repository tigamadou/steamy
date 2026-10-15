"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ds/Button";
import { ErrorSummary } from "@/components/ds/ErrorSummary";
import { GoalChipGroup } from "@/components/ds/GoalChip";
import { Loader } from "@/components/ds/Loader";
import { NumberStepper } from "@/components/ds/NumberStepper";
import { errorMessage } from "@/lib/api-call";
import { submitWith } from "@/lib/form";
import { useReferential } from "@/lib/use-referential";

import { useParentProfileSave } from "./useParentProfileSave";

type State = { attempt: number; error?: string };

/** WP09 · Profil 3/3 : nombre d'enfants à inscrire, objectifs pour l'enfant (au moins un, référentiel). */
export function ChildrenStep() {
  const save = useParentProfileSave();
  const goals = useReferential("goals");
  const [children, setChildren] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);

  const [state, action, pending] = useActionState(async (previous: State): Promise<State> => {
    const attempt = previous.attempt + 1;
    const failure = await save(
      { childrenToEnroll: children, goalsForChildren: selected },
      "/inscription/parent/bienvenue",
    );
    return failure ? { attempt, error: errorMessage(failure, "vous") } : { attempt };
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
      <ErrorSummary
        title="Enregistrement impossible :"
        errors={state.error ? [{ message: state.error }] : []}
        focusKey={state.attempt}
      />
      <div className="flex flex-col items-start gap-2">
        {/* Libellé visible ; le compteur porte le même nom accessible */}
        <p aria-hidden className="text-sm font-bold text-ink-700">
          Nombre d&apos;enfants à inscrire
        </p>
        <NumberStepper min={1} max={10} value={children} onChange={setChildren} label="Nombre d'enfants à inscrire" />
      </div>
      <GoalChipGroup
        legend="Vos objectifs pour votre enfant"
        name="goals"
        min={1}
        countLabel={(count) => `${count} choisi${count > 1 ? "s" : ""} · au moins 1`}
        options={goals.items.map((goal) => ({ value: goal.code, label: goal.label, emoji: goal.emoji }))}
        value={selected}
        onChange={setSelected}
      />
      <Button type="submit" block size="lg" loading={pending} disabled={selected.length === 0}>
        Terminer mon profil 🚀
      </Button>
    </form>
  );
}
