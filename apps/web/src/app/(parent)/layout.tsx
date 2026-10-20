import type { Metadata } from "next";
import { Suspense } from "react";

import { RoleGate } from "@/components/auth/RoleGate";
import { AppShellSkeleton } from "@/components/ds/AppShell";

// Espace personnel : jamais indexé.
export const metadata: Metadata = {
  title: { default: "Mon espace", template: "%s · Steamy" },
  robots: { index: false, follow: false },
};

// Espace parent : session et rôle vérifiés côté serveur, sous Suspense (cacheComponents), avec le squelette du shell
// pendant la lecture de la session. Un apprenant ou un enseignant est renvoyé vers son propre espace.
export default function ParentLayout({ children }: LayoutProps<"/">) {
  return (
    <Suspense fallback={<AppShellSkeleton label="Chargement de votre espace…" navCount={6} />}>
      <RoleGate role="parent">{children}</RoleGate>
    </Suspense>
  );
}
