import type { Metadata } from "next";

import { Mascot } from "@/components/ds/Mascot";
import { WebShell } from "@/components/ds/WebShell";

import { IdentityForm } from "./IdentityForm";

export const metadata: Metadata = { title: "Crée ton compte" };

// W04 · Identité et identifiant (W19 en état d'erreur)
export default function IdentityPage() {
  return (
    <WebShell
      kicker="Inscription · étape 1/4"
      title="Crée ton compte"
      sub="On a juste besoin de quelques infos pour commencer."
      step={1}
      total={4}
      brand={
        <>
          <Mascot pose="wave" size={220} hue="var(--surface)" />
          <p className="text-2xl font-black">On t&apos;attendait. 🚀</p>
        </>
      }
    >
      <IdentityForm />
    </WebShell>
  );
}
