import { Suspense } from "react";

import { RoleGate } from "@/components/auth/RoleGate";
import { Loader } from "@/components/ds/Loader";

// Espace enseignant : session et rôle vérifiés côté serveur, sous Suspense (cacheComponents).
export default function EnseignantLayout({ children }: LayoutProps<"/">) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center">
          <Loader label="Chargement de votre espace…" />
        </div>
      }
    >
      <RoleGate role="teacher">{children}</RoleGate>
    </Suspense>
  );
}
