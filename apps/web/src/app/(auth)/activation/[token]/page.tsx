import type { Metadata } from "next";
import { Suspense } from "react";

import { Loader } from "@/components/ds/Loader";

import { InvitationGate } from "./InvitationGate";

export const metadata: Metadata = { title: "Activation du compte · Steamy" };

// Lien de l'email d'invitation (C6) : `Referrer-Policy: no-referrer` posé par next.config.ts.
export default function ActivationPage({ params }: PageProps<"/activation/[token]">) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center">
          <Loader label="Vérification de votre invitation…" />
        </div>
      }
    >
      <InvitationGate params={params} />
    </Suspense>
  );
}
