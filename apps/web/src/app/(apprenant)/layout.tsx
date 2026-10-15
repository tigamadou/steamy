import { Suspense } from "react";

import { RoleGate } from "@/components/auth/RoleGate";
import { Loader } from "@/components/ds/Loader";

// Espace apprenant : session et rôle vérifiés côté serveur, sous Suspense (cacheComponents).
export default function ApprenantLayout({ children }: LayoutProps<"/">) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center">
          <Loader label="Chargement de ton espace…" />
        </div>
      }
    >
      <RoleGate role="learner">{children}</RoleGate>
    </Suspense>
  );
}
