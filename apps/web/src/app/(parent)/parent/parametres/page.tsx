import type { Metadata } from "next";
import { Suspense } from "react";

import { ParentSettings, ParentSettingsSkeleton } from "@/features/parent/settings/ParentSettings";

export const metadata: Metadata = { title: "Paramètres" };

/** WPD08 · paramètres du parent. */
export default function ParentSettingsPage() {
  return (
    <Suspense fallback={<ParentSettingsSkeleton />}>
      <ParentSettings />
    </Suspense>
  );
}
