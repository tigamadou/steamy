"use client";

import type { Schemas } from "@steamy/api-client";
import { useRouter } from "next/navigation";
import { useActionState, type ReactNode } from "react";

import { Button } from "@/components/ds/Button";
import { ErrorSummary } from "@/components/ds/ErrorSummary";
import { Field } from "@/components/ds/Field";
import { Select } from "@/components/ds/Select";
import { Textarea } from "@/components/ds/Textarea";
import { apiCall, errorMessage } from "@/lib/api-call";
import { submitWith } from "@/lib/form";
import { DIFFICULTY_LABELS } from "@/lib/format";
import { routes } from "@/lib/routes";

import { CLOSED_REASONS } from "./status";

type Level = Schemas["DifficultyEnum"];
const LEVELS = Object.keys(DIFFICULTY_LABELS) as Level[];

type State = {
  attempt: number;
  motivation?: string;
  selfLevel?: string;
  error?: string;
  /** Candidature devenue impossible (déjà candidat, complet, clos) : l'envoi n'est plus proposé. */
  blocked?: boolean;
  /** Candidature envoyée : le bouton reste occupé pendant le retour à WD10 (pas de second envoi). */
  sent?: boolean;
};

/** Messages des codes métier de `POST events/{slug}/applications/`. */
const BLOCKING: Partial<Record<Schemas["ErrorCodeEnum"], string>> = {
  ALREADY_APPLIED: "Tu as déjà une candidature en cours pour cet événement : retrouve-la dans « Mes candidatures ».",
  EVENT_FULL: CLOSED_REASONS.EVENT_FULL.reason,
  EVENT_CLOSED: CLOSED_REASONS.EVENT_CLOSED.reason,
  NOT_FOUND: "Cet événement n'est plus proposé.",
};

/**
 * WD11 · Formulaire de candidature : « Pourquoi veux-tu participer ? » (obligatoire) et « Ton expérience en
 * robotique » (Débutant / Intermédiaire / Avancé, facultatif). Envoi → WD10, où la candidature apparaît « En attente
 * de ton parent ». `notice` : encarts du parent et du ticket, avant l'envoi. `ALREADY_APPLIED`, `EVENT_FULL` et `EVENT_CLOSED` remplacent l'envoi par leur motif.
 */
export function ApplicationForm({ slug, notice }: { slug: string; notice?: ReactNode }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(
    async (previous: State, form: FormData): Promise<State> => {
      const attempt = previous.attempt + 1;
      const motivation = String(form.get("motivation") ?? "").trim();
      const selfLevel = String(form.get("selfLevel") ?? "") as Level | "";
      if (!motivation) return { attempt, motivation: "Dis-nous pourquoi tu veux participer." };

      const result = await apiCall((api) =>
        api.POST("/api/events/{slug}/applications/", { params: { path: { slug } }, body: { motivation, selfLevel } }),
      );
      if (result.ok) {
        router.push(`${routes.learner.events}?candidature=envoyee`);
        return { attempt, sent: true };
      }
      const blocking = BLOCKING[result.code];
      if (blocking) return { attempt, error: blocking, blocked: true };
      const { motivation: motivationError, selfLevel: levelError } = result.fields;
      if (motivationError || levelError) return { attempt, motivation: motivationError, selfLevel: levelError };
      return { attempt, error: errorMessage(result, "tu") };
    },
    { attempt: 0 },
  );

  const errors = [
    state.motivation && { field: "motivation", message: state.motivation },
    state.selfLevel && { field: "experience", message: state.selfLevel },
    state.error && { message: state.error },
  ].filter((item) => !!item);

  return (
    <form onSubmit={submitWith(action)} noValidate aria-label="Ta candidature" className="flex flex-col gap-4">
      <ErrorSummary errors={errors} focusKey={state.attempt} />
      <Field label="Pourquoi veux-tu participer ?" id="motivation" required error={state.motivation}>
        <Textarea name="motivation" rows={4} maxLength={2000} placeholder="Dis-nous ce qui te motive…" />
      </Field>
      <Field label="Ton expérience en robotique" id="experience" error={state.selfLevel}>
        <Select name="selfLevel" defaultValue="">
          <option value="">Choisis ton expérience</option>
          {LEVELS.map((level) => (
            <option key={level} value={level}>
              {DIFFICULTY_LABELS[level]}
            </option>
          ))}
        </Select>
      </Field>
      {notice}
      {state.blocked ? (
        <Button block size="lg" variant="outline" href={routes.learner.events}>
          Voir mes candidatures
        </Button>
      ) : (
        <Button type="submit" block size="lg" loading={pending || state.sent}>
          Envoyer ma candidature
        </Button>
      )}
    </form>
  );
}
