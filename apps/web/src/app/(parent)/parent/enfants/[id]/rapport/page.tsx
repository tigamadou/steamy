import type { Metadata } from "next";
import { Suspense } from "react";

import { WeeklyReport, WeeklyReportSkeleton } from "@/features/parent/report/WeeklyReport";

export const metadata: Metadata = { title: "Rapport hebdomadaire" };

/** WPD11 · Rapport hebdomadaire d'un enfant (`?semaine=AAAA-Www`). */
export default function WeeklyReportPage({ params, searchParams }: PageProps<"/parent/enfants/[id]/rapport">) {
  return (
    <Suspense fallback={<WeeklyReportSkeleton />}>
      <WeeklyReport params={params} searchParams={searchParams} />
    </Suspense>
  );
}
