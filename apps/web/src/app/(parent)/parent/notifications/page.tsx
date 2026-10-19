import type { Metadata } from "next";
import { Suspense } from "react";

import { Notifications, NotificationsSkeleton } from "@/features/notifications/Notifications";

export const metadata: Metadata = { title: "Notifications" };

/** WPD14 · notifications du parent (onglet et page dans l'URL), lues sous Suspense. */
export default function ParentNotificationsPage({ searchParams }: PageProps<"/parent/notifications">) {
  return (
    <Suspense fallback={<NotificationsSkeleton space="parent" />}>
      <Notifications space="parent" searchParams={searchParams} />
    </Suspense>
  );
}
