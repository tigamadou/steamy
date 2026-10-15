import type { Metadata } from "next";
import { Suspense } from "react";

import { Button } from "@/components/ds/Button";
import { FullScreenStage } from "@/components/ds/FullScreenStage";
import { Loader } from "@/components/ds/Loader";
import { Mascot } from "@/components/ds/Mascot";
import { routes } from "@/lib/routes";

import { ForgetResumeCode } from "../ForgetResumeCode";
import { SignupGate } from "../SignupGate";

export const metadata: Metadata = { title: "Inscription non validée" };

// W18 · Consentement refusé (terminal, D22) : ni « Changer de parent » ni « Réessayer plus tard ».
export default function ConsentRefusedPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center">
          <Loader label="Chargement de ton inscription…" />
        </div>
      }
    >
      <SignupGate steps={["refused"]}>
        {(state) => (
          <FullScreenStage tone="error">
            <ForgetResumeCode />
            <Mascot pose="sad" size={150} />
            <h1 className="text-3xl font-black text-ink-900">Inscription non validée</h1>
            <p className="text-base font-semibold text-ink-700">Ton parent n&apos;a pas accepté ton inscription.</p>
            {state.consentRequest?.refusalReason && (
              <p className="w-full rounded-lg border-2 border-error-300 bg-surface p-4 text-sm font-bold text-ink-800">
                Motif indiqué : « {state.consentRequest.refusalReason.label} »
              </p>
            )}
            <p className="text-sm font-semibold text-ink-700">
              Tu pourras refaire une demande à ce parent dans 30 jours. Parles-en ensemble d&apos;ici là.
            </p>
            <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
              <Button href="/inscription" size="lg">
                Retour à l&apos;accueil
              </Button>
              <Button href={routes.contact("changement-parent")} variant="outline" size="lg">
                Besoin d&apos;aide ?
              </Button>
            </div>
          </FullScreenStage>
        )}
      </SignupGate>
    </Suspense>
  );
}
