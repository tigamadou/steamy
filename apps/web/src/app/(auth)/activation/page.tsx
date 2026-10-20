import type { Metadata } from "next";

import { TeacherActivation } from "./TeacherActivation";

export const metadata: Metadata = { title: "Activation du compte" };

// Lien de l'email d'invitation (C6) : `/activation#jeton=…`, fragment lu côté client ; `Referrer-Policy:
// no-referrer` posé par next.config.ts. Sans jeton (lien incomplet) : lien expiré ou déjà utilisé.
export default function ActivationPage() {
  return <TeacherActivation />;
}
