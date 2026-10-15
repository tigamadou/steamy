import type { Metadata } from "next";
import { Suspense } from "react";

import { SignedInRedirect } from "@/components/auth/SignedInRedirect";
import { Mascot } from "@/components/ds/Mascot";
import { WebShell } from "@/components/ds/WebShell";

import { UserTypeForm } from "./UserTypeForm";

export const metadata: Metadata = { title: "Créer un compte" };

// W03 · Type d'utilisateur
export default function UserTypePage() {
  return (
    <>
      <Suspense fallback={null}>
        <SignedInRedirect />
      </Suspense>
      <WebShell
        kicker="Créer un compte"
        title="Tu es… ?"
        sub="Choisis ton profil pour qu'on adapte Steamy à toi."
        brand={<Mascot pose="idle" size={240} hue="var(--surface)" />}
      >
        <UserTypeForm />
      </WebShell>
    </>
  );
}
