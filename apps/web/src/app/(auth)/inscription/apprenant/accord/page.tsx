import type { Metadata } from "next";
import { Suspense } from "react";

import { Button } from "@/components/ds/Button";
import { Celebration } from "@/components/ds/Celebration";
import { Loader } from "@/components/ds/Loader";

import { ForgetResumeCode } from "../ForgetResumeCode";
import { SignupGate } from "../SignupGate";

export const metadata: Metadata = { title: "Inscription validée" };

// W08 · Accord reçu. L'API ne transmet pas le prénom du parent à l'enfant : le texte reste générique.
export default function ConsentGrantedPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center">
          <Loader label="Chargement de ton inscription…" />
        </div>
      }
    >
      <SignupGate steps={["password"]}>
        {(state) => (
          <>
            <ForgetResumeCode />
            <Celebration
              title="Super, c'est validé !"
              actions={
                <Button href="/inscription/apprenant/mot-de-passe" size="lg" block iconRight="arrow-right">
                  Continuer
                </Button>
              }
            >
              Bravo {state.firstName} : ton parent a accepté ton inscription. Il ne te reste plus qu&apos;à choisir ton
              mot de passe. 🎉
            </Celebration>
          </>
        )}
      </SignupGate>
    </Suspense>
  );
}
