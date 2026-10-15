import type { Metadata } from "next";
import { Suspense } from "react";

import { Loader } from "@/components/ds/Loader";

import { SignupGate } from "../SignupGate";
import { WaitingScreen } from "./WaitingScreen";

export const metadata: Metadata = { title: "En attente de ton parent" };

// W07 · Attente du consentement (plein écran)
export default function WaitingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center">
          <Loader label="Chargement de ton inscription…" />
        </div>
      }
    >
      <SignupGate steps={["waiting"]}>{(state) => <WaitingScreen initial={state} />}</SignupGate>
    </Suspense>
  );
}
