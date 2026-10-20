"use client";

import { useRouter } from "next/navigation";
import { useActionState } from "react";

import { Button, ErrorSummary, Field, ReferentialSelect, Textarea } from "@/components/ds";
import { apiCall, errorMessage } from "@/lib/api-call";
import { submitWith } from "@/lib/form";
import { routes } from "@/lib/routes";
import { useReferential } from "@/lib/use-referential";

import { DeletionRule } from "./rule";

type State = { attempt: number; reason?: string; note?: string; error?: string };

/**
 * WPD09 · suppression à l'initiative du parent (D54) : motif obligatoire (référentiel `deletion-reasons`), précisions
 * facultatives, règle expliquée. `POST accounts/children/{id}/deletion/` désactive le compte aussitôt ; retour à WPD03,
 * où la suppression reste annulable.
 */
export function DeleteChildForm({ child }: { child: { id: number; firstName: string } }) {
  const router = useRouter();
  const reasons = useReferential("deletion-reasons");
  const [state, action, pending] = useActionState(
    async (previous: State, form: FormData): Promise<State> => {
      const attempt = previous.attempt + 1;
      const reason = String(form.get("reason") ?? "");
      const note = String(form.get("note") ?? "").trim();
      if (!reason) return { attempt, reason: "Choisissez le motif de la suppression." };
      const result = await apiCall((api) =>
        api.POST("/api/accounts/children/{id}/deletion/", {
          params: { path: { id: String(child.id) } },
          body: { reason, note },
        }),
      );
      if (result.ok) {
        router.push(routes.parent.child(child.id, "supprime"));
        return { attempt };
      }
      if (result.fields.reason || result.fields.note) {
        return { attempt, reason: result.fields.reason, note: result.fields.note };
      }
      return { attempt, error: errorMessage(result, "vous") };
    },
    { attempt: 0 },
  );
  const errors = [
    state.reason && { field: "suppression-motif", message: state.reason },
    state.note && { field: "suppression-precisions", message: state.note },
    state.error && { message: state.error },
  ].filter((item) => !!item);

  return (
    <form
      onSubmit={submitWith(action)}
      noValidate
      aria-label={`Supprimer le compte de ${child.firstName}`}
      className="flex flex-col gap-4.5 rounded-[22px] border-2 border-error-300 bg-surface p-5 sm:p-7"
    >
      <DeletionRule firstName={child.firstName} />
      <ErrorSummary errors={errors} focusKey={state.attempt} />
      <Field label="Motif de la suppression" id="suppression-motif" required error={state.reason}>
        <ReferentialSelect
          name="reason"
          items={reasons.items}
          status={reasons.status === "idle" ? "loading" : reasons.status}
          onRetry={reasons.retry}
          placeholder="Choisissez un motif"
          required
          invalid={!!state.reason}
        />
      </Field>
      <Field label="Précisions (facultatif)" id="suppression-precisions" error={state.note}>
        <Textarea name="note" rows={3} maxLength={1000} />
      </Field>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button variant="outline" block href={routes.parent.child(child.id)}>
          Annuler
        </Button>
        <Button type="submit" variant="danger" block loading={pending}>
          Supprimer le compte
        </Button>
      </div>
    </form>
  );
}
