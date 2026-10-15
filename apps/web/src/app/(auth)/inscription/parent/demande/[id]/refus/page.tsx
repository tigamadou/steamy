import type { Metadata } from "next";
import { Suspense } from "react";

import { Loader } from "@/components/ds/Loader";
import { Mascot } from "@/components/ds/Mascot";
import { WebShell } from "@/components/ds/WebShell";

import { RequestGate } from "../RequestGate";
import { RefuseForm } from "./RefuseForm";

export const metadata: Metadata = { title: "Refuser la demande" };

// WP11 · Motif du refus
export default function RefuseRequestPage({ params }: PageProps<"/inscription/parent/demande/[id]/refus">) {
  return (
    <WebShell
      kicker="Refus de la demande"
      title="Pourquoi refusez-vous ?"
      sub="Indiquez un motif : il sera transmis à votre enfant pour qu'il ou elle comprenne."
      brand={
        <>
          <Mascot pose="focus" size={200} hue="var(--surface)" />
          <p className="font-bold">
            Le refus clôt cette demande. Votre enfant pourra vous en refaire une dans 30 jours.
          </p>
        </>
      }
    >
      <Suspense fallback={<Loader label="Chargement de la demande…" />}>
        <RequestGate params={params}>
          {(request) => <RefuseForm id={request.id} firstName={request.firstName} />}
        </RequestGate>
      </Suspense>
    </WebShell>
  );
}
