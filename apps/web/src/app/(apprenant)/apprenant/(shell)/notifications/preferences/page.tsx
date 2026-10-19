import type { Metadata } from "next";
import { Suspense } from "react";

import { Preferences, PreferencesSkeleton } from "@/features/notifications/Preferences";

export const metadata: Metadata = { title: "Préférences de notification" };

/** WD06 · préférences de notification, lues sous Suspense. */
export default function NotificationPreferencesPage() {
  return (
    <Suspense fallback={<PreferencesSkeleton />}>
      <Preferences />
    </Suspense>
  );
}
