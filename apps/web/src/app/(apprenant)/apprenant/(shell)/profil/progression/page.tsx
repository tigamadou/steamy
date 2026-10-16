import type { Metadata } from "next";
import { Suspense } from "react";

import { ProgressSkeleton, ProgressView } from "@/features/learning/progress/ProgressView";

export const metadata: Metadata = { title: "Ma progression" };

// WD21 · Ma progression.
export default function ProgressPage() {
  return (
    <Suspense fallback={<ProgressSkeleton />}>
      <ProgressView />
    </Suspense>
  );
}
