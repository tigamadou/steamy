import { Suspense } from "react";

import { RoleGate } from "@/components/auth/RoleGate";
import { Loader } from "@/components/ds/Loader";

// Espace parent : session et rôle vérifiés côté serveur, sous Suspense (cacheComponents).
export default function ParentLayout({ children }: LayoutProps<"/">) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center">
          <Loader label="Chargement de votre espace…" />
        </div>
      }
    >
      <RoleGate role="parent">{children}</RoleGate>
    </Suspense>
  );
}
