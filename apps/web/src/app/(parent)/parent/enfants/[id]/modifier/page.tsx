import type { Metadata } from "next";
import { Suspense } from "react";

import { EditChild, EditChildSkeleton } from "@/features/parent/children/EditChild";

export const metadata: Metadata = { title: "Modifier le profil" };

/** WPD10 · Modifier le profil d'un enfant. */
export default function EditChildPage({ params }: PageProps<"/parent/enfants/[id]/modifier">) {
  return (
    <Suspense fallback={<EditChildSkeleton />}>
      <EditChild params={params} />
    </Suspense>
  );
}
