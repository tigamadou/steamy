import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { AppStateBoundary } from "@/components/states";
import { PaymentRequestView } from "@/features/unlock/PaymentRequestView";
import { RequestSkeleton } from "@/features/unlock/RequestSkeleton";
import { getPaymentRequest } from "@/features/unlock/server";

export const metadata: Metadata = { title: "Demande à ton parent" };

/** Demande lue côté serveur : identifiant invalide, inconnu ou d'un autre apprenant → 404. */
async function RequestLoader({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const requestId = Number(id);
  if (!Number.isInteger(requestId) || requestId <= 0) notFound();
  const request = await getPaymentRequest(requestId);
  if (!request) notFound();
  return <PaymentRequestView initial={request} />;
}

// WA02 · Demande de paiement au parent (titre du header : « Demande à ton parent »).
export default function PaymentRequestPage({ params }: PageProps<"/apprenant/demandes/[id]">) {
  return (
    <AppStateBoundary>
      <Suspense fallback={<RequestSkeleton />}>
        <RequestLoader params={params} />
      </Suspense>
    </AppStateBoundary>
  );
}
