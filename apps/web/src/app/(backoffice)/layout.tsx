import type { Metadata } from "next";
import { Suspense } from "react";

import { BackofficeGate } from "@/components/backoffice/BackofficeGate";
import { Loader } from "@/components/ds/Loader";

// Back-office du personnel : jamais indexé.
export const metadata: Metadata = {
  title: "Back-office",
  robots: { index: false, follow: false },
};

// Personnel vérifié par TOTP (WAD15) seulement, contrôlé côté serveur sous Suspense (cacheComponents).
export default function BackofficeLayout({ children }: LayoutProps<"/">) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-ink-50">
          <Loader label="Ouverture du back-office…" />
        </div>
      }
    >
      <BackofficeGate>{children}</BackofficeGate>
    </Suspense>
  );
}
