import type { Metadata } from "next";
import { Suspense } from "react";

import { ProfileGate } from "@/components/auth/ProfileGate";
import { Button } from "@/components/ds/Button";
import { Celebration } from "@/components/ds/Celebration";
import { Loader } from "@/components/ds/Loader";

import { LinkedChildren } from "./LinkedChildren";

export const metadata: Metadata = { title: "Bienvenue sur Steamy" };

// WP10 · Bienvenue parent : profil complet, enfants rattachés, puis l'espace parent
export default function ParentWelcomePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center">
          <Loader label="Chargement…" />
        </div>
      }
    >
      <ProfileGate role="parent" steps={[null]}>
        {(me) => (
          <Celebration
            title={`Bienvenue, ${me.firstName} !`}
            actions={
              <>
                <Button href="/parent" size="lg" block>
                  Aller sur mon tableau de bord
                </Button>
                <Button href="/parent/enfants/ajouter" variant="outline" size="lg" block>
                  Ajouter un enfant
                </Button>
              </>
            }
          >
            <span className="mb-4 block">
              Votre espace parent est prêt : vous y suivrez la progression de vos enfants et validerez leurs demandes.
            </span>
            <Suspense fallback={<Loader label="Chargement de vos enfants…" />}>
              <LinkedChildren />
            </Suspense>
          </Celebration>
        )}
      </ProfileGate>
    </Suspense>
  );
}
