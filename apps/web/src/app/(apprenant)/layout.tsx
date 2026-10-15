import type { Metadata } from "next";
import { Suspense } from "react";

import { RoleGate } from "@/components/auth/RoleGate";
import { AppShellSkeleton } from "@/components/ds/AppShell";

// Espace personnel : jamais indexé.
export const metadata: Metadata = {
  title: "Mon espace",
  robots: { index: false, follow: false },
};

// Espace apprenant : session et rôle vérifiés côté serveur, sous Suspense (cacheComponents), avec le squelette du
// shell pendant la lecture de la session.
export default function ApprenantLayout({ children }: LayoutProps<"/">) {
  return (
    <Suspense fallback={<AppShellSkeleton label="Chargement de ton espace…" />}>
      <RoleGate role="learner">{children}</RoleGate>
    </Suspense>
  );
}
