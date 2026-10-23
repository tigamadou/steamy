"use client";

import { useEffect, useRef, useState } from "react";

import { Button, Modal } from "@/components/ds";
import { apiCall, errorMessage } from "@/lib/api-call";

/** Texte de la demande de fermeture : le compte est rattaché à un établissement, le support la traite (S5, C6). */
export const CLOSE_ACCOUNT_TEXT =
  "Votre compte est rattaché à votre établissement : sa fermeture est traitée par notre équipe, qui vous répond par email. Votre accès reste actif jusqu'à ce traitement.";

/**
 * Zone sensible de WT08 : « Demander la fermeture du compte ». Envoie un message au support
 * (`POST public/contact-messages/`, sujet « Autre » prérempli), sans suppression immédiate. Un seul envoi à la fois ;
 * une erreur reste affichée dans la fenêtre pour réessayer.
 */
export function CloseAccount({ name, email }: { name: string; email: string }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string>();
  const status = useRef<HTMLParagraphElement>(null);
  // Verrou « en vol » : un double clic ne part qu'une fois, même avant le rendu du bouton en chargement
  const inFlight = useRef(false);

  function close() {
    setOpen(false);
    setError(undefined);
  }

  // La demande envoyée désactive le bouton : le focus passe à la confirmation plutôt que de se perdre
  useEffect(() => {
    if (sent) status.current?.focus();
  }, [sent]);

  async function confirm() {
    if (inFlight.current) return;
    inFlight.current = true;
    setPending(true);
    setError(undefined);
    const result = await apiCall((api) =>
      api.POST("/api/public/contact-messages/", {
        body: {
          name,
          contact: email,
          subject: "autre",
          message: `Demande de fermeture du compte enseignant de ${name} (${email}).`,
        },
      }),
    );
    inFlight.current = false;
    setPending(false);
    if (!result.ok) {
      setError(errorMessage(result, "vous"));
      return;
    }
    setSent(true);
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border-[1.5px] border-error-300 bg-surface p-4.5 sm:flex-row sm:items-center">
      <div className="flex-1">
        <h3 className="m-0 text-sm font-black text-error-700">Fermer mon compte</h3>
        <p
          id="fermeture-compte"
          ref={status}
          tabIndex={-1}
          className="m-0 mt-1 text-[13px] font-semibold text-ink-600 outline-none"
        >
          {sent ? "Votre demande est envoyée. Notre équipe vous répond par email." : CLOSE_ACCOUNT_TEXT}
        </p>
      </div>
      <Button
        variant="danger"
        size="sm"
        disabled={sent}
        aria-describedby="fermeture-compte"
        onClick={() => setOpen(true)}
        className="self-start sm:self-auto"
      >
        Demander la fermeture du compte
      </Button>
      <Modal
        open={open && !sent}
        onClose={close}
        variant="danger"
        icon="⚠️"
        title="Demander la fermeture de votre compte ?"
        actions={
          <>
            <Button variant="ghost" onClick={close}>
              Annuler
            </Button>
            <Button variant="danger" loading={pending} onClick={() => void confirm()}>
              Envoyer la demande
            </Button>
          </>
        }
      >
        <p className="m-0">{CLOSE_ACCOUNT_TEXT}</p>
        {error && (
          <p role="alert" className="m-0 mt-3 font-bold text-error-700">
            {error}
          </p>
        )}
      </Modal>
    </div>
  );
}
