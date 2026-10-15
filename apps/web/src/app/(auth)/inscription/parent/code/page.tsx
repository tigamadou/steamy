import type { Metadata } from "next";

import { Mascot } from "@/components/ds/Mascot";
import { WebShell } from "@/components/ds/WebShell";

import { ParentCodeForm } from "./ParentCodeForm";

export const metadata: Metadata = { title: "Vérifiez votre numéro" };

// WP02 · Code SMS
export default function ParentCodePage() {
  return (
    <WebShell
      kicker="Vérification"
      title="Vérifiez votre numéro"
      brand={
        <>
          <Mascot pose="focus" size={200} hue="var(--surface)" />
          <p className="text-xl font-black">On vérifie que c&apos;est bien vous avant de continuer.</p>
        </>
      }
    >
      <ParentCodeForm />
    </WebShell>
  );
}
