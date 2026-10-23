"use client";

import { useRef, useState, type ReactNode } from "react";

import { Button, Modal } from "@/components/ds";
import { errorMessage, type ApiResult } from "@/lib/api-call";

export type ConfirmDialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Corps de la fenêtre : ce que l'action change. */
  children: ReactNode;
  confirmLabel: string;
  /** Action confirmée ; un échec reste affiché dans la fenêtre pour réessayer. */
  onConfirm: () => Promise<ApiResult<unknown>>;
  /** Appelée une fois l'action réussie, fenêtre déjà fermée. */
  onDone: () => void;
};

/**
 * Confirmation d'une action sensible (« Retirer de la classe »), au vouvoiement : un seul envoi à la fois (verrou « en
 * vol »), une erreur reste affichée dans la fenêtre pour un nouvel essai.
 */
export function ConfirmDialog({ open, onClose, title, children, confirmLabel, onConfirm, onDone }: ConfirmDialogProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const inFlight = useRef(false);

  function close() {
    setError(undefined);
    onClose();
  }

  async function confirm() {
    if (inFlight.current) return;
    inFlight.current = true;
    setPending(true);
    setError(undefined);
    const result = await onConfirm();
    inFlight.current = false;
    setPending(false);
    if (!result.ok) {
      setError(errorMessage(result, "vous"));
      return;
    }
    onClose();
    onDone();
  }

  return (
    <Modal
      open={open}
      onClose={close}
      variant="danger"
      icon="⚠️"
      title={title}
      actions={
        <>
          <Button variant="ghost" onClick={close}>
            Annuler
          </Button>
          <Button variant="danger" loading={pending} onClick={() => void confirm()}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div>{children}</div>
      {error && (
        <p role="alert" className="m-0 mt-3 font-bold text-error-700">
          {error}
        </p>
      )}
    </Modal>
  );
}
