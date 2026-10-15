import type { Metadata } from "next";
import { Suspense } from "react";

import { Loader } from "@/components/ds/Loader";
import { Mascot } from "@/components/ds/Mascot";
import { WebShell } from "@/components/ds/WebShell";

import { SignupGate } from "../SignupGate";
import { LearnerPasswordForm } from "./LearnerPasswordForm";

export const metadata: Metadata = { title: "Crée ton mot de passe" };

// W10 · Mot de passe, après l'accord du parent
export default function LearnerPasswordPage() {
  return (
    <WebShell
      kicker="Inscription · étape 4/4"
      title="Crée ton mot de passe"
      sub="Choisis un mot de passe que tu retiendras, mais que personne ne peut deviner."
      step={4}
      total={4}
      brand={<Mascot pose="idle" size={200} hue="var(--surface)" />}
    >
      <Suspense fallback={<Loader label="Chargement de ton inscription…" />}>
        <SignupGate steps={["password"]}>{() => <LearnerPasswordForm />}</SignupGate>
      </Suspense>
    </WebShell>
  );
}
