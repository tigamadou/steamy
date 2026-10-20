"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ds/Button";
import { ErrorSummary } from "@/components/ds/ErrorSummary";
import { Modal } from "@/components/ds/Modal";
import { REFUSAL_REASON_FIELD, RefusalFields } from "@/features/consent/RefusalFields";
import { apiCall, errorMessage } from "@/lib/api-call";

/**
 * WP11 · Refus : motif obligatoire (référentiel) et précisions facultatives, transmis à l'enfant (W18). Le refus clôt
 * la demande ; une confirmation est demandée avant l'envoi (C9 : nouvelle demande possible après 30 jours).
 */
export function RefuseForm({ id, firstName }: { id: number; firstName: string }) {
  const router = useRouter();
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
    reasonError && { field: REFUSAL_REASON_FIELD, message: reasonError },
    error && { message: error },
  ].filter((item) => !!item);

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <ErrorSummary title="Refus impossible :" errors={errors} focusKey={attempt} />
      <RefusalFields
        reason={reason}
        onReasonChange={(value) => {
          setReason(value);
          setReasonError(undefined);
        }}
        reasonError={reasonError}
        note={note}
        onNoteChange={setNote}
      />
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
