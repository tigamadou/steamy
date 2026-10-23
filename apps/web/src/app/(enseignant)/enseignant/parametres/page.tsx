import type { Metadata } from "next";
import { Suspense } from "react";

import { TeacherSettings, TeacherSettingsSkeleton } from "@/features/teacher/settings/TeacherSettings";

export const metadata: Metadata = { title: "Paramètres" };

/** WT08 · paramètres de l'enseignant. */
export default function TeacherSettingsPage() {
  return (
    <Suspense fallback={<TeacherSettingsSkeleton />}>
      <TeacherSettings />
    </Suspense>
  );
}
