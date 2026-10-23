import type { Metadata } from "next";
import { Suspense } from "react";

import { Notifications, NotificationsSkeleton } from "@/features/notifications/Notifications";

export const metadata: Metadata = { title: "Notifications" };

/** WT12 · notifications de l'enseignant (onglet et page dans l'URL), lues sous Suspense. */
export default function TeacherNotificationsPage({ searchParams }: PageProps<"/enseignant/notifications">) {
  return (
    <Suspense fallback={<NotificationsSkeleton space="teacher" />}>
      <Notifications space="teacher" searchParams={searchParams} />
    </Suspense>
  );
}
