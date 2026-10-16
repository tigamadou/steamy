import type { Metadata } from "next";
import { Suspense } from "react";

import { ParentInfo, ParentInfoSkeleton } from "@/features/account/ParentInfo";
import { ProfileBreadcrumb } from "@/features/account/ProfileBreadcrumb";

export const metadata: Metadata = { title: "Mon parent" };

// WD22 · Mon parent. Le h1 est le titre du header du shell (« Mon parent »).
export default function ParentPage() {
  return (
    <div className="mx-auto flex w-full max-w-140 flex-col gap-4">
      <ProfileBreadcrumb current="Mon parent" />
      <h2 className="sr-only">Ton parent</h2>
      <Suspense fallback={<ParentInfoSkeleton />}>
        <ParentInfo />
      </Suspense>
    </div>
  );
}
