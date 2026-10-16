import { Suspense } from "react";

import { AppShellSkeleton } from "@/components/ds/AppShell";
import { LearnerShell } from "@/features/shell/LearnerShell";

// Écrans de l'apprenant dans le shell (AppShell, nav D39) ; WJ06 et WJ11 vivent hors shell, dans `(plein-ecran)`.
export default function LearnerShellLayout({ children }: LayoutProps<"/apprenant">) {
  return (
    <Suspense fallback={<AppShellSkeleton label="Chargement de ton espace…" />}>
      <LearnerShell>{children}</LearnerShell>
    </Suspense>
  );
}
