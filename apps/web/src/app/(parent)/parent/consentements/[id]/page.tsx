import type { Metadata } from "next";
import { Suspense } from "react";

import { ConsentRequestScreen, ConsentRequestSkeleton } from "@/features/parent/consent/ConsentRequestScreen";

export const metadata: Metadata = { title: "Demande de consentement" };

/** WPD05 · demande de consentement (origine enfant), lue sous Suspense. */
export default function ParentConsentPage({ params }: PageProps<"/parent/consentements/[id]">) {
  return (
    <Suspense fallback={<ConsentRequestSkeleton />}>
      <ConsentRequestScreen params={params} />
    </Suspense>
  );
}
