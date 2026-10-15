"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ds/Button";
import { ErrorSummary } from "@/components/ds/ErrorSummary";
import { Field } from "@/components/ds/Field";
import { Modal } from "@/components/ds/Modal";
import { ReferentialSelect } from "@/components/ds/ReferentialSelect";
import { Textarea } from "@/components/ds/Textarea";
import { apiCall, errorMessage } from "@/lib/api-call";
import { useReferential } from "@/lib/use-referential";

/**
 * WP11 · Refus : motif obligatoire (référentiel) et précisions facultatives, transmis à l'enfant (W18). Le refus clôt
 * la demande ; une confirmation est demandée avant l'envoi (C9 : nouvelle demande possible après 30 jours).
 */
export function RefuseForm({ id, firstName }: { id: number; firstName: string }) {
  const router = useRouter();
  const reasons = useReferential("refusal-reasons");
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState<string>();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [attempt, setAttempt] = useState(0);
  const [note, setNote] = useState("");

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    setAttempt((n) => n + 1);
    if (!reason) {
      setReasonError("Choisissez un motif.");
      return;
    }
    setConfirming(true);
  };

  const confirm = async () => {
    setPending(true);
    const result = await apiCall((api) =>
      api.POST("/api/accounts/consent-requests/{id}/refuse/", {
        params: { path: { id: String(id) } },
        body: { reason, note: note.trim() },
      }),
    );
    setPending(false);
    setConfirming(false);
    if (result.ok) {
      router.replace(`/inscription/parent/demande/${id}/refusee`);
      return;
    }
    setAttempt((n) => n + 1);
    setError(result.fields.reason ?? errorMessage(result, "vous"));
  };

  const errors = [
    reasonError && { field: "motif-refus", message: reasonError },
    error && { message: error },
  ].filter((item) => !!item);

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <ErrorSummary title="Refus impossible :" errors={errors} focusKey={attempt} />
      <Field label="Motif du refus" id="motif-refus" required error={reasonError}>
        <ReferentialSelect
          name="reason"
          items={reasons.items}
          status={reasons.status === "idle" ? "loading" : reasons.status}
          onRetry={reasons.retry}
          value={reason}
          onChange={(value) => {
            setReason(value);
            setReasonError(undefined);
          }}
          placeholder="Choisissez…"
        />
      </Field>
      <Field label="Précisions (facultatif)" id="precisions-refus">
        <Textarea
          name="note"
          rows={3}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Un mot pour votre enfant…"
        />
      </Field>
      <div className="mt-3 flex flex-col gap-3">
        <Button type="submit" variant="danger" block size="lg">
          Confirmer le refus
        </Button>
        <Button href={`/inscription/parent/demande/${id}`} variant="ghost" block>
          Annuler
        </Button>
      </div>
      <Modal
        open={confirming}
        onClose={() => setConfirming(false)}
        variant="danger"
        icon="✋"
        title={`Refuser la demande de ${firstName} ?`}
        actions={
          <>
            <Button variant="outline" onClick={() => setConfirming(false)}>
              Revenir
            </Button>
            <Button variant="danger" loading={pending} onClick={confirm}>
              Refuser la demande
            </Button>
          </>
        }
      >
        Aucune inscription ne sera créée. Votre enfant pourra vous refaire une demande dans 30 jours.
      </Modal>
    </form>
  );
}
