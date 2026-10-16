import type { Metadata } from "next";
import { Suspense } from "react";

import { CourseTree, CourseTreeSkeleton } from "@/features/learning/CourseTree";
import { UNLOCKED_PARAM } from "@/features/unlock/types";
import { UnlockedToast } from "@/features/unlock/UnlockedToast";

export const metadata: Metadata = { title: "Mon parcours" };

// WC06a / WC06b · Parcours suivi : projets repliés, ou projet déplié par `?projet=<id>`. Toast « Parcours débloqué »
// à l'arrivée depuis un Kit Code valide (WA01, `?debloque=1`).
export default async function CourseTreePage({ params, searchParams }: PageProps<"/apprenant/parcours/[slug]">) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const { projet } = query;
  const expanded = typeof projet === "string" ? Number(projet) : null;
  return (
    <>
      <Suspense fallback={<CourseTreeSkeleton />}>
        <CourseTree slug={slug} expandedProjectId={expanded} />
      </Suspense>
      {query[UNLOCKED_PARAM] === "1" && <UnlockedToast />}
    </>
  );
}
