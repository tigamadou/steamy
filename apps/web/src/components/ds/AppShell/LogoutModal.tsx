"use client";

import { useState, useTransition } from "react";

import { Button } from "../Button";
import { Modal } from "../Modal";

const COPY = {
  tu: {
    body: "Tu seras déconnecté·e de Steamy sur cet appareil. À très vite pour de nouvelles missions !",
    error: "La déconnexion a échoué. Réessaie.",
  },
  vous: {
    body: "Vous serez déconnecté·e de Steamy sur cet appareil.",
    error: "La déconnexion a échoué. Réessayez.",
  },
} as const;

export type LogoutModalProps = {
  open: boolean;
  onClose: () => void;
  /** Ferme la session puis navigue ; une erreur levée est affichée dans la modale. */
  onConfirm: () => Promise<void>;
  /** Registre (C2) : tutoiement pour l'apprenant, vouvoiement pour le parent et l'enseignant. */
  register: "tu" | "vous";
};

// WD16 : confirmation de déconnexion (Annuler / Se déconnecter), sans flou du fond (§8.16).
export function LogoutModal({ open, onClose, onConfirm, register }: LogoutModalProps) {
  const [pending, startTransition] = useTransition();
  const [failed, setFailed] = useState(false);
  const copy = COPY[register];

  const close = () => {
    setFailed(false);
    onClose();
  };

  const confirm = () => {
    setFailed(false);
    startTransition(async () => {
      try {
        await onConfirm();
      } catch {
        setFailed(true);
      }
    });
  };

  return (
    <Modal
      open={open}
      onClose={close}
      icon="👋"
      variant="danger"
      title="Déjà l'heure de partir ?"
      actions={
        <>
          <Button variant="outline" onClick={close}>
            Annuler
          </Button>
          <Button variant="danger" onClick={confirm} loading={pending}>
            Se déconnecter
          </Button>
        </>
      }
    >
      <p>{copy.body}</p>
      <p role="alert" className="mt-2 font-bold text-error-700 empty:hidden">
        {failed ? copy.error : null}
      </p>
    </Modal>
  );
}
