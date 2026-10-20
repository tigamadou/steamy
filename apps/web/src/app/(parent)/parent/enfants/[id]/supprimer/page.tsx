import type { Metadata } from "next";
import { Suspense } from "react";

import { DeleteChild, DeleteChildSkeleton } from "@/features/parent/deletion/DeleteChild";

export const metadata: Metadata = { title: "Supprimer le compte" };

/** WPD09 · Supprimer le compte d'un enfant, ou valider sa demande (`?demande=<id>`). */
export default function DeleteChildPage({ params, searchParams }: PageProps<"/parent/enfants/[id]/supprimer">) {
  return (
    <Suspense fallback={<DeleteChildSkeleton />}>
      <DeleteChild params={params} searchParams={searchParams} />
    </Suspense>
  );
}
