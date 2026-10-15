import type { Metadata } from "next";

import { ConsentLanding } from "./ConsentLanding";

export const metadata: Metadata = { title: "Demande de consentement" };

// Atterrissage du lien SMS, jeton déjà retiré de l'URL
export default function ConsentPage() {
  return <ConsentLanding />;
}
