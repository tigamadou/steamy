import type { Metadata } from "next";

import { Mascot } from "@/components/ds/Mascot";
import { WebShell } from "@/components/ds/WebShell";

import { AgeForm } from "./AgeForm";

export const metadata: Metadata = { title: "Ton âge" };

// W05 · Âge (10-17 ans, D23)
export default function AgePage() {
  return (
    <WebShell
      kicker="Inscription · étape 2/4"
      title="Quel âge as-tu ?"
      sub="On adapte tes parcours à ton âge. Un parent validera toujours ton inscription."
      step={2}
      total={4}
      brand={<Mascot pose="focus" size={220} hue="var(--surface)" />}
    >
      <AgeForm />
    </WebShell>
  );
}
