"use client";

import { useState } from "react";

import { Button } from "@/components/ds/Button";
import { Modal } from "@/components/ds/Modal";

/**
 * « Mot de passe oublié ? » de W16 (D26, C7) : le parent et l'enseignant réinitialisent eux-mêmes (WL02) ;
 * l'apprenant n'a pas de canal et passe par son parent (WPD03).
 */
export function ForgotPasswordChoice() {
  const [open, setOpen] = useState(false);
  const [learner, setLearner] = useState(false);
  const close = () => {
    setOpen(false);
    setLearner(false);
  };

  return (
    <>
      <Button variant="ghost" size="sm" className="self-end" onClick={() => setOpen(true)}>
        Mot de passe oublié ?
      </Button>
      <Modal
        open={open}
        onClose={close}
        icon="🔑"
        title={learner ? "Demande à ton parent" : "Mot de passe oublié ?"}
        actions={
          learner ? (
            <Button block onClick={close}>
              J&apos;ai compris
            </Button>
          ) : (
            <>
              <Button block href="/mot-de-passe-oublie">
                Je suis parent ou enseignant
              </Button>
              <Button block variant="outline" onClick={() => setLearner(true)}>
                Je suis apprenant
              </Button>
            </>
          )
        }
      >
        {learner
          ? "Demande à ton parent de réinitialiser ton mot de passe depuis son espace Steamy."
          : "Qui es-tu ? La réinitialisation n'est pas la même pour tout le monde."}
      </Modal>
    </>
  );
}
