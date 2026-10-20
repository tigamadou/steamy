"use client";

import { Field } from "@/components/ds/Field";
import { ReferentialSelect } from "@/components/ds/ReferentialSelect";
import { Textarea } from "@/components/ds/Textarea";
import { useReferential } from "@/lib/use-referential";

/** Identifiant du champ « Motif du refus », cible du lien de l'`ErrorSummary`. */
export const REFUSAL_REASON_FIELD = "motif-refus";

export type RefusalFieldsProps = {
  reason: string;
  onReasonChange: (code: string) => void;
  reasonError?: string;
  note: string;
  onNoteChange: (note: string) => void;
};

/**
 * Champs du refus d'une demande de consentement, au vouvoiement : motif obligatoire en liste fermée (référentiel
 * `refusal-reasons`) et précisions facultatives, transmis à l'enfant (W18). Partagés par WP11 (lot 2) et la modale
 * de refus de WPD05 (lot 4).
 */
export function RefusalFields({ reason, onReasonChange, reasonError, note, onNoteChange }: RefusalFieldsProps) {
  const reasons = useReferential("refusal-reasons");
  return (
    <>
      <Field label="Motif du refus" id={REFUSAL_REASON_FIELD} required error={reasonError}>
        <ReferentialSelect
          name="reason"
          items={reasons.items}
          status={reasons.status === "idle" ? "loading" : reasons.status}
          onRetry={reasons.retry}
          value={reason}
          onChange={onReasonChange}
          placeholder="Choisissez…"
        />
      </Field>
      <Field label="Précisions (facultatif)" id="precisions-refus">
        <Textarea
          name="note"
          rows={3}
          value={note}
          onChange={(event) => onNoteChange(event.target.value)}
          placeholder="Un mot pour votre enfant…"
        />
      </Field>
    </>
  );
}
