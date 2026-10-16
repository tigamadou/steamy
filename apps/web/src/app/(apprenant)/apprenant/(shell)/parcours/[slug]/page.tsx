import type { Metadata } from "next";
import { Suspense } from "react";

import { CourseTree, CourseTreeSkeleton } from "@/features/learning/CourseTree";

export const metadata: Metadata = { title: "Mon parcours" };

// WC06a / WC06b · Parcours suivi : projets repliés, ou projet déplié par `?projet=<id>`.
export default async function CourseTreePage({ params, searchParams }: PageProps<"/apprenant/parcours/[slug]">) {
  const [{ slug }, { projet }] = await Promise.all([params, searchParams]);
  const expanded = typeof projet === "string" ? Number(projet) : null;
  return (
    <Suspense fallback={<CourseTreeSkeleton />}>
      <CourseTree slug={slug} expandedProjectId={expanded} />
    </Suspense>
  );
}
