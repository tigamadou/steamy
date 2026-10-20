import type { Metadata } from "next";
import { Suspense } from "react";

import { Deletion, DeletionSkeleton } from "@/features/account/Deletion";
import { ProfileBreadcrumb } from "@/features/account/ProfileBreadcrumb";

export const metadata: Metadata = { title: "Supprimer mon compte" };

// WD15 · Supprimer son compte. Le h1 est le titre du header du shell (« Supprimer mon compte »).
export default function DeletionPage() {
  return (
    <div className="mx-auto flex w-full max-w-140 flex-col gap-4">
      <ProfileBreadcrumb current="Supprimer mon compte" />
      <Suspense fallback={<DeletionSkeleton />}>
        <Deletion />
      </Suspense>
    </div>
  );
}
