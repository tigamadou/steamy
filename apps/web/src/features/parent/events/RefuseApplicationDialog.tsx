"use client";

import type { Schemas } from "@steamy/api-client";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button, Field, Modal, Textarea } from "@/components/ds";
import { apiCall } from "@/lib/api-call";

import { applicationErrorMessage } from "./status";

export type RefuseApplicationDialogProps = {
  open: boolean;
  onClose: () => void;
  applicationId: number;
  childFirstName: string;
  eventTitle: string;
  /** Candidature refusée, telle que renvoyée par l'API. */
  onRefused: (application: Schemas["Application"]) => void;
};

/** Modale de refus d'une candidature (WPD06, maquette de 4.0) : motif facultatif, notifié à l'enfant. */
export function RefuseApplicationDialog({
  open,
  onClose,
  applicationId,
  childFirstName,
  eventTitle,
  onRefused,
}: RefuseApplicationDialogProps) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  async function refuse() {
    setPending(true);
    setError(undefined);
    const result = await apiCall((api) =>
      api.POST("/api/events/applications/{id}/refuse/", {
        params: { path: { id: applicationId } },
        body: { reason: reason.trim() },
      }),
    );
    setPending(false);
    if (!result.ok) {
      if (result.code === "APPLICATION_ALREADY_RESOLVED") router.refresh();
      setError(applicationErrorMessage(result));
      return;
    }
    onRefused(result.data);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      variant="danger"
      title={`Refuser la candidature de ${childFirstName} ?`}
      actions={
        <>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button variant="danger" loading={pending} onClick={() => void refuse()}>
            Refuser la candidature
          </Button>
        </>
      }
    >
      <p className="m-0">
        {eventTitle}. {childFirstName} sera prévenu·e de votre refus.
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
