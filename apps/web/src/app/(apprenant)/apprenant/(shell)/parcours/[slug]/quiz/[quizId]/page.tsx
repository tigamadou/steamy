import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { ContentSkeleton } from "@/features/learning/ContentSkeleton";
import { QuizView } from "@/features/learning/quiz/QuizView";

export const metadata: Metadata = { title: "Quiz" };

// WJ04 / WJ10 · Quiz formatif ou sommatif, selon l'API.
export default async function QuizPage({ params }: PageProps<"/apprenant/parcours/[slug]/quiz/[quizId]">) {
  const { slug, quizId } = await params;
  const id = Number(quizId);
  if (!Number.isInteger(id) || id <= 0) notFound();
  return (
    <Suspense fallback={<ContentSkeleton />}>
      <QuizView slug={slug} quizId={id} />
    </Suspense>
  );
}
