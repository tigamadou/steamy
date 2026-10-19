import type { Metadata } from "next";
import { Suspense } from "react";

import { Notifications, NotificationsSkeleton } from "@/features/notifications/Notifications";

export const metadata: Metadata = { title: "Notifications" };

/** WD04 / WD05 · notifications (onglet et page dans l'URL), lues sous Suspense. */
export default function NotificationsPage({ searchParams }: PageProps<"/apprenant/notifications">) {
  return (
    <Suspense fallback={<NotificationsSkeleton />}>
      <Notifications searchParams={searchParams} />
    </Suspense>
  );
}
