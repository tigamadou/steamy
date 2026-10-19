import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { ContentSkeleton } from "@/features/learning/ContentSkeleton";
import { MissionView } from "@/features/learning/MissionView";

export const metadata: Metadata = { title: "Mission" };

// WJ03 · Mission : identifiants de l'API dans l'URL, rien n'est déduit de l'ordre.
export default async function MissionViewPage({ params }: PageProps<"/apprenant/parcours/[slug]/missions/[missionId]">) {
  const { slug, missionId } = await params;
  const id = Number(missionId);
  if (!Number.isInteger(id) || id <= 0) notFound();
  return (
    <Suspense fallback={<ContentSkeleton />}>
      <MissionView slug={slug} missionId={id} />
    </Suspense>
  );
}
