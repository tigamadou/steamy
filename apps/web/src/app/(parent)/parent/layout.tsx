import { Suspense } from "react";

import { AppShellSkeleton } from "@/components/ds/AppShell";
import { ParentShell } from "@/features/parent/shell/ParentShell";

// Écrans du parent dans le shell (AppShell, navigation de §5.11).
export default function ParentShellLayout({ children }: LayoutProps<"/parent">) {
  return (
    <Suspense fallback={<AppShellSkeleton label="Chargement de votre espace…" navCount={6} />}>
      <ParentShell>{children}</ParentShell>
    </Suspense>
  );
}
