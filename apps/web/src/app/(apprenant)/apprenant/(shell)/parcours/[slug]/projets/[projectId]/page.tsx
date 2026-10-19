import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { ContentSkeleton } from "@/features/learning/ContentSkeleton";
import { ProjectView } from "@/features/learning/ProjectView";

export const metadata: Metadata = { title: "Projet" };

// WJ01 · Projet : identifiants de l'API dans l'URL, rien n'est déduit de l'ordre.
export default async function ProjectViewPage({ params }: PageProps<"/apprenant/parcours/[slug]/projets/[projectId]">) {
  const { slug, projectId } = await params;
  const id = Number(projectId);
  if (!Number.isInteger(id) || id <= 0) notFound();
  return (
    <Suspense fallback={<ContentSkeleton />}>
      <ProjectView slug={slug} projectId={id} />
    </Suspense>
  );
}
