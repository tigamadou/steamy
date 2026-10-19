import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { ContentSkeleton } from "@/features/learning/ContentSkeleton";
import { LevelView } from "@/features/learning/LevelView";

export const metadata: Metadata = { title: "Niveau" };

// WJ02 · Niveau : identifiants de l'API dans l'URL, rien n'est déduit de l'ordre.
export default async function LevelViewPage({ params }: PageProps<"/apprenant/parcours/[slug]/niveaux/[levelId]">) {
  const { slug, levelId } = await params;
  const id = Number(levelId);
  if (!Number.isInteger(id) || id <= 0) notFound();
  return (
    <Suspense fallback={<ContentSkeleton />}>
      <LevelView slug={slug} levelId={id} />
    </Suspense>
  );
}
