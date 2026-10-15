import type { Metadata } from "next";

import { Button } from "@/components/ds/Button";
import { Celebration } from "@/components/ds/Celebration";

export const metadata: Metadata = { title: "Mot de passe réinitialisé · Steamy" };

// WL05 · Mot de passe réinitialisé : retour à la connexion, aucune minuterie.
export default function ResetDonePage() {
  return (
    <Celebration
      title="Mot de passe réinitialisé !"
      actions={
        <Button href="/connexion" size="lg" block>
          Se connecter
        </Button>
      }
    >
      Votre nouveau mot de passe est enregistré. Les sessions ouvertes sur vos autres appareils ont été fermées.
    </Celebration>
  );
}
