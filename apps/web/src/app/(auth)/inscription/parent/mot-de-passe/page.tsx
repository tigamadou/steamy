import type { Metadata } from "next";

import { Mascot } from "@/components/ds/Mascot";
import { WebShell } from "@/components/ds/WebShell";

import { ParentPasswordForm } from "./ParentPasswordForm";

export const metadata: Metadata = { title: "Créez votre mot de passe" };

// WP03 · Mot de passe du parent
export default function ParentPasswordPage() {
  return (
    <WebShell
      kicker="Sécurité"
      title="Créez votre mot de passe"
      sub="Un mot de passe solide protège votre compte et celui de votre enfant."
      brand={<Mascot pose="idle" size={200} hue="var(--surface)" />}
    >
      <ParentPasswordForm />
    </WebShell>
  );
}
