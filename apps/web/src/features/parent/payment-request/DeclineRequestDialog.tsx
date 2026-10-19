"use client";

import { useState } from "react";

import { Button, Field, Modal, Textarea } from "@/components/ds";
import { apiCall, errorMessage } from "@/lib/api-call";

export type DeclineRequestDialogProps = {
  open: boolean;
  onClose: () => void;
  requestId: number;
  childFirstName: string;
  /** Objet et montant (« Parcours Capteurs électroniques · 18 000 F CFA »), lus dans l'API. */
  summary: string;
  /** Demande refusée : l'écran se relit. */
  onDeclined: () => void;
};

/**
 * Modale « Refuser la demande » de WPD15 (maquette de 4.0) : motif facultatif, transmis à l'enfant, qui est notifié.
 * `POST payments/payment-requests/{id}/decline/`.
 */
export function DeclineRequestDialog({
  open,
  onClose,
  requestId,
  childFirstName,
  summary,
  onDeclined,
}: DeclineRequestDialogProps) {
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  async function decline() {
    setPending(true);
    setError(undefined);
    const result = await apiCall((api) =>
      api.POST("/api/payments/payment-requests/{id}/decline/", {
        params: { path: { id: requestId } },
        body: { reason: reason.trim() },
      }),
    );
    setPending(false);
    if (!result.ok) {
      setError(
        result.code === "PAYMENT_REQUEST_CLOSED"
          ? "Cette demande n'est plus en attente : elle a été réglée, annulée ou a expiré."
          : errorMessage(result, "vous"),
      );
      return;
    }
    onDeclined();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      variant="danger"
      title={`Refuser la demande de ${childFirstName} ?`}
      actions={
        <>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button variant="danger" loading={pending} onClick={() => void decline()}>
            Refuser la demande
          </Button>
        </>
      }
    >
      <p className="m-0">
        {summary}. {childFirstName} sera prévenu·e de votre refus.
      </p>
      <Field label="Motif (facultatif)" hint={`Il sera transmis à ${childFirstName}.`} className="mt-4 text-left">
        <Textarea value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} rows={3} />
      </Field>
      {error && (
        <p role="alert" className="m-0 mt-3 font-bold text-error-700">
          {error}
        </p>
      )}
    </Modal>
  );
}
