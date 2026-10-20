"use client";

import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";

import { Button } from "@/components/ds/Button";
import { ErrorSummary } from "@/components/ds/ErrorSummary";
import { Modal } from "@/components/ds/Modal";
import { REFUSAL_REASON_FIELD, RefusalFields } from "@/features/consent/RefusalFields";
import { apiCall, errorMessage } from "@/lib/api-call";

/** Demande déjà close entre l'ouverture de l'écran et le refus : l'écran est relu en lecture seule. */
const CLOSED_CODES = new Set(["CONSENT_ALREADY_RESOLVED", "CONSENT_REQUEST_EXPIRED"]);

/**
 * Modale « Refuser la demande » de WPD05 (reprise de WP11, au vouvoiement) : motif obligatoire en liste fermée et
 * précisions facultatives, transmis à l'enfant (W18). Le refus clôt la demande ; une nouvelle demande est possible
 * dans 30 jours (D22, C9). « Annuler » referme la modale sans aucun appel à l'API.
 */
export function RefuseConsentDialog({
  id,
  firstName,
  open,
  onClose,
}: {
  id: number;
  firstName: string;
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const formId = useId();
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState<string>();
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [attempt, setAttempt] = useState(0);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!reason) {
      setReasonError("Choisissez un motif.");
      // Une incrémentation par envoi : le récapitulatif des erreurs reprend le focus
      setAttempt((n) => n + 1);
      return;
    }
    setPending(true);
    const result = await apiCall((api) =>
      api.POST("/api/accounts/consent-requests/{id}/refuse/", {
        params: { path: { id: String(id) } },
        body: { reason, note: note.trim() },
      }),
    );
    setPending(false);
    if (result.ok) {
      onClose();
      router.refresh();
      return;
    }
    setAttempt((n) => n + 1);
    if (CLOSED_CODES.has(result.code)) router.refresh();
    setError(result.fields.reason ?? errorMessage(result, "vous"));
  };

  const errors = [
    reasonError && { field: REFUSAL_REASON_FIELD, message: reasonError },
    error && { message: error },
  ].filter((item) => !!item);

  return (
    <Modal
      open={open}
      onClose={onClose}
      variant="danger"
      icon="✋"
      title={`Refuser la demande de ${firstName} ?`}
      className="max-w-[480px]"
      actions={
        <>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" form={formId} variant="danger" loading={pending}>
            Refuser la demande
          </Button>
        </>
      }
    >
      <p className="m-0">
        Le refus clôt la demande et aucune inscription n&apos;est créée. Votre enfant pourra vous faire une nouvelle
        demande dans 30 jours.
      </p>
      <form id={formId} onSubmit={onSubmit} noValidate className="mt-4 flex flex-col gap-4 text-left">
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
      </form>
    </Modal>
  );
}
