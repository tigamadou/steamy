import type { Metadata } from "next";
import { Suspense } from "react";

import { Button } from "@/components/ds/Button";
import { FullScreenStage } from "@/components/ds/FullScreenStage";
import { Loader } from "@/components/ds/Loader";
import { homeForRole } from "@/lib/auth/home-for-role";

import { RequestGate } from "../RequestGate";

export const metadata: Metadata = { title: "Demande refusée" };

// WP12 · Refus envoyé (terminal)
export default function ConsentRefusedPage({ params }: PageProps<"/inscription/parent/demande/[id]/refusee">) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center">
          <Loader label="Chargement…" />
        </div>
      }
    >
      <RequestGate params={params}>
        {(request, me) => (
          <FullScreenStage>
            <span aria-hidden className="text-7xl">
              ✋
            </span>
            <h1 className="text-3xl font-black text-ink-900">Demande refusée</h1>
            <p className="font-semibold text-ink-700">
              {request.firstName} verra votre décision. Aucune inscription n&apos;a été créée.
            </p>
            <Button href={homeForRole(me)} size="lg">
              Retour à l&apos;accueil
            </Button>
          </FullScreenStage>
        )}
      </RequestGate>
    </Suspense>
  );
}
