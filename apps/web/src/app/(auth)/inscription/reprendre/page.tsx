import type { Metadata } from "next";

import { Mascot } from "@/components/ds/Mascot";
import { WebShell } from "@/components/ds/WebShell";

import { ResumeForm } from "./ResumeForm";

export const metadata: Metadata = { title: "Reprendre mon inscription" };

// Reprise d'inscription (C5) : depuis W02, W16 ou après un changement d'appareil
export default function ResumePage() {
  return (
    <WebShell
      kicker="Inscription en attente"
      title="Reprendre mon inscription"
      sub="Indique ton identifiant et le code de reprise que tu as noté."
      brand={<Mascot pose="focus" size={220} hue="var(--surface)" />}
    >
      <ResumeForm />
    </WebShell>
  );
}
