import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { ConsentRequestCard } from "@/components/ds/ConsentRequestCard";
import { Loader } from "@/components/ds/Loader";
import { Mascot } from "@/components/ds/Mascot";
import { WebShell } from "@/components/ds/WebShell";
import { formatInstant } from "@/lib/dates";
import { routes } from "@/lib/routes";

import { AcceptForm } from "./AcceptForm";
import { requestPath, RequestGate } from "./RequestGate";

export const metadata: Metadata = { title: "Demande de votre enfant" };

// WP05 · Demande de l'enfant : seulement ce que D20 autorise. Un parent au profil complet (déjà inscrit) la traite
// dans son espace (WPD05) : le lien SMS (`claim`) y aboutit.
export default function ConsentRequestPage({ params }: PageProps<"/inscription/parent/demande/[id]">) {
  return (
    <WebShell
      kicker="Demande de consentement"
      title="Votre enfant a besoin de votre accord"
      sub="Vérifiez sa demande, puis acceptez-la ou refusez-la."
      brand={<Mascot pose="focus" size={200} hue="var(--surface)" />}
    >
      <Suspense fallback={<Loader label="Chargement de la demande…" />}>
        <RequestGate params={params}>
          {(request, me) => {
            if (!me.profileStep) redirect(routes.parent.consent(request.id));
            if (request.status !== "pending") {
              const path = requestPath(request.id, request.status);
              if (path !== requestPath(request.id, "pending")) redirect(path);
              return (
                <p role="status" className="rounded-lg bg-ink-50 p-4 font-bold text-ink-700">
                  Cette demande n&apos;est plus en attente : elle a expiré ou a été remplacée par une plus récente.
                </p>
              );
            }
            return (
              <>
                <ConsentRequestCard
                  firstName={request.firstName}
                  lastName={request.lastName}
                  username={request.username}
                  age={request.age}
                  relationship={request.relationship.parentLabel || request.relationship.label}
                  expiresOn={formatInstant(request.expiresAt)}
                />
                <AcceptForm id={request.id} />
              </>
            );
          }}
        </RequestGate>
      </Suspense>
    </WebShell>
  );
}
