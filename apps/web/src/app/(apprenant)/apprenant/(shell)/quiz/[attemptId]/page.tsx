import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { AttemptDetail } from "@/features/learning/attempts/AttemptDetail";
import { ContentSkeleton } from "@/features/learning/ContentSkeleton";

export const metadata: Metadata = { title: "Détail de la tentative" };

// WD08 · Détail d'une tentative.
export default async function AttemptPage({ params }: PageProps<"/apprenant/quiz/[attemptId]">) {
  const { attemptId } = await params;
  const id = Number(attemptId);
  if (!Number.isInteger(id) || id <= 0) notFound();
  return (
    <Suspense fallback={<ContentSkeleton />}>
      <AttemptDetail attemptId={id} />
    </Suspense>
  );
}
