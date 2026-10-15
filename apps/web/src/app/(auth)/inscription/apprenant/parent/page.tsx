import type { Metadata } from "next";
import { Suspense } from "react";

import { Loader } from "@/components/ds/Loader";
import { Mascot } from "@/components/ds/Mascot";
import { WebShell } from "@/components/ds/WebShell";

import { SignupGate } from "../SignupGate";
import { ParentForm } from "./ParentForm";

export const metadata: Metadata = { title: "Numéro d'un parent" };

// W06 · Numéro du parent (consentement parental, accent --cat-ia)
export default function ParentPhonePage() {
  return (
    <WebShell
      kicker="Inscription · étape 3/4 · Consentement parental"
      title="Numéro d'un parent"
      sub="On va lui envoyer un SMS pour qu'il accepte ton inscription. Ça prend une minute."
      step={3}
      total={4}
      accent="cat-ia"
      accent2="primary-700"
      brand={<Mascot pose="wave" size={220} hue="var(--surface)" />}
    >
      <Suspense fallback={<Loader label="Chargement de ton inscription…" />}>
        <SignupGate steps={["parent"]}>{() => <ParentForm />}</SignupGate>
      </Suspense>
    </WebShell>
  );
}
