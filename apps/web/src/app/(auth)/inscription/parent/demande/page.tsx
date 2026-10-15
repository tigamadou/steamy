import type { Metadata } from "next";
import { Suspense } from "react";

import { ProfileGate } from "@/components/auth/ProfileGate";
import { Loader } from "@/components/ds/Loader";
import { Mascot } from "@/components/ds/Mascot";
import { WebShell } from "@/components/ds/WebShell";

import { RequestChoiceForm } from "./RequestChoiceForm";

export const metadata: Metadata = { title: "Avez-vous reçu une demande ?" };

// WP04 · Demande reçue ? (parent connecté, profil pas encore commencé)
export default function RequestChoicePage() {
  return (
    <WebShell
      kicker="Pourquoi êtes-vous ici ?"
      title="Avez-vous reçu une demande ?"
      sub="Si votre enfant a commencé son inscription, vous avez reçu un SMS avec un lien. Sinon, créez votre espace dès maintenant."
      brand={<Mascot pose="idle" size={220} hue="var(--surface)" />}
    >
      <Suspense fallback={<Loader label="Chargement…" />}>
        <ProfileGate role="parent" steps={["parent-location"]}>
          {() => <RequestChoiceForm />}
        </ProfileGate>
      </Suspense>
    </WebShell>
  );
}
