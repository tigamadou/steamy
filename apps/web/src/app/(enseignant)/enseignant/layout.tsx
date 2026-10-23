import { Suspense } from "react";

import { AppShellSkeleton } from "@/components/ds/AppShell";
import { TeacherShell } from "@/features/teacher/shell/TeacherShell";

// Écrans de l'enseignant dans le shell (AppShell, navigation de §5.12).
export default function TeacherShellLayout({ children }: LayoutProps<"/enseignant">) {
  return (
    <Suspense fallback={<AppShellSkeleton label="Chargement de votre espace…" navCount={7} />}>
      <TeacherShell>{children}</TeacherShell>
    </Suspense>
  );
}
