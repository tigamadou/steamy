import type { Metadata } from "next";
import { Suspense } from "react";

import { SignedInRedirect } from "@/components/auth/SignedInRedirect";
import { Mascot } from "@/components/ds/Mascot";
import { WebShell } from "@/components/ds/WebShell";

import { ParentSignupForm } from "./ParentSignupForm";

export const metadata: Metadata = { title: "Créer un compte parent" };

// WP01 · Créer un compte parent (vouvoiement)
export default function ParentSignupPage() {
  return (
    <>
      <Suspense fallback={null}>
        <SignedInRedirect />
      </Suspense>
      <WebShell
        kicker="Espace parent"
        title="Créez votre compte parent"
        sub="Quelques informations pour démarrer. Vous pourrez ensuite accompagner et suivre votre enfant."
        brand={
          <>
            <Mascot pose="wave" size={220} hue="var(--surface)" />
            <p className="text-2xl font-black">Accompagnez ses premiers pas. 👨‍👩‍👧</p>
          </>
        }
      >
        <ParentSignupForm />
      </WebShell>
    </>
  );
}
