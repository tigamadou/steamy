import type { Metadata } from "next";
import { Suspense } from "react";

import { PaymentRequestScreen, PaymentRequestSkeleton } from "@/features/parent/payment-request/PaymentRequestScreen";

export const metadata: Metadata = { title: "Demande de paiement" };

/** WPD15 · demande de paiement de l'enfant (cible du lien SMS et des notifications). */
export default function PaymentRequestPage({ params }: PageProps<"/parent/demandes/[id]">) {
  return (
    <Suspense fallback={<PaymentRequestSkeleton />}>
      <PaymentRequestScreen params={params} />
    </Suspense>
  );
}
