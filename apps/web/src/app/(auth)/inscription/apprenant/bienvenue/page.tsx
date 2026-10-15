import type { Metadata } from "next";
import { Suspense } from "react";

import { ProfileGate } from "@/components/auth/ProfileGate";
import { Avatar } from "@/components/ds/Avatar";
import { Button } from "@/components/ds/Button";
import { Celebration } from "@/components/ds/Celebration";
import { Loader } from "@/components/ds/Loader";

export const metadata: Metadata = { title: "Bienvenue sur Steamy" };

// W15 · Bienvenue : profil complet. Pas de « parcours gratuit débloqué » (D27) : les parcours gratuits sont ouverts.
export default function LearnerWelcomePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center">
          <Loader label="Chargement…" />
        </div>
      }
    >
      <ProfileGate role="learner" steps={[null]}>
        {(me) => (
          <Celebration
            title={`Bienvenue, ${me.firstName} !`}
            mascot={
              <Avatar name={me.firstName} emoji={me.avatar?.emoji} size={120} decorative />
            }
            actions={
              <>
                <Button href="/apprenant/catalogue?prix=gratuit" size="lg" block>
                  Voir les parcours gratuits
                </Button>
                <Button href="/apprenant" variant="outline" size="lg" block>
                  Aller sur mon tableau de bord
                </Button>
              </>
            }
          >
            Ton compte est prêt. Commence par un parcours gratuit : ils sont ouverts à tous, sans rien payer.
          </Celebration>
        )}
      </ProfileGate>
    </Suspense>
  );
}
