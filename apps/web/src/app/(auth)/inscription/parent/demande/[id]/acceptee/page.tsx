import type { Metadata } from "next";
import { Suspense } from "react";

import { Button } from "@/components/ds/Button";
import { Celebration } from "@/components/ds/Celebration";
import { Loader } from "@/components/ds/Loader";
import { homeForRole } from "@/lib/auth/home-for-role";

import { RequestGate } from "../RequestGate";

export const metadata: Metadata = { title: "Demande acceptée" };

// WP06 · Demande acceptée. L'enfant l'apprend sur W07 (il n'a pas de canal) : pas de « vient d'être prévenu ».
export default function ConsentAcceptedPage({ params }: PageProps<"/inscription/parent/demande/[id]/acceptee">) {
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
          <Celebration
            title="Demande acceptée !"
            actions={
              <Button href={homeForRole(me)} size="lg" block>
                {me.profileStep ? "Compléter mon profil" : "Aller sur mon tableau de bord"}
              </Button>
            }
          >
            <strong className="text-ink-900">{request.firstName}</strong> peut maintenant terminer son inscription.
          </Celebration>
        )}
      </RequestGate>
    </Suspense>
  );
}
